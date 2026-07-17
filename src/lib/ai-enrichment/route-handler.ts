import { NextResponse } from "next/server";
import { requireProductionBasicAuth } from "@/lib/security/production-basic-auth";
import { parseStrictSameOriginJson, AiRouteRequestError } from "./request-guard";
import { aiRestingMessage } from "./runtime-config";
import {
  aiDisclosureSessionCookie,
  createAiDisclosureSessionToken,
  hashAiDisclosureSessionToken,
  readAiDisclosureSessionToken,
} from "./disclosure-session";
import { currentAiDisclosureDigest } from "./canonical-hash";
import type { PublicAiDisclosureConfirmationRequest } from "./types";

type RequestValidator<T> = (value: unknown) => T;

function jsonResponse(value: unknown, status: number) {
  return NextResponse.json(value, {
    status,
    headers: { "cache-control": "no-store", vary: "Authorization, Origin" },
  });
}

export async function handleStage7b1AiPost<T>(
  request: Request,
  validateRequest: RequestValidator<T>,
  runFormalRequest?: (input: Readonly<{
    request: T;
    sessionTokenHash: string;
  }>) => Promise<Readonly<{
    body: unknown;
    status: number;
  }>>,
) {
  const authResponse = requireProductionBasicAuth(request);
  if (authResponse) {
    return authResponse;
  }

  try {
    const publicBody = validateRequest(await parseStrictSameOriginJson(request));

    // V2-7B-1 deliberately keeps the real runtime unreachable. Only focused
    // tests inject a closed fake orchestration here. V2-7B-2 must change the
    // actual Route Handler wiring after separate human approval.
    if (!runFormalRequest) {
      return jsonResponse(
        {
          ok: false,
          status: "resting",
          reason: "provider_activation_pending",
          message: aiRestingMessage("provider_activation_pending"),
        },
        503,
      );
    }
    const token = readAiDisclosureSessionToken(request.headers.get("cookie"));
    if (!token) {
      return jsonResponse(
        {
          ok: false,
          status: "rejected",
          reason: "disclosure_required",
          message: "Please review the AI data notice before continuing.",
        },
        428,
      );
    }
    const result = await runFormalRequest({
      request: publicBody as T,
      sessionTokenHash: hashAiDisclosureSessionToken(token),
    });
    return jsonResponse(result.body, result.status);
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

export async function handleStage7b1DisclosurePost(
  request: Request,
  validateRequest: RequestValidator<PublicAiDisclosureConfirmationRequest>,
  confirmDisclosure?: (input: Readonly<{
    request: PublicAiDisclosureConfirmationRequest;
    sessionTokenHash: string;
    disclosureDigest: string;
    confirmedAt: string;
  }>) => Promise<void>,
) {
  const authResponse = requireProductionBasicAuth(request);
  if (authResponse) return authResponse;

  try {
    const publicBody = validateRequest(await parseStrictSameOriginJson(request));
    if (!confirmDisclosure) {
      return jsonResponse(
        {
          ok: false,
          status: "resting",
          reason: "provider_activation_pending",
          message: aiRestingMessage("provider_activation_pending"),
        },
        503,
      );
    }
    const existingToken = readAiDisclosureSessionToken(request.headers.get("cookie"));
    const token = existingToken ?? createAiDisclosureSessionToken();
    await confirmDisclosure({
      request: publicBody,
      sessionTokenHash: hashAiDisclosureSessionToken(token),
      disclosureDigest: currentAiDisclosureDigest(),
      confirmedAt: new Date().toISOString(),
    });
    const response = jsonResponse(
      {
        ok: true,
        status: "confirmed",
        disclosureVersion: publicBody.disclosureVersion,
      },
      200,
    );
    if (!existingToken) {
      response.headers.set(
        "set-cookie",
        aiDisclosureSessionCookie(token, process.env.VERCEL_ENV === "production"),
      );
    }
    return response;
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

export async function handleStage7b1AiMutationPost<T>(
  request: Request,
  validateRequest: RequestValidator<T>,
  runMutation?: (input: T) => Promise<unknown>,
) {
  const authResponse = requireProductionBasicAuth(request);
  if (authResponse) return authResponse;
  try {
    const body = validateRequest(await parseStrictSameOriginJson(request));
    if (!runMutation) {
      return jsonResponse(
        {
          ok: false,
          status: "resting",
          reason: "provider_activation_pending",
          message: aiRestingMessage("provider_activation_pending"),
        },
        503,
      );
    }
    return jsonResponse({ ok: true, result: await runMutation(body) }, 200);
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
        message: "This AI action does not match the current app.",
      },
      400,
    );
  }
}
