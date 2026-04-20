/**
 * Lightweight in-memory stale-while-revalidate cache.
 * Lives at module scope so it survives page navigations in the same tab.
 * TTL default: 60 seconds (data is still refreshed in the background).
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const store = new Map<string, CacheEntry<unknown>>()
const DEFAULT_TTL_MS = 60_000

export function getCached<T>(key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttlMs) {
    store.delete(key)
    return null
  }
  return entry.data
}

export function setCached<T>(key: string, data: T): void {
  store.set(key, { data, timestamp: Date.now() })
}

export function invalidateCache(...keys: string[]): void {
  keys.forEach(k => store.delete(k))
}

export function invalidateCachePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k)
  }
}
