export type StorageRuntimeMode = "local" | "postgres-preview" | "postgres-production";

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

  if (cleaned === "local" || cleaned === "postgres-preview" || cleaned === "postgres-production") {
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

export function canUsePostgresProductionRuntime(env: NodeJS.ProcessEnv = process.env) {
  return isProductionVercelEnvironment(env);
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

export function assertPostgresProductionRuntime(env: NodeJS.ProcessEnv = process.env) {
  const resolution = resolveStorageRuntimeMode(env);

  if (resolution.mode !== "postgres-production") {
    throw new Error("Postgres Production runtime is disabled unless MIMI_STORAGE_RUNTIME=postgres-production");
  }

  if (!canUsePostgresProductionRuntime(env)) {
    throw new Error("Postgres Production runtime is allowed only in Vercel Production");
  }

  return resolution;
}

export function assertPostgresRuntime(env: NodeJS.ProcessEnv = process.env) {
  const resolution = resolveStorageRuntimeMode(env);

  if (resolution.mode === "postgres-preview") {
    return assertPostgresPreviewRuntime(env);
  }

  if (resolution.mode === "postgres-production") {
    return assertPostgresProductionRuntime(env);
  }

  throw new Error(
    "Postgres runtime is disabled unless MIMI_STORAGE_RUNTIME=postgres-preview or postgres-production",
  );
}

export function isPostgresRuntimeMode(mode: StorageRuntimeMode) {
  return mode === "postgres-preview" || mode === "postgres-production";
}

export function isStorageSmokeWriteEnabled(env: NodeJS.ProcessEnv = process.env) {
  return cleanEnvValue(env[STORAGE_SMOKE_WRITES_ENV_VAR]) === "true";
}

export function isStorageUiWriteEnabled(env: NodeJS.ProcessEnv = process.env) {
  return cleanEnvValue(env[STORAGE_UI_WRITES_ENV_VAR]) === "true";
}
