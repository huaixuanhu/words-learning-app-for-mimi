import { findActionableExampleSegment } from "@/lib/vocabulary/example-segmentation";
import { AI_DISCLOSURE_VERSION } from "./contract";
import { AI_CONTEXT_EXPLAIN_FEATURES } from "./types";
import type {
  AiContextExplanation,
  PublicAiContextExplainRequest,
  TrustedAiContextPayload,
} from "./types";

const PUBLIC_CONTEXT_REQUEST_KEYS = [
  "vocabularyEntryId",
  "exampleIndex",
  "selectedStart",
  "selectedEnd",
  "feature",
  "disclosureVersion",
  "idempotencyKey",
] as const;
const CONTEXT_RESULT_KEYS = [
  "suggestedHeadword",
  "meaningInContextZh",
  "grammarRoleZh",
  "contextExplanationZh",
  "phraseInContext",
] as const;
const URL_PATTERN = /(?:https?:\/\/|www\.)/iu;
const HEADWORD_PATTERN =
  /^[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*(?: [\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*)*$/u;

export type TrustedContextVocabularyEntry = Readonly<{
  surfaceText: string;
  meaningZh?: string;
  meaningsZh: readonly string[];
  example?: string;
  examples: readonly string[];
}>;

export class AiContextContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiContextContractError";
  }
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AiContextContractError(`${label} must be an object`);
  }

  return value as Record<string, unknown>;
}

function exactKeys(record: Record<string, unknown>, keys: readonly string[], label: string) {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();

  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new AiContextContractError(`${label} fields do not match the contract`);
  }
}

function boundedText(value: unknown, label: string, maximumCodePoints: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AiContextContractError(`${label} must be non-blank text`);
  }

  const text = value.trim();
  if ([...text].length > maximumCodePoints) {
    throw new AiContextContractError(`${label} is too long`);
  }
  if (URL_PATTERN.test(text)) {
    throw new AiContextContractError(`${label} must not contain a URL`);
  }

  return text;
}

function boundedStoredText(value: unknown, label: string, maximumCodePoints: number) {
  if (typeof value !== "string" || !value.trim()) {
    throw new AiContextContractError(`${label} must be non-blank text`);
  }
  if ([...value].length > maximumCodePoints) {
    throw new AiContextContractError(`${label} is too long`);
  }
  if (URL_PATTERN.test(value)) {
    throw new AiContextContractError(`${label} must not contain a URL`);
  }

  return value;
}

function boundedInteger(value: unknown, label: string, maximum: number) {
  if (!Number.isSafeInteger(value) || Number(value) < 0 || Number(value) > maximum) {
    throw new AiContextContractError(`${label} is outside the allowed range`);
  }

  return Number(value);
}

function normalizeComparable(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("en-US");
}

export function validatePublicAiContextExplainRequest(
  value: unknown,
): PublicAiContextExplainRequest {
  const record = asRecord(value, "request");
  exactKeys(record, PUBLIC_CONTEXT_REQUEST_KEYS, "request");

  const feature = record.feature;
  if (!AI_CONTEXT_EXPLAIN_FEATURES.includes(feature as never)) {
    throw new AiContextContractError("feature is unsupported");
  }

  const disclosureVersion = boundedText(
    record.disclosureVersion,
    "disclosureVersion",
    80,
  );
  if (disclosureVersion !== AI_DISCLOSURE_VERSION) {
    throw new AiContextContractError("disclosureVersion is not current");
  }

  const selectedStart = boundedInteger(record.selectedStart, "selectedStart", 4_000);
  const selectedEnd = boundedInteger(record.selectedEnd, "selectedEnd", 4_000);
  if (selectedEnd <= selectedStart || selectedEnd - selectedStart > 120) {
    throw new AiContextContractError("selected span is invalid");
  }

  return {
    vocabularyEntryId: boundedText(record.vocabularyEntryId, "vocabularyEntryId", 128),
    exampleIndex: boundedInteger(record.exampleIndex, "exampleIndex", 127),
    selectedStart,
    selectedEnd,
    feature: feature as PublicAiContextExplainRequest["feature"],
    disclosureVersion,
    idempotencyKey: boundedText(record.idempotencyKey, "idempotencyKey", 160),
  };
}

export function buildTrustedAiContextPayload(
  requestValue: unknown,
  entry: TrustedContextVocabularyEntry,
): TrustedAiContextPayload {
  const request = validatePublicAiContextExplainRequest(requestValue);
  const sourceTerm = boundedText(entry.surfaceText, "sourceTerm", 120);
  const examples = entry.examples.length
    ? [...entry.examples]
    : entry.example?.trim()
      ? [entry.example]
      : [];
  const exampleValue = examples[request.exampleIndex];

  if (exampleValue === undefined) {
    throw new AiContextContractError("exampleIndex does not reference a stored example");
  }

  const example = boundedStoredText(exampleValue, "example", 600);
  const selected = findActionableExampleSegment(
    example,
    request.selectedStart,
    request.selectedEnd,
  );
  if (!selected) {
    throw new AiContextContractError("selected span is not one actionable stored token");
  }

  const sourceMeaningsZh = (entry.meaningsZh.length
    ? entry.meaningsZh
    : entry.meaningZh?.trim()
      ? [entry.meaningZh]
      : [])
    .slice(0, 8)
    .map((meaning, index) => boundedText(meaning, `sourceMeaningsZh[${index}]`, 160));
  const payload = {
    sourceTerm,
    sourceMeaningsZh,
    example,
    selectedText: selected.text,
  };

  if ([...JSON.stringify(payload)].length > 2_500) {
    throw new AiContextContractError("context payload is too large");
  }

  return payload;
}

export function validateAiContextExplanation(
  value: unknown,
  trustedContext: TrustedAiContextPayload,
): AiContextExplanation {
  const record = asRecord(value, "contextExplanation");
  exactKeys(record, CONTEXT_RESULT_KEYS, "contextExplanation");

  const suggestedHeadword = boundedText(
    record.suggestedHeadword,
    "suggestedHeadword",
    80,
  );
  if (!HEADWORD_PATTERN.test(suggestedHeadword)) {
    throw new AiContextContractError("suggestedHeadword must be a plain word or phrase");
  }

  let phraseInContext: string | null = null;
  if (record.phraseInContext !== null) {
    phraseInContext = boundedText(record.phraseInContext, "phraseInContext", 120);
    if (
      !normalizeComparable(trustedContext.example).includes(
        normalizeComparable(phraseInContext),
      )
    ) {
      throw new AiContextContractError("phraseInContext must occur in the trusted example");
    }
  }

  return {
    suggestedHeadword,
    meaningInContextZh: boundedText(
      record.meaningInContextZh,
      "meaningInContextZh",
      160,
    ),
    grammarRoleZh: boundedText(record.grammarRoleZh, "grammarRoleZh", 80),
    contextExplanationZh: boundedText(
      record.contextExplanationZh,
      "contextExplanationZh",
      400,
    ),
    phraseInContext,
  };
}
