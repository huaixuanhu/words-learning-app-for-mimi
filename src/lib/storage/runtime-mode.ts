export type StorageRuntimeMode = "local" | "postgres-preview";

export const STORAGE_RUNTIME_ENV_VAR = "MIMI_STORAGE_RUNTIME";
export const STORAGE_SMOKE_WRITES_ENV_VAR = "MIMI_ENABLE_STORAGE_SMOKE_WRITES";
export const STORAGE_UI_WRITES_ENV_VAR = "MIMI_ENABLE_STORAGE_UI_WRITES";

export type StorageRuntimeResolution = Readonly<{
  mode: StorageRuntimeMode;
  source: "default" | "env";
  reason: "missing" | "valid" | "invalid";
  rawValue: string | null;
}>;

function cleanEnvValue(value: string | undefined) {
  return value?.trim() || "";
}

export function isProductionVercelEnvironment(env: NodeJS.ProcessEnv = process.env) {
  return env.VERCEL_ENV === "production";
}

export function parseStorageRuntimeMode(value: string | undefined): StorageRuntimeMode | null {
  const cleaned = cleanEnvValue(value);

  if (!cleaned) {
    return null;
  }

  if (cleaned === "local" || cleaned === "postgres-preview") {
    return cleaned;
  }

  return null;
}

export function resolveStorageRuntimeMode(
  env: NodeJS.ProcessEnv = process.env,
): StorageRuntimeResolution {
  const rawValue = cleanEnvValue(env[STORAGE_RUNTIME_ENV_VAR]);

  if (!rawValue) {
    return {
      mode: "local",
      source: "default",
      reason: "missing",
      rawValue: null,
    };
  }

  const parsed = parseStorageRuntimeMode(rawValue);

  if (!parsed) {
    return {
      mode: "local",
      source: "env",
      reason: "invalid",
      rawValue,
    };
  }

  return {
    mode: parsed,
    source: "env",
    reason: "valid",
    rawValue,
  };
}

export function canUsePostgresPreviewRuntime(env: NodeJS.ProcessEnv = process.env) {
  if (isProductionVercelEnvironment(env)) {
    return false;
  }

  if (env.VERCEL_ENV === "preview" || env.VERCEL_ENV === "development") {
    return true;
  }

  if (env.STAGE5F_DATABASE_TARGET === "development" || env.STAGE5F_DATABASE_TARGET === "preview") {
    return true;
  }

  return env.NODE_ENV !== "production";
}

export function assertPostgresPreviewRuntime(env: NodeJS.ProcessEnv = process.env) {
  const resolution = resolveStorageRuntimeMode(env);

  if (resolution.mode !== "postgres-preview") {
    throw new Error("Postgres runtime is disabled unless MIMI_STORAGE_RUNTIME=postgres-preview");
  }

  if (!canUsePostgresPreviewRuntime(env)) {
    throw new Error("Postgres runtime is allowed only in development or preview environments");
  }

  return resolution;
}

export function isStorageSmokeWriteEnabled(env: NodeJS.ProcessEnv = process.env) {
  return cleanEnvValue(env[STORAGE_SMOKE_WRITES_ENV_VAR]) === "true";
}

export function isStorageUiWriteEnabled(env: NodeJS.ProcessEnv = process.env) {
  return cleanEnvValue(env[STORAGE_UI_WRITES_ENV_VAR]) === "true";
}
