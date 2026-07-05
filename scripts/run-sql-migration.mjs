import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  assertNonProductionDatabaseTarget,
  createPool,
} from "./db-connection.mjs";

const migrationPath = process.argv[2];

if (!migrationPath) {
  throw new Error("Usage: node scripts/run-sql-migration.mjs <migration.sql>");
}

assertNonProductionDatabaseTarget();

const resolvedMigrationPath = resolve(process.cwd(), migrationPath);
const sql = await readFile(resolvedMigrationPath, "utf8");
const pool = createPool();
const client = await pool.connect();

try {
  await client.query(sql);
  console.log(`Applied migration: ${migrationPath}`);
} finally {
  client.release();
  await pool.end();
}
