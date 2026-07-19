import {
  GEMINI_PRICING_2026_07_14_STANDARD,
  getAiGenerationAvailability,
  isGeminiPricingFresh,
} from "./contract";
import type { AiGenerationAvailability } from "./types";
import { resolveProductionCutoverMode } from "@/lib/security/production-cutover-mode";

type AiRuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export const AI_STAGE7B2_EXECUTION_SCOPE = "v2-7b-2-local-smoke" as const;
export const AI_STAGE7B2_MAX_PROVIDER_ATTEMPTS = 2 as const;
export const AI_STAGE8_2_EXECUTION_SCOPE = "v2-8-2-preview" as const;
export const AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS = 4 as const;
export const AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS_ENV_VAR =
  "MIMI_AI_PREVIEW_ROLLOUT_MAX_PROVIDER_ATTEMPTS" as const;
export const AI_STAGE8_3_EXECUTION_SCOPE = "v2-8-3-production" as const;
export const AI_STAGE8_3_ROLLOUT_MAX_PROVIDER_ATTEMPTS = 4 as const;
export const AI_STAGE8_3_ROLLOUT_MAX_PROVIDER_ATTEMPTS_ENV_VAR =
  "MIMI_AI_PRODUCTION_ROLLOUT_MAX_PROVIDER_ATTEMPTS" as const;
export const AI_STAGE8_3_STEADY_STATE_ACCEPTED_ENV_VAR =
  "MIMI_V2_8_3_PRODUCTION_STEADY_STATE_ACCEPTED" as const;

export type AiProviderAttemptBoundary = Readonly<{
  maximumProviderAttempts: number;
  reason:
    | "stage7b2_smoke_attempt_limit"
    | "stage8_2_preview_rollout_attempt_limit"
    | "stage8_3_production_rollout_attempt_limit";
}>;

export type AiRuntimeHealth = Readonly<{
  enabled: boolean;
  availability: AiGenerationAvailability;
}>;

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function hasServerStudyTokenSecret(env: AiRuntimeEnvironment) {
  return new TextEncoder().encode(clean(env.MIMI_STUDY_TOKEN_SECRET)).byteLength >= 32;
}

function hasValidPreviewRolloutCeiling(env: AiRuntimeEnvironment) {
  const value = clean(env[AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS_ENV_VAR]);
  return value === "" || value === String(AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS);
}

function hasExplicitProductionRolloutPhase(env: AiRuntimeEnvironment) {
  const rolloutCeiling = clean(
    env[AI_STAGE8_3_ROLLOUT_MAX_PROVIDER_ATTEMPTS_ENV_VAR],
  );
  if (rolloutCeiling === String(AI_STAGE8_3_ROLLOUT_MAX_PROVIDER_ATTEMPTS)) {
    return true;
  }
  return (
    rolloutCeiling === "" &&
    env[AI_STAGE8_3_STEADY_STATE_ACCEPTED_ENV_VAR] === "true"
  );
}

export function isStage7b2LocalSmokeConfigured(env: AiRuntimeEnvironment) {
  return (
    clean(env.MIMI_AI_EXECUTION_SCOPE) === AI_STAGE7B2_EXECUTION_SCOPE &&
    env.MIMI_AI_RUNTIME_ENABLED === "true" &&
    env.MIMI_AI_ACCOUNTING_READY === "true" &&
    env.MIMI_AI_SCHEMA6_READY === "true" &&
    env.MIMI_STORAGE_RUNTIME === "postgres-preview" &&
    env.STAGE5F_DATABASE_TARGET === "preview" &&
    env.MIMI_V2_7B2_TEMP_TARGET_CONFIRMED === "true" &&
    env.MIMI_AI_AUTH_KEY_TYPE_CONFIRMED === "auth-key" &&
    env.MIMI_AI_PROJECT_LOGGING_DISABLED_CONFIRMED === "true" &&
    Boolean(clean(env.GEMINI_API_KEY)) &&
    !clean(env.VERCEL) &&
    !clean(env.VERCEL_ENV) &&
    env.NODE_ENV !== "test"
  );
}

export function isStage7b2LocalSmokeRuntime(env: AiRuntimeEnvironment) {
  return (
    isStage7b2LocalSmokeConfigured(env) &&
    env.MIMI_AI_KILL_SWITCH !== "true"
  );
}

export function isStage8_2ProtectedPreviewConfigured(env: AiRuntimeEnvironment) {
  return (
    clean(env.MIMI_AI_EXECUTION_SCOPE) === AI_STAGE8_2_EXECUTION_SCOPE &&
    env.MIMI_AI_RUNTIME_ENABLED === "true" &&
    env.MIMI_AI_ACCOUNTING_READY === "true" &&
    env.MIMI_AI_SCHEMA6_READY === "true" &&
    env.MIMI_STORAGE_RUNTIME === "postgres-preview" &&
    env.STAGE5F_DATABASE_TARGET === "preview" &&
    env.MIMI_V2_8_2_STAGING_TARGET_CONFIRMED === "true" &&
    env.MIMI_V2_8_2_PREVIEW_PROTECTED_CONFIRMED === "true" &&
    env.MIMI_AI_AUTH_KEY_TYPE_CONFIRMED === "auth-key" &&
    env.MIMI_AI_PROJECT_LOGGING_DISABLED_CONFIRMED === "true" &&
    Boolean(clean(env.GEMINI_API_KEY)) &&
    hasServerStudyTokenSecret(env) &&
    hasValidPreviewRolloutCeiling(env) &&
    clean(env.VERCEL) === "1" &&
    clean(env.VERCEL_ENV) === "preview" &&
    clean(env.VERCEL_GIT_COMMIT_REF) === "V2" &&
    env.NODE_ENV !== "test"
  );
}

export function isStage8_2ProtectedPreviewRuntime(env: AiRuntimeEnvironment) {
  return (
    isStage8_2ProtectedPreviewConfigured(env) &&
    env.MIMI_AI_KILL_SWITCH !== "true"
  );
}

export function isStage8_3ProductionConfigured(env: AiRuntimeEnvironment) {
  return (
    clean(env.MIMI_AI_EXECUTION_SCOPE) === AI_STAGE8_3_EXECUTION_SCOPE &&
    env.MIMI_AI_RUNTIME_ENABLED === "true" &&
    env.MIMI_AI_ACCOUNTING_READY === "true" &&
    env.MIMI_AI_SCHEMA6_READY === "true" &&
    env.MIMI_STORAGE_RUNTIME === "postgres-production" &&
    env.STAGE6B_DATABASE_TARGET === "production" &&
    env.MIMI_V2_8_3_PRODUCTION_TARGET_CONFIRMED === "true" &&
    env.MIMI_V2_8_3_PRODUCTION_ACCESS_CONFIRMED === "true" &&
    env.MIMI_V2_8_3_PRODUCTION_KEY_CONFIRMED === "true" &&
    env.MIMI_AI_AUTH_KEY_TYPE_CONFIRMED === "auth-key" &&
    env.MIMI_AI_PROJECT_LOGGING_DISABLED_CONFIRMED === "true" &&
    Boolean(clean(env.GEMINI_API_KEY)) &&
    hasServerStudyTokenSecret(env) &&
    hasExplicitProductionRolloutPhase(env) &&
    (env.MIMI_AI_KILL_SWITCH === "true" ||
      env.MIMI_AI_KILL_SWITCH === "false") &&
    resolveProductionCutoverMode(env) === "live" &&
    clean(env.VERCEL) === "1" &&
    clean(env.VERCEL_ENV) === "production" &&
    clean(env.VERCEL_GIT_COMMIT_REF) === "main" &&
    clean(env.NODE_ENV) === "production"
  );
}

export function isStage8_3ProductionRuntime(env: AiRuntimeEnvironment) {
  return (
    isStage8_3ProductionConfigured(env) &&
    env.MIMI_AI_KILL_SWITCH === "false"
  );
}

export function isStage7b2LoopbackRequest(request: Request) {
  try {
    const hostname = new URL(request.url).hostname.toLocaleLowerCase("en-US");
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function canRunStage7b2FormalRoute(
  request: Request,
  env: AiRuntimeEnvironment = process.env,
) {
  return isStage7b2LocalSmokeConfigured(env) && isStage7b2LoopbackRequest(request);
}

export function canRunStage8_2ProtectedPreviewRoute(
  request: Request,
  env: AiRuntimeEnvironment = process.env,
) {
  try {
    return (
      isStage8_2ProtectedPreviewConfigured(env) &&
      new URL(request.url).protocol === "https:"
    );
  } catch {
    return false;
  }
}

export function canRunStage8_3ProductionRoute(
  request: Request,
  env: AiRuntimeEnvironment = process.env,
) {
  try {
    return (
      isStage8_3ProductionConfigured(env) &&
      new URL(request.url).protocol === "https:"
    );
  } catch {
    return false;
  }
}

export function canRunFormalAiRoute(
  request: Request,
  env: AiRuntimeEnvironment = process.env,
) {
  return (
    canRunStage7b2FormalRoute(request, env) ||
    canRunStage8_2ProtectedPreviewRoute(request, env) ||
    canRunStage8_3ProductionRoute(request, env)
  );
}

export function resolveAiProviderAttemptBoundary(
  env: AiRuntimeEnvironment = process.env,
): AiProviderAttemptBoundary | undefined {
  if (isStage7b2LocalSmokeConfigured(env)) {
    return {
      maximumProviderAttempts: AI_STAGE7B2_MAX_PROVIDER_ATTEMPTS,
      reason: "stage7b2_smoke_attempt_limit",
    };
  }
  if (
    isStage8_2ProtectedPreviewConfigured(env) &&
    clean(env[AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS_ENV_VAR]) ===
      String(AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS)
  ) {
    return {
      maximumProviderAttempts: AI_STAGE8_2_ROLLOUT_MAX_PROVIDER_ATTEMPTS,
      reason: "stage8_2_preview_rollout_attempt_limit",
    };
  }
  if (
    isStage8_3ProductionConfigured(env) &&
    clean(env[AI_STAGE8_3_ROLLOUT_MAX_PROVIDER_ATTEMPTS_ENV_VAR]) ===
      String(AI_STAGE8_3_ROLLOUT_MAX_PROVIDER_ATTEMPTS)
  ) {
    return {
      maximumProviderAttempts: AI_STAGE8_3_ROLLOUT_MAX_PROVIDER_ATTEMPTS,
      reason: "stage8_3_production_rollout_attempt_limit",
    };
  }
  return undefined;
}

export function resolveAiRuntimeHealth(
  env: AiRuntimeEnvironment,
  now: string | Date,
): AiRuntimeHealth {
  const enabled = env.MIMI_AI_RUNTIME_ENABLED === "true";
  const availability = getAiGenerationAvailability({
    killSwitchEnabled: env.MIMI_AI_KILL_SWITCH === "true",
    providerConfigured: enabled && Boolean(env.GEMINI_API_KEY?.trim()),
    pricingFresh: isGeminiPricingFresh(GEMINI_PRICING_2026_07_14_STANDARD, now),
    usageAccountingAvailable:
      env.MIMI_AI_ACCOUNTING_READY === "true" &&
      env.MIMI_AI_SCHEMA6_READY === "true",
    quotaAvailable: env.MIMI_AI_QUOTA_AVAILABLE !== "false",
  });

  if (
    availability.status === "available" &&
    !isStage7b2LocalSmokeRuntime(env) &&
    !isStage8_2ProtectedPreviewRuntime(env) &&
    !isStage8_3ProductionRuntime(env)
  ) {
    return {
      enabled,
      availability: {
        status: "resting",
        reason: "provider_activation_pending",
      },
    };
  }

  return { enabled, availability };
}

export function aiRestingMessage(reason: AiGenerationAvailability["reason"]) {
  if (reason === "quota_exhausted") {
    return "AI suggestions have finished for today. Your saved words still work normally.";
  }
  return "AI suggestions are resting for now. Your saved words still work normally.";
}
