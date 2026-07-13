// Dead-simple in-memory TTL cache. Lives for the process lifetime only.
// Keeps repeated tool calls (same cite) from re-hitting leg.wa.gov.

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

export async function withCache<T>(
  key: string,
  ttlMs: number,
  produce: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expires > now) return hit.value;
  const value = await produce();
  store.set(key, { value, expires: now + ttlMs });
  return value;
}

export function clearCache(): void {
  store.clear();
}
