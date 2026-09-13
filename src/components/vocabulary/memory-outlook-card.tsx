import { memo } from "react";
import type {
  RetrievabilityBucket,
  ReviewLoadBucket,
} from "@/lib/dashboard/insights";

type MemoryOutlookCardProps = Readonly<{
  reviewLoad: readonly ReviewLoadBucket[];
  retrievability: readonly RetrievabilityBucket[];
  retrievabilityEligibleCount: number;
  calculatedAt: string;
  timezone: string;
}>;

const retrievabilityTone = {
  high: "bg-[var(--mimi-primary)]",
  middle: "border border-[var(--mimi-primary)] bg-[var(--mimi-primary-soft)]",
  lower: "border border-[var(--mimi-border-strong)] bg-[var(--mimi-surface-muted)]",
} as const;

function barHeight(value: number, maximum: number) {
  if (value <= 0 || maximum <= 0) return 0;
  return (value / maximum) * 100;
}

function entryCountLabel(count: number) {
  return `${count} ${count === 1 ? "entry" : "entries"}`;
}

export const MemoryOutlookCard = memo(function MemoryOutlookCard({
  reviewLoad,
  retrievability,
  retrievabilityEligibleCount,
  calculatedAt,
  timezone,
}: MemoryOutlookCardProps) {
  const reviewLoadTotal = reviewLoad.reduce((sum, bucket) => sum + bucket.count, 0);
  const reviewLoadMaximum = Math.max(1, ...reviewLoad.map((bucket) => bucket.count));

  return (
    <section className="min-w-0 border-t border-[var(--mimi-border)] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0" aria-labelledby="memory-outlook-title">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="memory-outlook-title" className="mimi-display-title text-lg text-[var(--mimi-text)]">
          Memory outlook
        </h3>
        <span className="mimi-pill-muted px-2 py-0.5 text-[0.68rem] font-semibold">FSRS estimate</span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-[var(--mimi-text)]">Review load</p>
          <p className="text-xs text-[var(--mimi-text-soft)]">
            Current schedule
          </p>
        </div>
        {reviewLoadTotal > 0 ? (
          <figure className="mt-2" aria-label="Estimated words to review by study day; Today includes earlier due words">
            <div className="grid h-24 grid-cols-5 items-end gap-2 border-b border-[var(--mimi-border)] px-1">
              {reviewLoad.map((bucket) => (
                <div
                  key={bucket.key}
                  role="img"
                  className="flex h-full min-w-0 flex-col justify-end"
                  aria-label={`${bucket.label}: ${entryCountLabel(bucket.count)}`}
                >
                  <span className="mb-1 text-center text-[0.68rem] font-semibold text-[var(--mimi-text)]">
                    {bucket.count}
                  </span>
                  <span aria-hidden="true" className="flex h-14 items-end justify-center">
                    <span
                      className="w-3/5 max-w-8 rounded-t-sm border border-[var(--mimi-primary)] bg-[var(--mimi-primary-soft)]"
                      style={{ height: `${barHeight(bucket.count, reviewLoadMaximum)}%` }}
                    />
                  </span>
                  <span className="mt-1 truncate text-center text-[0.6rem] leading-4 text-[var(--mimi-text-muted)]">
                    {bucket.label}
                  </span>
                </div>
              ))}
            </div>
          </figure>
        ) : (
          <p className="mt-2 rounded-md border border-dashed border-[var(--mimi-border-strong)] bg-[var(--mimi-surface-muted)] px-3 py-4 text-center text-xs text-[var(--mimi-text-soft)]">
            No scheduled reviews yet.
          </p>
        )}
      </div>

      <div className="mt-4 border-t border-[var(--mimi-border)] pt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-[var(--mimi-text)]">Recall estimate</p>
          <p className="text-xs text-[var(--mimi-text-soft)]">
            {retrievabilityEligibleCount} words
          </p>
        </div>
        {retrievabilityEligibleCount > 0 ? (
          <>
            <div
              className="mt-2 flex h-3 overflow-hidden rounded-full border border-[var(--mimi-border-strong)] bg-[var(--mimi-surface-muted)]"
              role="img"
              aria-label={retrievability
                .map((bucket) => `${bucket.label}: ${entryCountLabel(bucket.count)}`)
                .join(", ")}
            >
              {retrievability.map((bucket) =>
                bucket.count > 0 ? (
                  <span
                    key={bucket.key}
                    aria-hidden="true"
                    className={retrievabilityTone[bucket.key]}
                    style={{ width: `${bucket.share}%` }}
                  />
                ) : null,
              )}
            </div>
            <div className="mt-2 grid gap-1.5">
              {retrievability.map((bucket) => (
                <div key={bucket.key} className="flex items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-2 text-[var(--mimi-text-soft)]">
                    <span aria-hidden="true" className={`size-2.5 rounded-sm ${retrievabilityTone[bucket.key]}`} />
                    {bucket.label}
                  </span>
                  <span className="font-semibold text-[var(--mimi-text)]">
                    {bucket.count}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 rounded-md border border-dashed border-[var(--mimi-border-strong)] bg-[var(--mimi-surface-muted)] px-3 py-4 text-center text-xs text-[var(--mimi-text-soft)]">
            Not enough review history yet.
          </p>
        )}
      </div>
      <p className="mt-3 text-[0.68rem] text-[var(--mimi-text-muted)]">
        Updated <time dateTime={calculatedAt}>{new Intl.DateTimeFormat("en-AU", {
          timeZone: timezone, hour: "2-digit", minute: "2-digit",
        }).format(new Date(calculatedAt))}</time>
      </p>
    </section>
  );
});
