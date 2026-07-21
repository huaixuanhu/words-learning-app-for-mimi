import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createPool } from "./db-connection.mjs";
import {
  assertCommandContract,
  assertPinnedAdditiveMigration,
  assertPinnedTtsMigration,
  assertExpectedInventoryDigest,
  assertMainMigrationGates,
  assertPinnedMigration,
  assertTargetIdentity,
  compareInventoryParity,
  databaseUrlFromEnv,
  safeFailure,
  unwrapSafeInventoryArtifact,
  V2_STAGE8_3_TARGETS,
} from "./v2-stage8-3-contract.mjs";
import {
  executePinnedMigration,
  inventorySchema5,
  inventorySchema6,
  withReadOnlySnapshot,
} from "./v2-stage8-3-db-core.mjs";

const MIGRATION_FILE = resolve(
  process.cwd(),
  "db/migrations/0003_v2_schema6_data_model.sql",
);
const ADDITIVE_MIGRATION_FILE = resolve(
  process.cwd(),
  "db/migrations/0004_v2_bilingual_examples.sql",
);
const TTS_MIGRATION_FILE = resolve(
  process.cwd(),
  "db/migrations/0005_v2_standard_tts_accounting.sql",
);

function migrationBody(sql, filename) {
  const normalized = sql.trim();
  if (!/^begin;\s/iu.test(normalized) || !/\scommit;$/iu.test(normalized)) {
    throw Object.assign(new Error(`${filename} is not transaction wrapped`), {
      code: "V2_8_3_MIGRATION_WRAPPER_INVALID",
      safeToReport: true,
    });
  }
  return normalized.replace(/^begin;\s*/iu, "").replace(/\s*commit;$/iu, "");
}

function beforeArtifactPath(argv) {
  const positions = argv
    .map((value, index) => (value === "--before" ? index : -1))
    .filter((index) => index >= 0);
  if (positions.length !== 1) {
    throw Object.assign(
      new Error("parity-schema6 requires exactly one --before artifact path"),
      {
        code: "V2_8_3_BEFORE_ARTIFACT_REQUIRED",
        safeToReport: true,
      },
    );
  }
  const value = argv[positions[0] + 1];
  if (!value || value.startsWith("--")) {
    throw Object.assign(new Error("The --before artifact path is missing"), {
      code: "V2_8_3_BEFORE_ARTIFACT_REQUIRED",
      safeToReport: true,
    });
  }
  return resolve(process.cwd(), value);
}

async function readBeforeArtifact(argv) {
  const raw = await readFile(beforeArtifactPath(argv), "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("The --before artifact is not valid JSON"), {
      code: "V2_8_3_BEFORE_ARTIFACT_INVALID",
      safeToReport: true,
    });
  }
  const artifact = unwrapSafeInventoryArtifact(parsed);
  if (artifact.schemaVersion !== 5) {
    throw Object.assign(
      new Error("The --before artifact must be a Schema 5 inventory"),
      {
        code: "V2_8_3_BEFORE_ARTIFACT_SCHEMA_MISMATCH",
        safeToReport: true,
      },
    );
  }
  return artifact;
}

async function run() {
  let phase = "local-guard";
  let pool;
  let client;
  try {
    const command = process.argv[2];
    const contract = assertCommandContract({
      argv: process.argv.slice(3),
      command,
      env: process.env,
    });
    const rawUrl = databaseUrlFromEnv(process.env);
    const identity = await assertTargetIdentity({
      env: process.env,
      rawUrl,
    });
    const migrationSql = await readFile(MIGRATION_FILE, "utf8");
    const migrationSha256 = assertPinnedMigration(migrationSql);
    const additiveMigrationSql = await readFile(ADDITIVE_MIGRATION_FILE, "utf8");
    const additiveMigrationSha256 = assertPinnedAdditiveMigration(
      additiveMigrationSql,
    );
    const ttsMigrationSql = await readFile(TTS_MIGRATION_FILE, "utf8");
    const ttsMigrationSha256 = assertPinnedTtsMigration(ttsMigrationSql);
    const completeMigrationSql = [
      "begin;",
      migrationBody(migrationSql, "0003_v2_schema6_data_model.sql"),
      migrationBody(additiveMigrationSql, "0004_v2_bilingual_examples.sql"),
      migrationBody(ttsMigrationSql, "0005_v2_standard_tts_accounting.sql"),
      "commit;",
    ].join("\n");
    const beforeArtifact =
      command === "parity-schema6"
        ? await readBeforeArtifact(process.argv.slice(3))
        : null;

    let mainGates = null;
    let expectedBeforeDigest = null;
    if (command === "migrate-main") {
      mainGates = assertMainMigrationGates(process.env);
      expectedBeforeDigest = assertExpectedInventoryDigest(
        process.env,
        V2_STAGE8_3_TARGETS.MAIN,
      );
    } else if (command === "migrate-clone") {
      expectedBeforeDigest = assertExpectedInventoryDigest(
        process.env,
        V2_STAGE8_3_TARGETS.CLONE,
      );
    }

    phase = "database-connect";
    pool = createPool(rawUrl);
    client = await pool.connect();
    await client.query("set timezone to 'UTC'");
    phase = command;

    let result;
    if (command === "inventory-schema5") {
      result = await withReadOnlySnapshot(client, () =>
        inventorySchema5(client, identity, process.env),
      );
    } else if (command === "inspect-schema6") {
      result = await withReadOnlySnapshot(client, () =>
        inventorySchema6(client, identity, process.env),
      );
    } else if (command === "parity-schema6") {
      const after = await withReadOnlySnapshot(client, () =>
        inventorySchema6(client, identity, process.env),
      );
      const parity = compareInventoryParity(beforeArtifact, after);
      if (!parity.matched) {
        throw Object.assign(
          new Error(`Parity failed: ${parity.mismatches.join(", ")}`),
          {
            code: "V2_8_3_PARITY_FAILURE",
            safeToReport: true,
          },
        );
      }
      result = { after, before: beforeArtifact, parity };
    } else {
      result = await executePinnedMigration({
        client,
        env: process.env,
        expectedBeforeDigest,
        identity,
        migrationSql: completeMigrationSql,
      });
      result = {
        ...result,
        mainGates,
      };
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          additiveMigrationSha256,
          migrationSha256,
          ttsMigrationSha256,
          result,
          targetMode: contract.target,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: safeFailure(error, phase) }));
    process.exitCode = 1;
  } finally {
    client?.release();
    await pool?.end();
  }
}

await run();
