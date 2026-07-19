import type { NextRequest } from "next/server";
import { validatePublicAiEnrichmentRequest } from "@/lib/ai-enrichment/contract";
import { runPostgresFormalEnrichmentRoute } from "@/lib/ai-enrichment/formal-route-runners";
import { handleStage7b1AiPost } from "@/lib/ai-enrichment/route-handler";
import { canRunFormalAiRoute } from "@/lib/ai-enrichment/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return handleStage7b1AiPost(
    request,
    validatePublicAiEnrichmentRequest,
    canRunFormalAiRoute(request)
      ? runPostgresFormalEnrichmentRoute
      : undefined,
  );
}
