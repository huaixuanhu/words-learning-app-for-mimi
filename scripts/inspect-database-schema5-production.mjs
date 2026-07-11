import {
  assertProductionDatabaseTarget,
  createPool,
} from "./db-connection.mjs";
import {
  assertEmptySchema5Counts,
  inspectSchema5,
} from "./schema5-inspection.mjs";

if (!process.argv.includes("--i-confirm-production-read")) {
  throw new Error("Production inspection requires --i-confirm-production-read");
}

assertProductionDatabaseTarget("inspect");

const pool = createPool();
let client;

try {
  client = await pool.connect();
  const result = await inspectSchema5(client);

  assertEmptySchema5Counts(result.counts);
  console.log(
    JSON.stringify(
      {
        target: "production",
        migration: "skipped-existing-schema",
        empty: true,
        ...result,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(`Production schema version 5 inspection failed with code: ${error?.code || "unknown"}`);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
