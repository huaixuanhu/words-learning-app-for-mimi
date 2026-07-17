import { describe, expect, it } from "vitest";
import {
  validatePublicAiCandidateAdd,
  validatePublicAiDraftDecision,
} from "./formal-action-contract";

const draft = {
  additionalMeaningsZh: [],
  examples: ["People adapt gradually."],
  similarWords: [],
  confusableWords: [],
};

describe("V2-7B-1 formal AI action contracts", () => {
  it("requires edited content only for an explicit accept decision", () => {
    expect(validatePublicAiDraftDecision({
      draftId: "draft-1",
      action: "accept",
      draft,
    })).toMatchObject({ action: "accept", draft });
    expect(() => validatePublicAiDraftDecision({
      draftId: "draft-1",
      action: "accept",
      draft: null,
    })).toThrow("accept requires");
    expect(() => validatePublicAiDraftDecision({
      draftId: "draft-1",
      action: "reject",
      draft,
    })).toThrow("reject does not accept");
  });

  it("keeps Track selection explicit and rejects extra server-control fields", () => {
    const input = {
      draftId: "draft-1",
      candidateWord: "adopt",
      surfaceText: "adopt",
      meaningZh: "采用",
      example: "They adopt a policy.",
      learningTrack: "active",
      timezone: "Australia/Melbourne",
    };
    expect(validatePublicAiCandidateAdd(input)).toMatchObject({
      candidateWord: "adopt",
      learningTrack: "active",
    });
    expect(() => validatePublicAiCandidateAdd({ ...input, personId: "client-owned" }))
      .toThrow("fields do not match");
  });
});
