import { describe, expect, it } from "vitest";
import { AI_DISCLOSURE_VERSION } from "./contract";
import { loadPostgresFormalAiSource } from "./postgres-formal-store";
import type { PostgresQueryable } from "@/lib/storage/postgres/client";

const vocabularyEntryId = "00000000-0000-4000-8000-000000007b31";
const personId = "00000000-0000-4000-8000-000000007b32";

function queryable(status = "new"): PostgresQueryable {
  return {
    query: async () => ({
      rows: [{
        id: vocabularyEntryId,
        person_id: personId,
        surface_text: "adapt",
        meaning_zh: "legacy meaning",
        meanings_zh: ["适应"],
        example: "legacy example",
        examples: ["We adapt, then adapt again."],
        status,
        notes: "must never leave",
      }],
      rowCount: 1,
      command: "SELECT",
      oid: 0,
      fields: [],
    }) as never,
  };
}

describe("V2-7B-1 server-owned vocabulary lookup", () => {
  it("builds only the enrichment allowlist from a current stored word", async () => {
    const source = await loadPostgresFormalAiSource({
      vocabularyEntryId,
      feature: "enrichment_v1",
      disclosureVersion: AI_DISCLOSURE_VERSION,
      idempotencyKey: "enrichment-1",
    }, queryable());
    expect(source).toEqual({
      personId,
      vocabularyEntryId,
      payload: {
        term: "adapt",
        meaningsZh: ["适应"],
        examples: ["We adapt, then adapt again."],
      },
    });
    expect(JSON.stringify(source)).not.toContain("notes");
  });

  it("rebuilds the exact repeated-token span and rejects archived sources", async () => {
    const source = await loadPostgresFormalAiSource({
      vocabularyEntryId,
      exampleIndex: 0,
      selectedStart: 15,
      selectedEnd: 20,
      feature: "context_explain_v1",
      disclosureVersion: AI_DISCLOSURE_VERSION,
      idempotencyKey: "context-1",
    }, queryable());
    expect(source?.payload).toMatchObject({
      selectedText: "adapt",
      selectedStart: 15,
      selectedEnd: 20,
    });
    expect(await loadPostgresFormalAiSource({
      vocabularyEntryId,
      feature: "enrichment_v1",
      disclosureVersion: AI_DISCLOSURE_VERSION,
      idempotencyKey: "enrichment-2",
    }, queryable("archived"))).toBeNull();
  });
});
