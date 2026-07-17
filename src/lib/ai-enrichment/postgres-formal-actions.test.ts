import { describe, expect, it } from "vitest";
import { buildAiSourceHash } from "./canonical-hash";
import {
  addPostgresAiCandidateToLearning,
  decidePostgresAiDraft,
} from "./postgres-formal-actions";
import type { PostgresQueryable } from "@/lib/storage/postgres/client";

const sourcePayload = {
  term: "adapt",
  meaningsZh: ["适应"],
  examples: ["We adapt to change."],
};
const acceptedDraft = {
  additionalMeaningsZh: [],
  examples: ["People adapt gradually."],
  similarWords: [],
  confusableWords: [{
    word: "adopt",
    type: "spelling" as const,
    differenceZh: "adapt 表示适应；adopt 表示采用。",
    examplePair: ["We adapt to change.", "They adopt a policy."],
  }],
};

function queryResult<T extends object>(rows: T[]) {
  return { rows, rowCount: rows.length, command: "", oid: 0, fields: [] };
}

class ActionFake {
  readonly logs: string[] = [];
  status: "draft" | "accepted" | "rejected";
  sourceHash = buildAiSourceHash(sourcePayload);
  duplicate = { id: "00000000-0000-4000-8000-000000007b55", surface_text: "adopt" };

  constructor(status: "draft" | "accepted" | "rejected") {
    this.status = status;
  }

  transaction = async <T>(callback: (queryable: PostgresQueryable) => Promise<T>) =>
    callback(this.queryable);

  queryable: PostgresQueryable = {
    query: async <T extends object = Record<string, unknown>>(
      queryText: string,
      values: unknown[] = [],
    ) => {
      const sql = queryText.replace(/\s+/gu, " ").trim().toLocaleLowerCase("en-US");
      this.logs.push(sql);
      if (sql.includes("from ai_enrichment_drafts draft")) {
        return queryResult([{
          id: "00000000-0000-4000-8000-000000007b51",
          person_id: "00000000-0000-4000-8000-000000007b52",
          source_vocabulary_item_id: "00000000-0000-4000-8000-000000007b53",
          ai_run_id: "00000000-0000-4000-8000-000000007b54",
          status: this.status,
          draft_json: acceptedDraft,
          accepted_content_json: this.status === "accepted" ? acceptedDraft : null,
          source_hash: this.sourceHash,
          surface_text: sourcePayload.term,
          meaning_zh: "适应",
          meanings_zh: sourcePayload.meaningsZh,
          example: sourcePayload.examples[0],
          examples: sourcePayload.examples,
          source_status: "new",
        }] as unknown as T[]) as never;
      }
      if (sql.startsWith("update ai_enrichment_drafts")) {
        this.status = sql.includes("status = 'accepted'") ? "accepted" : "rejected";
        return queryResult([]) as never;
      }
      if (sql.includes("from vocabulary_items") && sql.includes("normalized_text = $2")) {
        return queryResult([this.duplicate] as unknown as T[]) as never;
      }
      if (sql.startsWith("insert into vocabulary_relations")) {
        return queryResult([{ id: String(values[0]) }] as unknown as T[]) as never;
      }
      throw new Error(`Unhandled action SQL: ${sql}`);
    },
  };
}

describe("V2-7B-1 Postgres AI decisions", () => {
  it("accepts edited content only while the source hash is still current", async () => {
    const fake = new ActionFake("draft");
    const result = await decidePostgresAiDraft({
      draftId: "00000000-0000-4000-8000-000000007b51",
      action: "accept",
      draft: acceptedDraft,
    }, { transaction: fake.transaction });
    expect(result).toMatchObject({ status: "accepted" });
    expect(fake.status).toBe("accepted");

    const changed = new ActionFake("draft");
    changed.sourceHash = "stale-source-hash";
    await expect(decidePostgresAiDraft({
      draftId: "00000000-0000-4000-8000-000000007b51",
      action: "accept",
      draft: acceptedDraft,
    }, { transaction: changed.transaction })).rejects.toThrow("changed after generation");
  });

  it("records a rejection without accepted content", async () => {
    const fake = new ActionFake("draft");
    expect(await decidePostgresAiDraft({
      draftId: "00000000-0000-4000-8000-000000007b51",
      action: "reject",
      draft: null,
    }, { transaction: fake.transaction })).toEqual({ status: "rejected" });
    expect(fake.status).toBe("rejected");
  });

  it("reuses a duplicate and links only an exact accepted candidate", async () => {
    const exact = new ActionFake("accepted");
    expect(await addPostgresAiCandidateToLearning({
      draftId: "00000000-0000-4000-8000-000000007b51",
      candidateWord: "adopt",
      surfaceText: "adopt",
      meaningZh: "采用",
      example: "They adopt a policy.",
      learningTrack: "active",
      timezone: "Australia/Melbourne",
    }, { transaction: exact.transaction })).toMatchObject({
      created: false,
      relationLinked: true,
    });
    expect(exact.logs.some((sql) => sql.startsWith("insert into vocabulary_relations")))
      .toBe(true);

    const edited = new ActionFake("accepted");
    edited.duplicate = {
      id: "00000000-0000-4000-8000-000000007b56",
      surface_text: "adopted phrase",
    };
    expect(await addPostgresAiCandidateToLearning({
      draftId: "00000000-0000-4000-8000-000000007b51",
      candidateWord: "adopt",
      surfaceText: "adopted phrase",
      meaningZh: "改写",
      example: "An edited phrase.",
      learningTrack: "recognition",
      timezone: "Australia/Melbourne",
    }, { transaction: edited.transaction })).toMatchObject({
      created: false,
      relationLinked: false,
    });
    expect(edited.logs.some((sql) => sql.startsWith("insert into vocabulary_relations")))
      .toBe(false);
  });
});
