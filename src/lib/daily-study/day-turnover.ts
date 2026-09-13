type StudyDayTurnover = Readonly<{
  dayEndsAt: string;
  getNow(): string | null;
  refresh(): Promise<Readonly<{ dayEndsAt: string }>>;
  onError(error: unknown): void;
}>;

/** Refresh an open Today view when its server-owned window ends, including after sleep. */
export function watchStudyDayTurnover(input: StudyDayTurnover) {
  let dayEndsAt = input.dayEndsAt;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let refreshing = false;

  const schedule = () => {
    if (stopped) return;
    clearTimeout(timeoutId);
    const now = input.getNow();
    const remaining = now ? Date.parse(dayEndsAt) - Date.parse(now) : Number.NaN;
    // Re-check the trusted clock periodically; a sleeping tab may miss its exact timer.
    const delay = Number.isFinite(remaining)
      ? Math.max(1, Math.min(60_000, remaining))
      : 60_000;
    timeoutId = setTimeout(checkBoundary, delay);
  };

  const checkBoundary = () => {
    if (stopped || refreshing) return;
    clearTimeout(timeoutId);
    const now = input.getNow();

    if (now && Date.parse(now) < Date.parse(dayEndsAt)) {
      schedule();
      return;
    }

    // Sleep or a clock correction can invalidate the server-clock estimate.
    // Resolve through the server again instead of trusting the device date.
    refreshing = true;
    void input.refresh()
      .then((today) => {
        if (!stopped) dayEndsAt = today.dayEndsAt;
      })
      .catch((error: unknown) => {
        if (!stopped) input.onError(error);
      })
      .finally(() => {
        refreshing = false;
        // An unavailable server should not trigger a tight retry loop.
        if (!stopped) timeoutId = setTimeout(checkBoundary, 60_000);
      });
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") checkBoundary();
  };

  window.addEventListener("focus", checkBoundary);
  document.addEventListener("visibilitychange", onVisible);
  schedule();

  return () => {
    stopped = true;
    clearTimeout(timeoutId);
    window.removeEventListener("focus", checkBoundary);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
