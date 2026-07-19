export type ServerClockAnchor = Readonly<{
  serverTimeMs: number;
  monotonicTimeMs: number;
  wallTimeMs: number;
}>;

export const SERVER_CLOCK_MAX_DRIFT_MS = 60_000;

export function createServerClockAnchor(
  serverNow: string,
  monotonicTimeMs: number,
  wallTimeMs: number,
): ServerClockAnchor | null {
  const serverTimeMs = new Date(serverNow).getTime();

  if (
    !Number.isFinite(serverTimeMs) ||
    !Number.isFinite(monotonicTimeMs) ||
    !Number.isFinite(wallTimeMs)
  ) {
    return null;
  }

  return { serverTimeMs, monotonicTimeMs, wallTimeMs };
}

export function estimateServerNow(
  anchor: ServerClockAnchor,
  monotonicTimeMs: number,
  wallTimeMs: number,
) {
  const monotonicElapsedMs = monotonicTimeMs - anchor.monotonicTimeMs;
  const wallElapsedMs = wallTimeMs - anchor.wallTimeMs;

  if (
    !Number.isFinite(monotonicElapsedMs) ||
    !Number.isFinite(wallElapsedMs) ||
    monotonicElapsedMs < 0 ||
    wallElapsedMs < 0 ||
    Math.abs(monotonicElapsedMs - wallElapsedMs) > SERVER_CLOCK_MAX_DRIFT_MS
  ) {
    return null;
  }

  return new Date(anchor.serverTimeMs + monotonicElapsedMs).toISOString();
}
