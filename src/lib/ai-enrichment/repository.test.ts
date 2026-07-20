import { describe, expect, it } from "vitest";
import { createEmptyVocabularyData, addVocabularyItem } from "@/lib/vocabulary/repository";
import {
  addAcceptedAiCandidateToLearning,
  createLocalFixtureDraft,
  decideAiEnrichmentDraft,
} from "./repository";
import {
  parseVocabularyBackupText,
  serializeVocabularyBackup,
} from "@/lib/backup/json-backup";
import type { AiEnrichmentDraft } from "./types";

const now = "2026-07-15T00:00:00.000Z";
const draft = {
  additionalMeaningsZh: [],
  sourceExampleTranslationsZh: ["适应新的日常安排需要时间。"],
  examples: ["People adapt gradually."],
  exampleTranslationsZh: ["人们逐渐适应。"],
  similarWords: [],
  confusableWords: [
    {
      word: "adopt",
      type: "spelling" as const,
      differenceZh: "adapt 表示适应；adopt 常表示采纳或收养。",
      examplePair: ["We adapt to change.", "We adopt a new policy."],
      examplePairTranslationsZh: ["我们适应变化。", "我们采纳一项新政策。"],
    },
  ],
};

function sourceData() {
  const empty = createEmptyVocabularyData(now);
  return addVocabularyItem(
    empty,
    {
      surfaceText: "adapt",
      meaningZh: "适应",
      meaningsZh: ["适应"],
      example: "It takes time to adapt to a new routine.",
      examples: ["It takes time to adapt to a new routine."],
      source: "manual",
      timezone: "Australia/Melbourne",
    },
    now,
  );
}

describe("V2 Stage 7A accepted enrichment lifecycle", () => {
  it("stores honest local lineage and reuses a valid source cache", () => {
    const source = sourceData();
    const first = createLocalFixtureDraft(source.data, source.item.id, draft, now);
    const replay = createLocalFixtureDraft(first.data, source.item.id, draft, now);

    expect(first.run).toMatchObject({
      provider: "local-fixture",
      model: "fixture-v1",
      inputTokens: 0,
      estimatedCostUsd: 0,
    });
    expect(replay.cacheStatus).toBe("cached");
    expect(replay.data.aiRuns).toHaveLength(1);
  });

  it("requires explicit acceptance and rejects stale source content", () => {
    const source = sourceData();
    const staged = createLocalFixtureDraft(source.data, source.item.id, draft, now);
    const accepted = decideAiEnrichmentDraft(
      staged.data,
      staged.draft.id,
      "accepted",
      draft,
      "2026-07-15T00:01:00.000Z",
    );
    expect(accepted.draft.status).toBe("accepted");
    expect(accepted.draft.acceptedContent).toEqual(draft);

    const second = createLocalFixtureDraft(source.data, source.item.id, draft, now);
    const edited = {
      ...second.data,
      items: second.data.items.map((item) =>
        item.id === source.item.id ? { ...item, meaningsZh: ["改变后的释义"] } : item,
      ),
    };
    expect(() =>
      decideAiEnrichmentDraft(edited, second.draft.id, "accepted", draft, now),
    ).toThrow("changed after the preview");
  });

  it("adds an accepted candidate once and records its relation lineage", () => {
    const source = sourceData();
    const staged = createLocalFixtureDraft(source.data, source.item.id, draft, now);
    const accepted = decideAiEnrichmentDraft(
      staged.data,
      staged.draft.id,
      "accepted",
      draft,
      now,
    );
    const added = addAcceptedAiCandidateToLearning(
      accepted.data,
      {
        draftId: accepted.draft.id,
        candidateWord: "adopt",
        surfaceText: "adopt",
        meaningZh: "采纳；收养",
        example: "We adopt a new policy.",
        exampleTranslationZh: "我们采纳一项新政策。",
        learningTrack: "active",
        timezone: "Australia/Melbourne",
      },
      now,
    );
    const duplicate = addAcceptedAiCandidateToLearning(
      added.data,
      {
        draftId: accepted.draft.id,
        candidateWord: "adopt",
        surfaceText: "adopt",
        meaningZh: "采纳；收养",
        example: "We adopt a new policy.",
        exampleTranslationZh: "我们采纳一项新政策。",
        learningTrack: "recognition",
        timezone: "Australia/Melbourne",
      },
      now,
    );

    expect(added.created).toBe(true);
    expect(added.item).toMatchObject({ source: "ai_generated", learningTrack: "active" });
    expect(added.data.vocabularyCreationFacts[0]).toMatchObject({
      sourceKind: "ai_add_to_learning",
      sourceActionId: accepted.draft.id,
    });
    expect(added.data.vocabularyRelations[0]).toMatchObject({
      sourceVocabularyItemId: source.item.id,
      targetVocabularyItemId: added.item.id,
      relationType: "spelling",
      aiRunId: staged.run.id,
    });
    expect(duplicate.created).toBe(false);
    expect(duplicate.data.items.filter((item) => item.normalizedText === "adopt")).toHaveLength(1);
  });

  it("refuses to link a candidate after the accepted source changes", () => {
    const source = sourceData();
    const staged = createLocalFixtureDraft(source.data, source.item.id, draft, now);
    const accepted = decideAiEnrichmentDraft(
      staged.data,
      staged.draft.id,
      "accepted",
      draft,
      now,
    );
    const changed = {
      ...accepted.data,
      items: accepted.data.items.map((item) =>
        item.id === source.item.id
          ? { ...item, meaningsZh: [...item.meaningsZh, "改变后的释义"] }
          : item,
      ),
    };

    expect(() =>
      addAcceptedAiCandidateToLearning(
        changed,
        {
          draftId: accepted.draft.id,
          candidateWord: "adopt",
          surfaceText: "adopt",
          meaningZh: "采纳；收养",
          example: "We adopt a new policy.",
          exampleTranslationZh: "我们采纳一项新政策。",
          learningTrack: "active",
          timezone: "Australia/Melbourne",
        },
        now,
      ),
    ).toThrow("changed after the preview");
    expect(changed.items.some((item) => item.normalizedText === "adopt")).toBe(false);
    expect(changed.vocabularyRelations).toHaveLength(0);
  });

  it("treats an edited target as a manual add without AI relation lineage", () => {
    const source = sourceData();
    const staged = createLocalFixtureDraft(source.data, source.item.id, draft, now);
    const accepted = decideAiEnrichmentDraft(
      staged.data,
      staged.draft.id,
      "accepted",
      draft,
      now,
    );

    const manuallyEdited = addAcceptedAiCandidateToLearning(
        accepted.data,
        {
          draftId: accepted.draft.id,
          candidateWord: "adopt",
          surfaceText: "unrelated",
          meaningZh: "不相关",
          example: "This target is unrelated.",
          exampleTranslationZh: "这个目标并不相关。",
          learningTrack: "recognition",
          timezone: "Australia/Melbourne",
        },
        now,
      );

    expect(manuallyEdited.item.source).toBe("manual");
    expect(manuallyEdited.relationLinked).toBe(false);
    expect(manuallyEdited.data.vocabularyRelations).toHaveLength(0);
    expect(manuallyEdited.data.vocabularyCreationFacts[0].sourceKind).toBe("single");
  });

  it("deduplicates a stable relation across later accepted runs", () => {
    const source = sourceData();
    const first = createLocalFixtureDraft(source.data, source.item.id, draft, now);
    const acceptedFirst = decideAiEnrichmentDraft(
      first.data,
      first.draft.id,
      "accepted",
      draft,
      now,
    );
    const linked = addAcceptedAiCandidateToLearning(
      acceptedFirst.data,
      {
        draftId: acceptedFirst.draft.id,
        candidateWord: "adopt",
        surfaceText: "adopt",
        meaningZh: "采纳",
        example: "We adopt a policy.",
        exampleTranslationZh: "我们采纳一项政策。",
        learningTrack: "recognition",
        timezone: "Australia/Melbourne",
      },
      now,
    );
    const changedSource = {
      ...linked.data,
      items: linked.data.items.map((item) =>
        item.id === source.item.id
          ? {
              ...item,
              examples: [...item.examples, "People adapt over time."],
              exampleTranslationsZh: [
                ...(item.exampleTranslationsZh ?? []),
                "人们会逐渐适应。",
              ],
            }
          : item,
      ),
    };
    const second = createLocalFixtureDraft(
      changedSource,
      source.item.id,
      {
        ...draft,
        sourceExampleTranslationsZh: [
          "适应新的日常安排需要时间。",
          "人们会逐渐适应。",
        ],
        examples: ["People can adapt gradually."],
      },
      "2026-07-16T00:00:00.000Z",
    );
    const acceptedSecond = decideAiEnrichmentDraft(
      second.data,
      second.draft.id,
      "accepted",
      second.draft.draft,
      "2026-07-16T00:01:00.000Z",
    );
    const relinked = addAcceptedAiCandidateToLearning(
      acceptedSecond.data,
      {
        draftId: acceptedSecond.draft.id,
        candidateWord: "adopt",
        surfaceText: "adopt",
        meaningZh: "采纳",
        example: "We adopt a policy.",
        exampleTranslationZh: "我们采纳一项政策。",
        learningTrack: "recognition",
        timezone: "Australia/Melbourne",
      },
      "2026-07-16T00:02:00.000Z",
    );

    expect(relinked.data.vocabularyRelations).toHaveLength(1);
    expect(relinked.data.vocabularyRelations[0].aiRunId).toBe(first.run.id);
  });

  it("round-trips accepted local lineage while excluding undecided previews", () => {
    const source = sourceData();
    const staged = createLocalFixtureDraft(source.data, source.item.id, draft, now);
    const accepted = decideAiEnrichmentDraft(
      staged.data,
      staged.draft.id,
      "accepted",
      draft,
      now,
    );
    const secondDraft = createLocalFixtureDraft(
      {
        ...accepted.data,
        items: accepted.data.items.map((item) =>
          item.id === source.item.id
            ? {
                ...item,
                examples: [...item.examples, draft.examples[0]],
                exampleTranslationsZh: [
                  ...(item.exampleTranslationsZh ?? []),
                  "人们逐渐适应。",
                ],
              }
            : item,
        ),
      },
      source.item.id,
      {
        ...draft,
        sourceExampleTranslationsZh: [
          "适应新的日常安排需要时间。",
          "人们逐渐适应。",
        ],
        examples: ["A second local preview stays temporary."],
      },
      "2026-07-15T00:02:00.000Z",
    );
    const serialized = serializeVocabularyBackup(secondDraft.data, {
      exportedAt: "2026-07-15T00:03:00.000Z",
      timezone: "Australia/Melbourne",
    });
    const parsed = parseVocabularyBackupText(serialized, "2026-07-15T00:04:00.000Z");

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.errors.join("; "));
    expect(parsed.data.aiRuns).toHaveLength(1);
    expect(parsed.data.aiRuns[0].provider).toBe("local-fixture");
    expect(parsed.data.aiEnrichmentDrafts).toHaveLength(1);
    expect(parsed.data.aiEnrichmentDrafts[0].status).toBe("accepted");
  });

  it("rejects dishonest fixture lineage and invalid accepted content on restore", () => {
    const source = sourceData();
    const staged = createLocalFixtureDraft(source.data, source.item.id, draft, now);
    const accepted = decideAiEnrichmentDraft(
      staged.data,
      staged.draft.id,
      "accepted",
      draft,
      now,
    );
    const serialized = serializeVocabularyBackup(accepted.data, {
      exportedAt: now,
      timezone: "Australia/Melbourne",
    });
    const dishonest = JSON.parse(serialized) as {
      data: {
        aiRuns: Array<{ modelLabel: string }>;
        aiEnrichmentDrafts: Array<{
          draft: AiEnrichmentDraft;
          acceptedContent: AiEnrichmentDraft;
        }>;
      };
    };
    dishonest.data.aiRuns[0].modelLabel = "Gemini 3.1 Flash-Lite";
    const dishonestResult = parseVocabularyBackupText(JSON.stringify(dishonest), now);

    expect(dishonestResult.ok).toBe(false);
    if (dishonestResult.ok) throw new Error("dishonest fixture lineage was accepted");
    expect(dishonestResult.errors.join(" ")).toContain(
      "local-fixture lineage is inconsistent",
    );

    const invalidContent = JSON.parse(serialized) as typeof dishonest;
    const invalidDraft = {
      ...invalidContent.data.aiEnrichmentDrafts[0].draft,
      examples: ["https://example.com/untrusted"],
    };
    invalidContent.data.aiEnrichmentDrafts[0].draft = invalidDraft;
    invalidContent.data.aiEnrichmentDrafts[0].acceptedContent = invalidDraft;
    const invalidResult = parseVocabularyBackupText(JSON.stringify(invalidContent), now);

    expect(invalidResult.ok).toBe(false);
    if (invalidResult.ok) throw new Error("invalid AI content was accepted");
    expect(invalidResult.errors.join(" ")).toContain("must not contain a URL");
  });
});
