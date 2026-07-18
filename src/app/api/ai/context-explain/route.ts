import type { NextRequest } from "next/server";
import { validatePublicAiContextExplainRequest } from "@/lib/ai-enrichment/context-contract";
import { runPostgresFormalContextRoute } from "@/lib/ai-enrichment/formal-route-runners";
import { handleStage7b1AiPost } from "@/lib/ai-enrichment/route-handler";
import { canRunStage7b2FormalRoute } from "@/lib/ai-enrichment/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return handleStage7b1AiPost(
    request,
    validatePublicAiContextExplainRequest,
    canRunStage7b2FormalRoute(request)
      ? runPostgresFormalContextRoute
      : undefined,
  );
}
