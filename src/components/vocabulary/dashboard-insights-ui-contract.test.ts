import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(fileName: string) {
  return readFileSync(
    join(process.cwd(), "src", "components", "vocabulary", fileName),
    "utf8",
  );
}

const dashboardSource = source("home-dashboard.tsx");
const trackCardSource = source("home-track-card.tsx");
const insightsSource = source("dashboard-insights.tsx");
const rhythmSource = source("learning-rhythm-chart.tsx");
const outlookSource = source("memory-outlook-card.tsx");
const combinedInsightsSource = [insightsSource, rhythmSource, outlookSource].join("\n");

describe("V2-8-1 Dashboard Insights UI contract", () => {
  it("keeps each Track card compact with two primary goals, two references, and two actuals", () => {
    expect(trackCardSource).toContain("Added today");
    expect(trackCardSource).toContain("Suggested review");
    expect(trackCardSource).toContain("Review goal");
    expect(trackCardSource).toContain("New learning goal");
    expect(trackCardSource).toContain("Today’s progress · Actual");
    expect(trackCardSource).toContain("Reviewed today");
    expect(trackCardSource).toContain("Learned today");
    expect(trackCardSource).toContain("No goal");
    expect(trackCardSource).toContain("grid-cols-2");
    expect(trackCardSource).toContain('reviewHref');
    expect(trackCardSource).toContain('newLearningHref');
  });

  it("adds Track-isolated actual and estimated Insights without persistence", () => {
    expect(dashboardSource).toContain("DashboardInsights");
    expect(insightsSource).toContain('useState<ReviewProfile>("recognition")');
    expect(insightsSource).toContain("LearningRhythmChart");
    expect(insightsSource).toContain("MemoryOutlookCard");
    expect(rhythmSource).toContain("Learning rhythm");
    expect(rhythmSource).toContain("Actual");
    expect(rhythmSource).toContain("Entries");
    expect(rhythmSource).toContain("Attempts");
    expect(outlookSource).toContain("FSRS estimate");
    expect(outlookSource).toContain("Updates after study.");
    expect(combinedInsightsSource).not.toContain("fetch(");
    expect(combinedInsightsSource).not.toContain("localStorage");
  });

  it("uses calm language and exposes values without hover-only interactions", () => {
    expect(combinedInsightsSource.toLowerCase()).not.toContain("overdue");
    expect(combinedInsightsSource.toLowerCase()).not.toContain("expired");
    expect(combinedInsightsSource.toLowerCase()).not.toContain("streak");
    expect(rhythmSource).toContain("aria-label");
    expect(outlookSource).toContain("aria-label");
    expect(insightsSource).toContain("aria-pressed");
  });
});
