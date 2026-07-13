export const AI_ENRICHMENT_FEATURES = ["enrichment_v1"] as const;
export const AI_CONTEXT_EXPLAIN_FEATURES = ["context_explain_v1"] as const;
export const AI_FEATURES = [
  ...AI_ENRICHMENT_FEATURES,
  ...AI_CONTEXT_EXPLAIN_FEATURES,
] as const;
export const AI_CONFUSABLE_TYPES = ["spelling", "sound", "usage"] as const;
export const AI_GENERATION_UNAVAILABLE_REASONS = [
  "kill_switch",
  "provider_not_configured",
  "pricing_stale",
  "usage_accounting_unavailable",
  "quota_exhausted",
] as const;

export type AiEnrichmentFeature = (typeof AI_ENRICHMENT_FEATURES)[number];
export type AiContextExplainFeature = (typeof AI_CONTEXT_EXPLAIN_FEATURES)[number];
export type AiFeature = (typeof AI_FEATURES)[number];
export type AiConfusableType = (typeof AI_CONFUSABLE_TYPES)[number];
export type AiGenerationUnavailableReason =
  (typeof AI_GENERATION_UNAVAILABLE_REASONS)[number];

export type PublicAiEnrichmentRequest = Readonly<{
  vocabularyEntryId: string;
  feature: AiEnrichmentFeature;
  disclosureVersion: string;
  idempotencyKey: string;
}>;

export type TrustedAiLexicalPayload = Readonly<{
  term: string;
  meaningsZh: readonly string[];
  examples: readonly string[];
}>;

export type PublicAiContextExplainRequest = Readonly<{
  vocabularyEntryId: string;
  exampleIndex: number;
  selectedStart: number;
  selectedEnd: number;
  feature: AiContextExplainFeature;
  disclosureVersion: string;
  idempotencyKey: string;
}>;

export type TrustedAiContextPayload = Readonly<{
  sourceTerm: string;
  sourceMeaningsZh: readonly string[];
  example: string;
  selectedText: string;
}>;

export type AiContextExplanation = Readonly<{
  suggestedHeadword: string;
  meaningInContextZh: string;
  grammarRoleZh: string;
  contextExplanationZh: string;
  phraseInContext: string | null;
}>;

export type SimilarWordSuggestion = Readonly<{
  word: string;
  differenceZh: string;
}>;

export type ConfusableWordSuggestion = Readonly<{
  word: string;
  type: AiConfusableType;
  differenceZh: string;
  examplePair: readonly string[];
}>;

export type AiEnrichmentDraft = Readonly<{
  additionalMeaningsZh: readonly string[];
  examples: readonly string[];
  similarWords: readonly SimilarWordSuggestion[];
  confusableWords: readonly ConfusableWordSuggestion[];
}>;

export type GeminiUsage = Readonly<{
  promptTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  totalTokenCount: number;
}>;

export type GeminiPricing = Readonly<{
  provider: "google-gemini-api";
  model: string;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
  checkedAt: string;
  staleAfter: string;
}>;

export type AiProductionLimits = Readonly<{
  personAttemptsPerDay: number;
  globalAttemptsPerDay: number;
  globalConcurrency: number;
  reservedInputTokensPerAttempt: number;
  reservedOutputTokensPerAttempt: number;
  globalInputTokensPerDay: number;
  globalOutputTokensPerDay: number;
  estimatedCostUsdPerDay: number;
  estimatedCostUsdPerMonth: number;
}>;

export type AiBudgetSnapshot = Readonly<{
  personAttemptsToday: number;
  globalAttemptsToday: number;
  activeProviderCalls: number;
  reservedInputTokensToday: number;
  reservedOutputTokensToday: number;
  estimatedCostUsdToday: number;
  estimatedCostUsdMonth: number;
}>;

export type AiAttemptReservation = Readonly<{
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}>;

export type AiReservationDecision =
  | Readonly<{
      allowed: true;
      reasons: readonly [];
      next: AiBudgetSnapshot;
    }>
  | Readonly<{
      allowed: false;
      reasons: readonly string[];
      next: null;
    }>;

export type AiGenerationAvailability =
  | Readonly<{
      status: "available";
      reason: null;
    }>
  | Readonly<{
      status: "resting";
      reason: AiGenerationUnavailableReason;
    }>;

export type AiGenerationHealth = Readonly<{
  killSwitchEnabled: boolean;
  providerConfigured: boolean;
  pricingFresh: boolean;
  usageAccountingAvailable: boolean;
  quotaAvailable: boolean;
}>;
