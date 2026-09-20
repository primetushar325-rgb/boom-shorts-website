/**
 * TCP fault-injection proxy for the database connection.
 *
 *   node scripts/db-fault-proxy.mjs            # 6432 -> 5432, control on 6433
 *
 * Point the app at it instead of Postgres directly:
 *
 *   DATABASE_URL=postgresql://user:pass@127.0.0.1:6432/postgres npm run start
 *
 * Then drive it from `npm run test:checkout` (or by hand):
 *
 *   curl -X POST localhost:6433/stale   # kill the pooled sockets, DB stays up
 *   curl -X POST localhost:6433/fail    # kill them AND refuse new connections
 *   curl -X POST localhost:6433/heal    # back to normal
 *   curl         localhost:6433/state
 *
 * WHY IT EXISTS
 * -------------
 * The production "Something went wrong" on Order Now -> /checkout/[id] was a
 * *transient* connection failure: Vercel freezes a serverless function between
 * requests, the Supabase pooler drops its idle sockets, and on thaw the `pg`
 * Pool hands out a socket that is already dead. The first query fails with
 * `Connection terminated unexpectedly`; the next one, on a fresh connection,
 * succeeds.
 *
 * That cannot be reproduced by pointing the app at a healthy database, and it
 * cannot be reproduced by mocking Drizzle either — it is a socket-level race.
 * `/stale` reproduces it exactly: the pooled connections die, the database
 * itself is still reachable, so a single retry must recover.
 *
 * This tool never touches application code or data.
 */
import net from "node:net";
import http from "node:http";

const LISTEN_PORT = Number(process.env.PROXY_PORT || 6432);
const CONTROL_PORT = Number(process.env.CONTROL_PORT || 6433);
const UPSTREAM_HOST = process.env.UPSTREAM_HOST || "127.0.0.1";
const UPSTREAM_PORT = Number(process.env.UPSTREAM_PORT || 5432);

let failing = false;
let killedSockets = 0;
const live = new Set();

function killAll() {
  const n = live.size;
  for (const { client, upstream } of [...live]) {
    killedSockets += 1;
    client.destroy();
    upstream.destroy();
  }
  live.clear();
  return n;
}

const server = net.createServer((client) => {
  // A destroyed socket emits 'error'; without this the proxy itself would die.
  client.on("error", () => {});

  if (failing) {
    killedSockets += 1;
    client.destroy();
    return;
  }

  const upstream = net.createConnection({ host: UPSTREAM_HOST, port: UPSTREAM_PORT });
  upstream.on("error", () => {});

  const pair = { client, upstream };
  live.add(pair);

  const cleanup = () => {
    live.delete(pair);
    client.destroy();
    upstream.destroy();
  };

  client.on("data", (chunk) => {
    if (failing) return cleanup();
    upstream.write(chunk);
  });
  upstream.on("data", (chunk) => {
    if (failing) return cleanup();
    client.write(chunk);
  });
  client.on("close", cleanup);
  upstream.on("close", cleanup);
});

server.listen(LISTEN_PORT, "127.0.0.1", () => {
  console.log(
    `PROXY_READY 127.0.0.1:${LISTEN_PORT} -> ${UPSTREAM_HOST}:${UPSTREAM_PORT} (control: http://127.0.0.1:${CONTROL_PORT})`,
  );
});

http
  .createServer((req, res) => {
    const send = (payload) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(payload));
    };

    if (req.method === "POST" && req.url === "/stale") {
      failing = false;
      return send({ mode: "stale", killedNow: killAll(), killedSockets, failing });
    }
    if (req.method === "POST" && req.url === "/fail") {
      failing = true;
      return send({ mode: "outage", killedNow: killAll(), killedSockets, failing });
    }
    if (req.method === "POST" && req.url === "/heal") {
      failing = false;
      return send({ mode: "healthy", killedSockets, failing });
    }
    return send({ failing, liveSockets: live.size, killedSockets });
  })
  .listen(CONTROL_PORT, "127.0.0.1", () => {
    console.log(`CONTROL_READY http://127.0.0.1:${CONTROL_PORT}/state`);
  });
