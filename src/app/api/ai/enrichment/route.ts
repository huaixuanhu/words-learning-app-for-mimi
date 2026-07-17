import type { NextRequest } from "next/server";
import { validatePublicAiEnrichmentRequest } from "@/lib/ai-enrichment/contract";
import { handleStage7b1AiPost } from "@/lib/ai-enrichment/route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return handleStage7b1AiPost(request, validatePublicAiEnrichmentRequest);
}
