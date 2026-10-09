/** WFD is independent of vocabulary, review-track and server backup schemas. */
export type WfdSentence = {
  id: string;
  text: string;
  /** Empty means uncurated; never synthesize a translation during import. */
  translationZh: string;
  chunks: { text: string; cueZh: string; visualLabel?: string }[];
  source: {
    name: string;
    url: string;
    edition: string;
    retrievedAt: string;
    kind: "prediction" | "demo" | "user";
  };
  tags: string[];
  image?: string;
  visualKind?: "scene" | "sequence" | "diagram";
  animation?: "reveal" | "flow" | "timeline";
};

export type WfdAttempt = {
  id: string;
  sentenceId: string;
  submittedAt: string;
  mode: "recall" | "dictation";
  answer: string;
  assisted: boolean;
  playCount: number;
  correct: boolean;
  /** Local practice accuracy in [0, 1], not a Pearson score. */
  accuracy: number;
};

export type WfdProgress = {
  learnedAt?: string;
  dueAt?: string;
  lastAttemptAt?: string;
  intervalDays?: number;
  successfulReviews?: number;
  lapses?: number;
  lastIndependentSuccessAt?: string;
};

export type WfdData = {
  version: 1;
  personId: string;
  /** Imported content; built-in examples are shipped separately. */
  sentences: WfdSentence[];
  attempts: WfdAttempt[];
  progress: Record<string, WfdProgress>;
  updatedAt: string;
};

export type WfdGradeToken = {
  expected?: string;
  actual?: string;
  kind: "correct" | "missing" | "extra" | "changed";
};

export type WfdGrade = {
  correct: boolean;
  accuracy: number;
  expectedCount: number;
  correctCount: number;
  tokens: WfdGradeToken[];
};

export class WfdDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WfdDataError";
  }
}
