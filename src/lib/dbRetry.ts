/**
 * One quick retry for *transient* Postgres connection failures.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * The site runs on Vercel serverless functions talking to the Supabase pooler.
 * Between requests the platform freezes the function; the idle TCP sockets the
 * `pg` Pool is holding are closed by the pooler/NAT while the function is
 * frozen, and the timers that would reap them do not run. On the next
 * invocation the Pool hands out a socket that is already dead and the very
 * first query fails with `Connection terminated unexpectedly`.
 *
 * That is not a database problem and not a query problem — the data is fine and
 * a brand-new connection succeeds immediately. It is a stale-connection race,
 * and the standard mitigation is to discard the dead socket and try once more.
 *
 * This is what made "Order Now" -> /checkout/[id] fail on a phone but pass in
 * tests: a cold instance builds a fresh Pool and works, while a warm-but-frozen
 * instance hands out a dead socket. See `checkout/[id]/page.tsx`.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT DELIBERATELY DOES NOT DO
 * ---------------------------------------------------------------------------
 * It never retries a *real* error. A wrong query, a missing column, a
 * constraint violation, a bad password or a missing DATABASE_URL are thrown
 * straight back to the caller, so a genuine problem is still surfaced instead
 * of being papered over. It also never fabricates data — it either returns the
 * real row or it throws.
 */

/**
 * Driver / OS error codes meaning "the connection went away", plus the
 * Postgres SQLSTATE class 08 (connection exception) and the shutdown states.
 */
const TRANSIENT_CODES = new Set<string>([
  // node/net + DNS
  "ECONNRESET",
  "ECONNREFUSED",
  "ECONNABORTED",
  "ETIMEDOUT",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "ENETDOWN",
  "ENOTFOUND",
  "EAI_AGAIN",
  // Postgres class 08 — connection exception
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "08P01",
  // server went away / not accepting connections right now
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
  "53300", // too_many_connections
]);

/**
 * Message fragments for the transient failures that arrive with no `code` —
 * most importantly `pg`'s "Connection terminated unexpectedly", which is the
 * error actually observed in production.
 */
const TRANSIENT_MESSAGE_FRAGMENTS = [
  "connection terminated unexpectedly",
  "connection terminated",
  "server closed the connection unexpectedly",
  "this socket has been ended by the other party",
  "this socket is closed",
  "socket hang up",
  "timeout expired when trying to connect",
  "timeout exceeded when trying to connect",
  "connection closed unexpectedly",
  "connection reset",
  "connection refused",
  "connection ended",
  "terminated by the server",
  "client has already been released",
  "network error",
  "other side closed",
];

type ErrorLike = {
  code?: unknown;
  message?: unknown;
  cause?: unknown;
};

/**
 * True when `error` (or anything in its `cause` chain) is a connection-level
 * failure worth one retry.
 *
 * Drizzle rethrows as `Failed query: …` with the driver error attached as
 * `cause`, so the chain has to be walked — matching on the outer message alone
 * would classify every transient failure as permanent.
 */
export function isTransientDbError(error: unknown): boolean {
  let current: unknown = error;

  // Bounded walk: `cause` chains are short, but never loop forever.
  for (let depth = 0; current && depth < 8; depth += 1) {
    const candidate = current as ErrorLike;

    const code = typeof candidate.code === "string" ? candidate.code : undefined;
    if (code && TRANSIENT_CODES.has(code)) return true;

    const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
    if (message && TRANSIENT_MESSAGE_FRAGMENTS.some((fragment) => message.includes(fragment))) {
      return true;
    }

    current = candidate.cause;
  }

  return false;
}

export type DbRetryOptions = {
  /** How many extra attempts are allowed. One is enough for a stale socket. */
  retries?: number;
  /** Pause before retrying, so a momentarily saturated pool can recover. */
  delayMs?: number;
  /** Read-only label used in the warning log. Never contains data or secrets. */
  label?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `operation`, retrying once when it fails with a transient connection
 * error. Anything else — and a second transient failure — is rethrown
 * untouched so the caller still sees the real error.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options: DbRetryOptions = {},
): Promise<T> {
  const { retries = 1, delayMs = 120, label = "database read" } = options;

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !isTransientDbError(error)) throw error;
      // Deliberately terse: no query text, no parameters, no connection string.
      console.warn(
        `[db-retry] transient connection failure during ${label}; retrying (${attempt + 1}/${retries})`,
      );
      if (delayMs > 0) await sleep(delayMs);
    }
  }
}
