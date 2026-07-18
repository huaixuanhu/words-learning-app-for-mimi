import {
  GEMINI_PRICING_2026_07_14_STANDARD,
  getAiGenerationAvailability,
  isGeminiPricingFresh,
} from "./contract";
import type { AiGenerationAvailability } from "./types";

type AiRuntimeEnvironment = Readonly<Record<string, string | undefined>>;

export const AI_PROVIDER_ACTIVATION_STATE = "v2-7b-2-local-smoke" as const;
export const AI_STAGE7B2_EXECUTION_SCOPE = "v2-7b-2-local-smoke" as const;
export const AI_STAGE7B2_MAX_PROVIDER_ATTEMPTS = 2 as const;

export type AiRuntimeHealth = Readonly<{
  enabled: boolean;
  availability: AiGenerationAvailability;
}>;

function clean(value: string | undefined) {
  return value?.trim() ?? "";
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

  if (availability.status === "available" && !isStage7b2LocalSmokeRuntime(env)) {
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
