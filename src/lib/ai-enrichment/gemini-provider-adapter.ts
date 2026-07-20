import {
  AI_PRODUCTION_LIMITS,
  GEMINI_STAGE2_MODEL,
  assertCompleteAiExampleTranslations,
  validateAiEnrichmentDraft,
  validateGeminiUsage,
  validateTrustedAiLexicalPayload,
} from "./contract";
import { validateAiContextExplanation } from "./context-contract";
import type {
  AiContextExplanation,
  AiEnrichmentDraft,
  GeminiUsage,
  TrustedAiContextPayload,
  TrustedAiLexicalPayload,
} from "./types";

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export const GEMINI_PROVIDER_TIMEOUT_MS = 90_000;

export type GeminiStructuredResult<T> = Readonly<{
  value: T;
  usage: GeminiUsage;
  modelVersion: string;
  providerResponseId: string | null;
}>;

export type GeminiProviderMaterials = Readonly<{
  systemPrompt: string;
  responseJsonSchema: unknown;
}>;

export class GeminiProviderAdapterError extends Error {
  readonly category: string;
  readonly httpStatus: number | null;
  readonly usage: GeminiUsage | null;
  readonly modelVersion: string | null;
  readonly providerResponseId: string | null;

  constructor(
    category: string,
    message: string,
    httpStatus: number | null = null,
    evidence: Readonly<{
      usage?: GeminiUsage | null;
      modelVersion?: string | null;
      providerResponseId?: string | null;
    }> = {},
  ) {
    super(message);
    this.name = "GeminiProviderAdapterError";
    this.category = category;
    this.httpStatus = httpStatus;
    this.usage = evidence.usage ?? null;
    this.modelVersion = evidence.modelVersion ?? null;
    this.providerResponseId = evidence.providerResponseId ?? null;
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function providerErrorCategory(status: number) {
  if (status === 400) return "provider_rejected_request";
  if (status === 401 || status === 403) return "provider_auth_or_permission";
  if (status === 429) return "provider_quota_or_rate_limit";
  if (status >= 500) return "provider_unavailable";
  return "provider_error";
}

function buildRequestBody(
  trustedPayload: TrustedAiLexicalPayload | TrustedAiContextPayload,
  materials: GeminiProviderMaterials,
) {
  return {
    store: false,
    systemInstruction: { parts: [{ text: materials.systemPrompt }] },
    contents: [
      { role: "user", parts: [{ text: JSON.stringify(trustedPayload) }] },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseJsonSchema: materials.responseJsonSchema,
      thinkingConfig: { thinkingLevel: "minimal" },
      maxOutputTokens: AI_PRODUCTION_LIMITS.reservedOutputTokensPerAttempt,
    },
  };
}

function createBoundedProviderSignal(parentSignal?: AbortSignal) {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted) {
    forwardAbort();
  } else {
    parentSignal?.addEventListener("abort", forwardAbort, { once: true });
  }
  const timeout = setTimeout(
    () => controller.abort(new Error("Gemini provider timeout")),
    GEMINI_PROVIDER_TIMEOUT_MS,
  );

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
      parentSignal?.removeEventListener("abort", forwardAbort);
    },
  };
}

type ProviderEvidence = Readonly<{
  usage: GeminiUsage;
  modelVersion: string;
  providerResponseId: string | null;
}>;

function parseVisibleJson(body: Record<string, unknown>, evidence: ProviderEvidence) {
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const candidate = record(candidates[0]);
  if (!candidate || candidate.finishReason !== "STOP") {
    throw new GeminiProviderAdapterError(
      "provider_nonstop_finish",
      "Gemini did not return one complete structured result.",
      null,
      evidence,
    );
  }
  const content = record(candidate.content);
  const parts = content && Array.isArray(content.parts) ? content.parts : [];
  const text = parts
    .map(record)
    .filter((part): part is Record<string, unknown> => Boolean(part))
    .filter((part) => part.thought !== true && typeof part.text === "string")
    .map((part) => part.text as string)
    .join("");

  if (!text.trim()) {
    throw new GeminiProviderAdapterError(
      "provider_response_contract",
      "Gemini returned no visible structured result.",
      null,
      evidence,
    );
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GeminiProviderAdapterError(
      "provider_response_contract",
      "Gemini returned invalid structured JSON.",
      null,
      evidence,
    );
  }
}

function parseProviderEnvelope(bodyValue: unknown) {
  const body = record(bodyValue);
  if (!body) {
    throw new GeminiProviderAdapterError(
      "provider_response_contract",
      "Gemini returned an invalid response envelope.",
    );
  }
  const promptFeedback = record(body.promptFeedback);
  const providerResponseId =
    typeof body.responseId === "string" && body.responseId.trim()
      ? body.responseId
      : null;
  const reportedModelVersion =
    typeof body.modelVersion === "string" && body.modelVersion.trim()
      ? body.modelVersion
      : null;
  if (
    promptFeedback &&
    typeof promptFeedback.blockReason === "string" &&
    promptFeedback.blockReason !== "BLOCK_REASON_UNSPECIFIED"
  ) {
    let blockedUsage: GeminiUsage | null = null;
    try {
      blockedUsage = validateGeminiUsage(body.usageMetadata);
    } catch {
      blockedUsage = null;
    }
    throw new GeminiProviderAdapterError(
      "provider_content_block",
      "Gemini did not return content for this request.",
      null,
      {
        usage: blockedUsage,
        modelVersion: reportedModelVersion,
        providerResponseId,
      },
    );
  }

  let usage: GeminiUsage;
  try {
    usage = validateGeminiUsage(body.usageMetadata);
  } catch {
    throw new GeminiProviderAdapterError(
      "provider_usage_invalid",
      "Gemini returned missing or invalid usage metadata.",
    );
  }
  if (usage.promptTokenCount > AI_PRODUCTION_LIMITS.reservedInputTokensPerAttempt) {
    throw new GeminiProviderAdapterError(
      "provider_usage_exceeded",
      "Gemini input usage exceeded the reserved limit.",
      null,
      { usage, modelVersion: reportedModelVersion, providerResponseId },
    );
  }
  if (
    usage.candidatesTokenCount + usage.thoughtsTokenCount >
    AI_PRODUCTION_LIMITS.reservedOutputTokensPerAttempt
  ) {
    throw new GeminiProviderAdapterError(
      "provider_usage_exceeded",
      "Gemini output usage exceeded the reserved limit.",
      null,
      { usage, modelVersion: reportedModelVersion, providerResponseId },
    );
  }

  const modelVersion = reportedModelVersion;
  if (!modelVersion) {
    throw new GeminiProviderAdapterError(
      "provider_model_missing",
      "Gemini returned no model version evidence.",
      null,
      { usage, modelVersion: reportedModelVersion, providerResponseId },
    );
  }
  if (!modelVersion.startsWith(GEMINI_STAGE2_MODEL)) {
    throw new GeminiProviderAdapterError(
      "provider_model_mismatch",
      "Gemini returned an unexpected model version.",
      null,
      { usage, modelVersion, providerResponseId },
    );
  }

  return {
    body,
    usage,
    modelVersion,
    providerResponseId,
  };
}

export function createGeminiProviderAdapter(input: Readonly<{
  apiKey: string;
  fetchImpl?: FetchLike;
}> | string) {
  const apiKey = typeof input === "string" ? input.trim() : input.apiKey.trim();
  if (!apiKey) {
    throw new GeminiProviderAdapterError(
      "provider_not_configured",
      "The Gemini provider is not configured.",
    );
  }
  const fetchImpl = typeof input === "string" ? fetch : input.fetchImpl ?? fetch;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_STAGE2_MODEL}:generateContent`;

  async function generate<T>(
    trustedPayload: TrustedAiLexicalPayload | TrustedAiContextPayload,
    materials: GeminiProviderMaterials,
    validate: (value: unknown) => T,
    signal?: AbortSignal,
  ): Promise<GeminiStructuredResult<T>> {
    const boundedSignal = createBoundedProviderSignal(signal);
    try {
      let response: Response;
      try {
        response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(buildRequestBody(trustedPayload, materials)),
          signal: boundedSignal.signal,
          cache: "no-store",
        });
      } catch {
        throw new GeminiProviderAdapterError(
          "provider_network_ambiguous",
          "The Gemini request did not complete clearly.",
        );
      }

      if (!response.ok) {
        throw new GeminiProviderAdapterError(
          providerErrorCategory(response.status),
          "Gemini did not accept the request.",
          response.status,
        );
      }

      let bodyValue: unknown;
      try {
        bodyValue = await response.json();
      } catch {
        throw new GeminiProviderAdapterError(
          "provider_response_contract",
          "Gemini returned an unreadable response.",
        );
      }

      const envelope = parseProviderEnvelope(bodyValue);
      const parsed = parseVisibleJson(envelope.body, envelope);
      let value: T;
      try {
        value = validate(parsed);
      } catch {
        throw new GeminiProviderAdapterError(
          "provider_response_contract",
          "Gemini returned content that did not pass the app contract.",
          null,
          envelope,
        );
      }
      return {
        value,
        usage: envelope.usage,
        modelVersion: envelope.modelVersion,
        providerResponseId: envelope.providerResponseId,
      };
    } finally {
      boundedSignal.cleanup();
    }
  }

  return {
    generateEnrichment(
      trustedPayloadValue: unknown,
      materials: GeminiProviderMaterials,
      signal?: AbortSignal,
    ) {
      const trustedPayload = validateTrustedAiLexicalPayload(trustedPayloadValue);
      return generate<AiEnrichmentDraft>(
        trustedPayload,
        materials,
        (value) =>
          assertCompleteAiExampleTranslations(
            validateAiEnrichmentDraft(value, trustedPayload),
            trustedPayload.examples,
          ),
        signal,
      );
    },
    generateContextExplanation(
      trustedPayload: TrustedAiContextPayload,
      materials: GeminiProviderMaterials,
      signal?: AbortSignal,
    ) {
      return generate<AiContextExplanation>(
        trustedPayload,
        materials,
        (value) => validateAiContextExplanation(value, trustedPayload),
        signal,
      );
    },
  };
}
