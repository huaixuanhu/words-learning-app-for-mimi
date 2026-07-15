import Link from "next/link";
import { ArrowRight, AudioWaveform, BookOpen } from "lucide-react";
import type { DailyStudyTrackSummary, ReviewProfile } from "@/lib/daily-study/types";
import { TodayGoalsForm } from "./today-goals-form";

type DailyTrackCardProps = Readonly<{
  personId: string;
  localDate: string;
  profile: ReviewProfile;
  track: DailyStudyTrackSummary;
  onSaveGoals: Parameters<typeof TodayGoalsForm>[0]["onSave"];
}>;

const metricLabels = [
  ["addedToday", "Added today"],
  ["suggestedReview", "Suggested review"],
  ["reviewGoal", "Review goal"],
  ["newWordGoal", "New-word goal"],
  ["reviewedToday", "Reviewed today"],
  ["learnedToday", "Learned today"],
] as const;

export function DailyTrackCard({
  personId,
  localDate,
  profile,
  track,
  onSaveGoals,
}: DailyTrackCardProps) {
  const recognition = profile === "recognition";
  const Icon = recognition ? BookOpen : AudioWaveform;

  return (
    <section className="mimi-card grid gap-4 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-[var(--mimi-text-muted)]">
            {recognition ? "Reading and meaning" : "Recall and sound"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--mimi-text)]">
            {recognition ? "Recognition Vocabulary" : "Active Vocabulary"}
          </h2>
        </div>
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-md bg-[var(--mimi-primary-soft)] text-[var(--mimi-primary-deep)]">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      </div>

      {track.status === "available" ? (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {metricLabels.map(([key, label]) => (
              <div key={key} className="rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-muted)] px-3 py-2.5">
                <p className="text-xs leading-4 text-[var(--mimi-text-soft)]">{label}</p>
                <p className="mt-1 text-xl font-semibold text-[var(--mimi-text)]">{track.metrics[key]}</p>
              </div>
            ))}
          </div>

          {recognition ? (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/review?zone=review"
                className="mimi-button mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
              >
                Review
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/review?zone=new"
                className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
              >
                New Words
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/practice-lab?zone=review"
                className="mimi-button mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
              >
                Review
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/practice-lab?zone=new"
                className="mimi-button-secondary mimi-focus-ring inline-flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
              >
                New Words
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          )}

          <TodayGoalsForm
            personId={personId}
            localDate={localDate}
            track={track}
            onSave={onSaveGoals}
          />
        </>
      ) : (
        <p className="rounded-md border border-dashed border-[var(--mimi-border-strong)] p-4 text-sm leading-6 text-[var(--mimi-text-soft)]">
          This Track is temporarily unavailable.
        </p>
      )}
    </section>
  );
}
