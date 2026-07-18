import type { NextRequest } from "next/server";
import { validatePublicAiDisclosureConfirmationRequest } from "@/lib/ai-enrichment/contract";
import { confirmPostgresFormalDisclosure } from "@/lib/ai-enrichment/formal-route-runners";
import { handleStage7b1DisclosurePost } from "@/lib/ai-enrichment/route-handler";
import { canRunStage7b2FormalRoute } from "@/lib/ai-enrichment/runtime-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: NextRequest) {
  return handleStage7b1DisclosurePost(
    request,
    validatePublicAiDisclosureConfirmationRequest,
    canRunStage7b2FormalRoute(request)
      ? confirmPostgresFormalDisclosure
      : undefined,
  );
}
