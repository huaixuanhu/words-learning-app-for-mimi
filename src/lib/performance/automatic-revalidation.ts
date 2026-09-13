/** Bounds unsolicited cross-tab/online refreshes; user retries remain separate. */
export function createAutomaticRevalidator(options: {
  run(): Promise<boolean>;
  isVisible(): boolean;
  minimumIntervalMs?: number;
  maximumFailures?: number;
}) {
  const interval = options.minimumIntervalMs ?? 30_000;
  const maximumFailures = options.maximumFailures ?? 3;
  let dirty = false;
  let inFlight = false;
  let disposed = false;
  let failures = 0;
  let lastStartedAt = -Infinity;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function schedule() {
    if (disposed || !dirty || inFlight || timer || failures >= maximumFailures || !options.isVisible()) return;
    const delay = Math.max(0, interval - (Date.now() - lastStartedAt));
    if (delay > 0) {
      timer = setTimeout(() => { timer = null; schedule(); }, delay);
      return;
    }
    dirty = false;
    inFlight = true;
    lastStartedAt = Date.now();
    void (async () => {
      try {
        failures = await options.run() ? 0 : failures + 1;
      } catch {
        failures += 1;
      } finally {
        inFlight = false;
        schedule();
      }
    })();
  }

  return {
    request() { dirty = true; schedule(); },
    resume() { schedule(); },
    reset() {
      failures = 0;
      dirty = false;
      if (timer) clearTimeout(timer);
      timer = null;
    },
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
