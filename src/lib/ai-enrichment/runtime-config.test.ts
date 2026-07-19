import { describe, expect, it } from "vitest";
import {
  AI_STAGE8_2_EXECUTION_SCOPE,
  AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS,
  AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS_ENV_VAR,
  AI_STAGE7B2_EXECUTION_SCOPE,
  canRunFormalAiRoute,
  canRunStage8_2ProtectedPreviewRoute,
  canRunStage7b2FormalRoute,
  isStage8_2ProtectedPreviewConfigured,
  isStage8_2ProtectedPreviewRuntime,
  isStage7b2LocalSmokeConfigured,
  isStage7b2LocalSmokeRuntime,
  resolveAiProviderAttemptBoundary,
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
  const readyProtectedPreview = {
    NODE_ENV: "production",
    VERCEL: "1",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: "V2",
    MIMI_AI_EXECUTION_SCOPE: AI_STAGE8_2_EXECUTION_SCOPE,
    MIMI_AI_RUNTIME_ENABLED: "true",
    MIMI_AI_ACCOUNTING_READY: "true",
    MIMI_AI_SCHEMA6_READY: "true",
    MIMI_STORAGE_RUNTIME: "postgres-preview",
    STAGE5F_DATABASE_TARGET: "preview",
    MIMI_V2_8_2_STAGING_TARGET_CONFIRMED: "true",
    MIMI_V2_8_2_PREVIEW_PROTECTED_CONFIRMED: "true",
    MIMI_AI_AUTH_KEY_TYPE_CONFIRMED: "auth-key",
    MIMI_AI_PROJECT_LOGGING_DISABLED_CONFIRMED: "true",
    MIMI_STUDY_TOKEN_SECRET: "p".repeat(32),
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

  it("opens the formal route for the exact protected V2 Preview", () => {
    const request = new Request("https://mimi-v2-preview.vercel.app/api/ai/enrichment");

    expect(isStage8_2ProtectedPreviewConfigured(readyProtectedPreview)).toBe(true);
    expect(isStage8_2ProtectedPreviewRuntime(readyProtectedPreview)).toBe(true);
    expect(canRunStage8_2ProtectedPreviewRoute(request, readyProtectedPreview)).toBe(true);
    expect(canRunFormalAiRoute(request, readyProtectedPreview)).toBe(true);
    expect(resolveAiRuntimeHealth(readyProtectedPreview, now)).toMatchObject({
      enabled: true,
      availability: { status: "available", reason: null },
    });
  });

  it("refuses an unprotected, wrong-branch, insecure, or incomplete Preview", () => {
    const secureRequest = new Request(
      "https://mimi-v2-preview.vercel.app/api/ai/enrichment",
    );
    const insecureRequest = new Request("http://mimi.example/api/ai/enrichment");
    const unsafeEnvironments = [
      { ...readyProtectedPreview, VERCEL: "" },
      { ...readyProtectedPreview, VERCEL_ENV: "production" },
      { ...readyProtectedPreview, VERCEL_GIT_COMMIT_REF: "main" },
      { ...readyProtectedPreview, MIMI_STORAGE_RUNTIME: "postgres-production" },
      { ...readyProtectedPreview, MIMI_V2_8_2_STAGING_TARGET_CONFIRMED: "false" },
      { ...readyProtectedPreview, MIMI_V2_8_2_PREVIEW_PROTECTED_CONFIRMED: "false" },
      { ...readyProtectedPreview, MIMI_AI_PROJECT_LOGGING_DISABLED_CONFIRMED: "false" },
      { ...readyProtectedPreview, MIMI_STUDY_TOKEN_SECRET: "too-short" },
      { ...readyProtectedPreview, NODE_ENV: "test" },
      {
        ...readyProtectedPreview,
        [AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS_ENV_VAR]: "5",
      },
    ];

    expect(
      canRunStage8_2ProtectedPreviewRoute(insecureRequest, readyProtectedPreview),
    ).toBe(false);
    for (const unsafe of unsafeEnvironments) {
      expect(isStage8_2ProtectedPreviewConfigured(unsafe)).toBe(false);
      expect(canRunStage8_2ProtectedPreviewRoute(secureRequest, unsafe)).toBe(false);
    }
  });

  it("uses a four-attempt ceiling only for the initial Preview rollout", () => {
    expect(resolveAiProviderAttemptBoundary(readyProtectedPreview)).toBeUndefined();
    expect(
      resolveAiProviderAttemptBoundary({
        ...readyProtectedPreview,
        [AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS_ENV_VAR]: String(
          AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS,
        ),
      }),
    ).toEqual({
      maximumProviderAttempts: 4,
      reason: "stage8_2_preview_rollout_attempt_limit",
    });
    expect(resolveAiProviderAttemptBoundary(readyLocalSmoke)).toEqual({
      maximumProviderAttempts: 2,
      reason: "stage7b2_smoke_attempt_limit",
    });
  });

  it("keeps the Preview route wired while its kill switch makes AI unavailable", () => {
    const killed = { ...readyProtectedPreview, MIMI_AI_KILL_SWITCH: "true" };
    const request = new Request("https://mimi-v2-preview.vercel.app/api/ai/enrichment");

    expect(isStage8_2ProtectedPreviewConfigured(killed)).toBe(true);
    expect(isStage8_2ProtectedPreviewRuntime(killed)).toBe(false);
    expect(canRunFormalAiRoute(request, killed)).toBe(true);
    expect(resolveAiRuntimeHealth(killed, now)).toMatchObject({
      availability: { status: "resting", reason: "kill_switch" },
    });
  });
});
