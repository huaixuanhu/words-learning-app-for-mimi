import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function readVisibleTsxTree(relativeRoot: string): string {
  const absoluteRoot = join(process.cwd(), relativeRoot);

  function walk(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) return walk(path);
      if (!entry.name.endsWith(".tsx") || entry.name.includes(".test.")) return [];
      return [readFileSync(path, "utf8")];
    });
  }

  return walk(absoluteRoot).join("\n");
}

const visibleSource = [
  readVisibleTsxTree("src/app"),
  readVisibleTsxTree("src/components"),
].join("\n");

describe("V2-8-1.1 learner-facing copy contract", () => {
  it("keeps redundant atmosphere and internal stage labels out of ordinary UI", () => {
    const removedCopy = [
      "Calm mind. Clear words.",
      "Small steps today.",
      "Review gently, remember deeply.",
      "One calm step at a time.",
      "Plan today, then choose one calm zone.",
      "Meet new entries, one card at a time.",
      "Return to familiar entries at a calm pace.",
      "Find and care for your words.",
      "Keep a copy you can carry and restore.",
      "Choose how the app feels and who is studying.",
      "A quiet space for Active Vocabulary.",
      "You are building something valuable.",
      "Insights are resting for now.",
      "AI suggestions are resting for this storage mode.",
      "AI explanation is resting for this storage mode.",
      "Cached preview",
      "Fresh preview",
      "Today Hub",
      "Quiet tools",
      "Calm vocabulary flashcards for Mimi.",
      "V2 Stage 3 Schema 6 Fixture",
    ];

    for (const copy of removedCopy) {
      expect(visibleSource).not.toContain(copy);
    }

    expect(readSource("src/components/app-shell.tsx")).not.toContain("subtitle");
  });

  it("keeps safety, provenance, metric, and interaction copy visible", () => {
    expect(readSource("src/components/vocabulary/vocabulary-library.tsx")).toContain(
      "Batch imported",
    );
    expect(readSource("src/components/study/reset-today-control.tsx")).toContain(
      "真的要确定清空本日记录吗？这里不可以撤销哦",
    );
    expect(readSource("src/components/settings/person-settings-form.tsx")).toContain(
      "只切换学习数据，不是账号或密码隔离。",
    );
    expect(readSource("src/components/review/review-session.tsx")).toContain(
      "Space flip · Arrow keys choose · Enter confirm",
    );
    expect(readSource("src/components/vocabulary/learning-rhythm-chart.tsx")).toContain(
      "Actual",
    );
    expect(readSource("src/components/vocabulary/memory-outlook-card.tsx")).toContain(
      "FSRS estimate",
    );

    const enrichmentSource = readSource(
      "src/components/ai/ai-enrichment-dialog.tsx",
    );
    expect(enrichmentSource).toContain("AI content may be inaccurate");
    expect(enrichmentSource).toContain("Only the word, Chinese meanings, and examples are sent.");
    expect(enrichmentSource).toContain("AI data and retention");
    expect(readSource("src/lib/ai-enrichment/local-fixture-runtime.ts")).toContain(
      "Local preview · No AI request was made.",
    );
  });

  it("keeps the JSON example optional and outside the ordinary Batch flow", () => {
    const importSource = readSource("src/components/vocabulary/import-workspace.tsx");
    const detailsStart = importSource.indexOf("<details");
    const sample = importSource.indexOf("{JSON_IMPORT_SAMPLE}", detailsStart);
    const detailsEnd = importSource.indexOf("</details>", sample);

    expect(importSource).toContain('const [jsonText, setJsonText] = useState("");');
    expect(importSource).not.toContain("useState(JSON_IMPORT_SAMPLE)");
    expect(importSource).toContain("Example format");
    expect(detailsStart).toBeGreaterThan(-1);
    expect(sample).toBeGreaterThan(detailsStart);
    expect(detailsEnd).toBeGreaterThan(sample);
  });

  it("uses natural fixture display names while retaining technical identifiers", () => {
    for (const fixturePath of [
      "test_fixtures/stage5m-backup.json",
      "test_fixtures/stage6b-p1e-schema5-backup.json",
      "test_fixtures/v2-stage3-schema6-backup.json",
    ]) {
      const fixture = JSON.parse(readSource(fixturePath)) as {
        data: { people: Array<{ id: string; slug: string; displayName: string }> };
      };
      const [person] = fixture.data.people;

      expect(person.displayName).toBe("Mimi");
      expect(`${person.id} ${person.slug}`).toMatch(/fixture|stage/u);
    }

    const generatorSource = readSource("scripts/backup-import-plan.mjs");
    expect(generatorSource).not.toMatch(/displayName: "(?:V2 |Stage )/u);
  });
});
