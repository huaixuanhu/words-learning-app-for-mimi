import { memo } from "react";
import type { LearningRhythmPoint } from "@/lib/dashboard/insights";

type LearningRhythmChartProps = Readonly<{
  points: readonly LearningRhythmPoint[];
  period: 7 | 14;
  onPeriodChange: (period: 7 | 14) => void;
}>;

function localDateLabel(localDate: string, includeMonth: boolean) {
  const date = new Date(`${localDate}T00:00:00.000Z`);

  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    weekday: "short",
    ...(includeMonth ? { day: "numeric", month: "short" } : {}),
  }).format(date);
}

function barHeight(value: number, maximum: number) {
  if (value <= 0 || maximum <= 0) return 0;
  return Math.max(8, Math.round((value / maximum) * 100));
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export const LearningRhythmChart = memo(function LearningRhythmChart({
  points,
  period,
  onPeriodChange,
}: LearningRhythmChartProps) {
  const visiblePoints = points.slice(-period);
  const maximum = Math.max(
    1,
    ...visiblePoints.flatMap((point) => [point.entries, point.attempts]),
  );
  const totalEntries = visiblePoints.reduce((sum, point) => sum + point.entries, 0);
  const totalAttempts = visiblePoints.reduce((sum, point) => sum + point.attempts, 0);
  const hasActivity = totalEntries > 0 || totalAttempts > 0;

  return (
    <section className="rounded-lg border border-[var(--mimi-border)] bg-[var(--mimi-surface)] p-3 sm:p-4" aria-labelledby="learning-rhythm-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 id="learning-rhythm-title" className="mimi-display-title text-lg text-[var(--mimi-text)]">
              Learning rhythm
            </h3>
            <span className="mimi-pill-muted px-2 py-0.5 text-[0.68rem] font-semibold">Actual</span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--mimi-text-soft)]">
            Completed entries · All attempts
          </p>
        </div>
        <div className="inline-flex rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-muted)] p-0.5" role="group" aria-label="Learning rhythm range">
          {([7, 14] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              onClick={() => onPeriodChange(value)}
              className={`mimi-focus-ring min-h-9 rounded px-2.5 text-xs font-semibold transition-colors ${
                period === value
                  ? "bg-[var(--mimi-surface-strong)] text-[var(--mimi-primary-deep)] shadow-sm"
                  : "text-[var(--mimi-text-soft)]"
              }`}
            >
              {value} days
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--mimi-text-soft)]" aria-label={`${totalEntries} completed entries and ${totalAttempts} attempts in ${period} days`}>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm bg-[var(--mimi-primary)]" />
          Entries · {totalEntries}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-sm border border-[#9a8758] bg-[var(--mimi-amber)]" />
          Attempts · {totalAttempts}
        </span>
      </div>

      {hasActivity ? (
        <figure className="mt-4" aria-label={`Learning rhythm over the last ${period} days`}>
          <div
            className="grid h-36 items-end gap-1.5 border-b border-[var(--mimi-border)] px-1"
            style={{ gridTemplateColumns: `repeat(${visiblePoints.length}, minmax(0, 1fr))` }}
          >
            {visiblePoints.map((point, index) => {
              const showDate = period === 7 || index % 2 === 0 || index === visiblePoints.length - 1;

              return (
                <div
                  key={point.localDate}
                  role="img"
                  className="flex h-full min-w-0 flex-col justify-end"
                  aria-label={`${localDateLabel(point.localDate, true)}: ${countLabel(point.entries, "completed entry", "completed entries")}, ${countLabel(point.attempts, "attempt")}`}
                >
                  <div aria-hidden="true" className="flex h-[6.5rem] items-end justify-center gap-0.5">
                    <span
                      className="w-[42%] max-w-4 rounded-t-sm bg-[var(--mimi-primary)]"
                      style={{ height: `${barHeight(point.entries, maximum)}%` }}
                    />
                    <span
                      className="w-[42%] max-w-4 rounded-t-sm border border-[#9a8758] bg-[var(--mimi-amber)]"
                      style={{ height: `${barHeight(point.attempts, maximum)}%` }}
                    />
                  </div>
                  <span className="mt-1 h-5 truncate text-center text-[0.62rem] leading-5 text-[var(--mimi-text-muted)]">
                    {showDate ? localDateLabel(point.localDate, false) : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </figure>
      ) : (
        <p className="mt-4 rounded-md border border-dashed border-[var(--mimi-border-strong)] bg-[var(--mimi-surface-muted)] px-3 py-7 text-center text-sm text-[var(--mimi-text-soft)]">
          No study activity in this window yet.
        </p>
      )}
    </section>
  );
});
