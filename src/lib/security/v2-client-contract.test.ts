import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  V2_CLIENT_CONTRACT_HEADER,
  V2_CLIENT_CONTRACT_VERSION,
  v2ClientContractHeaders,
} from "./v2-client-contract";

describe("V2 client contract marker", () => {
  it("owns one exact Schema 6 mutation header", () => {
    expect(v2ClientContractHeaders()).toEqual({
      [V2_CLIENT_CONTRACT_HEADER]: V2_CLIENT_CONTRACT_VERSION,
    });
    expect(V2_CLIENT_CONTRACT_VERSION).toBe("v2-schema6");
  });

  it.each([
    "src/components/vocabulary/use-vocabulary-data.ts",
    "src/components/study/use-daily-study.ts",
    "src/lib/ai-enrichment/formal-client.ts",
  ])("keeps the marker on the %s mutation sender", async (file) => {
    const source = await readFile(resolve(process.cwd(), file), "utf8");

    expect(source).toContain("...v2ClientContractHeaders()");
  });
});
