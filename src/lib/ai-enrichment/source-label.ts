import type { VocabularyData, VocabularyItem } from "@/lib/vocabulary/types";

export function getVocabularySourceLabel(
  data: VocabularyData,
  item: VocabularyItem,
) {
  if (item.source === "json_file" || item.source === "json_paste") {
    return "Batch imported";
  }

  if (item.source === "manual") {
    return "Manual";
  }

  if (item.source === "ai_generated") {
    const creation = data.vocabularyCreationFacts.find(
      (fact) =>
        fact.personId === item.personId &&
        fact.originalVocabularyItemId === item.id &&
        fact.sourceKind === "ai_add_to_learning",
    );
    const draft = creation
      ? data.aiEnrichmentDrafts.find(
          (candidate) =>
            candidate.personId === item.personId &&
            candidate.id === creation.sourceActionId,
        )
      : null;
    const run = draft
      ? data.aiRuns.find(
          (candidate) =>
            candidate.personId === item.personId && candidate.id === draft.aiRunId,
        )
      : null;

    if (run?.provider === "local-fixture") {
      return "Local preview added";
    }
    if (run?.provider === "google-gemini-api") {
      return "AI added";
    }
    return "Suggestion added";
  }

  return "Text imported";
}
