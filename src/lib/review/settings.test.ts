import { describe, expect, it } from "vitest";
import {
  DEFAULT_SESSION_LIMIT,
  MAX_SESSION_LIMIT,
  MIN_SESSION_LIMIT,
  getSelectedReviewSettings,
  normalizeReviewSettings,
  normalizeSessionLimit,
  updateReviewSettings,
} from "./settings";
import { addPerson, createEmptyVocabularyData, selectPerson } from "@/lib/vocabulary/repository";

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

  it("updates selected person settings and repository updatedAt together", () => {
    const data = createEmptyVocabularyData("2026-07-04T00:00:00.000Z");
    const updated = updateReviewSettings(
      data,
      { sessionLimit: "7", timezone: "Asia/Shanghai" },
      "2026-07-04T01:00:00.000Z",
    );

    expect(getSelectedReviewSettings(updated)).toMatchObject({
      sessionLimit: 7,
      timezone: "Asia/Shanghai",
      updatedAt: "2026-07-04T01:00:00.000Z",
    });
    expect(updated.updatedAt).toBe("2026-07-04T01:00:00.000Z");
  });

  it("keeps review settings separate across people", () => {
    const initial = createEmptyVocabularyData("2026-07-04T00:00:00.000Z");
    const addedPerson = addPerson(
      initial,
      { id: "person-friend", displayName: "Friend" },
      "2026-07-04T00:10:00.000Z",
    ).data;
    const friendUpdated = updateReviewSettings(
      addedPerson,
      { sessionLimit: "9", timezone: "Asia/Tokyo" },
      "2026-07-04T00:11:00.000Z",
    );
    const mimiData = selectPerson(friendUpdated, "person_mimi", "2026-07-04T00:12:00.000Z");

    expect(getSelectedReviewSettings(mimiData).sessionLimit).toBe(24);
    expect(getSelectedReviewSettings(selectPerson(friendUpdated, "person-friend")).sessionLimit).toBe(9);
  });
});
