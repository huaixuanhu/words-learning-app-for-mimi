import { describe, expect, it } from "vitest";
import {
  resolveTtsRuntimeConfig,
  TTS_GOOGLE_PROJECT_ID,
  TTS_LOCAL_FIXTURE_SCOPE,
  TTS_LOCAL_GOOGLE_SCOPE,
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
    });
    expect(
      resolveTtsRuntimeConfig("http://127.0.0.1:3000/api/tts", {
        ...googleEnabled,
        MIMI_TTS_GCP_PROJECT: "wrong-project",
      }),
    ).toEqual({ status: "resting", reason: "project_not_available" });
  });
});
