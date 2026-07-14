import { beforeEach, describe, expect, it } from "vitest";
import {
  completeLocalCommand,
  consumeLocalPrompt,
  issueLocalPromptToken,
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
