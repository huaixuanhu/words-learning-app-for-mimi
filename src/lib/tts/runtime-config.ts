export const TTS_LOCAL_FIXTURE_SCOPE = "v2-8-2-3-local-fixture";
export const TTS_LOCAL_GOOGLE_SCOPE = "v2-8-2-3-local-google-adc";
export const TTS_GOOGLE_PROJECT_ID = "for-tts-502913";

type TtsEnvironment = Record<string, string | undefined> & {
  MIMI_TTS_EXECUTION_SCOPE?: string;
  MIMI_TTS_KILL_SWITCH?: string;
  MIMI_TTS_PROVIDER?: string;
  MIMI_TTS_GCP_PROJECT?: string;
  MIMI_TTS_RUNTIME_ENABLED?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
};

export type TtsRuntimeConfig =
  | Readonly<{
      status: "available";
      executionScope: typeof TTS_LOCAL_FIXTURE_SCOPE;
      provider: "local-fixture";
    }>
  | Readonly<{
      status: "available";
      executionScope: typeof TTS_LOCAL_GOOGLE_SCOPE;
      provider: "google-cloud-standard";
      projectId: typeof TTS_GOOGLE_PROJECT_ID;
    }>
  | Readonly<{
      status: "resting";
      reason:
        | "kill_switch_closed"
        | "runtime_disabled"
        | "scope_not_available"
        | "provider_not_available"
        | "project_not_available"
        | "local_boundary_rejected";
    }>;

function loopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function resolveTtsRuntimeConfig(
  requestUrl: string,
  env: TtsEnvironment = process.env,
): TtsRuntimeConfig {
  if (env.MIMI_TTS_KILL_SWITCH !== "off") {
    return { status: "resting", reason: "kill_switch_closed" };
  }
  if (env.MIMI_TTS_RUNTIME_ENABLED !== "true") {
    return { status: "resting", reason: "runtime_disabled" };
  }
  const url = new URL(requestUrl);
  if (
    !loopbackHostname(url.hostname) ||
    env.VERCEL === "1" ||
    Boolean(env.VERCEL_ENV)
  ) {
    return { status: "resting", reason: "local_boundary_rejected" };
  }

  if (env.MIMI_TTS_EXECUTION_SCOPE === TTS_LOCAL_FIXTURE_SCOPE) {
    if (env.MIMI_TTS_PROVIDER !== "local-fixture") {
      return { status: "resting", reason: "provider_not_available" };
    }
    return {
      status: "available",
      executionScope: TTS_LOCAL_FIXTURE_SCOPE,
      provider: "local-fixture",
    };
  }

  if (env.MIMI_TTS_EXECUTION_SCOPE !== TTS_LOCAL_GOOGLE_SCOPE) {
    return { status: "resting", reason: "scope_not_available" };
  }
  if (env.MIMI_TTS_PROVIDER !== "google-cloud-standard") {
    return { status: "resting", reason: "provider_not_available" };
  }
  if (env.MIMI_TTS_GCP_PROJECT !== TTS_GOOGLE_PROJECT_ID) {
    return { status: "resting", reason: "project_not_available" };
  }
  return {
    status: "available",
    executionScope: TTS_LOCAL_GOOGLE_SCOPE,
    provider: "google-cloud-standard",
    projectId: TTS_GOOGLE_PROJECT_ID,
  };
}

export function ttsRestingMessage() {
  return "Cloud voice is not ready here. You can retry later or choose Use device voice in Settings.";
}
