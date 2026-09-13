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
  let attempts = 0;
  let retryNotBefore = 0;

  const schedule = (minimumDelay = 0) => {
    if (stopped) return;
    clearTimeout(timeoutId);
    const now = input.getNow();
    const remaining = now ? Date.parse(dayEndsAt) - Date.parse(now) : Number.NaN;
    // Re-check the trusted clock periodically; a sleeping tab may miss its exact timer.
    const delay = Number.isFinite(remaining)
      ? Math.max(1, Math.min(60_000, remaining))
      : 60_000;
    timeoutId = setTimeout(checkBoundary, Math.max(minimumDelay, delay));
  };

  const checkBoundary = () => {
    if (stopped || refreshing) return;
    clearTimeout(timeoutId);
    const now = input.getNow();

    if (now && Date.parse(now) < Date.parse(dayEndsAt)) {
      attempts = 0;
      retryNotBefore = 0;
      schedule();
      return;
    }

    // Background tabs and repeated focus events must not keep the database awake.
    // The timer can still check the local clock after automatic retries are spent.
    if (document.visibilityState !== "visible" || attempts >= 3) {
      schedule(60_000);
      return;
    }
    if (Date.now() < retryNotBefore) {
      schedule(retryNotBefore - Date.now());
      return;
    }

    // Sleep or a clock correction can invalidate the server-clock estimate.
    // Resolve through the server again instead of trusting the device date.
    refreshing = true;
    attempts += 1;
    retryNotBefore = Date.now() + 60_000;
    void input.refresh()
      .then((today) => {
        if (!stopped) dayEndsAt = today.dayEndsAt;
      })
      .catch((error: unknown) => {
        if (!stopped) input.onError(error);
      })
      .finally(() => {
        refreshing = false;
        if (stopped) return;
        const refreshedNow = input.getNow();
        if (refreshedNow && Date.parse(refreshedNow) < Date.parse(dayEndsAt)) {
          attempts = 0;
          retryNotBefore = 0;
        } else if (attempts >= 3) {
          input.onError(new Error("Automatic study refresh paused. Reload this page to try again."));
        }
        schedule(60_000);
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
