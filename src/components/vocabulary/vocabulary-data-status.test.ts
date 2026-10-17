import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VocabularyDataStatus } from "./vocabulary-data-status";

function render(isLoaded: boolean, loadError: string | null, isRefreshing = false) {
  return renderToStaticMarkup(createElement(VocabularyDataStatus, {
    isLoaded, loadError, isRefreshing, onRetry() {},
  }));
}

describe("workspace recovery display", () => {
  it("describes a failed load without claiming the Library is empty", () => {
    const html = render(false, "Check your connection and retry.");
    expect(html).toContain("Your words couldn’t be loaded");
    expect(html).toContain('role="alert"');
    expect(html).toContain("Retry</button>");
    expect(html).not.toContain("No matching words");
    expect(html).not.toContain("last loaded data");
  });

  it("identifies a retained snapshot as the last loaded data", () => {
    const html = render(true, "Check your connection and retry.");
    expect(html).toContain("Your Library couldn’t refresh");
    expect(html).toContain("Showing the last loaded data.");
  });

  it("keeps pending reads distinguishable and prevents duplicate retry clicks", () => {
    expect(render(false, null, true)).toContain("Loading your words…");
    const html = render(false, "Check your connection and retry.", true);
    expect(html).toContain("Retrying…");
    expect(html).toContain('disabled=""');
  });

  it("does not add a connection banner after a successful read", () => {
    expect(render(true, null)).toBe("");
  });

  it("offers manual review only for an unresolved save with a fresh snapshot", () => {
    const html = renderToStaticMarkup(createElement(VocabularyDataStatus, {
      isLoaded: true, loadError: "The save could not be confirmed.", isRefreshing: false,
      onRetry() {}, onContinue: async () => {},
      recovery: { requestId: "old", personId: "learner", personName: "Mimi", snapshotFingerprint: "digest" },
    }));
    expect(html).toContain("Review your last save");
    expect(html).toContain("Your latest saved data is loaded");
    expect(html).toContain("核对后继续");
    expect(html).not.toContain("Showing the last loaded data");
    expect(render(true, "Connection unavailable")).not.toContain("核对后继续");
  });
});
