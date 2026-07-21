import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  InMemoryTtsAccounting,
  TTS_GLOBAL_LIMITS,
  type TtsReservationInput,
} from "./accounting";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const now = "2026-07-21T02:00:00.000Z";

function input(index: number, overrides: Partial<TtsReservationInput> = {}): TtsReservationInput {
  return {
    executionScope: "test-scope",
    requestIdHash: hash(`request-${index}`),
    cacheKeyHash: hash("adapt:voice-v1"),
    voiceContractId: "voice-v1",
    characterCount: 5,
    now,
    ...overrides,
  };
}

describe("TTS atomic accounting", () => {
  it("retains attempt, character and list-cost usage after failure", async () => {
    const accounting = new InMemoryTtsAccounting();
    const reserved = await accounting.reserve(input(1));
    expect(reserved.status).toBe("reserved");
    if (reserved.status !== "reserved") throw new Error("reservation missing");
    await accounting.settle(reserved.handle, {
      outcome: "failed",
      terminalCategory: "provider_timeout",
      latencyMs: 8_000,
      completedAt: "2026-07-21T02:00:08.000Z",
    });
    const snapshot = accounting.snapshot("test-scope", "2026-07-21T02:00:09.000Z");
    expect(snapshot.day).toMatchObject({
      attemptsReserved: 1,
      charactersReserved: 5,
      activeProviderCalls: 0,
    });
    expect(snapshot.day.estimatedCostUsdReserved).toBeCloseTo(0.00002, 8);
    expect(snapshot.runs).toEqual([
      expect.objectContaining({ status: "failed" }),
    ]);
  });

  it("blocks the fifth concurrent provider call and detects replay", async () => {
    const accounting = new InMemoryTtsAccounting();
    const reservations = await Promise.all(
      Array.from({ length: TTS_GLOBAL_LIMITS.concurrentProviderCalls }, (_, index) =>
        accounting.reserve(input(index)),
      ),
    );
    expect(reservations.every((result) => result.status === "reserved")).toBe(true);
    await expect(accounting.reserve(input(99))).resolves.toEqual({
      status: "blocked",
      reasons: ["concurrency_limit"],
    });
    await expect(accounting.reserve(input(0))).resolves.toMatchObject({
      status: "replay",
      runStatus: "submitted",
    });
  });

  it("keeps execution scopes independent without a person-id input", async () => {
    const accounting = new InMemoryTtsAccounting();
    const first = await accounting.reserve(
      input(1, { characterCount: TTS_GLOBAL_LIMITS.charactersPerDay }),
    );
    expect(first.status).toBe("reserved");
    await expect(accounting.reserve(input(2))).resolves.toMatchObject({
      status: "blocked",
      reasons: expect.arrayContaining(["daily_character_limit"]),
    });
    await expect(
      accounting.reserve(input(3, { executionScope: "another-environment" })),
    ).resolves.toMatchObject({ status: "reserved" });
  });
});

