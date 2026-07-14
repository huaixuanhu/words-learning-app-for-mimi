import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { PromptSeed } from "./runtime-engine";
import type { TrustedPromptClaims } from "./types";
import { StudyPromptError } from "./prompt-errors";

type RecognitionPromptClaims = Extract<
  TrustedPromptClaims,
  { reviewProfile: "recognition" }
>;

const TOKEN_VERSION = 1;
const MINIMUM_SECRET_BYTES = 32;

type StudyTokenEnvelope<T> = Readonly<{
  version: typeof TOKEN_VERSION;
  kind: "prompt" | "cursor";
  expiresAt: string;
  claims: T;
}>;

function encode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest();
}

function assertSecret(secret: string) {
  if (Buffer.byteLength(secret, "utf8") < MINIMUM_SECRET_BYTES) {
    throw new Error("MIMI_STUDY_TOKEN_SECRET must contain at least 32 bytes");
  }
}

export function getStudyTokenSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.MIMI_STUDY_TOKEN_SECRET;

  if (!secret) {
    throw new Error("MIMI_STUDY_TOKEN_SECRET is required for server-backed study tokens");
  }

  assertSecret(secret);
  return secret;
}

export function signOpaqueStudyToken<T>(
  envelope: StudyTokenEnvelope<T>,
  secret: string,
) {
  assertSecret(secret);
  const payload = encode(JSON.stringify(envelope));
  const digest = encode(signature(payload, secret));

  return `${payload}.${digest}`;
}

export function verifyOpaqueStudyToken<T>(
  token: string,
  expectedKind: StudyTokenEnvelope<T>["kind"],
  now: string,
  secret: string,
  options: Readonly<{ allowExpired?: boolean }> = {},
) {
  assertSecret(secret);
  const [payload, suppliedSignature, ...rest] = token.split(".");

  if (!payload || !suppliedSignature || rest.length > 0) {
    throw new StudyPromptError("prompt_invalid", "Study token is malformed");
  }

  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature, "base64url");

  if (
    supplied.length !== expectedSignature.length ||
    !timingSafeEqual(supplied, expectedSignature)
  ) {
    throw new StudyPromptError("prompt_invalid", "Study token signature is invalid");
  }

  let envelope: StudyTokenEnvelope<T>;

  try {
    envelope = JSON.parse(decode(payload)) as StudyTokenEnvelope<T>;
  } catch {
    throw new StudyPromptError("prompt_invalid", "Study token payload is invalid");
  }

  if (
    envelope.version !== TOKEN_VERSION ||
    envelope.kind !== expectedKind ||
    typeof envelope.expiresAt !== "string" ||
    !envelope.claims ||
    typeof envelope.claims !== "object"
  ) {
    throw new StudyPromptError("prompt_invalid", "Study token contract is invalid");
  }

  const nowTime = new Date(now).getTime();
  const expiry = new Date(envelope.expiresAt).getTime();

  if (!Number.isFinite(nowTime) || !Number.isFinite(expiry)) {
    throw new StudyPromptError("prompt_invalid", "Study token timestamps are invalid");
  }

  if (expiry <= nowTime && !options.allowExpired) {
    throw new StudyPromptError("prompt_expired", "Study token has expired");
  }

  return envelope;
}

export function issueServerPromptToken(
  seed: PromptSeed,
  now: string,
  secret: string,
  options: Readonly<{ promptId?: string; ttlMs?: number }> = {},
) {
  const promptId = options.promptId ?? randomUUID();
  const expiresAt = new Date(
    new Date(now).getTime() + (options.ttlMs ?? 30 * 60 * 1000),
  ).toISOString();
  const claims = {
    ...seed,
    promptId,
    expiresAt,
    targetRevision: null,
  } as const;
  const promptToken = signOpaqueStudyToken(
    {
      version: TOKEN_VERSION,
      kind: "prompt",
      expiresAt,
      claims,
    },
    secret,
  );

  return {
    promptToken,
    claims: { ...claims, promptToken } satisfies TrustedPromptClaims,
  };
}

export function verifyServerPromptToken(
  promptToken: string,
  now: string,
  secret: string,
  options: Readonly<{ allowExpired?: boolean }> = {},
): RecognitionPromptClaims {
  const envelope = verifyOpaqueStudyToken<
    Omit<RecognitionPromptClaims, "promptToken">
  >(promptToken, "prompt", now, secret, options);
  const claims = envelope.claims;

  if (
    claims.reviewProfile !== "recognition" ||
    claims.activityType !== "recognition_card" ||
    claims.targetRevision !== null ||
    typeof claims.promptId !== "string" ||
    typeof claims.personId !== "string" ||
    typeof claims.planId !== "string" ||
    !Number.isSafeInteger(claims.planVersion) ||
    typeof claims.localDate !== "string" ||
    typeof claims.vocabularyItemId !== "string"
  ) {
    throw new StudyPromptError(
      "prompt_invalid",
      "Recognition prompt claims are invalid",
    );
  }

  return { ...claims, promptToken };
}
