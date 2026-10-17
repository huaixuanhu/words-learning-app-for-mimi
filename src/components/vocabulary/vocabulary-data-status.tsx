"use client";

import { useState } from "react";
import { PendingSaveRecoveryDialog, type PendingSaveRecovery } from "./pending-save-recovery";

type VocabularyDataStatusProps = Readonly<{
  isLoaded: boolean;
  loadError: string | null;
  isRefreshing: boolean;
  onRetry(): void;
  recovery?: PendingSaveRecovery | null;
  onContinue?(recovery: PendingSaveRecovery): Promise<void>;
}>;

export function VocabularyDataStatus({
  isLoaded,
  loadError,
  isRefreshing,
  onRetry,
  recovery,
  onContinue,
}: VocabularyDataStatusProps) {
  const [review, setReview] = useState<PendingSaveRecovery | null>(null);
  if (isLoaded && !loadError) {
    return null;
  }

  return (
    <section
      role={loadError ? "alert" : "status"}
      aria-busy={isRefreshing}
      aria-label="Saved words connection"
      className={`mx-auto w-full max-w-5xl px-4 sm:px-6 ${isLoaded ? "pt-4" : "py-12 sm:py-20"}`}
    >
      <div className="mimi-panel p-5 sm:p-6">
        <h2 className="mimi-display-title text-xl text-[var(--mimi-text)]">
          {loadError
            ? recovery ? "Review your last save" : isLoaded ? "Your Library couldn’t refresh" : "Your words couldn’t be loaded"
            : "Loading your words…"}
        </h2>
        {loadError ? (
          <>
            {isLoaded ? (
              <p className="mt-2 text-sm leading-6 text-[var(--mimi-text-soft)]">
                {recovery ? "Your latest saved data is loaded. Check your recent change before continuing." : "Showing the last loaded data."}
              </p>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-[var(--mimi-text-soft)]">{recovery ? "The earlier save is still unconfirmed. You can continue after reviewing your saved words." : loadError}</p>
            <button
              type="button"
              disabled={isRefreshing}
              onClick={onRetry}
              className="mimi-button mimi-focus-ring mt-4 inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
            >
              {isRefreshing ? "Retrying…" : "Retry"}
            </button>
            {recovery && onContinue ? (
              <button type="button" disabled={isRefreshing} onClick={() => setReview(recovery)}
                className="mimi-button-secondary mimi-focus-ring mt-4 ml-3 inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold disabled:opacity-60">
                核对后继续
              </button>
            ) : null}
          </>
        ) : null}
      </div>
      {review && onContinue ? <PendingSaveRecoveryDialog
        key={`${review.requestId}:${review.snapshotFingerprint}`}
        recovery={review} onCancel={() => setReview(null)} onContinue={onContinue}
      /> : null}
    </section>
  );
}
