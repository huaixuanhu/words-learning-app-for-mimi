import { describe, expect, it } from "vitest";
import { resolveAiRuntimeHealth } from "./runtime-config";

describe("V2 Stage 7A AI runtime health", () => {
  const now = "2026-07-15T00:00:00.000Z";

  it("fails closed when activation, a credential, or accounting is missing", () => {
    expect(resolveAiRuntimeHealth({}, now)).toMatchObject({
      enabled: false,
      availability: { status: "resting", reason: "provider_not_configured" },
    });
    expect(
      resolveAiRuntimeHealth(
        { MIMI_AI_RUNTIME_ENABLED: "true", GEMINI_API_KEY: "test-only" },
        now,
      ),
    ).toMatchObject({
      availability: { status: "resting", reason: "usage_accounting_unavailable" },
    });
  });

  it("keeps the kill switch ahead of every other state", () => {
    expect(resolveAiRuntimeHealth({ MIMI_AI_KILL_SWITCH: "true" }, now)).toMatchObject({
      availability: { status: "resting", reason: "kill_switch" },
    });
  });

  it("becomes available only with every gate present", () => {
    expect(
      resolveAiRuntimeHealth(
        {
          MIMI_AI_RUNTIME_ENABLED: "true",
          MIMI_AI_ACCOUNTING_READY: "true",
          MIMI_AI_SCHEMA6_READY: "true",
          GEMINI_API_KEY: "test-only",
        },
        now,
      ),
    ).toMatchObject({ availability: { status: "available", reason: null } });
  });
});
