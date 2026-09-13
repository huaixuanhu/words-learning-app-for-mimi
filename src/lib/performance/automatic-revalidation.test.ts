import { afterEach, describe, expect, it, vi } from "vitest";
import { createAutomaticRevalidator } from "./automatic-revalidation";

afterEach(() => { vi.useRealTimers(); });

describe("automatic workspace revalidation", () => {
  it("coalesces 100 notifications into one flight and at most one delayed trailing read", async () => {
    vi.useFakeTimers();
    let finish!: (success: boolean) => void;
    const run = vi.fn().mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; }))
      .mockResolvedValue(true);
    const scheduler = createAutomaticRevalidator({ run, isVisible: () => true });
    for (let i = 0; i < 100; i += 1) scheduler.request();
    expect(run).toHaveBeenCalledTimes(1);
    finish(true);
    await vi.advanceTimersByTimeAsync(29_999);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(run).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(30 * 60_000);
    expect(run).toHaveBeenCalledTimes(2);
    scheduler.dispose();
  });

  it("stops after three failed automatic reads despite repeated completed bursts, then permits manual recovery", async () => {
    vi.useFakeTimers();
    const run = vi.fn().mockResolvedValue(false);
    const scheduler = createAutomaticRevalidator({ run, isVisible: () => true });
    for (let i = 0; i < 100; i += 1) {
      scheduler.request();
      await vi.advanceTimersByTimeAsync(30_000);
    }
    expect(run).toHaveBeenCalledTimes(3);
    scheduler.reset(); // Explicit user retry re-arms automatic observation.
    scheduler.request();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(run).toHaveBeenCalledTimes(4);
    scheduler.dispose();
  });

  it("defers all hidden-tab notifications until visible and does not run after disposal", async () => {
    vi.useFakeTimers();
    let visible = false;
    const run = vi.fn().mockResolvedValue(true);
    const scheduler = createAutomaticRevalidator({ run, isVisible: () => visible });
    for (let i = 0; i < 100; i += 1) scheduler.request();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).not.toHaveBeenCalled();
    visible = true;
    scheduler.resume();
    await vi.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);
    scheduler.request();
    scheduler.dispose();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
