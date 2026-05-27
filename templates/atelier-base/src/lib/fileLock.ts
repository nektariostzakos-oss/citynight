/**
 * Per-key async mutex. Serializes concurrent read-modify-write sequences
 * against the same file so two requests don't race (read-read-write-write
 * producing a lost write).
 *
 * Scope is in-process — fine for a single-instance deploy (our Hostinger
 * target). For multi-instance, swap for a DB transaction or a cross-process
 * lock.
 */

declare global {
  // eslint-disable-next-line no-var
  var __atelierFileLocks: Map<string, Promise<unknown>> | undefined;
}

const locks: Map<string, Promise<unknown>> =
  (globalThis.__atelierFileLocks ??= new Map<string, Promise<unknown>>());

export async function withFileLock<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  // Chain: wait for whatever's in flight, then run fn. Errors don't break
  // the chain — next waiter gets a clean slate.
  const next = prev.catch(() => undefined).then(fn);
  locks.set(key, next);
  try {
    return await next;
  } finally {
    // Clean up when we're the tail, so the map doesn't grow unbounded.
    if (locks.get(key) === next) locks.delete(key);
  }
}
