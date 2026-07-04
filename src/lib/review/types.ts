export type ReviewRating = "forgot" | "hard" | "vague" | "remembered";

export type ReviewStateStatus = "learning" | "review";

export type ReviewState = {
  id: string;
  vocabularyItemId: string;
  status: ReviewStateStatus;
  dueAt: string;
  lastReviewedAt: string | null;
  reviewCount: number;
  lapseCount: number;
  intervalMinutes: number;
  difficulty: number | null;
  stability: number | null;
  updatedAt: string;
};

export type ReviewEvent = {
  id: string;
  vocabularyItemId: string;
  reviewedAt: string;
  rating: ReviewRating;
  previousDueAt: string | null;
  nextDueAt: string;
  previousIntervalMinutes: number | null;
  nextIntervalMinutes: number;
  elapsedMs: number;
};

export type ReviewSettings = {
  sessionLimit: number;
  timezone: string;
  updatedAt: string;
};
