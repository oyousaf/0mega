type CacheEntry<T = unknown> = {
  value: T;
  expiry: number;
};

const cache = new Map<string, CacheEntry>();

/**
 * Retrieve a cached value if it hasn’t expired.
 */
export function getCached<T extends object>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // expired → delete + miss
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }

  return entry.value as T;
}

/**
 * Store a cached value with a TTL.
 */
export function setCached<T>(key: string, value: T, ttlMs: number = 2000) {
  cache.set(key, {
    value,
    expiry: Date.now() + ttlMs,
  });
}
