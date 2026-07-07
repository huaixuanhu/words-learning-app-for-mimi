import type { PersonReviewSettings, ReviewEvent, ReviewState } from "@/lib/review/types";

export type VocabularySource = "manual" | "txt_file" | "pasted_text" | "json_file" | "json_paste";

export type VocabularyStatus = "new" | "archived";

export type ImportSourceType = "txt_file" | "pasted_text" | "json_file" | "json_paste";

export type ImportCandidateStatus = "new" | "duplicate" | "invalid";

export type LearningTrack = "recognition" | "active";

export type VocabularyTag = "PTE" | "IELTS" | "Listening" | "Writing" | "Spelling Risk";

export type Person = {
  id: string;
  displayName: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type VocabularyItem = {
  id: string;
  personId: string;
  surfaceText: string;
  normalizedText: string;
  meaningZh: string;
  example: string;
  notes: string;
  rarityScore: number | null;
  learningTrack: LearningTrack;
  tags: VocabularyTag[] | null;
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
  personId: string;
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
  notes: string;
  rarityScore: number | null;
  learningTrack: LearningTrack;
  tags: VocabularyTag[] | null;
  status: ImportCandidateStatus;
  errors: string[];
};

export type VocabularyData = {
  schemaVersion: 4;
  people: Person[];
  selectedPersonId: string;
  items: VocabularyItem[];
  importBatches: ImportBatch[];
  reviewStates: ReviewState[];
  reviewEvents: ReviewEvent[];
  settingsByPerson: PersonReviewSettings[];
  updatedAt: string;
};

export type NewVocabularyInput = {
  id?: string;
  personId?: string;
  surfaceText: string;
  meaningZh?: string;
  example?: string;
  notes?: string;
  rarityScore?: number | null;
  learningTrack?: LearningTrack;
  tags?: VocabularyTag[] | null;
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
    | "learningTrack"
    | "tags"
    | "createdAt"
    | "timezone"
  >
>;

export type ImportBatchInput = {
  id?: string;
  personId?: string;
  sourceType: ImportSourceType;
  fileName?: string | null;
};

export type ImportCommitResult = {
  data: VocabularyData;
  batch: ImportBatch;
  items: VocabularyItem[];
};
