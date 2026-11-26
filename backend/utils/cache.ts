/**
 * Server-side TTL Cache with tag-based invalidation for public catalog endpoints
 * (job listings, public company profiles, categories, home stats).
 * Private candidate/application/resume data is NEVER cached here.
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

class PublicDataCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds = 45, tags: string[] = []): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
      tags,
    });
  }

  invalidateTag(tag: string): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.tags.includes(tag)) {
        this.store.delete(key);
      }
    }
  }

  clearAll(): void {
    this.store.clear();
  }
}

export const publicCache = new PublicDataCache();
