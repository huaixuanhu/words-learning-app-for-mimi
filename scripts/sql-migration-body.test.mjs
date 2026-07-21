import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { migrationBody } from "./sql-migration-body.mjs";

describe("SQL migration transaction body", () => {
  it.each([
    "../db/migrations/0004_v2_bilingual_examples.sql",
    "../db/migrations/0005_v2_standard_tts_accounting.sql",
  ])("accepts versioned migrations with leading comments: %s", async (path) => {
    const sql = await readFile(new URL(path, import.meta.url), "utf8");
    const body = migrationBody(sql, path);

    expect(body.length).toBeGreaterThan(0);
    expect(body).not.toMatch(/^begin;/iu);
    expect(body).not.toMatch(/commit;$/iu);
  });

  it("permits comments outside the transaction", () => {
    expect(
      migrationBody("-- why\n/* scope */\nbegin;\nselect 1;\ncommit;\n-- done", "ok.sql"),
    ).toBe("select 1;");
  });

  it.each([
    "select 0; begin; select 1; commit;",
    "begin; select 1; commit; select 2;",
    "select 1;",
  ])("rejects SQL outside an exact transaction: %s", (sql) => {
    expect(() => migrationBody(sql, "unsafe.sql")).toThrow(
      "unsafe.sql is not transaction wrapped",
    );
  });
});
