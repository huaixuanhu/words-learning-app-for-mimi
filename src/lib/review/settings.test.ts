import { describe, expect, it } from "vitest";
import {
  DEFAULT_SESSION_LIMIT,
  MAX_SESSION_LIMIT,
  MIN_SESSION_LIMIT,
  normalizeReviewSettings,
  normalizeSessionLimit,
  updateReviewSettings,
} from "./settings";
import { createEmptyVocabularyData } from "@/lib/vocabulary/repository";

describe("review settings", () => {
  it("normalizes invalid session limits to safe values", () => {
    expect(normalizeSessionLimit("")).toBe(DEFAULT_SESSION_LIMIT);
    expect(normalizeSessionLimit("not-a-number")).toBe(DEFAULT_SESSION_LIMIT);
    expect(normalizeSessionLimit(-4)).toBe(MIN_SESSION_LIMIT);
    expect(normalizeSessionLimit(120)).toBe(MAX_SESSION_LIMIT);
    expect(normalizeSessionLimit(12.6)).toBe(13);
  });

  it("keeps a usable timezone and updatedAt", () => {
    expect(normalizeReviewSettings({ sessionLimit: "10", timezone: "  Australia/Melbourne  " })).toMatchObject({
      sessionLimit: 10,
      timezone: "Australia/Melbourne",
    });
  });

  it("updates data settings and repository updatedAt together", () => {
    const data = createEmptyVocabularyData("2026-07-04T00:00:00.000Z");
    const updated = updateReviewSettings(
      data,
      { sessionLimit: "7", timezone: "Asia/Shanghai" },
      "2026-07-04T01:00:00.000Z",
    );

    expect(updated.settings).toMatchObject({
      sessionLimit: 7,
      timezone: "Asia/Shanghai",
      updatedAt: "2026-07-04T01:00:00.000Z",
    });
    expect(updated.updatedAt).toBe("2026-07-04T01:00:00.000Z");
  });
});
