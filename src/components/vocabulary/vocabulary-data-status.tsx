"use client";

type VocabularyDataStatusProps = Readonly<{
  isLoaded: boolean;
  loadError: string | null;
  isRefreshing: boolean;
  onRetry(): void;
}>;

export function VocabularyDataStatus({
  isLoaded,
  loadError,
  isRefreshing,
  onRetry,
}: VocabularyDataStatusProps) {
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
            ? isLoaded ? "Your Library couldn’t refresh" : "Your words couldn’t be loaded"
            : "Loading your words…"}
        </h2>
        {loadError ? (
          <>
            {isLoaded ? (
              <p className="mt-2 text-sm leading-6 text-[var(--mimi-text-soft)]">
                Showing the last loaded data.
              </p>
            ) : null}
            <p className="mt-2 text-sm leading-6 text-[var(--mimi-text-soft)]">{loadError}</p>
            <button
              type="button"
              disabled={isRefreshing}
              onClick={onRetry}
              className="mimi-button mimi-focus-ring mt-4 inline-flex min-h-11 items-center justify-center px-4 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
            >
              {isRefreshing ? "Retrying…" : "Retry"}
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
