import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("V2-8-2.3 PF-002 learner UI refinement", () => {
  it("makes Review and New Learning predictable across navigation and sessions", () => {
    const navData = source("src/lib/stage-two-data.ts");
    const mobileNav = source("src/components/app-nav.tsx");
    const zoneTabs = source("src/components/study/learning-zone-tabs.tsx");
    const review = source("src/components/review/review-session.tsx");
    const active = source("src/components/practice/active-practice-session.tsx");

    expect(navData).toContain('label: "Review / New Learning"');
    expect(navData).toContain('mobileLabel: "Learn"');
    expect(mobileNav).toContain('"mobileLabel" in item');
    expect(zoneTabs).toContain('label: "Review"');
    expect(zoneTabs).toContain('label: "New Learning"');
    expect(zoneTabs).toContain('aria-current={active ? "page" : undefined}');
    expect(review).toContain('label="Recognition learning zone"');
    expect(review).not.toContain("Open New Words");
    expect(review).not.toContain("Open Review");
    expect(active).toContain('label="Active learning zone"');
  });

  it("separates goals, reference values, actuals, and ready queues", () => {
    const home = source("src/components/vocabulary/home-track-card.tsx");
    const study = source("src/components/study/today-goals-form.tsx");
    const recognition = source("src/components/review/review-session.tsx");
    const active = source("src/components/practice/active-practice-session.tsx");

    for (const text of ["Review goal", "Suggested review ·", "New learning goal", "Added today ·"]) {
      expect(home).toContain(text);
      expect(study).toContain(text);
    }
    expect(study).toContain("Save today’s goals");

    for (const session of [recognition, active]) {
      expect(session).toContain("Daily goal");
      expect(session).toContain("Reviewed today");
      expect(session).toContain("Learned today");
      expect(session).toContain("Ready now");
      expect(session).not.toContain('["Goal"');
      expect(session).not.toContain('["Done"');
      expect(session).not.toContain('["Left"');
    }
  });

  it("uses one lightweight display font without changing body, control, or motion fonts", () => {
    const layout = source("src/app/layout.tsx");
    const css = source("src/app/globals.css");
    const shell = source("src/components/app-shell.tsx");
    const nav = source("src/components/app-nav.tsx");
    const home = source("src/components/vocabulary/home-dashboard.tsx");

    expect(layout).toContain("Instrument_Serif");
    expect(layout).toContain('subsets: ["latin"]');
    expect(layout).toContain('weight: "400"');
    expect(layout).toContain('display: "swap"');
    expect(css).toContain(".mimi-display-title");
    expect(css).toContain("var(--font-instrument-serif)");
    expect(shell).toContain('className="mimi-display-title');
    expect(nav).not.toContain("mimi-display-title relative flex min-h-14");
    expect(home).toContain("lg:items-stretch");
    expect(home).toContain("lg:h-full");
    expect(css).not.toContain("transition-duration: 1ms");
  });
});
