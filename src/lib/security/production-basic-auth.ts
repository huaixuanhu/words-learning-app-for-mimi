import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { resolveProductionCutoverMode } from "./production-cutover-mode";

type RequestWithHeaders = Pick<Request, "headers">;

type BasicAuthEnvironment = {
  [key: string]: string | undefined;
  MIMI_BASIC_AUTH_PASSWORD?: string;
  MIMI_BASIC_AUTH_USER?: string;
  MIMI_PRODUCTION_CUTOVER_MODE?: string;
  VERCEL_ENV?: string;
};

function secureEqual(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function parseBasicCredentials(authorization: string | null) {
  if (!authorization) {
    return null;
  }

  const [scheme, encoded, extra] = authorization.trim().split(/\s+/);

  if (scheme?.toLowerCase() !== "basic" || !encoded || extra) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      passphrase: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function accessGateResponse(status: 401 | 503) {
  const headers = new Headers({
    "cache-control": "no-store",
    vary: "Authorization",
  });

  if (status === 401) {
    headers.set("www-authenticate", 'Basic realm="Mimi Vocabulary", charset="UTF-8"');
  }

  return new NextResponse(null, { status, headers });
}

function maintenanceResponse() {
  return new NextResponse("A short update is in progress. Please try again soon.", {
    status: 503,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
      "retry-after": "60",
    },
  });
}

export function requireProductionBasicAuth(
  request: RequestWithHeaders,
  env: BasicAuthEnvironment = process.env,
) {
  if (env.VERCEL_ENV !== "production") {
    return null;
  }

  const expectedUsername = env.MIMI_BASIC_AUTH_USER;
  const expectedPassphrase = env.MIMI_BASIC_AUTH_PASSWORD;

  if (!expectedUsername || !expectedPassphrase) {
    return accessGateResponse(503);
  }

  const credentials = parseBasicCredentials(request.headers.get("authorization"));

  if (
    !credentials ||
    !secureEqual(credentials.username, expectedUsername) ||
    !secureEqual(credentials.passphrase, expectedPassphrase)
  ) {
    return accessGateResponse(401);
  }

  const cutoverMode = resolveProductionCutoverMode(env);
  if (cutoverMode === null || cutoverMode === "maintenance") {
    return maintenanceResponse();
  }

  return null;
}
