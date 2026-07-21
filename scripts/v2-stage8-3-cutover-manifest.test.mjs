import { describe, expect, it } from "vitest";

import {
  createV2Stage83CutoverManifestTemplate,
  validateV2Stage83CutoverManifest,
} from "./v2-stage8-3-cutover-manifest.mjs";
import {
  V2_STAGE8_3_ADDITIVE_MIGRATION_SHA256,
  V2_STAGE8_3_TTS_MIGRATION_SHA256,
} from "./v2-stage8-3-contract.mjs";

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const COMMIT_A = "a".repeat(40);
const COMMIT_B = "b".repeat(40);

function readyManifest() {
  const value = createV2Stage83CutoverManifestTemplate();
  value.status = "ready-for-main-migration";
  value.record = {
    createdAt: "2026-07-19T01:00:00.000Z",
    updatedAt: "2026-07-19T01:05:00.000Z",
    approverRole: "owner",
  };
  value.source = {
    exactCommitSha: COMMIT_A,
    v1CommitSha: COMMIT_B,
    v1DeploymentId: "dpl_v1production",
    maintenanceDeploymentId: "dpl_maintenance",
    v2DeploymentId: "dpl_v2production",
  };
  value.database.before = {
    schemaVersion: 5,
    inventoryArtifactSha256: SHA_A,
    combinedRowSha256: SHA_B,
    coreRowCount: 42,
  };
  value.database.backup = {
    encrypted: true,
    checksumSha256: SHA_A,
    evidenceSha256: SHA_B,
    restoreVerified: true,
    custodyConfirmed: true,
  };
  value.database.recovery = {
    schemaVersion: 5,
    recoveryId: "br_schema5recovery",
    evidenceSha256: SHA_A,
    confirmed: true,
  };
  value.writeWindow = {
    windowId: "cutover_20260719",
    startedAt: "2026-07-19T01:10:00.000Z",
    endedAt: null,
    firstV2WriteAt: null,
    oldRuntimeWritePathBlocked: true,
    oldRuntimeEvidenceSha256: SHA_B,
    noInFlightWritesConfirmed: true,
  };
  value.ai.ledgerBeforeSha256 = SHA_A;
  value.rollback = {
    v1ArtifactConfirmed: true,
    schema5AccessRouteConfirmed: true,
    schema5AccessEvidenceSha256: SHA_A,
    schema5RecoveryConfirmed: true,
    encryptedBackupConfirmed: true,
    pairedReady: true,
    reconciliationDecision: "no-v2-writes",
    reconciliationEvidenceSha256: null,
    lossAcceptanceEvidenceSha256: null,
  };
  return value;
}

describe("V2-8-3 cutover manifest", () => {
  it("creates a secret-free draft with the pinned fixed contract", () => {
    const template = createV2Stage83CutoverManifestTemplate();
    const output = JSON.stringify(template);

    expect(validateV2Stage83CutoverManifest(template)).toEqual(template);
    expect(template.database.additiveMigrationSha256).toBe(
      V2_STAGE8_3_ADDITIVE_MIGRATION_SHA256,
    );
    expect(template.database.ttsMigrationSha256).toBe(
      V2_STAGE8_3_TTS_MIGRATION_SHA256,
    );
    expect(output).not.toMatch(/postgres(?:ql)?:\/\//u);
    expect(output).not.toMatch(/password|apiKey|databaseUrl|secret/u);
  });

  it("rejects a cutover manifest with TTS migration drift", () => {
    const value = readyManifest();
    value.database.ttsMigrationSha256 = SHA_A;
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /fixed V2-8-3 contract is invalid/u,
    );
  });

  it("rejects a cutover manifest with additive migration drift", () => {
    const value = readyManifest();
    value.database.additiveMigrationSha256 = SHA_A;
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /fixed V2-8-3 contract is invalid/u,
    );
  });

  it("accepts a complete paired pre-write rollback packet", () => {
    expect(validateV2Stage83CutoverManifest(readyManifest())).toMatchObject({
      status: "ready-for-main-migration",
      rollback: {
        pairedReady: true,
        reconciliationDecision: "no-v2-writes",
      },
    });
  });

  it("refuses readiness or Schema 6 evidence with an empty core inventory", () => {
    const before = readyManifest();
    before.database.before.coreRowCount = 0;
    expect(() => validateV2Stage83CutoverManifest(before)).toThrow(
      /must prove a non-empty inventory/u,
    );

    const after = readyManifest();
    after.status = "schema6-verified";
    after.database.after = {
      schemaVersion: 6,
      inventoryArtifactSha256: SHA_B,
      combinedRowSha256: SHA_B,
      coreRowCount: 0,
      parityMatched: true,
    };
    expect(() => validateV2Stage83CutoverManifest(after)).toThrow(
      /must prove a non-empty inventory/u,
    );
  });

  it("refuses a migration record without old-runtime blocking evidence", () => {
    const value = readyManifest();
    value.writeWindow.oldRuntimeWritePathBlocked = false;
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /oldRuntimeWritePathBlocked is required/u,
    );
  });

  it("requires a post-write reconciliation decision", () => {
    const value = readyManifest();
    value.status = "rollback-requested";
    value.writeWindow.firstV2WriteAt = "2026-07-19T02:00:00.000Z";
    value.rollback.reconciliationDecision = "unselected";
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /explicit reconciliation decision/u,
    );
  });

  it("requires separate evidence before accepting loss", () => {
    const value = readyManifest();
    value.status = "rollback-requested";
    value.writeWindow.endedAt = "2026-07-19T01:20:00.000Z";
    value.writeWindow.firstV2WriteAt = "2026-07-19T02:00:00.000Z";
    value.rollback.reconciliationDecision = "approved-loss";
    value.rollback.reconciliationEvidenceSha256 = SHA_A;
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /separate acceptance evidence/u,
    );
    value.rollback.lossAcceptanceEvidenceSha256 = SHA_B;
    expect(validateV2Stage83CutoverManifest(value).rollback).toMatchObject({
      reconciliationDecision: "approved-loss",
      reconciliationEvidenceSha256: SHA_A,
      lossAcceptanceEvidenceSha256: SHA_B,
    });
  });

  it("requires evidence for an approved post-write import route", () => {
    const value = readyManifest();
    value.status = "rollback-requested";
    value.writeWindow.endedAt = "2026-07-19T01:20:00.000Z";
    value.writeWindow.firstV2WriteAt = "2026-07-19T02:00:00.000Z";
    value.rollback.reconciliationDecision = "approved-import-route";
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /requires reconciliation evidence/u,
    );
    value.rollback.reconciliationEvidenceSha256 = SHA_B;
    expect(validateV2Stage83CutoverManifest(value).rollback).toMatchObject({
      reconciliationDecision: "approved-import-route",
      reconciliationEvidenceSha256: SHA_B,
    });
  });

  it("requires the complete write-window chronology after the first V2 write", () => {
    const value = readyManifest();
    value.status = "rollback-requested";
    value.writeWindow.firstV2WriteAt = "2026-07-19T02:00:00.000Z";
    value.rollback.reconciliationDecision = "forward-repair";
    value.rollback.reconciliationEvidenceSha256 = SHA_A;

    value.writeWindow.windowId = null;
    value.writeWindow.startedAt = null;
    value.writeWindow.endedAt = null;
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /writeWindow.windowId is required/u,
    );

    value.writeWindow.windowId = "cutover_20260719";
    value.writeWindow.startedAt = "2026-07-19T01:10:00.000Z";
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /writeWindow.endedAt is required/u,
    );

    value.writeWindow.endedAt = "2026-07-19T02:10:00.000Z";
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /firstV2WriteAt cannot precede writeWindow.endedAt/u,
    );
  });

  it("requires an AI ledger baseline and exact initial rollout lock", () => {
    const missingLedger = readyManifest();
    missingLedger.ai.ledgerBeforeSha256 = null;
    expect(() => validateV2Stage83CutoverManifest(missingLedger)).toThrow(
      /ai.ledgerBeforeSha256 is required/u,
    );

    const disabled = readyManifest();
    disabled.ai.killSwitchEnabled = false;
    expect(() => validateV2Stage83CutoverManifest(disabled)).toThrow(
      /initial AI cap and enabled Kill Switch/u,
    );

    const invalidBoolean = readyManifest();
    invalidBoolean.ai.killSwitchEnabled = "true";
    expect(() => validateV2Stage83CutoverManifest(invalidBoolean)).toThrow(
      /must be a boolean/u,
    );
  });

  it("rejects secret-shaped fields and values before normalizing", () => {
    expect(() =>
      validateV2Stage83CutoverManifest({
        ...readyManifest(),
        databaseUrl: "postgresql://user:pass@example.invalid/db",
      }),
    ).toThrow(/Sensitive field names/u);
    expect(() =>
      validateV2Stage83CutoverManifest({
        ...readyManifest(),
        note: `AQ.${"x".repeat(30)}`,
      }),
    ).toThrow(/Sensitive value shape/u);
  });

  it("requires full Schema 6 parity before the verified status", () => {
    const value = readyManifest();
    value.status = "schema6-verified";
    value.database.after = {
      schemaVersion: 6,
      inventoryArtifactSha256: SHA_B,
      combinedRowSha256: SHA_B,
      coreRowCount: 42,
      parityMatched: true,
    };
    expect(validateV2Stage83CutoverManifest(value).database.after.parityMatched).toBe(true);
    value.database.after.coreRowCount = 41;
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /core row counts must match/u,
    );
  });

  it("requires exact core-row digests and ordered cutover timestamps", () => {
    const value = readyManifest();
    value.status = "schema6-verified";
    value.database.after = {
      schemaVersion: 6,
      inventoryArtifactSha256: SHA_B,
      combinedRowSha256: SHA_A,
      coreRowCount: 42,
      parityMatched: true,
    };
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /core row digests must match/u,
    );

    value.status = "ready-for-main-migration";
    value.writeWindow.endedAt = "2026-07-19T01:00:00.000Z";
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /endedAt cannot precede/u,
    );

    value.writeWindow.endedAt = null;
    value.status = "rollback-requested";
    value.writeWindow.firstV2WriteAt = "2026-07-19T01:00:00.000Z";
    value.rollback.reconciliationDecision = "forward-repair";
    value.rollback.reconciliationEvidenceSha256 = SHA_A;
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /firstV2WriteAt cannot precede writeWindow.startedAt/u,
    );
  });

  it("requires post-activation ledger evidence and explicit steady-state acceptance", () => {
    const value = readyManifest();
    value.status = "live";
    value.writeWindow.endedAt = "2026-07-19T01:20:00.000Z";
    value.database.after = {
      schemaVersion: 6,
      inventoryArtifactSha256: SHA_B,
      combinedRowSha256: SHA_B,
      coreRowCount: 42,
      parityMatched: true,
    };
    value.ai.killSwitchEnabled = false;
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /ai.ledgerAfterSha256 is required/u,
    );
    value.ai.ledgerAfterSha256 = SHA_B;
    expect(validateV2Stage83CutoverManifest(value).status).toBe("live");

    value.ai.phase = "steady-state";
    value.ai.rolloutMaximumProviderAttempts = null;
    expect(() => validateV2Stage83CutoverManifest(value)).toThrow(
      /steadyStateAcceptanceEvidenceSha256 is required/u,
    );
    value.ai.steadyStateAcceptanceEvidenceSha256 = SHA_A;
    expect(validateV2Stage83CutoverManifest(value).ai).toMatchObject({
      phase: "steady-state",
      rolloutMaximumProviderAttempts: null,
      steadyStateAcceptanceEvidenceSha256: SHA_A,
    });
  });
});
