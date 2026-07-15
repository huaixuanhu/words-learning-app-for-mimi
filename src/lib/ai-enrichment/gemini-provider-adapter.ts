import {
  AI_PRODUCTION_LIMITS,
  GEMINI_STAGE2_MODEL,
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

  constructor(category: string, message: string, httpStatus: number | null = null) {
    super(message);
    this.name = "GeminiProviderAdapterError";
    this.category = category;
    this.httpStatus = httpStatus;
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

function parseVisibleJson(body: Record<string, unknown>) {
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];
  const candidate = record(candidates[0]);
  if (!candidate || candidate.finishReason !== "STOP") {
    throw new GeminiProviderAdapterError(
      "provider_nonstop_finish",
      "Gemini did not return one complete structured result.",
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
    );
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new GeminiProviderAdapterError(
      "provider_response_contract",
      "Gemini returned invalid structured JSON.",
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
  if (
    promptFeedback &&
    typeof promptFeedback.blockReason === "string" &&
    promptFeedback.blockReason !== "BLOCK_REASON_UNSPECIFIED"
  ) {
    throw new GeminiProviderAdapterError(
      "provider_content_block",
      "Gemini did not return content for this request.",
    );
  }

  const usage = validateGeminiUsage(body.usageMetadata);
  if (usage.promptTokenCount > AI_PRODUCTION_LIMITS.reservedInputTokensPerAttempt) {
    throw new GeminiProviderAdapterError(
      "provider_usage_exceeded",
      "Gemini input usage exceeded the reserved limit.",
    );
  }
  if (
    usage.candidatesTokenCount + usage.thoughtsTokenCount >
    AI_PRODUCTION_LIMITS.reservedOutputTokensPerAttempt
  ) {
    throw new GeminiProviderAdapterError(
      "provider_usage_exceeded",
      "Gemini output usage exceeded the reserved limit.",
    );
  }

  const modelVersion =
    typeof body.modelVersion === "string" ? body.modelVersion : GEMINI_STAGE2_MODEL;
  if (!modelVersion.startsWith(GEMINI_STAGE2_MODEL)) {
    throw new GeminiProviderAdapterError(
      "provider_model_mismatch",
      "Gemini returned an unexpected model version.",
    );
  }

  return {
    body,
    usage,
    modelVersion,
    providerResponseId:
      typeof body.responseId === "string" && body.responseId.trim()
        ? body.responseId
        : null,
  };
}

export function createGeminiProviderAdapter(input: Readonly<{
  apiKey: string;
  fetchImpl?: FetchLike;
}>) {
  const apiKey = input.apiKey.trim();
  if (!apiKey) {
    throw new GeminiProviderAdapterError(
      "provider_not_configured",
      "The Gemini provider is not configured.",
    );
  }
  const fetchImpl = input.fetchImpl ?? fetch;
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
      const parsed = parseVisibleJson(envelope.body);
      return {
        value: validate(parsed),
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
        (value) => validateAiEnrichmentDraft(value, trustedPayload),
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
