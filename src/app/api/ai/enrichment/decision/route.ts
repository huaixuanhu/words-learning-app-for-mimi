import type { NextRequest } from "next/server";
import { validatePublicAiDraftDecision } from "@/lib/ai-enrichment/formal-action-contract";
import { runPostgresFormalDraftDecision } from "@/lib/ai-enrichment/formal-route-runners";
import { handleStage7b1AiMutationPost } from "@/lib/ai-enrichment/route-handler";
import { canRunFormalAiRoute } from "@/lib/ai-enrichment/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return handleStage7b1AiMutationPost(
    request,
    validatePublicAiDraftDecision,
    canRunFormalAiRoute(request)
      ? runPostgresFormalDraftDecision
      : undefined,
  );
}
