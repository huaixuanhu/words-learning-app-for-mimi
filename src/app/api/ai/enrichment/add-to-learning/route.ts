import type { NextRequest } from "next/server";
import { validatePublicAiCandidateAdd } from "@/lib/ai-enrichment/formal-action-contract";
import { handleStage7b1AiMutationPost } from "@/lib/ai-enrichment/route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return handleStage7b1AiMutationPost(request, validatePublicAiCandidateAdd);
}
