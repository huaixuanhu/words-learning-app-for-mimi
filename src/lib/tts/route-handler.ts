import { NextResponse } from "next/server";
import { requireProductionBasicAuth } from "@/lib/security/production-basic-auth";
import { parseStrictTtsJson } from "./request-guard";
import { TtsContractError, validatePublicTtsRequest } from "./contract";
import { TtsService, TtsServiceError } from "./service";
import { ttsRestingMessage } from "./runtime-config";

function jsonResponse(value: unknown, status: number) {
  return NextResponse.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      vary: "Authorization, Origin",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function handleTtsPost(
  request: Request,
  resolveService?: (request: Request) => TtsService | null,
) {
  const authResponse = requireProductionBasicAuth(request);
  if (authResponse) return authResponse;

  try {
    const body = validatePublicTtsRequest(await parseStrictTtsJson(request));
    const service = resolveService?.(request) ?? null;
    if (!service) {
      return jsonResponse(
        {
          ok: false,
          status: "resting",
          reason: "voice_not_ready",
          message: ttsRestingMessage(),
        },
        503,
      );
    }
    const result = await service.synthesize(body);
    return new NextResponse(Buffer.from(result.audio), {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "content-type": result.contentType,
        vary: "Authorization, Origin",
        "x-content-type-options": "nosniff",
        "x-mimi-tts-cache": result.cacheStatus,
        "x-mimi-tts-cache-digest": result.cacheDigest,
        "x-mimi-tts-request-id": body.requestId,
        "x-mimi-tts-source": result.source,
        "x-mimi-tts-voice-contract": result.voiceContractId,
      },
    });
  } catch (error) {
    if (error instanceof TtsContractError || error instanceof TtsServiceError) {
      return jsonResponse(
        {
          ok: false,
          status: "rejected",
          reason: error.code,
          message: error.message,
        },
        error.status,
      );
    }
    return jsonResponse(
      {
        ok: false,
        status: "rejected",
        reason: "voice_request_invalid",
        message: "Voice unavailable · Try again",
      },
      400,
    );
  }
}
