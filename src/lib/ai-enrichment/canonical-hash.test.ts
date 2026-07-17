import { describe, expect, it } from "vitest";
import {
  buildAiCacheKeyHash,
  buildAiIdempotencyKeyHash,
  buildAiRequestHash,
  buildAiSourceHash,
  canonicalAiJson,
  currentAiDisclosureDigest,
} from "./canonical-hash";
import { AI_DISCLOSURE_VERSION } from "./contract";

const personId = "00000000-0000-4000-8000-000000007b01";
const vocabularyEntryId = "00000000-0000-4000-8000-000000007b02";
const payload = {
  term: "adapt",
  meaningsZh: ["适应"],
  examples: ["We adapt to change."],
};

describe("V2-7B-1 canonical AI hashes", () => {
  it("sorts object keys while preserving array order", () => {
    expect(canonicalAiJson({ z: 1, a: { y: 2, x: 3 } })).toBe(
      canonicalAiJson({ a: { x: 3, y: 2 }, z: 1 }),
    );
    expect(canonicalAiJson({ values: ["a", "b"] })).not.toBe(
      canonicalAiJson({ values: ["b", "a"] }),
    );
  });

  it("keeps Cache identity independent from a browser Idempotency Key", () => {
    const sourceHash = buildAiSourceHash(payload);
    const base = {
      vocabularyEntryId,
      feature: "enrichment_v1" as const,
      disclosureVersion: AI_DISCLOSURE_VERSION,
    };
    const first = { ...base, idempotencyKey: "first" };
    const second = { ...base, idempotencyKey: "second" };

    expect(buildAiRequestHash(personId, first, sourceHash)).toBe(
      buildAiRequestHash(personId, second, sourceHash),
    );
    expect(buildAiIdempotencyKeyHash(personId, first.idempotencyKey)).not.toBe(
      buildAiIdempotencyKeyHash(personId, second.idempotencyKey),
    );
    expect(buildAiCacheKeyHash({ personId, vocabularyEntryId, feature: base.feature, sourceHash }))
      .toHaveLength(64);
    expect(currentAiDisclosureDigest()).toHaveLength(64);
  });

  it("invalidates source and Cache identity when trusted lexical data changes", () => {
    const original = buildAiSourceHash(payload);
    const edited = buildAiSourceHash({ ...payload, meaningsZh: ["适应", "改编"] });
    expect(edited).not.toBe(original);
    expect(buildAiCacheKeyHash({ personId, vocabularyEntryId, feature: "enrichment_v1", sourceHash: edited }))
      .not.toBe(buildAiCacheKeyHash({ personId, vocabularyEntryId, feature: "enrichment_v1", sourceHash: original }));
  });
});
