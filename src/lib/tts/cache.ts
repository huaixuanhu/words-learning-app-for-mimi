import type { RuntimeCache } from "@vercel/functions";

export const TTS_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
export const TTS_CACHE_NAMESPACE = "mimi-tts-v1";

export type TtsCacheEntry = Readonly<{
  audioBase64: string;
  contentType: "audio/mpeg";
  voiceContractId: string;
  createdAt: string;
}>;

export type TtsCache = Readonly<{
  get: (digest: string) => Promise<TtsCacheEntry | null>;
  set: (digest: string, value: TtsCacheEntry) => Promise<void>;
}>;

function isCacheEntry(value: unknown): value is TtsCacheEntry {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.audioBase64 === "string" &&
    Boolean(row.audioBase64) &&
    row.contentType === "audio/mpeg" &&
    typeof row.voiceContractId === "string" &&
    Boolean(row.voiceContractId) &&
    typeof row.createdAt === "string" &&
    Number.isFinite(Date.parse(row.createdAt))
  );
}

export class MemoryTtsCache implements TtsCache {
  private readonly values = new Map<string, TtsCacheEntry>();

  async get(digest: string) {
    return this.values.get(digest) ?? null;
  }

  async set(digest: string, value: TtsCacheEntry) {
    this.values.set(digest, value);
  }
}

export function createRuntimeTtsCache(
  runtimeCacheFactory?: () => RuntimeCache,
): TtsCache {
  let runtimeCache: RuntimeCache | null = null;
  const resolveCache = async () => {
    if (runtimeCache) return runtimeCache;
    if (runtimeCacheFactory) {
      runtimeCache = runtimeCacheFactory();
      return runtimeCache;
    }
    const { getCache } = await import("@vercel/functions");
    runtimeCache = getCache({ namespace: TTS_CACHE_NAMESPACE });
    return runtimeCache;
  };

  return {
    async get(digest) {
      const value = await (await resolveCache()).get(digest);
      return isCacheEntry(value) ? value : null;
    },
    async set(digest, value) {
      await (await resolveCache()).set(digest, value, {
        name: "",
        tags: [TTS_CACHE_NAMESPACE],
        ttl: TTS_CACHE_TTL_SECONDS,
      });
    },
  };
}
