import { describe, expect, it } from "vitest";
import { addServerTiming } from "./server-timing";

describe("privacy-safe Server-Timing", () => {
  it("emits only an allowlisted metric and numeric duration", () => {
    const response = addServerTiming(
      new Response(null),
      "mimi_study",
      100,
      137,
    );

    expect(response.headers.get("server-timing")).toBe("mimi_study;dur=37");
  });

  it("never emits a negative duration", () => {
    const response = addServerTiming(
      new Response(null),
      "mimi_storage",
      200,
      150,
    );

    expect(response.headers.get("server-timing")).toBe("mimi_storage;dur=0");
  });
});
