import { describe, expect, it } from "vitest";
import { createEmptyVocabularyData, addVocabularyItem } from "./repository";
import { findSelectedPersonVocabularyDuplicate } from "./context-word-actions";

describe("context word manual-add duplicate check", () => {
  it("matches normalized selected-person entries including archived entries", () => {
    const now = "2026-07-14T00:00:00.000Z";
    const initial = createEmptyVocabularyData(now);
    const added = addVocabularyItem(initial, {
      surfaceText: "Well-known",
      source: "manual",
      timezone: "Australia/Melbourne",
    }, now);
    const archived = {
      ...added.data,
      items: added.data.items.map((item) => ({
        ...item,
        status: "archived" as const,
        archivedAt: now,
      })),
    };

    expect(findSelectedPersonVocabularyDuplicate(archived, "  well-known  ")?.id).toBe(
      added.item.id,
    );
    expect(findSelectedPersonVocabularyDuplicate(archived, "different")).toBeNull();
  });
});
