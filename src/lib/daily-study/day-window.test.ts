import { describe, expect, it } from "vitest";
import {
  resolveCalendarMonth,
  resolvePersonDay,
  resolvePersonDayOffset,
  resolveStudyDay,
  resolveStudyDayOffset,
} from "./day-window";

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

  it("builds contiguous calendar offsets across a 25-hour day", () => {
    const now = "2026-04-05T02:00:00.000Z";
    const previous = resolvePersonDayOffset(now, "Australia/Melbourne", -1);
    const current = resolvePersonDayOffset(now, "Australia/Melbourne", 0);
    const next = resolvePersonDayOffset(now, "Australia/Melbourne", 1);

    expect([previous.localDate, current.localDate, next.localDate]).toEqual([
      "2026-04-04",
      "2026-04-05",
      "2026-04-06",
    ]);
    expect(previous.dayEndsAt).toBe(current.dayStartsAt);
    expect(current.dayEndsAt).toBe(next.dayStartsAt);
    expect(new Date(current.dayEndsAt).getTime() - new Date(current.dayStartsAt).getTime())
      .toBe(25 * 60 * 60 * 1000);
  });

  it("rejects invalid timestamps and timezones", () => {
    expect(() => resolvePersonDay("not-a-date", "Australia/Melbourne")).toThrow(
      "now must be a valid timestamp",
    );
    expect(() => resolvePersonDay("2026-07-14T04:00:00.000Z", "Mars/Mimi")).toThrow(
      "Unsupported timezone",
    );
    expect(() =>
      resolvePersonDayOffset("2026-07-14T04:00:00.000Z", "Australia/Melbourne", 0.5),
    ).toThrow("calendarDayOffset must be a bounded whole number");
  });

  it("resolves a Melbourne budget month across the DST boundary", () => {
    expect(resolveCalendarMonth("2026-10-15T00:00:00.000Z", "Australia/Melbourne"))
      .toEqual({
        localMonth: "2026-10",
        timezone: "Australia/Melbourne",
        monthStartsAt: "2026-09-30T14:00:00.000Z",
        monthEndsAt: "2026-10-31T13:00:00.000Z",
      });
  });
});

describe("06:00 study days", () => {
  it("keeps midnight and 05:59 in the prior learning date, then rolls over at 06:00", () => {
    const timezone = "Australia/Melbourne";
    const expected = {
      localDate: "2026-07-14",
      timezone,
      dayStartsAt: "2026-07-13T20:00:00.000Z",
      dayEndsAt: "2026-07-14T20:00:00.000Z",
    };

    for (const now of [
      "2026-07-14T13:59:59.999Z",
      "2026-07-14T14:00:00.000Z",
      "2026-07-14T19:59:59.999Z",
    ]) {
      expect(resolveStudyDay(now, timezone)).toEqual(expected);
    }
    expect(resolveStudyDay(expected.dayEndsAt, timezone)).toMatchObject({
      localDate: "2026-07-15",
      dayStartsAt: expected.dayEndsAt,
    });
    expect(resolvePersonDay("2026-07-14T14:00:00.000Z", timezone).localDate)
      .toBe("2026-07-15");
  });

  it.each([
    ["2026-04-04T17:00:00.000Z", "2026-04-04", 25],
    ["2026-10-03T17:00:00.000Z", "2026-10-03", 23],
  ])("resolves local 06:00 boundaries through DST at %s", (now, localDate, hours) => {
    const timezone = "Australia/Melbourne";
    const current = resolveStudyDay(now, timezone);
    const previous = resolveStudyDayOffset(now, timezone, -1);
    const next = resolveStudyDayOffset(now, timezone, 1);

    expect(current.localDate).toBe(localDate);
    expect(Date.parse(current.dayEndsAt) - Date.parse(current.dayStartsAt))
      .toBe(Number(hours) * 60 * 60 * 1000);
    expect(previous.dayEndsAt).toBe(current.dayStartsAt);
    expect(next.dayStartsAt).toBe(current.dayEndsAt);
    expect(resolveStudyDay(current.dayEndsAt, timezone)).toEqual(next);
  });

  it("keeps early New Year learning in December without shifting the budget month", () => {
    const now = "2026-12-31T17:00:00.000Z";
    const timezone = "Australia/Melbourne";
    expect(resolveStudyDay(now, timezone).localDate).toBe("2026-12-31");
    expect(resolveCalendarMonth(now, timezone).localMonth).toBe("2027-01");
    expect(resolveStudyDayOffset(now, timezone, 1).localDate).toBe("2027-01-01");
  });

  it("rejects invalid study-day inputs", () => {
    expect(() => resolveStudyDay("bad", "Australia/Melbourne")).toThrow("valid timestamp");
    expect(() => resolveStudyDay("2026-07-14T04:00:00Z", "Mars/Mimi"))
      .toThrow("Unsupported timezone");
    expect(() => resolveStudyDayOffset("2026-07-14T04:00:00Z", "UTC", 0.5))
      .toThrow("bounded whole number");
  });
});
