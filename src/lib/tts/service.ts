import { countUnicodeCharacters, type PublicTtsRequest } from "./contract";
import { buildTtsCacheKey, sha256Text } from "./cache-key";
import type { TtsAccounting, TtsReservationHandle } from "./accounting";
import type { TtsCache, TtsCacheEntry } from "./cache";
import {
  TTS_MAX_AUDIO_BYTES,
  TTS_PROVIDER_TIMEOUT_MS,
  TtsProviderError,
  validateTtsProviderResult,
  type TtsProvider,
} from "./provider";

export type TtsServiceResult = Readonly<{
  audio: Uint8Array;
  contentType: "audio/mpeg";
  source: TtsProvider["source"];
  cacheStatus: "hit" | "miss" | "coalesced";
  cacheDigest: string;
  voiceContractId: string;
}>;

export class TtsServiceError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message = "Voice unavailable · Try again") {
    super(message);
    this.name = "TtsServiceError";
    this.code = code;
    this.status = status;
  }
}

type FreshResult = Omit<TtsServiceResult, "cacheStatus">;

function decodeCacheEntry(entry: TtsCacheEntry, expectedVoiceContractId: string) {
  if (entry.voiceContractId !== expectedVoiceContractId) return null;
  const audio = Uint8Array.from(Buffer.from(entry.audioBase64, "base64"));
  if (!audio.byteLength || audio.byteLength > TTS_MAX_AUDIO_BYTES) return null;
  return audio;
}

function terminalCategory(error: unknown) {
  if (error instanceof TtsProviderError) return error.category;
  if (error instanceof DOMException && error.name === "TimeoutError") return "provider_timeout";
  return "provider_failed";
}

async function settleFailure(
  accounting: TtsAccounting,
  handle: TtsReservationHandle,
  startedAt: number,
  error: unknown,
  now: () => Date,
) {
  await accounting.settle(handle, {
    outcome: "failed",
    terminalCategory: terminalCategory(error),
    latencyMs: Math.max(0, Math.round(Date.now() - startedAt)),
    completedAt: now().toISOString(),
  });
}

export class TtsService {
  private readonly inFlight = new Map<string, Promise<FreshResult>>();

  constructor(
    private readonly dependencies: Readonly<{
      executionScope: string;
      provider: TtsProvider;
      cache: TtsCache;
      accounting: TtsAccounting;
      now?: () => Date;
      timeoutMs?: number;
    }>,
  ) {}

  async synthesize(request: PublicTtsRequest): Promise<TtsServiceResult> {
    const cacheDigest = buildTtsCacheKey(request.text, this.dependencies.provider.voice);
    try {
      const cached = await this.dependencies.cache.get(cacheDigest);
      if (cached) {
        const audio = decodeCacheEntry(cached, this.dependencies.provider.voice.id);
        if (audio) {
          return {
            audio,
            contentType: "audio/mpeg",
            source: this.dependencies.provider.source,
            cacheStatus: "hit",
            cacheDigest,
            voiceContractId: this.dependencies.provider.voice.id,
          };
        }
      }
    } catch {
      // Runtime Cache is ephemeral. A miss still passes through atomic accounting.
    }

    const existing = this.inFlight.get(cacheDigest);
    if (existing) {
      const shared = await existing;
      return { ...shared, cacheStatus: "coalesced" };
    }

    const task = this.synthesizeFresh(request, cacheDigest);
    this.inFlight.set(cacheDigest, task);
    try {
      const fresh = await task;
      return { ...fresh, cacheStatus: "miss" };
    } finally {
      if (this.inFlight.get(cacheDigest) === task) this.inFlight.delete(cacheDigest);
    }
  }

  private async synthesizeFresh(
    request: PublicTtsRequest,
    cacheDigest: string,
  ): Promise<FreshResult> {
    const now = this.dependencies.now ?? (() => new Date());
    const reservation = await this.dependencies.accounting.reserve({
      executionScope: this.dependencies.executionScope,
      requestIdHash: sha256Text(request.requestId),
      cacheKeyHash: cacheDigest,
      voiceContractId: this.dependencies.provider.voice.id,
      characterCount: countUnicodeCharacters(request.text),
      now: now().toISOString(),
    });
    if (reservation.status === "blocked") {
      const status = reservation.reasons.includes("concurrency_limit") ? 503 : 429;
      throw new TtsServiceError("tts_budget_closed", status);
    }
    if (reservation.status === "replay") {
      throw new TtsServiceError("request_replayed", 409, "Please try the voice button again.");
    }

    const startedAt = Date.now();
    const controller = new AbortController();
    const timeoutMs = this.dependencies.timeoutMs ?? TTS_PROVIDER_TIMEOUT_MS;
    const timeout = setTimeout(
      () => controller.abort(new DOMException("Voice request timed out", "TimeoutError")),
      timeoutMs,
    );
    try {
      const providerResult = validateTtsProviderResult(
        await this.dependencies.provider.synthesize({
          normalizedText: request.text,
          signal: controller.signal,
        }),
      );
      await this.dependencies.accounting.settle(reservation.handle, {
        outcome: "succeeded",
        terminalCategory: null,
        latencyMs: Math.max(0, Math.round(Date.now() - startedAt)),
        completedAt: now().toISOString(),
      });
      try {
        await this.dependencies.cache.set(cacheDigest, {
          audioBase64: Buffer.from(providerResult.audio).toString("base64"),
          contentType: providerResult.contentType,
          voiceContractId: this.dependencies.provider.voice.id,
          createdAt: now().toISOString(),
        });
      } catch {
        // The audio remains valid; a later request may synthesize again under the ledger.
      }
      return {
        audio: providerResult.audio,
        contentType: providerResult.contentType,
        source: this.dependencies.provider.source,
        cacheDigest,
        voiceContractId: this.dependencies.provider.voice.id,
      };
    } catch (error) {
      await settleFailure(
        this.dependencies.accounting,
        reservation.handle,
        startedAt,
        error,
        now,
      ).catch(() => undefined);
      throw error instanceof TtsServiceError
        ? error
        : new TtsServiceError("provider_unavailable", 503);
    } finally {
      clearTimeout(timeout);
    }
  }
}
