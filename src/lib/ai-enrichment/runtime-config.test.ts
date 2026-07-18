import { describe, expect, it } from "vitest";
import {
  AI_STAGE7B2_EXECUTION_SCOPE,
  canRunStage7b2FormalRoute,
  isStage7b2LocalSmokeConfigured,
  isStage7b2LocalSmokeRuntime,
  resolveAiRuntimeHealth,
} from "./runtime-config";

describe("V2-7B-2 AI runtime health", () => {
  const now = "2026-07-15T00:00:00.000Z";
  const readyLocalSmoke = {
    NODE_ENV: "production",
    MIMI_AI_EXECUTION_SCOPE: AI_STAGE7B2_EXECUTION_SCOPE,
    MIMI_AI_RUNTIME_ENABLED: "true",
    MIMI_AI_ACCOUNTING_READY: "true",
    MIMI_AI_SCHEMA6_READY: "true",
    MIMI_STORAGE_RUNTIME: "postgres-preview",
    STAGE5F_DATABASE_TARGET: "preview",
    MIMI_V2_7B2_TEMP_TARGET_CONFIRMED: "true",
    MIMI_AI_AUTH_KEY_TYPE_CONFIRMED: "auth-key",
    MIMI_AI_PROJECT_LOGGING_DISABLED_CONFIRMED: "true",
    GEMINI_API_KEY: "test-only",
  } as const;

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

  it("keeps ordinary environments closed even when generic readiness is claimed", () => {
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
    ).toMatchObject({
      enabled: true,
      availability: { status: "resting", reason: "provider_activation_pending" },
    });
  });

  it("opens only for the exact localhost smoke proof", () => {
    expect(isStage7b2LocalSmokeRuntime(readyLocalSmoke)).toBe(true);
    expect(resolveAiRuntimeHealth(readyLocalSmoke, now)).toMatchObject({
      enabled: true,
      availability: { status: "available", reason: null },
    });
    expect(
      canRunStage7b2FormalRoute(
        new Request("http://127.0.0.1:3001/api/ai/enrichment"),
        readyLocalSmoke,
      ),
    ).toBe(true);
    expect(
      canRunStage7b2FormalRoute(
        new Request("https://mimi.example/api/ai/enrichment"),
        readyLocalSmoke,
      ),
    ).toBe(false);
  });

  it("refuses Vercel, test, Production storage, and unconfirmed account state", () => {
    for (const unsafe of [
      { ...readyLocalSmoke, VERCEL: "1" },
      { ...readyLocalSmoke, VERCEL_ENV: "preview" },
      { ...readyLocalSmoke, NODE_ENV: "test" },
      { ...readyLocalSmoke, MIMI_STORAGE_RUNTIME: "postgres-production" },
      { ...readyLocalSmoke, MIMI_V2_7B2_TEMP_TARGET_CONFIRMED: "false" },
      { ...readyLocalSmoke, MIMI_AI_AUTH_KEY_TYPE_CONFIRMED: "standard-key" },
      { ...readyLocalSmoke, MIMI_AI_PROJECT_LOGGING_DISABLED_CONFIRMED: "false" },
    ]) {
      expect(isStage7b2LocalSmokeRuntime(unsafe)).toBe(false);
    }
  });

  it("keeps the local route wired while the kill switch stops provider availability", () => {
    const killed = { ...readyLocalSmoke, MIMI_AI_KILL_SWITCH: "true" };
    expect(isStage7b2LocalSmokeConfigured(killed)).toBe(true);
    expect(isStage7b2LocalSmokeRuntime(killed)).toBe(false);
    expect(
      canRunStage7b2FormalRoute(
        new Request("http://localhost:3001/api/ai/enrichment"),
        killed,
      ),
    ).toBe(true);
    expect(resolveAiRuntimeHealth(killed, now)).toMatchObject({
      availability: { status: "resting", reason: "kill_switch" },
    });
  });
});
