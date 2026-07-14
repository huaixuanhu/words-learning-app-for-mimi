import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { memo } from "react";
import { CalmCard } from "@/components/ui/motion-primitives";
import type { DailyStudyTrackSummary } from "@/lib/daily-study/types";

const metricLabels = [
  ["addedToday", "Added"],
  ["suggestedReview", "Suggested"],
  ["reviewGoal", "Review goal"],
  ["newWordGoal", "New goal"],
  ["reviewedToday", "Reviewed"],
  ["learnedToday", "Learned"],
] as const;

type HomeTrackCardProps = Readonly<{
  title: string;
  eyebrow: string;
  description: string;
  track: DailyStudyTrackSummary | null;
  href: string;
  cta: string;
  Icon: typeof BookOpen;
  tone: string;
}>;

export const HomeTrackCard = memo(function HomeTrackCard({
  title,
  eyebrow,
  description,
  track,
  href,
  cta,
  Icon,
  tone,
}: HomeTrackCardProps) {
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
        <p className="text-sm leading-5 text-[var(--mimi-text-soft)]">{description}</p>

        <div className="grid grid-cols-3 gap-1.5">
          {metricLabels.map(([key, label]) => (
            <div key={key} className="rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-muted)] px-2 py-2">
              <p className="text-[0.68rem] leading-4 text-[var(--mimi-text-soft)]">{label}</p>
              <p className="mt-0.5 text-lg font-semibold text-[var(--mimi-text)]">
                {track?.status === "available" ? track.metrics[key] : "-"}
              </p>
            </div>
          ))}
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
