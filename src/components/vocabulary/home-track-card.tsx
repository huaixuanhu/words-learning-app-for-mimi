import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { memo } from "react";
import { CalmCard } from "@/components/ui/motion-primitives";
import type { DailyStudyTrackSummary } from "@/lib/daily-study/types";

const metricLabels = [
  ["addedToday", "Added today"],
  ["suggestedReview", "Suggested review"],
  ["reviewGoal", "Review goal"],
  ["newWordGoal", "New-word goal"],
] as const;

type HomeTrackCardProps = Readonly<{
  title: string;
  eyebrow: string;
  track: DailyStudyTrackSummary | null;
  href: string;
  cta: string;
  Icon: typeof BookOpen;
  tone: string;
}>;

type ProgressRowProps = Readonly<{
  label: string;
  actual: number | null;
  goal: number | null;
}>;

function ProgressRow({ label, actual, goal }: ProgressRowProps) {
  const percentage = actual !== null && goal !== null && goal > 0
    ? Math.min(100, Math.round((actual / goal) * 100))
    : 0;
  const valueLabel = actual === null || goal === null
    ? "-"
    : goal === 0
      ? `${actual} · No goal`
      : `${actual} / ${goal}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-[var(--mimi-text-soft)]">{label}</span>
        <span className="font-semibold text-[var(--mimi-text)]">{valueLabel}</span>
      </div>
      <div
        className="mimi-progress-track mt-1.5 h-1.5"
        role={goal !== null && goal > 0 ? "progressbar" : undefined}
        aria-label={goal !== null && goal > 0 ? label : undefined}
        aria-valuemin={goal !== null && goal > 0 ? 0 : undefined}
        aria-valuemax={goal !== null && goal > 0 ? goal : undefined}
        aria-valuenow={goal !== null && goal > 0 && actual !== null ? Math.min(actual, goal) : undefined}
        aria-valuetext={
          goal !== null && goal > 0 && actual !== null
            ? `${actual} completed, goal ${goal}`
            : undefined
        }
      >
        <div className="mimi-progress-fill h-full" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export const HomeTrackCard = memo(function HomeTrackCard({
  title,
  eyebrow,
  track,
  href,
  cta,
  Icon,
  tone,
}: HomeTrackCardProps) {
  const metrics = track?.status === "available" ? track.metrics : null;

  return (
    <CalmCard className="mimi-card h-full">
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-[var(--mimi-text-muted)]">{eyebrow}</p>
            <h3 className="mt-1.5 text-lg font-semibold text-[var(--mimi-text)]">{title}</h3>
          </div>
          <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-md ${tone}`}>
            <Icon aria-hidden="true" className="size-4.5" />
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {metricLabels.map(([key, label]) => (
            <div key={key} className="rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-muted)] px-2 py-2">
              <p className="text-[0.68rem] leading-4 text-[var(--mimi-text-soft)]">{label}</p>
              <p className="mt-0.5 text-lg font-semibold text-[var(--mimi-text)]">
                {metrics ? metrics[key] : "-"}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-2.5 rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface)] p-2.5">
          <p className="text-[0.68rem] font-semibold uppercase tracking-normal text-[var(--mimi-text-muted)]">
            Today’s progress · Actual
          </p>
          <ProgressRow
            label="Reviewed today"
            actual={metrics?.reviewedToday ?? null}
            goal={metrics?.reviewGoal ?? null}
          />
          <ProgressRow
            label="Learned today"
            actual={metrics?.learnedToday ?? null}
            goal={metrics?.newWordGoal ?? null}
          />
        </div>

        <Link
          href={href}
          className="mimi-button mimi-focus-ring mt-auto inline-flex min-h-11 w-fit items-center justify-center gap-2 px-3 text-sm font-semibold"
        >
          {cta}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </CalmCard>
  );
});
