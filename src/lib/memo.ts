/**
 * Small in-memory cache for the national-layer reads that every page repeats (the directory
 * of 774 councils, the allocation periods, one month's allocations). These change when a
 * council approves a record or a month is imported, which is rare, so a few minutes of
 * staleness is fine and saves five or six database round trips per page view.
 *
 * Per process (per Worker isolate on Cloudflare, per function instance on Vercel). A stale
 * entry is served while a fresh one is computed, and concurrent callers share one computation.
 * ASKLGA_CACHE_MS=0 turns it off (tests, the eval harness, a workspace session).
 */
const TTL_DEFAULT = Number(process.env.ASKLGA_CACHE_MS ?? 5 * 60 * 1000);

type Entry = { value: unknown; at: number; pending?: Promise<unknown> };
const store = new Map<string, Entry>();

export async function memo<T>(key: string, fn: () => Promise<T>, ttlMs = TTL_DEFAULT): Promise<T> {
  if (!(ttlMs > 0)) return fn();
  const now = Date.now();
  const e = store.get(key);
  if (e && now - e.at < ttlMs) return e.value as T;
  if (e?.pending) return (e.value !== undefined ? e.value : e.pending) as T;
  const pending = fn().then(
    (value) => {
      store.set(key, { value, at: Date.now() });
      return value;
    },
    (err) => {
      store.delete(key);
      throw err;
    },
  );
  if (e) e.pending = pending;
  else store.set(key, { value: undefined, at: 0, pending });
  // A stale value is better than a wait; a missing one has to wait.
  return (e && e.value !== undefined ? e.value : await pending) as T;
}

/** Drops cached entries, all of them or those whose key starts with `prefix`. */
export function forget(prefix?: string) {
  if (!prefix) return store.clear();
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
