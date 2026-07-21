import { InMemoryTtsAccounting } from "@/lib/tts/accounting";
import { MemoryTtsCache } from "@/lib/tts/cache";
import { createGoogleCloudTtsProvider } from "@/lib/tts/google-cloud-provider";
import { localFixtureTtsProvider } from "@/lib/tts/local-fixture-provider";
import { handleTtsPost } from "@/lib/tts/route-handler";
import { resolveTtsRuntimeConfig } from "@/lib/tts/runtime-config";
import { TtsService } from "@/lib/tts/service";

let localFixtureService: TtsService | null = null;
let localGoogleService: TtsService | null = null;

function resolveLocalFixtureService(request: Request) {
  const config = resolveTtsRuntimeConfig(request.url);
  if (config.status !== "available") return null;
  if (config.provider === "google-cloud-standard") {
    if (!localGoogleService) {
      localGoogleService = new TtsService({
        executionScope: config.executionScope,
        provider: createGoogleCloudTtsProvider(),
        cache: new MemoryTtsCache(),
        accounting: new InMemoryTtsAccounting(),
      });
    }
    return localGoogleService;
  }
  if (!localFixtureService) {
    localFixtureService = new TtsService({
      executionScope: config.executionScope,
      provider: localFixtureTtsProvider,
      cache: new MemoryTtsCache(),
      accounting: new InMemoryTtsAccounting(),
    });
  }
  return localFixtureService;
}

export async function POST(request: Request) {
  return handleTtsPost(request, resolveLocalFixtureService);
}
