import { describe, expect, it } from "vitest";
import {
  addAcceptedAiCandidateToLearning,
  createLocalFixtureDraft,
  decideAiEnrichmentDraft,
} from "./repository";
import { getVocabularySourceLabel } from "./source-label";
import {
  addVocabularyItem,
  createEmptyVocabularyData,
  deleteVocabularyItem,
  rollbackImportBatch,
} from "@/lib/vocabulary/repository";
import {
  parseVocabularyBackupText,
  serializeVocabularyBackup,
} from "@/lib/backup/json-backup";

const NOW = "2026-07-16T00:00:00.000Z";
const PREVIEW = {
  additionalMeaningsZh: [],
  examples: ["People adapt gradually."],
  similarWords: [],
  confusableWords: [
    {
      word: "adopt",
      type: "spelling" as const,
      differenceZh: "adapt 表示适应；adopt 常表示采纳或收养。",
      examplePair: ["We adapt to change.", "We adopt a new policy."],
    },
  ],
};

function localPreviewAddition() {
  const source = addVocabularyItem(
    createEmptyVocabularyData(NOW),
    {
      surfaceText: "adapt",
      meaningZh: "适应",
      examples: ["We adapt to change."],
      source: "manual",
      timezone: "Australia/Melbourne",
    },
    NOW,
  );
  const staged = createLocalFixtureDraft(source.data, source.item.id, PREVIEW, NOW);
  const accepted = decideAiEnrichmentDraft(
    staged.data,
    staged.draft.id,
    "accepted",
    PREVIEW,
    NOW,
  );
  const added = addAcceptedAiCandidateToLearning(
    accepted.data,
    {
      draftId: accepted.draft.id,
      candidateWord: "adopt",
      surfaceText: "adopt",
      meaningZh: "采纳；收养",
      example: "We adopt a new policy.",
      learningTrack: "active",
      timezone: "Australia/Melbourne",
    },
    NOW,
  );

  return { data: added.data, source: source.item, target: added.item };
}

describe("V2 Stage 7A vocabulary source labels", () => {
  it("shows the exact provider class while retained lineage exists", () => {
    const local = localPreviewAddition();
    expect(getVocabularySourceLabel(local.data, local.target)).toBe(
      "Local preview added",
    );

    const googleData = {
      ...local.data,
      aiRuns: local.data.aiRuns.map((run) => ({
        ...run,
        provider: "google-gemini-api" as const,
        model: "gemini-3.1-flash-lite",
        modelLabel: "Gemini 3.1 Flash-Lite",
      })),
    };
    expect(getVocabularySourceLabel(googleData, local.target)).toBe("AI added");
  });

  it("uses a neutral label after source deletion and backup round-trip", () => {
    const local = localPreviewAddition();
    const deleted = deleteVocabularyItem(local.data, local.source.id, NOW).data;
    const target = deleted.items.find((item) => item.id === local.target.id);
    if (!target) throw new Error("Derived target disappeared with its source");

    expect(getVocabularySourceLabel(deleted, target)).toBe("Suggestion added");
    const parsed = parseVocabularyBackupText(
      serializeVocabularyBackup(deleted, {
        exportedAt: NOW,
        timezone: "Australia/Melbourne",
      }),
      NOW,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.errors.join("; "));
    const restoredTarget = parsed.data.items.find((item) => item.id === target.id);
    if (!restoredTarget) throw new Error("Derived target did not restore");
    expect(getVocabularySourceLabel(parsed.data, restoredTarget)).toBe(
      "Suggestion added",
    );
  });

  it("uses the same neutral label after a source batch rollback", () => {
    const local = localPreviewAddition();
    const batchId = "batch-source-adapt";
    const batchBacked = {
      ...local.data,
      importBatches: [
        {
          id: batchId,
          personId: local.source.personId,
          sourceType: "json_paste" as const,
          fileName: null,
          createdAt: NOW,
          totalRows: 1,
          acceptedRows: 1,
          duplicateRows: 0,
          invalidRows: 0,
        },
        ...local.data.importBatches,
      ],
      items: local.data.items.map((item) =>
        item.id === local.source.id
          ? { ...item, source: "json_paste" as const, importBatchId: batchId }
          : item,
      ),
      vocabularyCreationFacts: local.data.vocabularyCreationFacts.map((fact) =>
        fact.originalVocabularyItemId === local.source.id
          ? { ...fact, sourceActionId: batchId, sourceKind: "batch" as const }
          : fact,
      ),
    };
    const rolledBack = rollbackImportBatch(batchBacked, batchId, NOW).data;
    const target = rolledBack.items.find((item) => item.id === local.target.id);
    if (!target) throw new Error("Derived target disappeared with its source batch");

    expect(getVocabularySourceLabel(rolledBack, target)).toBe("Suggestion added");
  });
});
