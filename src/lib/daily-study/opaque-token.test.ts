import { describe, expect, it } from "vitest";
import {
  getStudyTokenSecret,
  issueServerPromptToken,
  signOpaqueStudyToken,
  verifyOpaqueStudyToken,
  verifyServerPromptToken,
} from "./opaque-token";

const SECRET = "stage-five-test-secret-that-is-32-bytes-long";

describe("opaque study tokens", () => {
  it("round trips bound Recognition prompt claims", () => {
    const issued = issueServerPromptToken(
      {
        personId: "person-1",
        planId: "plan-1",
        planVersion: 1,
        localDate: "2026-07-14",
        vocabularyItemId: "item-1",
        reviewProfile: "recognition",
        activityType: "recognition_card",
      },
      "2026-07-14T04:00:00.000Z",
      SECRET,
      { promptId: "prompt-1", ttlMs: 60_000 },
    );

    expect(
      verifyServerPromptToken(
        issued.promptToken,
        "2026-07-14T04:00:30.000Z",
        SECRET,
      ),
    ).toEqual(issued.claims);
  });

  it("rejects tampering, wrong token kinds, and expiry", () => {
    const token = signOpaqueStudyToken(
      {
        version: 1,
        kind: "cursor",
        expiresAt: "2026-07-14T04:01:00.000Z",
        claims: { selectedCount: 1 },
      },
      SECRET,
    );

    expect(() =>
      verifyOpaqueStudyToken(`${token}x`, "cursor", "2026-07-14T04:00:00.000Z", SECRET),
    ).toThrow("signature");
    expect(() =>
      verifyOpaqueStudyToken(token, "prompt", "2026-07-14T04:00:00.000Z", SECRET),
    ).toThrow("contract");
    expect(() =>
      verifyOpaqueStudyToken(token, "cursor", "2026-07-14T04:01:00.000Z", SECRET),
    ).toThrow("expired");
  });

  it("reads an expired signed prompt only for a bounded server refresh", () => {
    const issued = issueServerPromptToken(
      {
        personId: "person-1",
        planId: "plan-1",
        planVersion: 1,
        localDate: "2026-07-14",
        vocabularyItemId: "item-1",
        reviewProfile: "recognition",
        activityType: "recognition_card",
      },
      "2026-07-14T04:00:00.000Z",
      SECRET,
      { promptId: "prompt-1", ttlMs: 60_000 },
    );

    expect(
      verifyServerPromptToken(
        issued.promptToken,
        "2026-07-14T04:01:00.000Z",
        SECRET,
        { allowExpired: true },
      ),
    ).toEqual(issued.claims);
  });

  it("reads the future secret only when explicitly called and fails closed", () => {
    expect(() => getStudyTokenSecret({ NODE_ENV: "test" } as NodeJS.ProcessEnv)).toThrow(
      "MIMI_STUDY_TOKEN_SECRET is required",
    );
    expect(() =>
      getStudyTokenSecret({ NODE_ENV: "test", MIMI_STUDY_TOKEN_SECRET: "short" }),
    ).toThrow("at least 32 bytes");
    expect(
      getStudyTokenSecret({ NODE_ENV: "test", MIMI_STUDY_TOKEN_SECRET: SECRET }),
    ).toBe(SECRET);
  });
});
