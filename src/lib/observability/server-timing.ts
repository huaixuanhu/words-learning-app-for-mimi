export type MimiServerTimingMetric = "mimi_storage" | "mimi_study";

export function addServerTiming(
  response: Response,
  metric: MimiServerTimingMetric,
  startedAt: number,
  endedAt = Date.now(),
) {
  const duration = Math.max(0, endedAt - startedAt);

  response.headers.set("server-timing", `${metric};dur=${duration}`);
  return response;
}
