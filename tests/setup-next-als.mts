/**
 * Preloaded before the test entry point (via `tsx --import`).
 *
 * Next's `async-local-storage.js` snapshots `globalThis.AsyncLocalStorage` at
 * module-load time and falls back to a stub that throws on `run()`. Node does
 * not put AsyncLocalStorage on globalThis — it lives in `node:async_hooks` —
 * and every `import` in the test file is hoisted above any top-level
 * assignment. So this has to be a separate module loaded first, otherwise
 * `cookies()` throws "called outside a request scope" and any page that reads
 * the customer session is untestable outside `next start`.
 */
import { AsyncLocalStorage } from "node:async_hooks";

(globalThis as unknown as { AsyncLocalStorage?: unknown }).AsyncLocalStorage = AsyncLocalStorage;
