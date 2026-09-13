import { handleTtsPost } from "@/lib/tts/route-handler";
import { createTtsServiceResolver } from "./service-resolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resolveTtsService = createTtsServiceResolver();

export async function POST(request: Request) {
  return handleTtsPost(request, resolveTtsService);
}
