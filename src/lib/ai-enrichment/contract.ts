import {
  AI_CONFUSABLE_TYPES,
  AI_ENRICHMENT_FEATURES,
} from "./types";
import type {
  AiAttemptReservation,
  AiBudgetSnapshot,
  AiEnrichmentDraft,
  AiGenerationAvailability,
  AiGenerationHealth,
  AiProductionLimits,
  AiReservationDecision,
  GeminiPricing,
  GeminiUsage,
  PublicAiEnrichmentRequest,
  PublicAiDisclosureConfirmationRequest,
  TrustedAiLexicalPayload,
} from "./types";

export const GEMINI_STAGE2_MODEL = "gemini-3.1-flash-lite" as const;
export const AI_PROMPT_VERSION = "v2-ai-enrichment-prompt-v2" as const;
export const AI_OUTPUT_SCHEMA_VERSION = "v2-ai-enrichment-draft-v2" as const;
export const AI_DISCLOSURE_VERSION = "ai-disclosure-v3" as const;
export const AI_MAX_COMBINED_CANDIDATES = 3 as const;

export const GEMINI_PRICING_2026_07_14_STANDARD: GeminiPricing = Object.freeze({
  provider: "google-gemini-api",
  model: GEMINI_STAGE2_MODEL,
  inputUsdPerMillionTokens: 0.25,
  outputUsdPerMillionTokens: 1.5,
  checkedAt: "2026-07-14T00:00:00.000Z",
  staleAfter: "2026-08-14T00:00:00.000Z",
});

export const AI_PRODUCTION_LIMITS: AiProductionLimits = Object.freeze({
  globalAttemptsPerDay: 300,
  globalConcurrency: 2,
  reservedInputTokensPerAttempt: 2_000,
  reservedOutputTokensPerAttempt: 700,
  globalInputTokensPerDay: 600_000,
  globalOutputTokensPerDay: 210_000,
  estimatedCostUsdPerDay: 0.5,
  estimatedCostUsdPerMonth: 2,
});

export const AI_STAGE2_EVALUATION_LIMITS = Object.freeze({
  corpusEntries: 120,
  maximumSubmittedRequests: 120,
  concurrency: 1,
  automaticRetries: 0,
  thinkingLevel: "minimal",
  maximumOutputTokens: 700,
});

export const AI_DISCLOSURE = Object.freeze({
  version: AI_DISCLOSURE_VERSION,
  provider: "Google Gemini API",
  model: GEMINI_STAGE2_MODEL,
  sentFields: ["term", "meaningsZh", "examples"],
  excludedFields: [
    "person identity",
    "private notes",
    "tags",
    "timestamps",
    "review history",
    "ratings",
    "daily goals",
    "typed answers",
    "audio",
  ],
  retentionSummary:
    "Paid content is not used to improve Google products. Google may retain prompt, context, and output for a limited period for safety, abuse prevention, and legal requirements; authorized review may occur.",
  projectLoggingSummary:
    "This app sends store=false. Optional project request logging must remain off for this route.",
  costBoundary:
    "Generation is bounded by independent request, token, estimated-cost, concurrency, and emergency-stop controls.",
});

export const AI_DISCLOSURE_DIGEST_MATERIAL = Object.freeze({
  version: AI_DISCLOSURE.version,
  provider: AI_DISCLOSURE.provider,
  model: AI_DISCLOSURE.model,
  sentFields: AI_DISCLOSURE.sentFields,
  excludedFields: AI_DISCLOSURE.excludedFields,
  retentionSummary: AI_DISCLOSURE.retentionSummary,
  projectLoggingSummary: AI_DISCLOSURE.projectLoggingSummary,
  costBoundary: AI_DISCLOSURE.costBoundary,
});

const PUBLIC_REQUEST_KEYS = [
  "vocabularyEntryId",
  "feature",
  "disclosureVersion",
  "idempotencyKey",
] as const;
const PUBLIC_DISCLOSURE_CONFIRMATION_KEYS = [
  "vocabularyEntryId",
  "disclosureVersion",
  "confirmed",
] as const;
const TRUSTED_LEXICAL_KEYS = ["term", "meaningsZh", "examples"] as const;
const DRAFT_KEYS = [
  "additionalMeaningsZh",
  "examples",
  "similarWords",
  "confusableWords",
] as const;
const SIMILAR_WORD_KEYS = ["word", "differenceZh"] as const;
const CONFUSABLE_WORD_KEYS = [
  "word",
  "type",
  "differenceZh",
  "examplePair",
] as const;

export class AiEnrichmentContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiEnrichmentContractError";
  }
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AiEnrichmentContractError(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  record: Record<string, unknown>,
  keys: readonly string[],
  label: string,
) {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new AiEnrichmentContractError(`${label} fields do not match the contract`);
  }
}

function codePointLength(value: string) {
  return [...value].length;
}

function boundedText(
  value: unknown,
  label: string,
  maximumCodePoints: number,
) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AiEnrichmentContractError(`${label} must be non-blank text`);
  }
  const trimmed = value.trim();
  if (codePointLength(trimmed) > maximumCodePoints) {
    throw new AiEnrichmentContractError(
      `${label} must be at most ${maximumCodePoints} characters`,
    );
  }
  return trimmed;
}

function boundedTextArray(
  value: unknown,
  label: string,
  minimumItems: number,
  maximumItems: number,
  maximumCodePoints: number,
) {
  if (!Array.isArray(value)) {
    throw new AiEnrichmentContractError(`${label} must be an array`);
  }
  if (value.length < minimumItems || value.length > maximumItems) {
    throw new AiEnrichmentContractError(
      `${label} must contain ${minimumItems} to ${maximumItems} items`,
    );
  }
  return value.map((entry, index) =>
    boundedText(entry, `${label}[${index}]`, maximumCodePoints),
  );
}

const AI_CANDIDATE_SURFACE_PATTERN =
  /^[A-Za-z]+(?:['’-][A-Za-z]+)*(?: [A-Za-z]+(?:['’-][A-Za-z]+)*)*$/u;
const AI_URL_PATTERN = /(?:https?:\/\/|www\.)/iu;
const AI_ERROR_FORM_EXPLANATION_PATTERN =
  /(?:拼写错误|语法错误|错误的搭配|错误形式|不正确|非标准|不标准|并不标准|此处应(?:使用|改为)|应改为|不可使用|misspell(?:ing|ed)?|ungrammatical|nonstandard|incorrect form)/iu;
const AI_EXAMPLE_ERROR_MARKER_PATTERN =
  /^(?:(?:correct|incorrect|wrong)\s*[:：-]|[✓✗✘]\s*)/iu;

function normalizeComparableAiText(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/\s+/gu, " ")
    .replace(/[\s,，;；:：。.!！?？、]+$/gu, "")
    .trim();
}

function boundedGeneratedText(
  value: unknown,
  label: string,
  maximumCodePoints: number,
) {
  const text = boundedText(value, label, maximumCodePoints);
  if (AI_URL_PATTERN.test(text)) {
    throw new AiEnrichmentContractError(`${label} must not contain a URL`);
  }
  return text;
}

function uniqueNovelGeneratedTextArray(
  value: unknown,
  label: string,
  minimumItems: number,
  maximumItems: number,
  maximumCodePoints: number,
  existing: readonly string[],
  rejectErrorMarkers = false,
) {
  if (!Array.isArray(value)) {
    throw new AiEnrichmentContractError(`${label} must be an array`);
  }
  if (value.length < minimumItems || value.length > maximumItems) {
    throw new AiEnrichmentContractError(
      `${label} must contain ${minimumItems} to ${maximumItems} items`,
    );
  }
  const seen = new Set(existing.map(normalizeComparableAiText));
  return value.map((entry, index) => {
    const text = boundedGeneratedText(
      entry,
      `${label}[${index}]`,
      maximumCodePoints,
    );
    if (rejectErrorMarkers && AI_EXAMPLE_ERROR_MARKER_PATTERN.test(text)) {
      throw new AiEnrichmentContractError(
        `${label}[${index}] must not be an error-labelled example`,
      );
    }
    const normalized = normalizeComparableAiText(text);
    if (seen.has(normalized)) {
      throw new AiEnrichmentContractError(
        `${label} must be unique and not repeat supplied content`,
      );
    }
    seen.add(normalized);
    return text;
  });
}

function validateLearnableCandidate(value: unknown, label: string) {
  const word = boundedGeneratedText(value, label, 80);
  if (!AI_CANDIDATE_SURFACE_PATTERN.test(word)) {
    throw new AiEnrichmentContractError(
      `${label} must be one plain standard-English word or phrase`,
    );
  }
  const tokens = normalizeAiCandidate(word).split(" ");
  if (tokens.includes("vs") || tokens.includes("versus")) {
    throw new AiEnrichmentContractError(
      `${label} must not contain a comparison label`,
    );
  }
  return word;
}

function validateDifferenceExplanation(value: unknown, label: string) {
  const difference = boundedGeneratedText(value, label, 180);
  if (AI_ERROR_FORM_EXPLANATION_PATTERN.test(difference)) {
    throw new AiEnrichmentContractError(
      `${label} must not describe the candidate as an incorrect form`,
    );
  }
  return difference;
}

function nonNegativeInteger(value: unknown, label: string) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) {
    throw new AiEnrichmentContractError(`${label} must be a non-negative integer`);
  }
  return Number(value);
}

function nonNegativeNumber(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new AiEnrichmentContractError(`${label} must be a non-negative number`);
  }
  return value;
}

export function normalizeAiCandidate(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
}

export function validatePublicAiEnrichmentRequest(
  value: unknown,
): PublicAiEnrichmentRequest {
  const record = asRecord(value, "request");
  exactKeys(record, PUBLIC_REQUEST_KEYS, "request");

  const vocabularyEntryId = boundedText(
    record.vocabularyEntryId,
    "vocabularyEntryId",
    128,
  );
  const feature = record.feature;
  if (!AI_ENRICHMENT_FEATURES.includes(feature as never)) {
    throw new AiEnrichmentContractError("feature is unsupported");
  }
  const disclosureVersion = boundedText(
    record.disclosureVersion,
    "disclosureVersion",
    80,
  );
  if (disclosureVersion !== AI_DISCLOSURE_VERSION) {
    throw new AiEnrichmentContractError("disclosureVersion is not current");
  }

  return {
    vocabularyEntryId,
    feature: feature as PublicAiEnrichmentRequest["feature"],
    disclosureVersion,
    idempotencyKey: boundedText(record.idempotencyKey, "idempotencyKey", 160),
  };
}

export function validatePublicAiDisclosureConfirmationRequest(
  value: unknown,
): PublicAiDisclosureConfirmationRequest {
  const record = asRecord(value, "request");
  exactKeys(record, PUBLIC_DISCLOSURE_CONFIRMATION_KEYS, "request");
  const disclosureVersion = boundedText(
    record.disclosureVersion,
    "disclosureVersion",
    80,
  );
  if (disclosureVersion !== AI_DISCLOSURE_VERSION) {
    throw new AiEnrichmentContractError("disclosureVersion is not current");
  }
  if (record.confirmed !== true) {
    throw new AiEnrichmentContractError("confirmed must be true");
  }
  return {
    vocabularyEntryId: boundedText(
      record.vocabularyEntryId,
      "vocabularyEntryId",
      128,
    ),
    disclosureVersion,
    confirmed: true,
  };
}

export function validateTrustedAiLexicalPayload(
  value: unknown,
): TrustedAiLexicalPayload {
  const record = asRecord(value, "lexicalPayload");
  exactKeys(record, TRUSTED_LEXICAL_KEYS, "lexicalPayload");

  const payload = {
    term: boundedText(record.term, "term", 120),
    meaningsZh: boundedTextArray(record.meaningsZh, "meaningsZh", 0, 8, 160),
    examples: boundedTextArray(record.examples, "examples", 0, 8, 320),
  };
  const serializedLength = codePointLength(JSON.stringify(payload));
  if (serializedLength > 4_000) {
    throw new AiEnrichmentContractError("lexicalPayload is too large");
  }
  return payload;
}

function validateAiEnrichmentDraftInternal(
  value: unknown,
  sourceContext: TrustedAiLexicalPayload | null,
): AiEnrichmentDraft {
  const record = asRecord(value, "draft");
  exactKeys(record, DRAFT_KEYS, "draft");
  const lexicalSource = sourceContext
    ? validateTrustedAiLexicalPayload(sourceContext)
    : null;

  const additionalMeaningsZh = uniqueNovelGeneratedTextArray(
    record.additionalMeaningsZh,
    "additionalMeaningsZh",
    0,
    3,
    80,
    lexicalSource?.meaningsZh ?? [],
  );
  const examples = uniqueNovelGeneratedTextArray(
    record.examples,
    "examples",
    0,
    3,
    240,
    lexicalSource?.examples ?? [],
    true,
  );

  if (!Array.isArray(record.similarWords) || record.similarWords.length > 3) {
    throw new AiEnrichmentContractError("similarWords must contain 0 to 3 items");
  }
  if (!Array.isArray(record.confusableWords) || record.confusableWords.length > 3) {
    throw new AiEnrichmentContractError("confusableWords must contain 0 to 3 items");
  }
  if (
    record.similarWords.length + record.confusableWords.length >
    AI_MAX_COMBINED_CANDIDATES
  ) {
    throw new AiEnrichmentContractError(
      `candidate arrays must contain at most ${AI_MAX_COMBINED_CANDIDATES} items combined`,
    );
  }

  const seen = new Set<string>(
    lexicalSource ? [normalizeAiCandidate(lexicalSource.term)] : [],
  );
  const similarWords = record.similarWords.map((entry, index) => {
    const item = asRecord(entry, `similarWords[${index}]`);
    exactKeys(item, SIMILAR_WORD_KEYS, `similarWords[${index}]`);
    const word = validateLearnableCandidate(
      item.word,
      `similarWords[${index}].word`,
    );
    const normalized = normalizeAiCandidate(word);
    if (seen.has(normalized)) {
      throw new AiEnrichmentContractError("candidate words must be unique and not the source term");
    }
    seen.add(normalized);
    return {
      word,
      differenceZh: validateDifferenceExplanation(
        item.differenceZh,
        `similarWords[${index}].differenceZh`,
      ),
    };
  });

  const confusableWords = record.confusableWords.map((entry, index) => {
    const item = asRecord(entry, `confusableWords[${index}]`);
    exactKeys(item, CONFUSABLE_WORD_KEYS, `confusableWords[${index}]`);
    const word = validateLearnableCandidate(
      item.word,
      `confusableWords[${index}].word`,
    );
    const normalized = normalizeAiCandidate(word);
    if (seen.has(normalized)) {
      throw new AiEnrichmentContractError("candidate words must be unique and not the source term");
    }
    seen.add(normalized);
    if (!AI_CONFUSABLE_TYPES.includes(item.type as never)) {
      throw new AiEnrichmentContractError(
        `confusableWords[${index}].type is unsupported`,
      );
    }
    const examplePair = uniqueNovelGeneratedTextArray(
      item.examplePair,
      `confusableWords[${index}].examplePair`,
      0,
      2,
      240,
      [],
      true,
    );
    if (examplePair.length === 1) {
      throw new AiEnrichmentContractError("examplePair must be empty or contain two examples");
    }
    return {
      word,
      type: item.type as (typeof AI_CONFUSABLE_TYPES)[number],
      differenceZh: validateDifferenceExplanation(
        item.differenceZh,
        `confusableWords[${index}].differenceZh`,
      ),
      examplePair,
    };
  });

  return { additionalMeaningsZh, examples, similarWords, confusableWords };
}

export function validateAiEnrichmentDraft(
  value: unknown,
  sourceContext: TrustedAiLexicalPayload,
): AiEnrichmentDraft {
  return validateAiEnrichmentDraftInternal(value, sourceContext);
}

// Novelty is a generation/acceptance rule. A retained accepted draft is
// historical evidence and may later overlap a legitimately edited source item.
export function validateStoredAiEnrichmentDraft(value: unknown): AiEnrichmentDraft {
  return validateAiEnrichmentDraftInternal(value, null);
}

export function validateGeminiUsage(value: unknown): GeminiUsage {
  const record = asRecord(value, "usageMetadata");
  const usage = {
    promptTokenCount: nonNegativeInteger(
      record.promptTokenCount,
      "promptTokenCount",
    ),
    candidatesTokenCount: nonNegativeInteger(
      record.candidatesTokenCount,
      "candidatesTokenCount",
    ),
    thoughtsTokenCount: nonNegativeInteger(
      record.thoughtsTokenCount ?? 0,
      "thoughtsTokenCount",
    ),
    totalTokenCount: nonNegativeInteger(record.totalTokenCount, "totalTokenCount"),
  };
  if (
    usage.totalTokenCount <
    usage.promptTokenCount + usage.candidatesTokenCount + usage.thoughtsTokenCount
  ) {
    throw new AiEnrichmentContractError("totalTokenCount is inconsistent");
  }
  return usage;
}

export function isGeminiPricingFresh(pricing: GeminiPricing, now: string | Date) {
  const current = now instanceof Date ? now : new Date(now);
  const staleAfter = new Date(pricing.staleAfter);
  return (
    Number.isFinite(current.getTime()) &&
    Number.isFinite(staleAfter.getTime()) &&
    current.getTime() < staleAfter.getTime() &&
    pricing.model === GEMINI_STAGE2_MODEL
  );
}

export function estimateGeminiCostUsd(
  usage: GeminiUsage,
  pricing: GeminiPricing = GEMINI_PRICING_2026_07_14_STANDARD,
) {
  const input =
    (nonNegativeInteger(usage.promptTokenCount, "promptTokenCount") / 1_000_000) *
    nonNegativeNumber(pricing.inputUsdPerMillionTokens, "input price");
  const outputTokens =
    nonNegativeInteger(usage.candidatesTokenCount, "candidatesTokenCount") +
    nonNegativeInteger(usage.thoughtsTokenCount, "thoughtsTokenCount");
  const output =
    (outputTokens / 1_000_000) *
    nonNegativeNumber(pricing.outputUsdPerMillionTokens, "output price");
  return input + output;
}

export function buildDefaultAttemptReservation(
  pricing: GeminiPricing = GEMINI_PRICING_2026_07_14_STANDARD,
  limits: AiProductionLimits = AI_PRODUCTION_LIMITS,
): AiAttemptReservation {
  return {
    inputTokens: limits.reservedInputTokensPerAttempt,
    outputTokens: limits.reservedOutputTokensPerAttempt,
    estimatedCostUsd:
      (limits.reservedInputTokensPerAttempt / 1_000_000) *
        pricing.inputUsdPerMillionTokens +
      (limits.reservedOutputTokensPerAttempt / 1_000_000) *
        pricing.outputUsdPerMillionTokens,
  };
}

export function reserveAiProviderAttempt(
  snapshot: AiBudgetSnapshot,
  reservation: AiAttemptReservation = buildDefaultAttemptReservation(),
  limits: AiProductionLimits = AI_PRODUCTION_LIMITS,
): AiReservationDecision {
  const checked = {
    globalAttemptsToday: nonNegativeInteger(
      snapshot.globalAttemptsToday,
      "globalAttemptsToday",
    ),
    activeProviderCalls: nonNegativeInteger(
      snapshot.activeProviderCalls,
      "activeProviderCalls",
    ),
    reservedInputTokensToday: nonNegativeInteger(
      snapshot.reservedInputTokensToday,
      "reservedInputTokensToday",
    ),
    reservedOutputTokensToday: nonNegativeInteger(
      snapshot.reservedOutputTokensToday,
      "reservedOutputTokensToday",
    ),
    estimatedCostUsdToday: nonNegativeNumber(
      snapshot.estimatedCostUsdToday,
      "estimatedCostUsdToday",
    ),
    estimatedCostUsdMonth: nonNegativeNumber(
      snapshot.estimatedCostUsdMonth,
      "estimatedCostUsdMonth",
    ),
  };
  const attempt = {
    inputTokens: nonNegativeInteger(reservation.inputTokens, "reservation.inputTokens"),
    outputTokens: nonNegativeInteger(
      reservation.outputTokens,
      "reservation.outputTokens",
    ),
    estimatedCostUsd: nonNegativeNumber(
      reservation.estimatedCostUsd,
      "reservation.estimatedCostUsd",
    ),
  };
  if (
    attempt.inputTokens !== limits.reservedInputTokensPerAttempt ||
    attempt.outputTokens !== limits.reservedOutputTokensPerAttempt
  ) {
    throw new AiEnrichmentContractError(
      "attempt reservation must match the configured per-attempt token envelope",
    );
  }
  const minimumReservationCost =
    (attempt.inputTokens / 1_000_000) *
      GEMINI_PRICING_2026_07_14_STANDARD.inputUsdPerMillionTokens +
    (attempt.outputTokens / 1_000_000) *
      GEMINI_PRICING_2026_07_14_STANDARD.outputUsdPerMillionTokens;
  if (attempt.estimatedCostUsd + Number.EPSILON < minimumReservationCost) {
    throw new AiEnrichmentContractError(
      "attempt reservation must not understate the configured token cost",
    );
  }
  const reasons: string[] = [];
  if (checked.globalAttemptsToday + 1 > limits.globalAttemptsPerDay) {
    reasons.push("global_attempt_limit");
  }
  if (checked.activeProviderCalls + 1 > limits.globalConcurrency) {
    reasons.push("global_concurrency_limit");
  }
  if (
    checked.reservedInputTokensToday + attempt.inputTokens >
    limits.globalInputTokensPerDay
  ) {
    reasons.push("daily_input_token_limit");
  }
  if (
    checked.reservedOutputTokensToday + attempt.outputTokens >
    limits.globalOutputTokensPerDay
  ) {
    reasons.push("daily_output_token_limit");
  }
  if (
    checked.estimatedCostUsdToday + attempt.estimatedCostUsd >
    limits.estimatedCostUsdPerDay + Number.EPSILON
  ) {
    reasons.push("daily_cost_limit");
  }
  if (
    checked.estimatedCostUsdMonth + attempt.estimatedCostUsd >
    limits.estimatedCostUsdPerMonth + Number.EPSILON
  ) {
    reasons.push("monthly_cost_limit");
  }
  if (reasons.length > 0) {
    return { allowed: false, reasons, next: null };
  }
  return {
    allowed: true,
    reasons: [],
    next: {
      globalAttemptsToday: checked.globalAttemptsToday + 1,
      activeProviderCalls: checked.activeProviderCalls + 1,
      reservedInputTokensToday:
        checked.reservedInputTokensToday + attempt.inputTokens,
      reservedOutputTokensToday:
        checked.reservedOutputTokensToday + attempt.outputTokens,
      estimatedCostUsdToday:
        checked.estimatedCostUsdToday + attempt.estimatedCostUsd,
      estimatedCostUsdMonth:
        checked.estimatedCostUsdMonth + attempt.estimatedCostUsd,
    },
  };
}

export function settleAiProviderAttempt(
  snapshot: AiBudgetSnapshot,
  reservation: AiAttemptReservation,
  usage: GeminiUsage | null,
  pricing: GeminiPricing = GEMINI_PRICING_2026_07_14_STANDARD,
): AiBudgetSnapshot {
  if (snapshot.activeProviderCalls < 1) {
    throw new AiEnrichmentContractError(
      "cannot settle a provider attempt without an active reservation",
    );
  }

  if (!usage) {
    return {
      ...snapshot,
      activeProviderCalls: snapshot.activeProviderCalls - 1,
    };
  }

  const checkedUsage = validateGeminiUsage(usage);
  const actualOutputTokens =
    checkedUsage.candidatesTokenCount + checkedUsage.thoughtsTokenCount;
  const actualCostUsd = estimateGeminiCostUsd(checkedUsage, pricing);

  return {
    ...snapshot,
    activeProviderCalls: snapshot.activeProviderCalls - 1,
    reservedInputTokensToday:
      snapshot.reservedInputTokensToday -
      reservation.inputTokens +
      checkedUsage.promptTokenCount,
    reservedOutputTokensToday:
      snapshot.reservedOutputTokensToday -
      reservation.outputTokens +
      actualOutputTokens,
    estimatedCostUsdToday:
      snapshot.estimatedCostUsdToday - reservation.estimatedCostUsd + actualCostUsd,
    estimatedCostUsdMonth:
      snapshot.estimatedCostUsdMonth - reservation.estimatedCostUsd + actualCostUsd,
  };
}

export function getAiGenerationAvailability(
  health: AiGenerationHealth,
): AiGenerationAvailability {
  if (health.killSwitchEnabled) {
    return { status: "resting", reason: "kill_switch" };
  }
  if (!health.providerConfigured) {
    return { status: "resting", reason: "provider_not_configured" };
  }
  if (!health.pricingFresh) {
    return { status: "resting", reason: "pricing_stale" };
  }
  if (!health.usageAccountingAvailable) {
    return { status: "resting", reason: "usage_accounting_unavailable" };
  }
  if (!health.quotaAvailable) {
    return { status: "resting", reason: "quota_exhausted" };
  }
  return { status: "available", reason: null };
}
