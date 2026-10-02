import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { readOnlyBackupWakeEnvironment, retrieveGuardedBackupTarget } from "./v2-1-backup-target.mjs";
import { selectTargetMetadata, validateConnectionUri } from "./v2-1-neon-target.mjs";
import { sha256 } from "./v2-1-production-contract.mjs";

function fixture(state = "archived") {
  return {
    approvedProjectSha256: sha256("fixture-project"),
    projects: [{ id: "fixture-project" }],
    branches: [{ id: "br-main", project_id: "fixture-project", name: "main", parent_id: null, current_state: state }],
    endpoints: [{ id: "ep-main", project_id: "fixture-project", branch_id: "br-main", region_id: "aws-ap-southeast-2", type: "read_write", current_state: "idle" }],
    target: "production-main",
  };
}

function target(state = "archived", endpointId = "ep-main") {
  const input = fixture(state);
  input.endpoints[0].id = endpointId;
  const metadata = selectTargetMetadata({ ...input, allowArchivedMainForBackup: true });
  return { branchState: state, safeIdentity: metadata.safeIdentity };
}

describe("archived Production backup target guard", () => {
  it("keeps shared defaults ready-only and restricts the opt-in to Production backup main", async () => {
    expect(() => selectTargetMetadata(fixture())).toThrow(/root main/u);
    expect(() => selectTargetMetadata({ ...fixture(), allowArchivedStaging: true })).toThrow(/root main/u);
    expect(selectTargetMetadata({ ...fixture(), allowArchivedMainForBackup: true }).branch.current_state).toBe("archived");
    expect(() => selectTargetMetadata({ ...fixture("ready"), target: "staging", allowArchivedMainForBackup: true }))
      .toThrow(/limited to the Production backup target/u);
    for (const file of ["v2-1-production-db.mjs", "v2-2-production-db.mjs"]) {
      const source = await readFile(new URL(file, import.meta.url), "utf8");
      expect(source).not.toContain("allowArchivedMainForBackup");
      expect(source).not.toContain("retrieveGuardedBackupTarget");
    }
  });

  it.each([
    (input) => { input.projects[0].id = "different-project"; },
    (input) => { input.branches[0].project_id = "different-project"; },
    (input) => { input.branches[0].name = "renamed-main"; },
    (input) => { input.branches[0].parent_id = "br-parent"; },
    (input) => { input.branches.push({ ...input.branches[0], id: "br-duplicate" }); },
    (input) => { input.endpoints[0].project_id = "different-project"; },
    (input) => { input.endpoints[0].branch_id = "br-other"; },
    (input) => { input.endpoints[0].region_id = "aws-us-east-1"; },
    (input) => { input.endpoints[0].type = "read_only"; },
    (input) => { input.endpoints.push({ ...input.endpoints[0], id: "ep-duplicate" }); },
    (input) => { input.branches[0].current_state = "suspended"; },
    (input) => { input.branches[0].current_state = "init"; },
  ])("preserves topology and state rejection with backup opt-in: %#", (change) => {
    const input = fixture();
    change(input);
    expect(() => selectTargetMetadata({ ...input, allowArchivedMainForBackup: true })).toThrow();
  });

  it("preserves the connection URI guard for archived targets", () => {
    const metadata = selectTargetMetadata({ ...fixture(), allowArchivedMainForBackup: true });
    for (const uri of [
      "postgresql://neondb_owner:fixture@ep-main-pooler.aws.neon.tech/neondb",
      "postgresql://neondb_owner:fixture@ep-other.aws.neon.tech/neondb",
      "postgresql://other_role:fixture@ep-main.aws.neon.tech/neondb",
      "postgresql://neondb_owner:fixture@ep-main.aws.neon.tech/other_database",
    ]) expect(() => validateConnectionUri(uri, metadata)).toThrow(/does not match/u);
  });

  it("overrides inherited wake options with a read-only session and finite limits", () => {
    expect(readOnlyBackupWakeEnvironment({ PGHOST: "fixture", PGCONNECT_TIMEOUT: "0", PGOPTIONS: "-c default_transaction_read_only=off" }))
      .toEqual({ PGHOST: "fixture", PGCONNECT_TIMEOUT: "15", PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=15000" });
  });
});

describe("one read-only wake and bounded readiness confirmation", () => {
  it("does not wake an already ready target with an idle endpoint", async () => {
    const ready = target("ready");
    const readTarget = vi.fn().mockResolvedValue(ready);
    const wakeTarget = vi.fn();
    const wait = vi.fn();
    expect(await retrieveGuardedBackupTarget({ readTarget, wakeTarget, wait })).toBe(ready);
    expect(readTarget).toHaveBeenCalledExactlyOnceWith("production-main", { allowArchivedMainForBackup: true });
    expect(wakeTarget).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();
  });

  it("wakes once, then waits only between identity-matched archived readbacks", async () => {
    const archived = target();
    const ready = target("ready");
    const order = [];
    const responses = [archived, archived, ready];
    const readTarget = vi.fn(async () => { order.push("read"); return responses.shift(); });
    const wakeTarget = vi.fn(async () => { order.push("wake"); });
    const wait = vi.fn(async () => { order.push("wait"); });
    expect(await retrieveGuardedBackupTarget({ readTarget, wakeTarget, wait })).toBe(ready);
    expect(order).toEqual(["read", "wake", "read", "wait", "read"]);
    expect(wakeTarget).toHaveBeenCalledExactlyOnceWith(archived);
    expect(wait).toHaveBeenCalledExactlyOnceWith(2_000);
  });

  it.each(["archived", "ready"])("rejects changed identity on a %s readback immediately", async (state) => {
    const readTarget = vi.fn().mockResolvedValueOnce(target()).mockResolvedValueOnce(target(state, "ep-changed"));
    const wakeTarget = vi.fn();
    const wait = vi.fn();
    await expect(retrieveGuardedBackupTarget({ readTarget, wakeTarget, wait })).rejects
      .toMatchObject({ code: "V2_1_NEON_READY_IDENTITY_MISMATCH" });
    expect(readTarget).toHaveBeenCalledTimes(2);
    expect(wakeTarget).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it("stops after three archived readbacks without a second wake", async () => {
    const readTarget = vi.fn().mockResolvedValue(target());
    const wakeTarget = vi.fn();
    const wait = vi.fn();
    await expect(retrieveGuardedBackupTarget({ readTarget, wakeTarget, wait })).rejects
      .toMatchObject({ code: "V2_1_NEON_MAIN_BRANCH_MISMATCH" });
    expect(readTarget).toHaveBeenCalledTimes(4);
    expect(wakeTarget).toHaveBeenCalledTimes(1);
    expect(wait.mock.calls).toEqual([[2_000], [2_000]]);
  });

  it("does not read back or retry when the wake fails", async () => {
    const readTarget = vi.fn().mockResolvedValue(target());
    const error = new Error("synthetic wake failure");
    const wakeTarget = vi.fn().mockRejectedValue(error);
    const wait = vi.fn();
    await expect(retrieveGuardedBackupTarget({ readTarget, wakeTarget, wait })).rejects.toBe(error);
    expect(readTarget).toHaveBeenCalledTimes(1);
    expect(wakeTarget).toHaveBeenCalledTimes(1);
    expect(wait).not.toHaveBeenCalled();
  });

  it("rejects an unsupported state without continuing confirmation", async () => {
    const readTarget = vi.fn().mockResolvedValueOnce(target()).mockResolvedValueOnce({ ...target(), branchState: "suspended" });
    const wakeTarget = vi.fn();
    const wait = vi.fn();
    await expect(retrieveGuardedBackupTarget({ readTarget, wakeTarget, wait })).rejects
      .toMatchObject({ code: "V2_1_NEON_MAIN_BRANCH_MISMATCH" });
    expect(readTarget).toHaveBeenCalledTimes(2);
    expect(wait).not.toHaveBeenCalled();
  });
});
