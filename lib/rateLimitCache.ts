type CacheEntry = {
  value: any;
  expiry: number;
};

const cache = new Map<string, CacheEntry>();

/**
 * Retrieve a cached value if it hasn’t expired.
 */
export function getCached(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;

  // expired → delete + miss
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

/**
 * Store a cached value with a TTL.
 */
export function setCached(key: string, value: any, ttlMs: number = 2000) {
  cache.set(key, {
    value,
    expiry: Date.now() + ttlMs,
  });
}
