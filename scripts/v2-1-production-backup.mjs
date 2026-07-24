import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

import {
  safeFailure,
  sha256,
  V21ProductionGuardError,
} from "./v2-1-production-contract.mjs";
import { retrieveGuardedTarget } from "./v2-1-neon-target.mjs";

const POSTGRES_BIN = "/opt/homebrew/opt/postgresql@17/bin";
const AGE_BIN = "/opt/homebrew/bin/age";
const AGE_KEYGEN_BIN = "/opt/homebrew/bin/age-keygen";
const SECURITY_BIN = "/usr/bin/security";
const AGE_KEYCHAIN_SERVICE = "mimi-vocabulary-backup-age-identity-v1";
const BACKUP_DIR = join(homedir(), "Documents", "Mimi Vocabulary Backups");
const EVIDENCE_ROOT = resolve(
  process.cwd(),
  "local_artifacts",
  "v2-1-production",
);
const MAX_CAPTURE_BYTES = 256 * 1024 * 1024;
const EXPECTED_TABLES = Object.freeze([
  "ai_context_explanation_cache",
  "ai_disclosure_confirmations",
  "ai_enrichment_drafts",
  "ai_request_idempotency",
  "ai_runs",
  "ai_usage_buckets",
  "backup_import_mappings",
  "backup_imports",
  "daily_study_defaults",
  "daily_study_plans",
  "import_batches",
  "people",
  "review_events",
  "review_settings",
  "review_states",
  "study_command_idempotency",
  "tts_runs",
  "tts_usage_buckets",
  "vocabulary_creation_facts",
  "vocabulary_creation_reversals",
  "vocabulary_items",
  "vocabulary_relations",
]);

function reject(message, code) {
  throw new V21ProductionGuardError(message, code);
}

function postgresTool(name) {
  return join(POSTGRES_BIN, name);
}

function command(bin, args, options = {}) {
  const result = spawnSync(bin, args, {
    encoding: options.encoding ?? "utf8",
    env: options.env,
    input: options.input,
    maxBuffer: MAX_CAPTURE_BYTES,
    stdio: options.stdio,
  });
  if (result.error || result.status !== 0) {
    reject(
      options.failureMessage || "A V2.1 backup command failed safely",
      options.failureCode || "V2_1_BACKUP_COMMAND_FAILED",
    );
  }
  return result;
}

function gitCommit() {
  const value = command("/usr/bin/git", ["rev-parse", "HEAD"], {
    failureMessage: "The exact Git commit could not be resolved",
  }).stdout.trim();
  if (!/^[a-f0-9]{40}$/u.test(value)) {
    reject("The Git commit is invalid", "V2_1_BACKUP_GIT_INVALID");
  }
  return value;
}

function assertGitClean() {
  const value = command(
    "/usr/bin/git",
    ["status", "--short", "--untracked-files=all"],
    { failureMessage: "Git status could not be inspected" },
  ).stdout.trim();
  if (value) {
    reject(
      "The Production backup requires a clean exact Git commit",
      "V2_1_BACKUP_GIT_DIRTY",
    );
  }
}

function assertTools() {
  const versions = {
    age: command(AGE_BIN, ["--version"], {
      failureMessage: "age is unavailable",
    }).stdout.trim(),
    pgDump: command(postgresTool("pg_dump"), ["--version"], {
      failureMessage: "PostgreSQL pg_dump is unavailable",
    }).stdout.trim(),
    pgRestore: command(postgresTool("pg_restore"), ["--version"], {
      failureMessage: "PostgreSQL pg_restore is unavailable",
    }).stdout.trim(),
    postgres: command(postgresTool("postgres"), ["--version"], {
      failureMessage: "PostgreSQL server tools are unavailable",
    }).stdout.trim(),
  };
  if (
    !/^v?1\.3\./u.test(versions.age) ||
    !versions.pgDump.includes(" 17.") ||
    !versions.pgRestore.includes(" 17.") ||
    !versions.postgres.includes(" 17.")
  ) {
    reject(
      "The V2.1 backup requires age 1.3.x and PostgreSQL 17",
      "V2_1_BACKUP_TOOL_VERSION_MISMATCH",
    );
  }
  return versions;
}

function readAgeIdentity() {
  const result = command(
    SECURITY_BIN,
    ["find-generic-password", "-s", AGE_KEYCHAIN_SERVICE, "-w"],
    { failureMessage: "The backup identity is unavailable" },
  );
  const identity = result.stdout.trim();
  if (!/^AGE-SECRET-KEY-[A-Z0-9-]+$/u.test(identity)) {
    reject(
      "The backup identity has an invalid shape",
      "V2_1_BACKUP_IDENTITY_INVALID",
    );
  }
  return identity;
}

function recipientFromIdentity(identity) {
  const recipient = command(AGE_KEYGEN_BIN, ["-y"], {
    failureMessage: "The age recipient could not be derived",
    input: `${identity}\n`,
  }).stdout.trim();
  if (!/^age1[a-z0-9]+$/u.test(recipient)) {
    reject(
      "The age recipient has an invalid shape",
      "V2_1_BACKUP_RECIPIENT_INVALID",
    );
  }
  return recipient;
}

function pgEnvironment(connectionString) {
  const parsed = new URL(connectionString);
  return {
    ...process.env,
    PGDATABASE: decodeURIComponent(parsed.pathname.slice(1)),
    PGHOST: parsed.hostname,
    PGPASSWORD: decodeURIComponent(parsed.password),
    PGPORT: parsed.port || "5432",
    PGSSLMODE: "require",
    PGTZ: "UTC",
    PGUSER: decodeURIComponent(parsed.username),
  };
}

function psql(env, sql, failureMessage) {
  return command(
    postgresTool("psql"),
    ["-XAtq", "-v", "ON_ERROR_STOP=1", "-c", sql],
    { env, failureMessage },
  ).stdout.trim();
}

function databaseSnapshot(env) {
  const tables = psql(
    env,
    `
      select table_name
      from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `,
    "Schema 6 table inventory failed",
  )
    .split("\n")
    .filter(Boolean);
  if (
    tables.length !== EXPECTED_TABLES.length ||
    tables.some((table, index) => table !== EXPECTED_TABLES[index])
  ) {
    reject(
      "The Production Schema 6 table inventory is unexpected",
      "V2_1_BACKUP_SCHEMA_MISMATCH",
    );
  }
  const snapshot = JSON.parse(
    psql(
      env,
      `
        select jsonb_build_object(
          'schemaVersion', case when exists (
            select 1
            from information_schema.columns
            where table_schema = 'public'
              and table_name = 'review_states'
              and column_name = 'review_profile'
          ) then 6 else 5 end,
          'schema', jsonb_build_object(
            'tables', (
              select count(*)
              from information_schema.tables
              where table_schema = 'public' and table_type = 'BASE TABLE'
            ),
            'constraints', (
              select count(*)
              from information_schema.table_constraints
              where table_schema = 'public'
            ),
            'indexes', (
              select count(*) from pg_indexes where schemaname = 'public'
            ),
            'triggers', (
              select count(*)
              from information_schema.triggers
              where trigger_schema = 'public'
            )
          ),
          'counts', jsonb_build_object(
            'people', (select count(*) from people),
            'vocabulary_items', (select count(*) from vocabulary_items),
            'import_batches', (select count(*) from import_batches),
            'review_states', (select count(*) from review_states),
            'review_events', (select count(*) from review_events),
            'review_settings', (select count(*) from review_settings),
            'daily_study_defaults', (select count(*) from daily_study_defaults),
            'daily_study_plans', (select count(*) from daily_study_plans),
            'vocabulary_creation_facts', (
              select count(*) from vocabulary_creation_facts
            ),
            'vocabulary_creation_reversals', (
              select count(*) from vocabulary_creation_reversals
            ),
            'ai_runs', (select count(*) from ai_runs),
            'ai_disclosure_confirmations', (
              select count(*) from ai_disclosure_confirmations
            ),
            'ai_request_idempotency', (
              select count(*) from ai_request_idempotency
            ),
            'ai_enrichment_drafts', (
              select count(*) from ai_enrichment_drafts
            ),
            'ai_context_explanation_cache', (
              select count(*) from ai_context_explanation_cache
            ),
            'vocabulary_relations', (
              select count(*) from vocabulary_relations
            ),
            'ai_usage_buckets', (select count(*) from ai_usage_buckets),
            'study_command_idempotency', (
              select count(*) from study_command_idempotency
            ),
            'tts_runs', (select count(*) from tts_runs),
            'tts_usage_buckets', (select count(*) from tts_usage_buckets)
          ),
          'invariants', jsonb_build_object(
            'vocabulary_person_orphans', (
              select count(*)
              from vocabulary_items item
              left join people person on person.id = item.person_id
              where person.id is null
            ),
            'review_state_item_orphans', (
              select count(*)
              from review_states state
              left join vocabulary_items item
                on item.person_id = state.person_id
               and item.id = state.vocabulary_item_id
              where item.id is null
            ),
            'review_event_item_orphans', (
              select count(*)
              from review_events event
              left join vocabulary_items item
                on item.person_id = event.person_id
               and item.id = event.vocabulary_item_id
              where item.id is null
            ),
            'submitted_ai_runs', (
              select count(*) from ai_runs where status = 'submitted'
            ),
            'processing_ai_requests', (
              select count(*)
              from ai_request_idempotency
              where status = 'processing'
            ),
            'active_ai_calls', (
              select coalesce(sum(active_provider_calls), 0)
              from ai_usage_buckets
            ),
            'submitted_tts_runs', (
              select count(*) from tts_runs where status = 'submitted'
            ),
            'active_tts_calls', (
              select coalesce(sum(active_provider_calls), 0)
              from tts_usage_buckets
            )
          ),
          'duplicates', jsonb_build_object(
            'groups', (
              select count(*)
              from (
                select person_id, normalized_text
                from vocabulary_items
                group by person_id, normalized_text
                having count(*) > 1
              ) duplicate_groups
            ),
            'removableItems', (
              select coalesce(sum(item_count - 1), 0)
              from (
                select count(*) as item_count
                from vocabulary_items
                group by person_id, normalized_text
                having count(*) > 1
              ) duplicate_groups
            )
          )
        )::text
      `,
      "Schema 6 snapshot failed",
    ),
  );
  if (
    Number(snapshot.schemaVersion) !== 6 ||
    Number(snapshot.schema?.tables) !== EXPECTED_TABLES.length ||
    Number(snapshot.counts?.people) < 1 ||
    Number(snapshot.counts?.vocabulary_items) < 1 ||
    Object.values(snapshot.invariants ?? {}).some(
      (value) => Number(value) !== 0,
    )
  ) {
    reject(
      "The Production Schema 6 snapshot is not clean",
      "V2_1_BACKUP_SNAPSHOT_INVALID",
    );
  }
  const tableDigests = {};
  for (const table of EXPECTED_TABLES) {
    const rows = command(
      postgresTool("psql"),
      [
        "-XAtq",
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        `copy (
          select to_jsonb(source_row)::text
          from ${table} source_row
          order by to_jsonb(source_row)::text
        ) to stdout`,
      ],
      {
        env,
        encoding: null,
        failureMessage: "A Schema 6 table digest failed",
      },
    ).stdout;
    tableDigests[table] = {
      bytes: rows.length,
      sha256: createHash("sha256").update(rows).digest("hex"),
    };
  }
  return { ...snapshot, tableDigests };
}

function snapshotsMatch(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function fileSha(path) {
  return sha256(await readFile(path));
}

function timestampToken(date = new Date()) {
  return date
    .toISOString()
    .replace(/[-:]/gu, "")
    .replace(/\.\d{3}Z$/u, "Z");
}

async function run() {
  let phase = "local-guard";
  let tempRoot;
  let pgData;
  let socketDir;
  let localPort;
  let localStarted = false;
  let archivePath;
  let partialPath;
  let archiveKeep = false;
  try {
    if (
      process.argv[2] !== "production" ||
      !process.argv.includes(
        "--i-confirm-v2-1-production-encrypted-backup",
      )
    ) {
      reject(
        "The exact V2.1 Production backup confirmation is required",
        "V2_1_BACKUP_CONFIRMATION_REQUIRED",
      );
    }
    assertGitClean();
    const versions = assertTools();
    const commitSha = gitCommit();
    const identity = readAgeIdentity();
    const recipient = recipientFromIdentity(identity);
    phase = "neon-target";
    const target = await retrieveGuardedTarget("production-main");
    const sourceEnv = pgEnvironment(target.connectionString);
    phase = "source-inventory-before";
    const sourceBefore = databaseSnapshot(sourceEnv);

    tempRoot = await mkdtemp(join(tmpdir(), "mimi-v2-1-schema6-backup-"));
    await chmod(tempRoot, 0o700);
    const identityPath = join(tempRoot, "age-identity.txt");
    await writeFile(identityPath, `${identity}\n`, { mode: 0o600 });
    await chmod(identityPath, 0o600);

    await mkdir(BACKUP_DIR, { mode: 0o700, recursive: true });
    await chmod(BACKUP_DIR, 0o700);
    const timestamp = timestampToken();
    archivePath = join(
      BACKUP_DIR,
      `mimi-production-schema6-v2-1-${timestamp}-${commitSha.slice(0, 12)}.dump.age`,
    );
    partialPath = `${archivePath}.partial`;
    phase = "encrypted-backup";
    const dump = command(
      postgresTool("pg_dump"),
      [
        "--format=custom",
        "--compress=zstd:level=6",
        "--no-owner",
        "--no-acl",
        "--serializable-deferrable",
        "--no-password",
      ],
      {
        encoding: null,
        env: sourceEnv,
        failureMessage: "The Schema 6 pg_dump failed",
      },
    ).stdout;
    command(
      AGE_BIN,
      [
        "--encrypt",
        "--recipient",
        recipient,
        "--output",
        partialPath,
      ],
      {
        encoding: null,
        input: dump,
        failureMessage: "The Schema 6 archive encryption failed",
      },
    );
    await chmod(partialPath, 0o600);
    await rename(partialPath, archivePath);
    await chmod(archivePath, 0o600);

    phase = "source-inventory-after";
    const sourceAfter = databaseSnapshot(sourceEnv);
    if (!snapshotsMatch(sourceBefore, sourceAfter)) {
      reject(
        "Production changed during the backup window",
        "V2_1_BACKUP_SOURCE_CHANGED",
      );
    }

    phase = "isolated-restore";
    pgData = join(tempRoot, "pgdata");
    socketDir = join(tempRoot, "socket");
    await mkdir(socketDir, { mode: 0o700 });
    command(
      postgresTool("initdb"),
      [
        "-D",
        pgData,
        "-A",
        "trust",
        "-U",
        "postgres",
        "--no-locale",
        "--encoding=UTF8",
      ],
      { failureMessage: "The isolated PostgreSQL cluster could not be initialized" },
    );
    localPort = String(55432 + Math.floor(Math.random() * 500));
    command(
      postgresTool("pg_ctl"),
      [
        "-D",
        pgData,
        "-o",
        `-k ${socketDir} -p ${localPort} -c listen_addresses=''`,
        "-w",
        "start",
      ],
      {
        failureMessage: "The isolated PostgreSQL cluster could not start",
        stdio: "ignore",
      },
    );
    localStarted = true;
    const localAdminEnv = {
      ...process.env,
      PGHOST: socketDir,
      PGPORT: localPort,
      PGTZ: "UTC",
      PGUSER: "postgres",
    };
    command(
      postgresTool("createdb"),
      ["-U", "postgres", "restored_schema6"],
      {
        env: localAdminEnv,
        failureMessage: "The isolated restore database could not be created",
      },
    );
    const decrypted = command(
      AGE_BIN,
      ["--decrypt", "--identity", identityPath, archivePath],
      {
        encoding: null,
        failureMessage: "The encrypted Schema 6 archive could not be decrypted",
      },
    ).stdout;
    command(
      postgresTool("pg_restore"),
      [
        "--exit-on-error",
        "--single-transaction",
        "--no-owner",
        "--no-acl",
        "-U",
        "postgres",
        "-d",
        "restored_schema6",
      ],
      {
        encoding: null,
        env: localAdminEnv,
        input: decrypted,
        failureMessage: "The Schema 6 archive restore failed",
      },
    );
    const restored = databaseSnapshot({
      ...localAdminEnv,
      PGDATABASE: "restored_schema6",
    });
    if (!snapshotsMatch(sourceBefore, restored)) {
      reject(
        "The restored Schema 6 snapshot does not match Production",
        "V2_1_BACKUP_RESTORE_MISMATCH",
      );
    }

    command(
      postgresTool("pg_ctl"),
      ["-D", pgData, "-m", "fast", "-w", "stop"],
      {
        failureMessage: "The isolated PostgreSQL cluster could not stop",
        stdio: "ignore",
      },
    );
    localStarted = false;
    await rm(tempRoot, { recursive: true });
    tempRoot = undefined;

    const archiveStat = await stat(archivePath);
    const evidence = {
      archive: {
        bytes: archiveStat.size,
        custody: "external-user-backup-directory",
        encryption: "age",
        filename: basename(archivePath),
        sha256: await fileSha(archivePath),
      },
      artifactKind: "v2-1-schema6-production-backup-restore-v1",
      completedAt: new Date().toISOString(),
      git: { commitSha },
      restore: {
        isolatedLocalPostgres: "17",
        snapshotMatched: true,
        verified: true,
      },
      source: sourceBefore,
      target: target.safeIdentity,
      tools: versions,
    };
    const evidenceDir = join(EVIDENCE_ROOT, timestamp);
    await mkdir(evidenceDir, { mode: 0o700, recursive: true });
    const evidencePath = join(evidenceDir, "production-backup-evidence.json");
    await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
      mode: 0o600,
    });
    await chmod(evidencePath, 0o600);
    const evidenceSha256 = await fileSha(evidencePath);
    archiveKeep = true;
    console.log(
      JSON.stringify(
        {
          archive: {
            bytes: evidence.archive.bytes,
            filename: evidence.archive.filename,
            sha256: evidence.archive.sha256,
          },
          evidence: {
            path: evidencePath,
            sha256: evidenceSha256,
          },
          ok: true,
          restoreVerified: true,
          source: {
            counts: sourceBefore.counts,
            duplicates: sourceBefore.duplicates,
            invariants: sourceBefore.invariants,
            schema: sourceBefore.schema,
            schemaVersion: sourceBefore.schemaVersion,
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: safeFailure(error, phase) }));
    process.exitCode = 1;
  } finally {
    if (localStarted && pgData) {
      spawnSync(
        postgresTool("pg_ctl"),
        ["-D", pgData, "-m", "fast", "-w", "stop"],
        { stdio: "ignore" },
      );
    }
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
    if (archivePath && !archiveKeep) {
      await rm(archivePath, { force: true });
    }
    if (partialPath) {
      await rm(partialPath, { force: true });
    }
  }
}

await run();
