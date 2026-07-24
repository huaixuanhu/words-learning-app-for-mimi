import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(fileName: string) {
  return readFileSync(
    join(process.cwd(), "src", "components", "vocabulary", fileName),
    "utf8",
  );
}

describe("V2.1 duplicate-import UI contract", () => {
  it("keeps preview read-only and only allows ready rows to be selected", () => {
    const source = readSource("import-workspace.tsx");
    const parseInputSource = source.slice(
      source.indexOf("const parseInput"),
      source.indexOf("const readFile"),
    );

    expect(parseInputSource).toContain("parseJsonImport");
    expect(parseInputSource).not.toContain("commit(");
    expect(source).toContain('disabled={candidate.status !== "new"}');
    expect(source).toContain("importSaveLockRef.current");
    expect(source).toContain('isSavingImport ? "Saving…" : "Save selected"');
  });

  it("shows duplicate cleanup only for a non-empty plan and confirms exact impact", () => {
    const source = readSource("vocabulary-library.tsx");

    expect(source).toContain("buildVocabularyDeduplicationPlan(data)");
    expect(source).toContain("deduplicationPlan.duplicateGroupsCount > 0");
    expect(source).toContain("getVocabularyDeduplicationConfirmation");
    expect(source).toContain("确认一键去重？");
    expect(source).toContain("这些历史不会合并");
    expect(source).toContain(".filter(({ remainingItems }) => remainingItems > 0)");
  });
});
