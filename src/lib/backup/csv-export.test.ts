import { describe, expect, it } from "vitest";
import { addVocabularyItem, createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import { escapeCsvValue, exportVocabularyCsv } from "./csv-export";

describe("vocabulary CSV export", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(escapeCsvValue('alpha, "beta"\nline two')).toBe('"alpha, ""beta""\nline two"');
    expect(escapeCsvValue(null)).toBe("");
    expect(escapeCsvValue(3)).toBe("3");
  });

  it("exports vocabulary rows with stable headers", () => {
    const result = addVocabularyItem(
      createEmptyVocabularyData("2026-07-05T00:00:00.000Z"),
      {
        id: "vocab-1",
        surfaceText: 'allocate, "time" card',
        meaningZh: "分配\n时间",
        example: "Allocate time wisely.",
        notes: "",
        rarityScore: 3,
        learningTrack: "active",
        tags: ["PTE", "Writing"],
        source: "manual",
        timezone: "Australia/Melbourne",
      },
      "2026-07-05T00:01:00.000Z",
    );
    const csv = exportVocabularyCsv(result.data);

    expect(csv.split("\n")[0]).toBe(
      "personId,personDisplayName,id,surfaceText,normalizedText,meaningZh,example,notes,rarityScore,learningTrack,tags,source,importBatchId,status,createdAt,systemCreatedAt,updatedAt,timezone,archivedAt",
    );
    expect(csv).toContain("person_mimi,Mimi");
    expect(csv).toContain('"allocate, ""time"" card"');
    expect(csv).toContain("active,PTE|Writing");
    expect(csv).toContain("分配 时间");
  });
});
