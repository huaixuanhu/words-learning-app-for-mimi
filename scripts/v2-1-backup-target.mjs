import { retrieveGuardedTarget } from "./v2-1-neon-target.mjs";
import { V21ProductionGuardError } from "./v2-1-production-contract.mjs";

export function readOnlyBackupWakeEnvironment(environment) {
  return {
    ...environment,
    PGCONNECT_TIMEOUT: "15",
    PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=15000",
  };
}

/** Backup-only activation; shared migration target checks remain ready-only. */
export async function retrieveGuardedBackupTarget({
  wakeTarget,
  readTarget = retrieveGuardedTarget,
  wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  const options = { allowArchivedMainForBackup: true };
  const initial = await readTarget("production-main", options);
  if (initial.branchState === "ready") return initial;
  if (initial.branchState !== "archived") {
    throw new V21ProductionGuardError("The backup branch state is unsupported", "V2_1_NEON_MAIN_BRANCH_MISMATCH");
  }

  // Exactly one read-only connection can reactivate an archived branch.
  // No inventory, dump or second wake is attempted until readiness is confirmed.
  await wakeTarget(initial);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const confirmed = await readTarget("production-main", options);
    if (confirmed.safeIdentity.identityDigest !== initial.safeIdentity.identityDigest) {
      throw new V21ProductionGuardError("The backup target identity changed while becoming ready", "V2_1_NEON_READY_IDENTITY_MISMATCH");
    }
    if (confirmed.branchState === "ready") return confirmed;
    if (confirmed.branchState !== "archived") {
      throw new V21ProductionGuardError("The backup branch state is unsupported", "V2_1_NEON_MAIN_BRANCH_MISMATCH");
    }
    if (attempt < 2) await wait(2_000);
  }
  throw new V21ProductionGuardError("The backup main branch did not become ready", "V2_1_NEON_MAIN_BRANCH_MISMATCH");
}
