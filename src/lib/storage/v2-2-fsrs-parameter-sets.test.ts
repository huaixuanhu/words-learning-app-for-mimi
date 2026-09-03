import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "db",
    "migrations",
    "0007_v2_2_fsrs_parameter_sets.sql",
  ),
  "utf8",
);

describe("V2.2 FSRS parameter-set migration", () => {
  it("is forward-only, transaction-wrapped, credential-free, and data-preserving", () => {
    expect(migrationSql).toContain(
      "0006_v2_1_vocabulary_unique_normalized_text.sql",
    );
    expect(migrationSql).toContain("begin;");
    expect(migrationSql.trimEnd()).toMatch(/commit;$/u);
    expect(migrationSql).not.toMatch(/\b(?:update|delete|insert)\b/iu);
    expect(migrationSql).not.toMatch(
      /database_url\s*=|postgres_url\s*=|AIza|AQ\.|password\s*=|secret\s*=/iu,
    );
  });

  it("accepts only the matching V1 and V2 identifiers", () => {
    for (const parameterSetId of [
      "recognition-fsrs-v1",
      "recognition-fsrs-v2",
      "active-fsrs-v1",
      "active-fsrs-v2",
    ]) {
      expect(migrationSql).toContain(`'${parameterSetId}'`);
    }

    expect(migrationSql).toContain(
      "drop constraint review_states_parameter_set_profile_valid",
    );
    expect(migrationSql).toContain(
      "drop constraint review_events_profile_evidence_consistent",
    );
    expect(migrationSql).not.toContain("parameter_set_id <>");
  });

  it("fails clearly if retained rows contain unknown identifiers", () => {
    expect(migrationSql).toContain("review_states contain an unsupported parameter set");
    expect(migrationSql).toContain("review_events contain an unsupported parameter set");
  });
});
