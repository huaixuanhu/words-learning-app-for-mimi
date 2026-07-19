import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Vercel function region contract", () => {
  it("keeps all V2 Functions in one Sydney region without unrelated compute flags", () => {
    const config = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(config).toEqual({
      $schema: "https://openapi.vercel.sh/vercel.json",
      regions: ["syd1"],
    });
    expect(JSON.stringify(config)).not.toContain("iad1");
    expect(config).not.toHaveProperty("functionFailoverRegions");
    expect(config).not.toHaveProperty("fluid");
  });
});
