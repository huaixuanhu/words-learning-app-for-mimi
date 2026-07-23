import { InMemoryTtsAccounting } from "@/lib/tts/accounting";
import { createRuntimeTtsCache, MemoryTtsCache } from "@/lib/tts/cache";
import {
  createGoogleCloudTtsProvider,
  createVercelWifAccessTokenResolver,
} from "@/lib/tts/google-cloud-provider";
import { localFixtureTtsProvider } from "@/lib/tts/local-fixture-provider";
import { createPostgresTtsAccounting } from "@/lib/tts/postgres-accounting";
import { handleTtsPost } from "@/lib/tts/route-handler";
import {
  resolveTtsRuntimeConfig,
  type TtsVercelWifIdentity,
  type TtsRuntimeConfig,
} from "@/lib/tts/runtime-config";
import { TtsService } from "@/lib/tts/service";
import type { TtsAccounting } from "@/lib/tts/accounting";
import type { TtsCache } from "@/lib/tts/cache";
import type { TtsProvider } from "@/lib/tts/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteDependencies = Readonly<{
  resolveConfig: (requestUrl: string) => TtsRuntimeConfig;
  createLocalFixtureProvider: () => TtsProvider;
  createLocalGoogleProvider: () => TtsProvider;
  createVercelWifGoogleProvider: (identity: TtsVercelWifIdentity) => TtsProvider;
  createMemoryCache: () => TtsCache;
  createRuntimeCache: () => TtsCache;
  createMemoryAccounting: () => TtsAccounting;
  createPostgresAccounting: () => TtsAccounting;
}>;

const defaultDependencies: RouteDependencies = {
  resolveConfig: resolveTtsRuntimeConfig,
  createLocalFixtureProvider: () => localFixtureTtsProvider,
  createLocalGoogleProvider: () => createGoogleCloudTtsProvider(),
  createVercelWifGoogleProvider: (identity) =>
    createGoogleCloudTtsProvider({
      resolveAuthorization: createVercelWifAccessTokenResolver(identity),
    }),
  createMemoryCache: () => new MemoryTtsCache(),
  createRuntimeCache: () => createRuntimeTtsCache(),
  createMemoryAccounting: () => new InMemoryTtsAccounting(),
  createPostgresAccounting: () => createPostgresTtsAccounting(),
};

export function createTtsServiceResolver(
  dependencies: RouteDependencies = defaultDependencies,
) {
  let localFixtureService: TtsService | null = null;
  let localGoogleService: TtsService | null = null;
  let vercelWifGoogleService: TtsService | null = null;
  return (request: Request) => {
    const config = dependencies.resolveConfig(request.url);
    if (config.status !== "available") return null;
    if (config.provider === "local-fixture") {
      if (!localFixtureService) {
        localFixtureService = new TtsService({
          executionScope: config.executionScope,
          provider: dependencies.createLocalFixtureProvider(),
          cache: dependencies.createMemoryCache(),
          accounting: dependencies.createMemoryAccounting(),
        });
      }
      return localFixtureService;
    }
    if (config.credentialMode === "vercel-wif") {
      if (!vercelWifGoogleService) {
        vercelWifGoogleService = new TtsService({
          executionScope: config.executionScope,
          provider: dependencies.createVercelWifGoogleProvider(config.identity),
          cache: dependencies.createRuntimeCache(),
          accounting: dependencies.createPostgresAccounting(),
        });
      }
      return vercelWifGoogleService;
    }
    if (!localGoogleService) {
      localGoogleService = new TtsService({
        executionScope: config.executionScope,
        provider: dependencies.createLocalGoogleProvider(),
        cache: dependencies.createMemoryCache(),
        accounting: dependencies.createMemoryAccounting(),
      });
    }
    return localGoogleService;
  };
}

const resolveTtsService = createTtsServiceResolver();

export async function POST(request: Request) {
  return handleTtsPost(request, resolveTtsService);
}
