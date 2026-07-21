import { describe, expect, it, vi } from "vitest";
import { InMemoryTtsAccounting } from "./accounting";
import { MemoryTtsCache, type TtsCache } from "./cache";
import { LOCAL_FIXTURE_VOICE_CONTRACT, TTS_REQUEST_VERSION } from "./contract";
import type { TtsProvider } from "./provider";
import { TtsService } from "./service";

function request(id: string) {
  return {
    version: TTS_REQUEST_VERSION,
    requestId: id,
    text: "adapt",
    purpose: "recognition" as const,
  };
}

function provider(synthesize: TtsProvider["synthesize"]): TtsProvider {
  return {
    source: "local-fixture",
    voice: LOCAL_FIXTURE_VOICE_CONTRACT,
    synthesize,
  };
}

describe("TTS service", () => {
  it("checks Cache before accounting and provider submission", async () => {
    const cache = new MemoryTtsCache();
    const synthesize = vi.fn(async () => ({
      audio: Uint8Array.from([1, 2, 3]),
      contentType: "audio/mpeg" as const,
      providerRequestId: null,
    }));
    const accounting = new InMemoryTtsAccounting();
    const service = new TtsService({
      executionScope: "test",
      provider: provider(synthesize),
      cache,
      accounting,
    });
    const first = await service.synthesize(
      request("00000000-0000-4000-8000-000000000001"),
    );
    const second = await service.synthesize(
      request("00000000-0000-4000-8000-000000000002"),
    );
    expect(first.cacheStatus).toBe("miss");
    expect(second.cacheStatus).toBe("hit");
    expect(synthesize).toHaveBeenCalledOnce();
    expect(accounting.snapshot("test", new Date().toISOString()).day.attemptsReserved).toBe(1);
  });

  it("coalesces equal in-flight misses into one provider attempt", async () => {
    let release!: () => void;
    const wait = new Promise<void>((resolve) => { release = resolve; });
    const synthesize = vi.fn(async () => {
      await wait;
      return {
        audio: Uint8Array.from([1, 2, 3]),
        contentType: "audio/mpeg" as const,
        providerRequestId: null,
      };
    });
    const accounting = new InMemoryTtsAccounting();
    const service = new TtsService({
      executionScope: "test",
      provider: provider(synthesize),
      cache: new MemoryTtsCache(),
      accounting,
    });
    const first = service.synthesize(request("00000000-0000-4000-8000-000000000003"));
    const second = service.synthesize(request("00000000-0000-4000-8000-000000000004"));
    await vi.waitFor(() => expect(synthesize).toHaveBeenCalledOnce());
    release();
    expect((await first).cacheStatus).toBe("miss");
    expect((await second).cacheStatus).toBe("coalesced");
    expect(accounting.snapshot("test", new Date().toISOString()).day.attemptsReserved).toBe(1);
  });

  it("does not bypass accounting when Cache fails", async () => {
    const brokenCache: TtsCache = {
      get: async () => { throw new Error("cache unavailable"); },
      set: async () => { throw new Error("cache unavailable"); },
    };
    const accounting = new InMemoryTtsAccounting();
    const service = new TtsService({
      executionScope: "test",
      provider: provider(async () => ({
        audio: Uint8Array.from([1]),
        contentType: "audio/mpeg",
        providerRequestId: null,
      })),
      cache: brokenCache,
      accounting,
    });
    await expect(
      service.synthesize(request("00000000-0000-4000-8000-000000000005")),
    ).resolves.toMatchObject({ cacheStatus: "miss" });
    expect(accounting.snapshot("test", new Date().toISOString()).day.attemptsReserved).toBe(1);
  });
});

