"use client";

import { useEffect, useMemo, useState } from "react";
import { CalmEntrance } from "@/components/ui/motion-primitives";
import {
  buildDashboardInsights,
  type DashboardInsightsSnapshot,
} from "@/lib/dashboard/insights";
import type { ReviewProfile } from "@/lib/review/types";
import type { VocabularyData } from "@/lib/vocabulary/types";
import { LearningRhythmChart } from "./learning-rhythm-chart";
import { MemoryOutlookCard } from "./memory-outlook-card";

type DashboardInsightsProps = Readonly<{
  data: VocabularyData;
  isLoaded: boolean;
}>;

type InsightsResult =
  | Readonly<{ status: "loading"; snapshot: null }>
  | Readonly<{ status: "available"; snapshot: DashboardInsightsSnapshot }>
  | Readonly<{ status: "unavailable"; snapshot: null }>;

const trackLabels: Readonly<Record<ReviewProfile, string>> = {
  recognition: "Recognition",
  active: "Active",
};

export function DashboardInsights({ data, isLoaded }: DashboardInsightsProps) {
  const [selectedTrack, setSelectedTrack] = useState<ReviewProfile>("recognition");
  const [period, setPeriod] = useState<7 | 14>(7);
  const [clockTime, setClockTime] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockTime(Date.now());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const calculatedAt = new Date(clockTime).toISOString();
  const result = useMemo<InsightsResult>(() => {
    if (!isLoaded) return { status: "loading", snapshot: null };

    try {
      return {
        status: "available",
        snapshot: buildDashboardInsights(data, calculatedAt),
      };
    } catch {
      return { status: "unavailable", snapshot: null };
    }
  }, [calculatedAt, data, isLoaded]);

  return (
    <CalmEntrance className="mimi-panel p-4 sm:p-5" delay={0.04}>
      <section aria-labelledby="dashboard-insights-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="dashboard-insights-title" className="mimi-display-title text-xl text-[var(--mimi-text)]">
              Insights
            </h2>
          </div>
          <div className="inline-flex rounded-md border border-[var(--mimi-border)] bg-[var(--mimi-surface-muted)] p-0.5" role="group" aria-label="Insights Track">
            {(["recognition", "active"] as const).map((reviewProfile) => (
              <button
                key={reviewProfile}
                type="button"
                aria-pressed={selectedTrack === reviewProfile}
                onClick={() => setSelectedTrack(reviewProfile)}
                className={`mimi-focus-ring min-h-10 rounded px-3 text-xs font-semibold transition-colors ${
                  selectedTrack === reviewProfile
                    ? "bg-[var(--mimi-surface-strong)] text-[var(--mimi-primary-deep)] shadow-sm"
                    : "text-[var(--mimi-text-soft)]"
                }`}
              >
                {trackLabels[reviewProfile]}
              </button>
            ))}
          </div>
        </div>

        {result.status === "available" ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(17rem,0.65fr)]">
            <LearningRhythmChart
              points={result.snapshot.tracks[selectedTrack].rhythm}
              period={period}
              onPeriodChange={setPeriod}
            />
            <MemoryOutlookCard
              reviewLoad={result.snapshot.tracks[selectedTrack].reviewLoad}
              retrievability={result.snapshot.tracks[selectedTrack].retrievability}
              retrievabilityEligibleCount={
                result.snapshot.tracks[selectedTrack].retrievabilityEligibleCount
              }
            />
          </div>
        ) : (
          <p className="mt-4 rounded-md border border-dashed border-[var(--mimi-border-strong)] bg-[var(--mimi-surface)] px-3 py-8 text-center text-sm text-[var(--mimi-text-soft)]">
            {result.status === "loading"
              ? "Loading insights..."
              : "Insights unavailable."}
          </p>
        )}
      </section>
    </CalmEntrance>
  );
}
