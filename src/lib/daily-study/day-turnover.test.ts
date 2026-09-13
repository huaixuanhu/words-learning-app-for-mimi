import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchStudyDayTurnover } from "./day-turnover";

describe("open study-day turnover", () => {
  let browser: EventTarget;
  let page: EventTarget & { visibilityState: string };
  const cleanup: Array<() => void> = [];
  const dayEndsAt = "2026-07-14T20:00:00.000Z";
  const nextDayEndsAt = "2026-07-15T20:00:00.000Z";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime("2026-07-14T19:59:50.000Z");
    browser = new EventTarget();
    page = Object.assign(new EventTarget(), { visibilityState: "visible" });
    vi.stubGlobal("window", browser);
    vi.stubGlobal("document", page);
  });

  afterEach(() => {
    for (const stop of cleanup.splice(0)) stop();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("refreshes exactly at the stored 06:00 boundary and removes its listeners on cleanup", async () => {
    const refresh = vi.fn(async () => ({ dayEndsAt: nextDayEndsAt }));
    const stop = watchStudyDayTurnover({
      dayEndsAt,
      getNow: () => new Date().toISOString(),
      refresh,
      onError: vi.fn(),
    });
    cleanup.push(stop);

    await vi.advanceTimersByTimeAsync(9_999);
    expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    stop();
    vi.setSystemTime(nextDayEndsAt);
    browser.dispatchEvent(new Event("focus"));
    page.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("uses the trusted clock and catches up after browser sleep without duplicate requests", async () => {
    let runtimeNow = "2026-07-14T19:59:00.000Z";
    let finish!: (today: { dayEndsAt: string }) => void;
    const refresh = vi.fn(() => new Promise<{ dayEndsAt: string }>((resolve) => {
      finish = resolve;
    }));
    cleanup.push(watchStudyDayTurnover({
      dayEndsAt,
      getNow: () => runtimeNow,
      refresh,
      onError: vi.fn(),
    }));

    vi.setSystemTime("2030-01-01T00:00:00.000Z");
    browser.dispatchEvent(new Event("focus"));
    expect(refresh).not.toHaveBeenCalled();
    runtimeNow = "2026-07-15T00:00:00.000Z";
    page.dispatchEvent(new Event("visibilitychange"));
    browser.dispatchEvent(new Event("focus"));
    expect(refresh).toHaveBeenCalledTimes(1);
    finish({ dayEndsAt: nextDayEndsAt });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("shows refresh failures and retries without a tight loop", async () => {
    const error = new Error("Temporarily unavailable");
    const onError = vi.fn();
    const refresh = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue({ dayEndsAt: nextDayEndsAt });
    cleanup.push(watchStudyDayTurnover({
      dayEndsAt,
      getNow: () => new Date().toISOString(),
      refresh,
      onError,
    }));

    await vi.advanceTimersByTimeAsync(10_000);
    expect(onError).toHaveBeenCalledWith(error);
    await vi.advanceTimersByTimeAsync(59_999);
    expect(refresh).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("resolves a lost trusted clock on wake and preserves the same plan through midnight", async () => {
    let runtimeNow: string | null = null;
    const refresh = vi.fn(async () => ({ dayEndsAt }));
    cleanup.push(watchStudyDayTurnover({
      dayEndsAt,
      getNow: () => runtimeNow,
      refresh,
      onError: vi.fn(),
    }));

    browser.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(1);
    runtimeNow = "2026-07-14T14:00:00.000Z";
    browser.dispatchEvent(new Event("focus"));
    expect(refresh).toHaveBeenCalledTimes(1);
    runtimeNow = dayEndsAt;
    browser.dispatchEvent(new Event("focus"));
    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("caps unsuccessful automatic refreshes even during repeated focus and visibility bursts", async () => {
    const refresh = vi.fn().mockRejectedValue(new Error("Offline"));
    const onError = vi.fn();
    cleanup.push(watchStudyDayTurnover({
      dayEndsAt, getNow: () => null, refresh, onError,
    }));

    for (let minute = 0; minute < 8; minute += 1) {
      for (let event = 0; event < 100; event += 1) {
        browser.dispatchEvent(new Event("focus"));
        page.dispatchEvent(new Event("visibilitychange"));
        await vi.advanceTimersByTimeAsync(1);
      }
      await vi.advanceTimersByTimeAsync(60_000);
    }
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(onError).toHaveBeenLastCalledWith(expect.objectContaining({
      message: "Automatic study refresh paused. Reload this page to try again.",
    }));
  });

  it("defers hidden tabs and stops responses that leave the trusted clock unresolved", async () => {
    page.visibilityState = "hidden";
    const refresh = vi.fn(async () => ({ dayEndsAt }));
    cleanup.push(watchStudyDayTurnover({ dayEndsAt, getNow: () => null, refresh, onError: vi.fn() }));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(refresh).not.toHaveBeenCalled();

    page.visibilityState = "visible";
    page.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });
});
