import {
  assertNonProductionDatabaseTarget,
  createPool,
} from "./db-connection.mjs";
import { inspectSchema5 } from "./schema5-inspection.mjs";

assertNonProductionDatabaseTarget();

const pool = createPool();
let client;

try {
  client = await pool.connect();
  console.log(JSON.stringify(await inspectSchema5(client), null, 2));
} catch (error) {
  console.error(`Schema version 5 inspection failed with code: ${error?.code || "unknown"}`);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
