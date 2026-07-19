import { describe, expect, it } from "vitest";
import { createServerClockAnchor, estimateServerNow } from "./server-clock";

describe("server-owned browser clock anchor", () => {
  it("advances from server time without consulting the device wall clock", () => {
    const anchor = createServerClockAnchor(
      "2026-07-19T13:59:59.000Z",
      1_000,
      10_000,
    );

    expect(anchor).not.toBeNull();
    expect(estimateServerNow(anchor!, 3_000, 12_000)).toBe(
      "2026-07-19T14:00:01.000Z",
    );
  });

  it("rejects an invalid server timestamp", () => {
    expect(createServerClockAnchor("not-a-time", 1_000, 10_000)).toBeNull();
  });

  it("requires a fresh server reading after sleep or a wall-clock jump", () => {
    const anchor = createServerClockAnchor(
      "2026-07-19T13:59:59.000Z",
      1_000,
      10_000,
    );

    expect(estimateServerNow(anchor!, 2_000, 3_610_000)).toBeNull();
  });
});
