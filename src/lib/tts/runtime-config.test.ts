import { describe, expect, it } from "vitest";
import {
  resolveTtsRuntimeConfig,
  TTS_GOOGLE_PROJECT_ID,
  TTS_LOCAL_FIXTURE_SCOPE,
  TTS_LOCAL_GOOGLE_SCOPE,
  TTS_PREVIEW_GOOGLE_SCOPE,
  TTS_PRODUCTION_GOOGLE_SCOPE,
  TTS_PRODUCTION_SERVICE_ACCOUNT_EMAIL,
  TTS_PRODUCTION_WIF_POOL_ID,
  TTS_PRODUCTION_WIF_PROVIDER_ID,
} from "./runtime-config";

const enabled = {
  MIMI_TTS_KILL_SWITCH: "off",
  MIMI_TTS_RUNTIME_ENABLED: "true",
  MIMI_TTS_EXECUTION_SCOPE: TTS_LOCAL_FIXTURE_SCOPE,
  MIMI_TTS_PROVIDER: "local-fixture",
};

describe("TTS local runtime gate", () => {
  it("opens only the exact local fixture boundary", () => {
    expect(resolveTtsRuntimeConfig("http://localhost:3000/api/tts", enabled)).toEqual({
      status: "available",
      executionScope: TTS_LOCAL_FIXTURE_SCOPE,
      provider: "local-fixture",
    });
  });

  it("fails closed when any provider gate is missing or Vercel is present", () => {
    expect(resolveTtsRuntimeConfig("http://localhost:3000/api/tts", {})).toMatchObject({
      status: "resting",
    });
    expect(
      resolveTtsRuntimeConfig("http://localhost:3000/api/tts", {
        ...enabled,
        VERCEL: "1",
      }),
    ).toEqual({ status: "resting", reason: "local_boundary_rejected" });
    expect(
      resolveTtsRuntimeConfig("https://preview.example/api/tts", enabled),
    ).toEqual({ status: "resting", reason: "local_boundary_rejected" });
  });

  it("opens the dedicated local Google ADC route only for the pinned project", () => {
    const googleEnabled = {
      MIMI_TTS_KILL_SWITCH: "off",
      MIMI_TTS_RUNTIME_ENABLED: "true",
      MIMI_TTS_EXECUTION_SCOPE: TTS_LOCAL_GOOGLE_SCOPE,
      MIMI_TTS_PROVIDER: "google-cloud-standard",
      MIMI_TTS_GCP_PROJECT: TTS_GOOGLE_PROJECT_ID,
    };
    expect(
      resolveTtsRuntimeConfig("http://127.0.0.1:3000/api/tts", googleEnabled),
    ).toEqual({
      status: "available",
      executionScope: TTS_LOCAL_GOOGLE_SCOPE,
      provider: "google-cloud-standard",
      projectId: TTS_GOOGLE_PROJECT_ID,
      credentialMode: "google-adc",
    });
    expect(
      resolveTtsRuntimeConfig("http://127.0.0.1:3000/api/tts", {
        ...googleEnabled,
        MIMI_TTS_GCP_PROJECT: "wrong-project",
      }),
    ).toEqual({ status: "resting", reason: "project_not_available" });
  });

  it("opens only the exact protected Preview WIF boundary", () => {
    const previewEnabled = {
      MIMI_TTS_KILL_SWITCH: "off",
      MIMI_TTS_RUNTIME_ENABLED: "true",
      MIMI_TTS_EXECUTION_SCOPE: TTS_PREVIEW_GOOGLE_SCOPE,
      MIMI_TTS_PROVIDER: "google-cloud-standard",
      MIMI_TTS_GCP_PROJECT: TTS_GOOGLE_PROJECT_ID,
      MIMI_TTS_GCP_PROJECT_NUMBER: "123456789012",
      MIMI_TTS_GCP_SERVICE_ACCOUNT_EMAIL:
        "mimi-tts-preview@for-tts-502913.iam.gserviceaccount.com",
      MIMI_TTS_GCP_WORKLOAD_IDENTITY_POOL_ID: "mimi-vercel-preview",
      MIMI_TTS_GCP_WORKLOAD_IDENTITY_PROVIDER_ID: "mimi-v2-preview",
      MIMI_TTS_ACCOUNTING_READY: "true",
      MIMI_TTS_SCHEMA6_READY: "true",
      MIMI_TTS_IDENTITY_TYPE_CONFIRMED: "wif",
      MIMI_STORAGE_RUNTIME: "postgres-preview",
      MIMI_V2_8_2_STAGING_TARGET_CONFIRMED: "true",
      MIMI_V2_8_2_PREVIEW_PROTECTED_CONFIRMED: "true",
      STAGE5F_DATABASE_TARGET: "preview",
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_REF: "V2",
      NODE_ENV: "production",
    };
    expect(
      resolveTtsRuntimeConfig("https://preview.example/api/tts", previewEnabled),
    ).toEqual({
      status: "available",
      executionScope: TTS_PREVIEW_GOOGLE_SCOPE,
      provider: "google-cloud-standard",
      projectId: TTS_GOOGLE_PROJECT_ID,
      credentialMode: "vercel-wif",
      identity: {
        audience:
          "https://iam.googleapis.com/projects/123456789012/locations/global/" +
          "workloadIdentityPools/mimi-vercel-preview/providers/mimi-v2-preview",
        projectNumber: "123456789012",
        serviceAccountEmail:
          "mimi-tts-preview@for-tts-502913.iam.gserviceaccount.com",
        workloadIdentityPoolId: "mimi-vercel-preview",
        workloadIdentityProviderId: "mimi-v2-preview",
      },
    });

    for (const unsafe of [
      { ...previewEnabled, VERCEL_GIT_COMMIT_REF: "main" },
      { ...previewEnabled, VERCEL_ENV: "production" },
      { ...previewEnabled, MIMI_STORAGE_RUNTIME: "postgres-production" },
      { ...previewEnabled, MIMI_V2_8_2_PREVIEW_PROTECTED_CONFIRMED: "false" },
      { ...previewEnabled, MIMI_TTS_ACCOUNTING_READY: "false" },
      { ...previewEnabled, MIMI_TTS_IDENTITY_TYPE_CONFIRMED: "key" },
      { ...previewEnabled, NODE_ENV: "test" },
    ]) {
      expect(
        resolveTtsRuntimeConfig("https://preview.example/api/tts", unsafe),
      ).toMatchObject({ status: "resting" });
    }
    expect(
      resolveTtsRuntimeConfig("http://preview.example/api/tts", previewEnabled),
    ).toEqual({ status: "resting", reason: "preview_boundary_rejected" });
  });

  it("opens only the exact independent Production WIF boundary", () => {
    const productionEnabled = {
      MIMI_TTS_KILL_SWITCH: "off",
      MIMI_TTS_RUNTIME_ENABLED: "true",
      MIMI_TTS_EXECUTION_SCOPE: TTS_PRODUCTION_GOOGLE_SCOPE,
      MIMI_TTS_PROVIDER: "google-cloud-standard",
      MIMI_TTS_GCP_PROJECT: TTS_GOOGLE_PROJECT_ID,
      MIMI_TTS_GCP_PROJECT_NUMBER: "123456789012",
      MIMI_TTS_GCP_SERVICE_ACCOUNT_EMAIL:
        TTS_PRODUCTION_SERVICE_ACCOUNT_EMAIL,
      MIMI_TTS_GCP_WORKLOAD_IDENTITY_POOL_ID: TTS_PRODUCTION_WIF_POOL_ID,
      MIMI_TTS_GCP_WORKLOAD_IDENTITY_PROVIDER_ID:
        TTS_PRODUCTION_WIF_PROVIDER_ID,
      MIMI_TTS_ACCOUNTING_READY: "true",
      MIMI_TTS_SCHEMA6_READY: "true",
      MIMI_TTS_IDENTITY_TYPE_CONFIRMED: "wif",
      MIMI_STORAGE_RUNTIME: "postgres-production",
      MIMI_V2_8_3_PRODUCTION_TARGET_CONFIRMED: "true",
      MIMI_V2_8_3_PRODUCTION_ACCESS_CONFIRMED: "true",
      MIMI_PRODUCTION_CUTOVER_MODE: "live",
      STAGE6B_DATABASE_TARGET: "production",
      VERCEL: "1",
      VERCEL_ENV: "production",
      VERCEL_GIT_COMMIT_REF: "main",
      NODE_ENV: "production",
    };
    expect(
      resolveTtsRuntimeConfig("https://words.example/api/tts", productionEnabled),
    ).toEqual({
      status: "available",
      executionScope: TTS_PRODUCTION_GOOGLE_SCOPE,
      provider: "google-cloud-standard",
      projectId: TTS_GOOGLE_PROJECT_ID,
      credentialMode: "vercel-wif",
      identity: {
        audience:
          "https://iam.googleapis.com/projects/123456789012/locations/global/" +
          "workloadIdentityPools/mimi-vercel-production/providers/mimi-v2-production",
        projectNumber: "123456789012",
        serviceAccountEmail: TTS_PRODUCTION_SERVICE_ACCOUNT_EMAIL,
        workloadIdentityPoolId: TTS_PRODUCTION_WIF_POOL_ID,
        workloadIdentityProviderId: TTS_PRODUCTION_WIF_PROVIDER_ID,
      },
    });

    for (const unsafe of [
      { ...productionEnabled, VERCEL_ENV: "preview" },
      { ...productionEnabled, VERCEL_GIT_COMMIT_REF: "V2" },
      { ...productionEnabled, MIMI_STORAGE_RUNTIME: "postgres-preview" },
      { ...productionEnabled, MIMI_PRODUCTION_CUTOVER_MODE: "schema6-readiness" },
      { ...productionEnabled, MIMI_V2_8_3_PRODUCTION_TARGET_CONFIRMED: "false" },
      { ...productionEnabled, MIMI_TTS_ACCOUNTING_READY: "false" },
      {
        ...productionEnabled,
        MIMI_TTS_GCP_SERVICE_ACCOUNT_EMAIL:
          "mimi-tts-preview@for-tts-502913.iam.gserviceaccount.com",
      },
      {
        ...productionEnabled,
        MIMI_TTS_GCP_WORKLOAD_IDENTITY_POOL_ID: "mimi-vercel-preview",
      },
      {
        ...productionEnabled,
        MIMI_TTS_GCP_WORKLOAD_IDENTITY_PROVIDER_ID: "mimi-v2-preview",
      },
    ]) {
      expect(
        resolveTtsRuntimeConfig("https://words.example/api/tts", unsafe),
      ).toMatchObject({ status: "resting" });
    }
    expect(
      resolveTtsRuntimeConfig("http://words.example/api/tts", productionEnabled),
    ).toEqual({ status: "resting", reason: "production_boundary_rejected" });
  });
});
