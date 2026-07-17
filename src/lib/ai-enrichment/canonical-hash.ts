import { createHash } from "node:crypto";
import {
  AI_DISCLOSURE_DIGEST_MATERIAL,
  AI_DISCLOSURE_VERSION,
  AI_OUTPUT_SCHEMA_VERSION,
  AI_PROMPT_VERSION,
  GEMINI_PRICING_2026_07_14_STANDARD,
  GEMINI_STAGE2_MODEL,
} from "./contract";
import type {
  AiFeature,
  PublicAiContextExplainRequest,
  PublicAiEnrichmentRequest,
  TrustedAiContextPayload,
  TrustedAiLexicalPayload,
} from "./types";
import {
  AI_CONTEXT_OUTPUT_SCHEMA_VERSION,
  AI_CONTEXT_PROMPT_VERSION,
} from "./context-contract";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right, "en-US"))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  throw new Error("Canonical AI material contains an unsupported value");
}

export function canonicalAiJson(value: unknown) {
  return JSON.stringify(canonicalize(value));
}

export function sha256AiDigest(value: unknown) {
  return createHash("sha256").update(canonicalAiJson(value), "utf8").digest("hex");
}

export function currentAiDisclosureDigest() {
  return sha256AiDigest(AI_DISCLOSURE_DIGEST_MATERIAL);
}

export function buildAiSourceHash(
  payload: TrustedAiLexicalPayload | TrustedAiContextPayload,
) {
  return sha256AiDigest({ kind: "source", payload });
}

export function buildAiRequestHash(
  personId: string,
  request: PublicAiEnrichmentRequest | PublicAiContextExplainRequest,
  sourceHash: string,
) {
  return sha256AiDigest({
    kind: "request",
    personId,
    request: { ...request, idempotencyKey: undefined },
    sourceHash,
  });
}

export function buildAiIdempotencyKeyHash(personId: string, idempotencyKey: string) {
  return sha256AiDigest({ kind: "idempotency", personId, idempotencyKey });
}

export function buildAiCacheKeyHash(input: Readonly<{
  personId: string;
  vocabularyEntryId: string;
  feature: AiFeature;
  sourceHash: string;
}>) {
  const promptVersion = input.feature === "context_explain_v1"
    ? AI_CONTEXT_PROMPT_VERSION
    : AI_PROMPT_VERSION;
  const outputSchemaVersion = input.feature === "context_explain_v1"
    ? AI_CONTEXT_OUTPUT_SCHEMA_VERSION
    : AI_OUTPUT_SCHEMA_VERSION;
  return sha256AiDigest({
    kind: "cache",
    ...input,
    model: GEMINI_STAGE2_MODEL,
    promptVersion,
    outputSchemaVersion,
    disclosureVersion: AI_DISCLOSURE_VERSION,
    disclosureDigest: currentAiDisclosureDigest(),
    pricingCheckedAt: GEMINI_PRICING_2026_07_14_STANDARD.checkedAt,
  });
}
