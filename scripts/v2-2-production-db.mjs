import { spawnSync } from "node:child_process";
import { chmod, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";

import { createPool } from "./db-connection.mjs";
import { EXPECTED_SCHEMA5_TABLES } from "./schema5-inspection.mjs";
import {
  assertBackupEvidenceBinding,
  assertCommandContract,
  assertPinnedV22Migration,
  assertStagingEvidenceBinding,
  classifyConstraintGeneration,
  compareDataSnapshots,
  safeFailure,
  sha256,
  V2_2_EVENTS_CONSTRAINT,
  V2_2_MIGRATION_SHA256,
  V2_2_STATES_CONSTRAINT,
  V22ProductionGuardError,
} from "./v2-2-production-contract.mjs";
import {
  confirmGuardedTargetReady,
  retrieveGuardedTarget,
} from "./v2-1-neon-target.mjs";
import {
  inspectPotentialInFlightWrites,
  inventorySchema6,
  V2_STAGE8_3_SCHEMA6_TABLES,
  withReadOnlySnapshot,
} from "./v2-stage8-3-db-core.mjs";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "db/migrations/0007_v2_2_fsrs_parameter_sets.sql",
);
const EVIDENCE_ROOT = resolve(
  process.cwd(),
  "local_artifacts",
  "v2-2-production",
);
const STAGING_EVIDENCE_ROOT = EVIDENCE_ROOT;
const BACKUP_EVIDENCE_ROOT = resolve(
  process.cwd(),
  "local_artifacts",
  "v2-1-production",
);
const EXPECTED_TABLES = Object.freeze(
  [...EXPECTED_SCHEMA5_TABLES, ...V2_STAGE8_3_SCHEMA6_TABLES].sort(),
);

function reject(message, code) {
  throw new V22ProductionGuardError(message, code);
}

function command(bin, args) {
  const result = spawnSync(bin, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    reject(
      "The exact Git release state could not be inspected",
      "V2_2_GIT_INSPECTION_FAILED",
    );
  }
  return result.stdout.trim();
}

function assertExactCleanCommit(expectedCommitSha) {
  const actualCommitSha = command("/usr/bin/git", ["rev-parse", "HEAD"]);
  const status = command("/usr/bin/git", [
    "status",
    "--short",
    "--untracked-files=all",
  ]);
  if (actualCommitSha !== expectedCommitSha || status) {
    reject(
      "The V2.2 migration requires the exact clean release commit",
      "V2_2_GIT_RELEASE_STATE_MISMATCH",
    );
  }
  return actualCommitSha;
}

function timestampToken(date = new Date()) {
  return date
    .toISOString()
    .replace(/[-:]/gu, "")
    .replace(/\.\d{3}Z$/u, "Z");
}

function assertContainedEvidencePath(path, root, label) {
  const absolute = resolve(path);
  const child = relative(root, absolute);
  if (!child || child.startsWith("..") || isAbsolute(child)) {
    reject(
      `${label} is outside its ignored evidence directory`,
      "V2_2_EVIDENCE_PATH_INVALID",
    );
  }
  return absolute;
}

async function readEvidence(path, root, label) {
  const absolute = assertContainedEvidencePath(path, root, label);
  const metadata = await stat(absolute);
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0) {
    reject(
      `${label} is not a private regular file`,
      "V2_2_EVIDENCE_FILE_INVALID",
    );
  }
  const body = await readFile(absolute);
  let evidence;
  try {
    evidence = JSON.parse(body.toString("utf8"));
  } catch {
    reject(`${label} is not valid JSON`, "V2_2_EVIDENCE_JSON_INVALID");
  }
  return { absolute, evidence, sha256: sha256(body) };
}

async function assertProductionEvidence(contract) {
  const staging = await readEvidence(
    process.env.MIMI_V2_2_STAGING_EVIDENCE_PATH,
    STAGING_EVIDENCE_ROOT,
    "Staging migration evidence",
  );
  assertStagingEvidenceBinding({
    actualSha256: staging.sha256,
    evidence: staging.evidence,
    expectedSha256: process.env.MIMI_V2_2_STAGING_EVIDENCE_SHA256,
    releaseCommitSha: contract.releaseCommitSha,
  });
  const backup = await readEvidence(
    process.env.MIMI_V2_2_PRODUCTION_BACKUP_EVIDENCE_PATH,
    BACKUP_EVIDENCE_ROOT,
    "Production backup evidence",
  );
  assertBackupEvidenceBinding({
    actualSha256: backup.sha256,
    evidence: backup.evidence,
    expectedSha256:
      process.env.MIMI_V2_2_PRODUCTION_BACKUP_EVIDENCE_SHA256,
    releaseCommitSha: contract.releaseCommitSha,
  });
  return {
    backupEvidenceSha256: backup.sha256,
    expectedConstraintSha256:
      staging.evidence.after.constraints.combinedSha256,
    stagingEvidenceSha256: staging.sha256,
  };
}

async function constraintState(client) {
  const result = await client.query(
    `
      select
        relation.relname as table_name,
        constraint_row.conname as constraint_name,
        constraint_row.contype as constraint_type,
        constraint_row.convalidated as validated,
        pg_get_constraintdef(constraint_row.oid, true) as definition
      from pg_constraint constraint_row
      join pg_class relation on relation.oid = constraint_row.conrelid
      join pg_namespace namespace_row on namespace_row.oid = relation.relnamespace
      where namespace_row.nspname = 'public'
        and constraint_row.conname = any($1::text[])
      order by constraint_row.conname
    `,
    [[V2_2_EVENTS_CONSTRAINT, V2_2_STATES_CONSTRAINT]],
  );
  const constraints = result.rows.map((row) => ({
    definition: row.definition,
    name: row.constraint_name,
    table: row.table_name,
    type: row.constraint_type,
    validated: Boolean(row.validated),
  }));
  return {
    ...classifyConstraintGeneration(constraints),
    definitions: Object.fromEntries(
      constraints.map((constraint) => [
        constraint.name,
        sha256(constraint.definition.replace(/\s+/gu, " ").trim()),
      ]),
    ),
  };
}

async function parameterSetCounts(client) {
  const result = await client.query(
    `
      select source, review_profile, parameter_set_id, count(*)::integer as rows
      from (
        select
          'review_states'::text as source,
          review_profile,
          parameter_set_id
        from review_states
        union all
        select
          'review_events'::text as source,
          review_profile,
          parameter_set_id
        from review_events
      ) parameter_sets
      group by source, review_profile, parameter_set_id
      order by source, review_profile, parameter_set_id
    `,
  );
  const unsupported = result.rows.filter(
    (row) =>
      !(
        (row.review_profile === "recognition" &&
          ["recognition-fsrs-v1", "recognition-fsrs-v2"].includes(
            row.parameter_set_id,
          )) ||
        (row.review_profile === "active" &&
          ["active-fsrs-v1", "active-fsrs-v2"].includes(row.parameter_set_id))
      ),
  );
  if (unsupported.length > 0) {
    reject(
      "Unsupported or cross-profile parameter-set rows remain",
      "V2_2_PARAMETER_SET_ROWS_INVALID",
    );
  }
  return result.rows.map((row) => ({
    parameterSetId: row.parameter_set_id,
    reviewProfile: row.review_profile,
    rows: Number(row.rows),
    source: row.source,
  }));
}

async function fullDataSnapshot(client) {
  const snapshot = {};
  for (const table of EXPECTED_TABLES) {
    const result = await client.query(
      `
        select to_jsonb(source_row)::text as canonical
        from ${table} source_row
        order by to_jsonb(source_row)::text
      `,
    );
    snapshot[table] = {
      count: result.rows.length,
      sha256: sha256(
        result.rows.map((row) => row.canonical).join("\u0000"),
      ),
    };
  }
  return snapshot;
}

async function inspect(client, target, guardedTarget) {
  const env = {
    MIMI_V2_8_3_EXPECTED_DATABASE: guardedTarget.expectedDatabase,
    MIMI_V2_8_3_EXPECTED_ROLE: guardedTarget.expectedRole,
  };
  return withReadOnlySnapshot(client, async () => {
    const inFlightTransactions = await inspectPotentialInFlightWrites(client);
    if (inFlightTransactions !== 0) {
      reject(
        "A write-capable database transaction is active",
        "V2_2_IN_FLIGHT_TRANSACTION",
      );
    }
    const inventory = await inventorySchema6(
      client,
      { ...guardedTarget.safeIdentity, target },
      env,
    );
    const dataSnapshot = await fullDataSnapshot(client);
    return {
      constraints: await constraintState(client),
      data: {
        combinedSha256: sha256(JSON.stringify(dataSnapshot)),
        tables: dataSnapshot,
      },
      inventory,
      parameterSets: await parameterSetCounts(client),
    };
  });
}

function dataParity(before, after) {
  return compareDataSnapshots(before.data.tables, after.data.tables);
}

async function openTarget(target) {
  let guardedTarget = await retrieveGuardedTarget(target, {
    allowArchivedStaging: target === "staging",
  });
  const pool = createPool(guardedTarget.connectionString);
  try {
    const client = await pool.connect();
    await client.query("set timezone to 'UTC'");
    if (guardedTarget.branchState === "archived") {
      guardedTarget = await confirmGuardedTargetReady(
        target,
        guardedTarget.safeIdentity.identityDigest,
      );
    }
    return { client, guardedTarget, pool };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

async function closeTarget(connection) {
  connection?.client?.release();
  await connection?.pool?.end();
}

async function writeMigrationEvidence({
  after,
  before,
  commitSha,
  evidenceBindings,
  migrationReconciledAfterConnectionError,
  target,
  targetIdentity,
}) {
  const parity = dataParity(before, after);
  if (!parity.matched) {
    reject(
      `The V2.2 migration changed table data: ${parity.mismatches.join(", ")}`,
      "V2_2_MIGRATION_DATA_PARITY_FAILED",
    );
  }
  if (
    before.constraints.generation !== "v1" ||
    after.constraints.generation !== "v2"
  ) {
    reject(
      "The V2.2 constraint transition is not exactly v1 to v2",
      "V2_2_MIGRATION_CONSTRAINT_TRANSITION_INVALID",
    );
  }
  if (
    evidenceBindings?.expectedConstraintSha256 &&
    after.constraints.combinedSha256 !==
      evidenceBindings.expectedConstraintSha256
  ) {
    reject(
      "Production constraint definitions do not match Staging evidence",
      "V2_2_PRODUCTION_STAGING_CONSTRAINT_MISMATCH",
    );
  }
  const evidence = {
    after,
    artifactKind: "v2-2-schema6-0007-migration-v1",
    before,
    completedAt: new Date().toISOString(),
    dataParity: parity,
    evidenceBindings,
    git: { commitSha },
    migration: {
      filename: "0007_v2_2_fsrs_parameter_sets.sql",
      reconciledAfterConnectionError:
        migrationReconciledAfterConnectionError,
      sha256: V2_2_MIGRATION_SHA256,
    },
    target: targetIdentity,
  };
  const timestamp = timestampToken();
  const evidenceDir = join(EVIDENCE_ROOT, timestamp);
  await mkdir(evidenceDir, { mode: 0o700, recursive: true });
  const evidencePath = join(evidenceDir, `${target}-migration-evidence.json`);
  const partialPath = `${evidencePath}.partial`;
  const body = Buffer.from(`${JSON.stringify(evidence, null, 2)}\n`);
  await writeFile(partialPath, body, { mode: 0o600 });
  await chmod(partialPath, 0o600);
  await rename(partialPath, evidencePath);
  await chmod(evidencePath, 0o600);
  return {
    evidence,
    evidencePath,
    evidenceSha256: sha256(body),
  };
}

async function migrate(contract) {
  const commitSha = assertExactCleanCommit(contract.releaseCommitSha);
  const evidenceBindings =
    contract.target === "production-main"
      ? await assertProductionEvidence(contract)
      : undefined;
  const migration = await readFile(MIGRATION_PATH, "utf8");
  const migrationSha256 = assertPinnedV22Migration(migration);
  let connection = await openTarget(contract.target);
  let before;
  let after;
  let migrationReconciledAfterConnectionError = false;
  try {
    before = await inspect(
      connection.client,
      contract.target,
      connection.guardedTarget,
    );
    if (before.constraints.generation !== "v1") {
      reject(
        "The V2.2 migration is already applied or the starting constraints are unexpected",
        "V2_2_MIGRATION_START_STATE_INVALID",
      );
    }
    if ((await inspectPotentialInFlightWrites(connection.client)) !== 0) {
      reject(
        "A write-capable database transaction appeared before migration",
        "V2_2_IN_FLIGHT_TRANSACTION",
      );
    }
    let migrationError;
    try {
      await connection.client.query(migration);
    } catch (error) {
      migrationError = error;
    }
    if (migrationError) {
      await closeTarget(connection);
      connection = undefined;
      try {
        connection = await openTarget(contract.target);
        after = await inspect(
          connection.client,
          contract.target,
          connection.guardedTarget,
        );
      } catch {
        reject(
          "The V2.2 migration result is ambiguous; read-only reconciliation is required",
          "V2_2_MIGRATION_RESULT_AMBIGUOUS",
        );
      }
      if (after.constraints.generation === "v1") {
        reject(
          "The V2.2 migration did not apply; the target remains on v1 constraints",
          "V2_2_MIGRATION_NOT_APPLIED",
        );
      }
      migrationReconciledAfterConnectionError = true;
    } else {
      try {
        after = await inspect(
          connection.client,
          contract.target,
          connection.guardedTarget,
        );
      } catch {
        await closeTarget(connection);
        connection = await openTarget(contract.target);
        after = await inspect(
          connection.client,
          contract.target,
          connection.guardedTarget,
        );
      }
    }
    const written = await writeMigrationEvidence({
      after,
      before,
      commitSha,
      evidenceBindings,
      migrationReconciledAfterConnectionError,
      target: contract.target,
      targetIdentity: connection.guardedTarget.safeIdentity,
    });
    return {
      after: {
        constraints: after.constraints,
        dataCombinedSha256: after.data.combinedSha256,
        inventory: after.inventory,
        parameterSets: after.parameterSets,
      },
      before: {
        constraints: before.constraints,
        dataCombinedSha256: before.data.combinedSha256,
        inventory: before.inventory,
        parameterSets: before.parameterSets,
      },
      dataParity: written.evidence.dataParity,
      evidence: {
        path: written.evidencePath,
        sha256: written.evidenceSha256,
      },
      migrationReconciledAfterConnectionError,
      migrationSha256,
    };
  } finally {
    await closeTarget(connection);
  }
}

async function run() {
  let phase = "local-guard";
  let connection;
  try {
    const commandName = process.argv[2];
    const contract = assertCommandContract({
      argv: process.argv.slice(3),
      command: commandName,
      env: process.env,
    });
    let result;
    if (commandName === "inventory") {
      phase = "neon-target";
      connection = await openTarget(contract.target);
      phase = "read-only-inventory";
      const inventory = await inspect(
        connection.client,
        contract.target,
        connection.guardedTarget,
      );
      result = {
        constraints: inventory.constraints,
        data: {
          combinedSha256: inventory.data.combinedSha256,
          tables: inventory.data.tables,
        },
        inventory: inventory.inventory,
        parameterSets: inventory.parameterSets,
      };
    } else {
      phase = "migration";
      result = await migrate(contract);
    }
    console.log(
      JSON.stringify(
        { ok: true, result, target: contract.target },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: safeFailure(error, phase) }));
    process.exitCode = 1;
  } finally {
    await closeTarget(connection);
  }
}

await run();
