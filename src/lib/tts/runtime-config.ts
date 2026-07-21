export const TTS_LOCAL_FIXTURE_SCOPE = "v2-8-2-3-local-fixture";
export const TTS_LOCAL_GOOGLE_SCOPE = "v2-8-2-3-local-google-adc";
export const TTS_PREVIEW_GOOGLE_SCOPE = "v2-8-2-3-preview";
export const TTS_GOOGLE_PROJECT_ID = "for-tts-502913";

export type TtsPreviewWifIdentity = Readonly<{
  audience: string;
  projectNumber: string;
  serviceAccountEmail: string;
  workloadIdentityPoolId: string;
  workloadIdentityProviderId: string;
}>;

type TtsEnvironment = Record<string, string | undefined> & {
  MIMI_TTS_EXECUTION_SCOPE?: string;
  MIMI_TTS_KILL_SWITCH?: string;
  MIMI_TTS_PROVIDER?: string;
  MIMI_TTS_GCP_PROJECT?: string;
  MIMI_TTS_GCP_PROJECT_NUMBER?: string;
  MIMI_TTS_GCP_SERVICE_ACCOUNT_EMAIL?: string;
  MIMI_TTS_GCP_WORKLOAD_IDENTITY_POOL_ID?: string;
  MIMI_TTS_GCP_WORKLOAD_IDENTITY_PROVIDER_ID?: string;
  MIMI_TTS_ACCOUNTING_READY?: string;
  MIMI_TTS_SCHEMA6_READY?: string;
  MIMI_TTS_IDENTITY_TYPE_CONFIRMED?: string;
  MIMI_TTS_RUNTIME_ENABLED?: string;
  MIMI_STORAGE_RUNTIME?: string;
  MIMI_V2_8_2_STAGING_TARGET_CONFIRMED?: string;
  MIMI_V2_8_2_PREVIEW_PROTECTED_CONFIRMED?: string;
  STAGE5F_DATABASE_TARGET?: string;
  NODE_ENV?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_REF?: string;
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
      credentialMode: "google-adc";
    }>
  | Readonly<{
      status: "available";
      executionScope: typeof TTS_PREVIEW_GOOGLE_SCOPE;
      provider: "google-cloud-standard";
      projectId: typeof TTS_GOOGLE_PROJECT_ID;
      credentialMode: "vercel-wif";
      identity: TtsPreviewWifIdentity;
    }>
  | Readonly<{
      status: "resting";
      reason:
        | "kill_switch_closed"
        | "runtime_disabled"
        | "scope_not_available"
        | "provider_not_available"
        | "project_not_available"
        | "local_boundary_rejected"
        | "preview_boundary_rejected"
        | "preview_readiness_missing"
        | "identity_not_available";
    }>;

function loopbackHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

function validWifId(value: string) {
  return /^[a-z][a-z0-9-]{3,31}$/u.test(value);
}

function resolvePreviewIdentity(env: TtsEnvironment): TtsPreviewWifIdentity | null {
  const projectNumber = clean(env.MIMI_TTS_GCP_PROJECT_NUMBER);
  const serviceAccountEmail = clean(env.MIMI_TTS_GCP_SERVICE_ACCOUNT_EMAIL);
  const workloadIdentityPoolId = clean(env.MIMI_TTS_GCP_WORKLOAD_IDENTITY_POOL_ID);
  const workloadIdentityProviderId = clean(
    env.MIMI_TTS_GCP_WORKLOAD_IDENTITY_PROVIDER_ID,
  );
  if (!/^\d{6,20}$/u.test(projectNumber)) return null;
  if (
    !/^[a-z][a-z0-9-]{4,28}[a-z0-9]@for-tts-502913\.iam\.gserviceaccount\.com$/u.test(
      serviceAccountEmail,
    )
  ) {
    return null;
  }
  if (!validWifId(workloadIdentityPoolId) || !validWifId(workloadIdentityProviderId)) {
    return null;
  }
  return {
    audience:
      `https://iam.googleapis.com/projects/${projectNumber}/locations/global/` +
      `workloadIdentityPools/${workloadIdentityPoolId}/providers/${workloadIdentityProviderId}`,
    projectNumber,
    serviceAccountEmail,
    workloadIdentityPoolId,
    workloadIdentityProviderId,
  };
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
  const localBoundary =
    loopbackHostname(url.hostname) &&
    env.VERCEL !== "1" &&
    !clean(env.VERCEL_ENV);

  if (env.MIMI_TTS_EXECUTION_SCOPE === TTS_LOCAL_FIXTURE_SCOPE) {
    if (!localBoundary) {
      return { status: "resting", reason: "local_boundary_rejected" };
    }
    if (env.MIMI_TTS_PROVIDER !== "local-fixture") {
      return { status: "resting", reason: "provider_not_available" };
    }
    return {
      status: "available",
      executionScope: TTS_LOCAL_FIXTURE_SCOPE,
      provider: "local-fixture",
    };
  }

  if (env.MIMI_TTS_EXECUTION_SCOPE === TTS_LOCAL_GOOGLE_SCOPE) {
    if (!localBoundary) {
      return { status: "resting", reason: "local_boundary_rejected" };
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
      credentialMode: "google-adc",
    };
  }

  if (env.MIMI_TTS_EXECUTION_SCOPE !== TTS_PREVIEW_GOOGLE_SCOPE) {
    return { status: "resting", reason: "scope_not_available" };
  }
  if (env.MIMI_TTS_PROVIDER !== "google-cloud-standard") {
    return { status: "resting", reason: "provider_not_available" };
  }
  if (env.MIMI_TTS_GCP_PROJECT !== TTS_GOOGLE_PROJECT_ID) {
    return { status: "resting", reason: "project_not_available" };
  }
  if (
    url.protocol !== "https:" ||
    clean(env.VERCEL) !== "1" ||
    clean(env.VERCEL_ENV) !== "preview" ||
    clean(env.VERCEL_GIT_COMMIT_REF) !== "V2" ||
    env.MIMI_STORAGE_RUNTIME !== "postgres-preview" ||
    env.STAGE5F_DATABASE_TARGET !== "preview" ||
    env.NODE_ENV === "test"
  ) {
    return { status: "resting", reason: "preview_boundary_rejected" };
  }
  if (
    env.MIMI_TTS_ACCOUNTING_READY !== "true" ||
    env.MIMI_TTS_SCHEMA6_READY !== "true" ||
    env.MIMI_V2_8_2_STAGING_TARGET_CONFIRMED !== "true" ||
    env.MIMI_V2_8_2_PREVIEW_PROTECTED_CONFIRMED !== "true"
  ) {
    return { status: "resting", reason: "preview_readiness_missing" };
  }
  if (env.MIMI_TTS_IDENTITY_TYPE_CONFIRMED !== "wif") {
    return { status: "resting", reason: "identity_not_available" };
  }
  const identity = resolvePreviewIdentity(env);
  if (!identity) {
    return { status: "resting", reason: "identity_not_available" };
  }
  return {
    status: "available",
    executionScope: TTS_PREVIEW_GOOGLE_SCOPE,
    provider: "google-cloud-standard",
    projectId: TTS_GOOGLE_PROJECT_ID,
    credentialMode: "vercel-wif",
    identity,
  };
}

export function ttsRestingMessage() {
  return "Cloud voice is not ready here. You can retry later or choose Use device voice in Settings.";
}
