import type { ReviewEvent, ReviewSettings, ReviewState } from "@/lib/review/types";

export type VocabularySource = "manual" | "txt_file" | "pasted_text";

export type VocabularyStatus = "new" | "archived";

export type ImportSourceType = "txt_file" | "pasted_text";

export type ImportCandidateStatus = "new" | "duplicate" | "invalid";

export type VocabularyItem = {
  id: string;
  surfaceText: string;
  normalizedText: string;
  meaningZh: string;
  example: string;
  notes: string;
  rarityScore: number | null;
  source: VocabularySource;
  importBatchId: string | null;
  status: VocabularyStatus;
  createdAt: string;
  systemCreatedAt: string;
  updatedAt: string;
  timezone: string;
  archivedAt: string | null;
};

export type ImportBatch = {
  id: string;
  sourceType: ImportSourceType;
  fileName: string | null;
  createdAt: string;
  totalRows: number;
  acceptedRows: number;
  duplicateRows: number;
  invalidRows: number;
};

export type ImportCandidate = {
  tempId: string;
  lineNumber: number;
  rawLine: string;
  surfaceText: string;
  normalizedText: string;
  meaningZh: string;
  example: string;
  rarityScore: number | null;
  status: ImportCandidateStatus;
  errors: string[];
};

export type VocabularyData = {
  schemaVersion: 2;
  items: VocabularyItem[];
  importBatches: ImportBatch[];
  reviewStates: ReviewState[];
  reviewEvents: ReviewEvent[];
  settings: ReviewSettings;
  updatedAt: string;
};

export type NewVocabularyInput = {
  id?: string;
  surfaceText: string;
  meaningZh?: string;
  example?: string;
  notes?: string;
  rarityScore?: number | null;
  source: VocabularySource;
  importBatchId?: string | null;
  createdAt?: string;
  systemCreatedAt?: string;
  updatedAt?: string;
  timezone: string;
};

export type UpdateVocabularyInput = Partial<
  Pick<
    VocabularyItem,
    | "surfaceText"
    | "meaningZh"
    | "example"
    | "notes"
    | "rarityScore"
    | "createdAt"
    | "timezone"
  >
>;

export type ImportBatchInput = {
  id?: string;
  sourceType: ImportSourceType;
  fileName?: string | null;
};

export type ImportCommitResult = {
  data: VocabularyData;
  batch: ImportBatch;
  items: VocabularyItem[];
};
