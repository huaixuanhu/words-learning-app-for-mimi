import { afterEach, describe, expect, it, vi } from "vitest";
import { readPostgresData } from "./use-vocabulary-data";

describe("V2 remote workspace read", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("treats a truncated successful response as a transient read failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockRejectedValue(new SyntaxError("truncated JSON")),
      }),
    );

    await expect(readPostgresData("person_mimi")).resolves.toBeNull();
  });
});
