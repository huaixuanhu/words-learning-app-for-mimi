import { beforeEach, describe, expect, it } from "vitest";
import {
  completeLocalCommand,
  consumeLocalPrompt,
  issueLocalPromptToken,
  refreshLocalPromptToken,
  readLocalCommandReplay,
  readLocalPromptToken,
  resetLocalStudyRuntimeForTests,
} from "./local-runtime";

const seed = {
  personId: "person-1",
  planId: "plan-1",
  planVersion: 1,
  localDate: "2026-07-14",
  vocabularyItemId: "item-1",
  reviewProfile: "recognition" as const,
  activityType: "recognition_card" as const,
};

describe("browser-local study operations", () => {
  beforeEach(() => resetLocalStudyRuntimeForTests());

  it("issues, reads, and consumes non-lexical prompt evidence", () => {
    const token = issueLocalPromptToken(seed, "2026-07-14T04:00:00.000Z");

    expect(readLocalPromptToken(token, "2026-07-14T04:01:00.000Z").claims).toMatchObject(seed);
    consumeLocalPrompt(token, "rating-1", "2026-07-14T04:01:00.000Z");
    consumeLocalPrompt(token, "rating-1", "2026-07-14T04:01:00.000Z");
    expect(() =>
      consumeLocalPrompt(token, "rating-2", "2026-07-14T04:01:00.000Z"),
    ).toThrow("already saved");
  });

  it("rejects expired prompts", () => {
    const token = issueLocalPromptToken(seed, "2026-07-14T04:00:00.000Z");

    expect(() => readLocalPromptToken(token, "2026-07-14T04:30:00.000Z")).toThrow(
      "expired",
    );
  });

  it("refreshes current and expired prompts without changing their prompt id", () => {
    const token = issueLocalPromptToken(seed, "2026-07-14T04:00:00.000Z");
    const original = readLocalPromptToken(token, "2026-07-14T04:01:00.000Z");
    const currentRefresh = refreshLocalPromptToken(
      { personId: seed.personId, promptToken: token },
      "2026-07-14T04:02:00.000Z",
    );
    const currentRecord = readLocalPromptToken(
      currentRefresh.promptToken,
      "2026-07-14T04:02:00.000Z",
    );
    const expiredRefresh = refreshLocalPromptToken(
      { personId: seed.personId, promptToken: currentRefresh.promptToken },
      "2026-07-14T04:32:00.000Z",
    );
    const expiredRecord = readLocalPromptToken(
      expiredRefresh.promptToken,
      "2026-07-14T04:32:00.000Z",
    );

    expect(currentRefresh.refreshedFromExpired).toBe(false);
    expect(expiredRefresh.refreshedFromExpired).toBe(true);
    expect(currentRecord.claims.promptId).toBe(original.claims.promptId);
    expect(expiredRecord.claims.promptId).toBe(original.claims.promptId);
    expect(expiredRecord.claims.expiresAt).toBe("2026-07-14T05:02:00.000Z");
    expect(() =>
      readLocalPromptToken(token, "2026-07-14T04:02:00.000Z"),
    ).toThrow("stale");
  });

  it("does not refresh consumed or wrong-person prompt evidence", () => {
    const consumed = issueLocalPromptToken(seed, "2026-07-14T04:00:00.000Z");
    consumeLocalPrompt(consumed, "rating-1", "2026-07-14T04:01:00.000Z");

    expect(() =>
      refreshLocalPromptToken(
        { personId: seed.personId, promptToken: consumed },
        "2026-07-14T04:02:00.000Z",
      ),
    ).toThrow("already saved");

    const other = issueLocalPromptToken(seed, "2026-07-14T04:00:00.000Z");
    expect(() =>
      refreshLocalPromptToken(
        { personId: "person-2", promptToken: other },
        "2026-07-14T04:02:00.000Z",
      ),
    ).toThrow("selected learner");
  });

  it("replays identical commands and rejects conflicting reuse", () => {
    const request = { personId: "person-1", localDate: "2026-07-14" };

    completeLocalCommand(
      "reset_today",
      "reset-1",
      request,
      { resetEventsCount: 2 },
      "2026-07-14T04:00:00.000Z",
    );

    expect(
      readLocalCommandReplay(
        "reset_today",
        "reset-1",
        request,
        "2026-07-14T05:00:00.000Z",
      ),
    ).toEqual({ resetEventsCount: 2 });
    expect(() =>
      readLocalCommandReplay(
        "reset_today",
        "reset-1",
        { ...request, localDate: "2026-07-15" },
        "2026-07-14T05:00:00.000Z",
      ),
    ).toThrow("different request");
  });
});
