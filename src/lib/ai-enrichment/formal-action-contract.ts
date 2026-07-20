import { validateStoredAiEnrichmentDraft } from "./contract";
import type { AiEnrichmentDraft } from "./types";
import type { LearningTrack } from "@/lib/vocabulary/types";

export type PublicAiDraftDecision = Readonly<{
  draftId: string;
  action: "accept" | "reject";
  draft: AiEnrichmentDraft | null;
}>;

export type PublicAiCandidateAdd = Readonly<{
  draftId: string;
  candidateWord: string;
  surfaceText: string;
  meaningZh: string;
  example: string;
  exampleTranslationZh?: string;
  learningTrack: LearningTrack;
  timezone: string;
}>;

export class AiFormalActionContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiFormalActionContractError";
  }
}

function record(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AiFormalActionContractError("request must be an object");
  }
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new AiFormalActionContractError("request fields do not match the contract");
  }
}

function text(value: unknown, label: string, maximum: number, allowBlank = false) {
  if (typeof value !== "string") {
    throw new AiFormalActionContractError(`${label} must be text`);
  }
  const trimmed = value.trim();
  if ((!allowBlank && !trimmed) || [...trimmed].length > maximum) {
    throw new AiFormalActionContractError(`${label} is outside the allowed length`);
  }
  return trimmed;
}

export function validatePublicAiDraftDecision(value: unknown): PublicAiDraftDecision {
  const input = record(value);
  exactKeys(input, ["draftId", "action", "draft"]);
  if (input.action !== "accept" && input.action !== "reject") {
    throw new AiFormalActionContractError("action is unsupported");
  }
  if (input.action === "accept" && input.draft === null) {
    throw new AiFormalActionContractError("accept requires an edited draft");
  }
  if (input.action === "reject" && input.draft !== null) {
    throw new AiFormalActionContractError("reject does not accept draft content");
  }
  return {
    draftId: text(input.draftId, "draftId", 128),
    action: input.action,
    draft: input.draft === null
      ? null
      : validateStoredAiEnrichmentDraft(input.draft),
  };
}

export function validatePublicAiCandidateAdd(value: unknown): PublicAiCandidateAdd {
  const input = record(value);
  exactKeys(input, [
    "draftId",
    "candidateWord",
    "surfaceText",
    "meaningZh",
    "example",
    "exampleTranslationZh",
    "learningTrack",
    "timezone",
  ]);
  if (input.learningTrack !== "recognition" && input.learningTrack !== "active") {
    throw new AiFormalActionContractError("learningTrack is unsupported");
  }
  return {
    draftId: text(input.draftId, "draftId", 128),
    candidateWord: text(input.candidateWord, "candidateWord", 80),
    surfaceText: text(input.surfaceText, "surfaceText", 120),
    meaningZh: text(input.meaningZh, "meaningZh", 240, true),
    example: text(input.example, "example", 600, true),
    exampleTranslationZh: text(
      input.exampleTranslationZh,
      "exampleTranslationZh",
      600,
      !String(input.example ?? "").trim(),
    ),
    learningTrack: input.learningTrack,
    timezone: text(input.timezone, "timezone", 120),
  };
}
