import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  join(
    process.cwd(),
    "db",
    "migrations",
    "0006_v2_1_vocabulary_unique_normalized_text.sql",
  ),
  "utf8",
);

describe("V2.1 vocabulary uniqueness migration", () => {
  it("fails before creating the unique index when duplicates remain", () => {
    const precheckPosition = migrationSql.indexOf("having count(*) > 1");
    const uniqueIndexPosition = migrationSql.indexOf(
      "create unique index vocabulary_items_person_normalized_text_unique",
    );

    expect(precheckPosition).toBeGreaterThan(-1);
    expect(uniqueIndexPosition).toBeGreaterThan(precheckPosition);
    expect(migrationSql).toContain(
      "duplicate vocabulary identities still exist",
    );
  });

  it("enforces selected-person plus normalized-text uniqueness without deleting data", () => {
    expect(migrationSql).toContain(
      "on vocabulary_items(person_id, normalized_text)",
    );
    expect(migrationSql).not.toMatch(/\bdelete\s+from\s+vocabulary_items\b/i);
    expect(migrationSql).not.toContain("on conflict");
  });
});
