import { describe, expect, it } from "vitest";
import {
  assertPostgresPreviewRuntime,
  canUsePostgresPreviewRuntime,
  isStorageSmokeWriteEnabled,
  resolveStorageRuntimeMode,
} from "./runtime-mode";

function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    ...overrides,
    NODE_ENV: overrides.NODE_ENV ?? "test",
  } as NodeJS.ProcessEnv;
}

describe("storage runtime mode", () => {
  it("defaults to local runtime when no env override is present", () => {
    expect(resolveStorageRuntimeMode(testEnv())).toEqual({
      mode: "local",
      source: "default",
      reason: "missing",
      rawValue: null,
    });
  });

  it("falls back to local runtime for invalid env values", () => {
    expect(resolveStorageRuntimeMode(testEnv({ MIMI_STORAGE_RUNTIME: "postgres" }))).toMatchObject({
      mode: "local",
      source: "env",
      reason: "invalid",
      rawValue: "postgres",
    });
  });

  it("allows postgres-preview in development or preview only", () => {
    expect(
      canUsePostgresPreviewRuntime(testEnv({
        MIMI_STORAGE_RUNTIME: "postgres-preview",
        VERCEL_ENV: "preview",
        NODE_ENV: "production",
      })),
    ).toBe(true);
    expect(
      canUsePostgresPreviewRuntime(testEnv({
        MIMI_STORAGE_RUNTIME: "postgres-preview",
        STAGE5F_DATABASE_TARGET: "development",
        NODE_ENV: "production",
      })),
    ).toBe(true);
    expect(
      canUsePostgresPreviewRuntime(testEnv({
        MIMI_STORAGE_RUNTIME: "postgres-preview",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      })),
    ).toBe(false);
  });

  it("rejects postgres-preview when Vercel reports production", () => {
    expect(() =>
      assertPostgresPreviewRuntime(testEnv({
        MIMI_STORAGE_RUNTIME: "postgres-preview",
        VERCEL_ENV: "production",
        NODE_ENV: "production",
      })),
    ).toThrow("development or preview");
  });

  it("keeps smoke writes disabled unless explicitly enabled", () => {
    expect(isStorageSmokeWriteEnabled(testEnv())).toBe(false);
    expect(isStorageSmokeWriteEnabled(testEnv({ MIMI_ENABLE_STORAGE_SMOKE_WRITES: "true" }))).toBe(true);
    expect(isStorageSmokeWriteEnabled(testEnv({ MIMI_ENABLE_STORAGE_SMOKE_WRITES: " TRUE " }))).toBe(false);
  });
});
