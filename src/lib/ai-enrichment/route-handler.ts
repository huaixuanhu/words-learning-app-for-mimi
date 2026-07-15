import { NextResponse } from "next/server";
import { requireProductionBasicAuth } from "@/lib/security/production-basic-auth";
import { parseStrictSameOriginJson, AiRouteRequestError } from "./request-guard";
import { aiRestingMessage, resolveAiRuntimeHealth } from "./runtime-config";

type RequestValidator<T> = (value: unknown) => T;

function jsonResponse(value: unknown, status: number) {
  return NextResponse.json(value, {
    status,
    headers: { "cache-control": "no-store", vary: "Authorization, Origin" },
  });
}

export async function handleStage7aAiPost<T>(
  request: Request,
  validateRequest: RequestValidator<T>,
) {
  const authResponse = requireProductionBasicAuth(request);
  if (authResponse) {
    return authResponse;
  }

  try {
    const publicBody = await parseStrictSameOriginJson(request);
    validateRequest(publicBody);

    const health = resolveAiRuntimeHealth(process.env, new Date());
    if (health.availability.status === "resting") {
      return jsonResponse(
        {
          ok: false,
          status: "resting",
          reason: health.availability.reason,
          message: aiRestingMessage(health.availability.reason),
        },
        503,
      );
    }

    // Stage 7A deliberately exposes no server path that can submit a provider call.
    // Stage 7B must remove this closed gate only after its separate approval and smoke test.
    return jsonResponse(
      {
        ok: false,
        status: "resting",
        reason: "fixture_only",
        message: aiRestingMessage("fixture_only"),
      },
      503,
    );
  } catch (error) {
    if (error instanceof AiRouteRequestError) {
      return jsonResponse(
        { ok: false, status: "rejected", reason: error.code, message: error.message },
        error.status,
      );
    }

    return jsonResponse(
      {
        ok: false,
        status: "rejected",
        reason: "request_contract_invalid",
        message: "This AI request does not match the current app.",
      },
      400,
    );
  }
}

