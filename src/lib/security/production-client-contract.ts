import { NextResponse } from "next/server";
import { resolveProductionCutoverMode } from "./production-cutover-mode";
import {
  V2_CLIENT_CONTRACT_HEADER,
  V2_CLIENT_CONTRACT_VERSION,
} from "./v2-client-contract";

type ClientContractRequest = Pick<Request, "headers" | "method">;
type ClientContractEnvironment = Readonly<Record<string, string | undefined>>;

const READ_ONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function requireV2ProductionClientContract(
  request: ClientContractRequest,
  env: ClientContractEnvironment = process.env,
) {
  if (
    env.VERCEL_ENV !== "production" ||
    READ_ONLY_METHODS.has(request.method.toUpperCase())
  ) {
    return null;
  }

  if (resolveProductionCutoverMode(env) !== "live") {
    return NextResponse.json(
      {
        ok: false,
        reason: "write-window-active",
        message: "A short update is in progress. Please try again soon.",
      },
      {
        status: 503,
        headers: {
          "cache-control": "no-store",
          "retry-after": "60",
        },
      },
    );
  }

  if (
    request.headers.get(V2_CLIENT_CONTRACT_HEADER) ===
    V2_CLIENT_CONTRACT_VERSION
  ) {
    return null;
  }

  return NextResponse.json(
    {
      ok: false,
      reason: "client-upgrade-required",
      message: "Please reload this page to continue.",
    },
    {
      status: 409,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
