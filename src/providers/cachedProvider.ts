import type { Fixture } from "../types";
import { getCacheMeta, getCachedValue, setCachedValue, type CacheMeta } from "../cache/indexedDbCache";
import type { SportsDataProvider } from "./sportsDataProvider";

export type CacheStatus = "hit" | "miss" | "write";

export interface CacheEvent extends CacheMeta {
  status: CacheStatus;
}

interface CachedProviderOptions {
  ttlMs: number;
  onCacheEvent?: (event: CacheEvent) => void;
}

export function createCachedSportsDataProvider(
  source: SportsDataProvider,
  options: CachedProviderOptions
): SportsDataProvider {
  return {
    async listFixtures() {
      return cached<Fixture[]>("fixtures:upcoming", options, () => source.listFixtures());
    },

    async getFixture(id: string) {
      return cached<Fixture | undefined>(`fixture:${id}`, options, () => source.getFixture(id));
    }
  };
}

export async function getProviderCacheMeta(key: string) {
  return getCacheMeta(key);
}

async function cached<T>(key: string, options: CachedProviderOptions, fetchFresh: () => Promise<T>) {
  const cachedRecord = await getCachedValue<T>(key);
  if (cachedRecord) {
    options.onCacheEvent?.({ key, status: "hit", savedAt: cachedRecord.savedAt, expiresAt: cachedRecord.expiresAt });
    return cachedRecord.value;
  }

  options.onCacheEvent?.({ key, status: "miss", savedAt: Date.now(), expiresAt: Date.now() });
  const freshValue = await fetchFresh();
  const writtenRecord = await setCachedValue(key, freshValue, options.ttlMs);

  if (writtenRecord) {
    options.onCacheEvent?.({
      key,
      status: "write",
      savedAt: writtenRecord.savedAt,
      expiresAt: writtenRecord.expiresAt
    });
  }

  return freshValue;
}
