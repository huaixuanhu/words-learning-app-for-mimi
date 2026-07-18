import type { NextRequest } from "next/server";
import { validatePublicAiEnrichmentRequest } from "@/lib/ai-enrichment/contract";
import { runPostgresFormalEnrichmentRoute } from "@/lib/ai-enrichment/formal-route-runners";
import { handleStage7b1AiPost } from "@/lib/ai-enrichment/route-handler";
import { canRunStage7b2FormalRoute } from "@/lib/ai-enrichment/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return handleStage7b1AiPost(
    request,
    validatePublicAiEnrichmentRequest,
    canRunStage7b2FormalRoute(request)
      ? runPostgresFormalEnrichmentRoute
      : undefined,
  );
}
