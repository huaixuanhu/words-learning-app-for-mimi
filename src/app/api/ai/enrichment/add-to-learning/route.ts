import type { NextRequest } from "next/server";
import { validatePublicAiCandidateAdd } from "@/lib/ai-enrichment/formal-action-contract";
import { runPostgresFormalCandidateAdd } from "@/lib/ai-enrichment/formal-route-runners";
import { handleStage7b1AiMutationPost } from "@/lib/ai-enrichment/route-handler";
import { canRunStage7b2FormalRoute } from "@/lib/ai-enrichment/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return handleStage7b1AiMutationPost(
    request,
    validatePublicAiCandidateAdd,
    canRunStage7b2FormalRoute(request)
      ? runPostgresFormalCandidateAdd
      : undefined,
  );
}
