import type { VocabularyData, VocabularyItem } from "@/lib/vocabulary/types";

export const VOCABULARY_CSV_COLUMNS = [
  "personId",
  "personDisplayName",
  "id",
  "surfaceText",
  "normalizedText",
  "meaningZh",
  "example",
  "notes",
  "rarityScore",
  "learningTrack",
  "tags",
  "source",
  "importBatchId",
  "status",
  "createdAt",
  "systemCreatedAt",
  "updatedAt",
  "timezone",
  "archivedAt",
] as const;

type VocabularyCsvColumn = (typeof VOCABULARY_CSV_COLUMNS)[number];

export function escapeCsvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function getVocabularyCsvValue(data: VocabularyData, item: VocabularyItem, column: VocabularyCsvColumn) {
  if (column === "personDisplayName") {
    return data.people.find((person) => person.id === item.personId)?.displayName ?? "";
  }

  if (column === "tags") {
    return item.tags?.join("|") ?? "";
  }

  return item[column];
}

export function exportVocabularyCsv(data: VocabularyData) {
  const rows = [
    VOCABULARY_CSV_COLUMNS.map(escapeCsvValue).join(","),
    ...data.items.map((item) =>
      VOCABULARY_CSV_COLUMNS.map((column) => escapeCsvValue(getVocabularyCsvValue(data, item, column))).join(","),
    ),
  ];

  return rows.join("\n");
}
