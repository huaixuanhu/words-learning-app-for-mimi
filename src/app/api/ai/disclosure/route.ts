import type { NextRequest } from "next/server";
import { validatePublicAiDisclosureConfirmationRequest } from "@/lib/ai-enrichment/contract";
import { handleStage7b1DisclosurePost } from "@/lib/ai-enrichment/route-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return handleStage7b1DisclosurePost(
    request,
    validatePublicAiDisclosureConfirmationRequest,
  );
}
