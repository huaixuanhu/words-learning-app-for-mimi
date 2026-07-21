import { describe, expect, it, vi } from "vitest";
import { InMemoryTtsAccounting } from "@/lib/tts/accounting";
import { MemoryTtsCache } from "@/lib/tts/cache";
import {
  GOOGLE_STANDARD_VOICE_CONTRACT,
  LOCAL_FIXTURE_VOICE_CONTRACT,
  TTS_REQUEST_VERSION,
} from "@/lib/tts/contract";
import { handleTtsPost } from "@/lib/tts/route-handler";
import { TtsService } from "@/lib/tts/service";
import { createTtsServiceResolver } from "./route";

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3000/api/tts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

const body = {
  version: TTS_REQUEST_VERSION,
  requestId: "00000000-0000-4000-8000-000000000001",
  text: "adapt",
  purpose: "recognition",
};

describe("POST /api/tts", () => {
  it("rests without parsing provider credentials when no service is wired", async () => {
    const response = await handleTtsPost(request(body));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      status: "resting",
      reason: "voice_not_ready",
    });
  });

  it("returns MP3 bytes with privacy-safe source and Cache headers", async () => {
    const provider = {
      source: "local-fixture" as const,
      voice: LOCAL_FIXTURE_VOICE_CONTRACT,
      synthesize: vi.fn(async () => ({
        audio: Uint8Array.from([0xff, 0xfb, 0x90, 0x64]),
        contentType: "audio/mpeg" as const,
        providerRequestId: null,
      })),
    };
    const service = new TtsService({
      executionScope: "test",
      provider,
      cache: new MemoryTtsCache(),
      accounting: new InMemoryTtsAccounting(),
    });
    const response = await handleTtsPost(request(body), () => service);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
    expect(response.headers.get("x-mimi-tts-source")).toBe("local-fixture");
    expect(response.headers.get("x-mimi-tts-cache-digest")).toMatch(/^[a-f0-9]{64}$/u);
    expect(response.headers.get("x-mimi-tts-voice-contract")).toBe(
      LOCAL_FIXTURE_VOICE_CONTRACT.id,
    );
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      Buffer.from([0xff, 0xfb, 0x90, 0x64]),
    );
  });

  it("rejects cross-origin and extra client-selected provider fields", async () => {
    const crossOrigin = await handleTtsPost(
      request(body, { origin: "https://attacker.example" }),
    );
    expect(crossOrigin.status).toBe(403);
    const extra = await handleTtsPost(request({ ...body, voice: "free-choice" }));
    expect(extra.status).toBe(400);
  });

  it("wires protected Preview to WIF, Runtime Cache and Postgres accounting", () => {
    const provider = {
      source: "google-cloud-standard" as const,
      voice: GOOGLE_STANDARD_VOICE_CONTRACT,
      synthesize: vi.fn(),
    };
    const cache = new MemoryTtsCache();
    const accounting = new InMemoryTtsAccounting();
    const createPreviewGoogleProvider = vi.fn(() => provider);
    const createRuntimeCache = vi.fn(() => cache);
    const createPostgresAccounting = vi.fn(() => accounting);
    const resolver = createTtsServiceResolver({
      resolveConfig: () => ({
        status: "available",
        executionScope: "v2-8-2-3-preview",
        provider: "google-cloud-standard",
        projectId: "for-tts-502913",
        credentialMode: "vercel-wif",
        identity: {
          audience:
            "https://iam.googleapis.com/projects/123456789012/locations/global/" +
            "workloadIdentityPools/mimi-vercel-preview/providers/mimi-v2-preview",
          projectNumber: "123456789012",
          serviceAccountEmail:
            "mimi-tts-preview@for-tts-502913.iam.gserviceaccount.com",
          workloadIdentityPoolId: "mimi-vercel-preview",
          workloadIdentityProviderId: "mimi-v2-preview",
        },
      }),
      createLocalFixtureProvider: () => provider,
      createLocalGoogleProvider: () => provider,
      createPreviewGoogleProvider,
      createMemoryCache: () => cache,
      createRuntimeCache,
      createMemoryAccounting: () => accounting,
      createPostgresAccounting,
    });

    expect(resolver(request(body))).toBeInstanceOf(TtsService);
    expect(resolver(request(body))).toBeInstanceOf(TtsService);
    expect(createPreviewGoogleProvider).toHaveBeenCalledOnce();
    expect(createRuntimeCache).toHaveBeenCalledOnce();
    expect(createPostgresAccounting).toHaveBeenCalledOnce();
  });
});
