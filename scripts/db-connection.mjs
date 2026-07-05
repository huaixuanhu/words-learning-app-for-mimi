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
  return new Pool({ connectionString: getDatabaseUrl() });
}
