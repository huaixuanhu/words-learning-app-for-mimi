import { describe, expect, it } from "vitest";
import { resolvePersonDay } from "./day-window";

describe("resolvePersonDay", () => {
  it("resolves a regular Melbourne day from the learner timezone", () => {
    expect(resolvePersonDay("2026-07-14T04:00:00.000Z", "Australia/Melbourne")).toEqual({
      localDate: "2026-07-14",
      timezone: "Australia/Melbourne",
      dayStartsAt: "2026-07-13T14:00:00.000Z",
      dayEndsAt: "2026-07-14T14:00:00.000Z",
    });
  });

  it("keeps the 25-hour daylight-saving end day", () => {
    const day = resolvePersonDay("2026-04-05T02:00:00.000Z", "Australia/Melbourne");

    expect(day.localDate).toBe("2026-04-05");
    expect(new Date(day.dayEndsAt).getTime() - new Date(day.dayStartsAt).getTime()).toBe(
      25 * 60 * 60 * 1000,
    );
  });

  it("keeps the 23-hour daylight-saving start day", () => {
    const day = resolvePersonDay("2026-10-04T02:00:00.000Z", "Australia/Melbourne");

    expect(day.localDate).toBe("2026-10-04");
    expect(new Date(day.dayEndsAt).getTime() - new Date(day.dayStartsAt).getTime()).toBe(
      23 * 60 * 60 * 1000,
    );
  });

  it("rejects invalid timestamps and timezones", () => {
    expect(() => resolvePersonDay("not-a-date", "Australia/Melbourne")).toThrow(
      "now must be a valid timestamp",
    );
    expect(() => resolvePersonDay("2026-07-14T04:00:00.000Z", "Mars/Mimi")).toThrow(
      "Unsupported timezone",
    );
  });
});
