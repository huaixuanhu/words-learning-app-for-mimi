import { Pool } from "@neondatabase/serverless";

export function assertNonProductionDatabaseTarget() {
  const target = process.env.STAGE5F_DATABASE_TARGET;

  if (target !== "development" && target !== "preview") {
    throw new Error(
      "Refusing database access without STAGE5F_DATABASE_TARGET=development or preview",
    );
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new Error("Refusing database access when VERCEL_ENV=production");
  }
}

export function assertProductionDatabaseTarget(expectedAction) {
  if (process.env.STAGE6B_DATABASE_TARGET !== "production") {
    throw new Error("Refusing Production database access without STAGE6B_DATABASE_TARGET=production");
  }

  if (process.env.VERCEL_ENV !== "production") {
    throw new Error("Refusing Production database access without VERCEL_ENV=production");
  }

  if (process.env.MIMI_PRODUCTION_DATABASE_ACTION !== expectedAction) {
    throw new Error(
      `Refusing Production database access without MIMI_PRODUCTION_DATABASE_ACTION=${expectedAction}`,
    );
  }
}

export function getDatabaseUrl() {
  const databaseUrl =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL_UNPOOLED, POSTGRES_URL_NON_POOLING, or DATABASE_URL");
  }

  return databaseUrl;
}

export function createPool() {
  const pool = new Pool({ connectionString: getDatabaseUrl() });

  pool.on("error", (error) => {
    console.error(`Database pool error code: ${error?.code || "unknown"}`);
  });

  return pool;
}
