import { describe, expect, it } from "vitest";
import { shouldIgnoreReviewShortcutInput } from "./keyboard-shortcuts";

const clearInput = {
  defaultPrevented: false,
  isComposing: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  modalOpen: false,
  textEntryFocused: false,
};

describe("review shortcut focus guard", () => {
  it("keeps shortcuts available after a non-input study button retains focus", () => {
    expect(shouldIgnoreReviewShortcutInput(clearInput)).toBe(false);
  });

  it.each([
    ["defaultPrevented", true],
    ["isComposing", true],
    ["altKey", true],
    ["ctrlKey", true],
    ["metaKey", true],
    ["shiftKey", true],
    ["modalOpen", true],
    ["textEntryFocused", true],
  ] as const)("ignores guarded %s input", (key, value) => {
    expect(
      shouldIgnoreReviewShortcutInput({ ...clearInput, [key]: value }),
    ).toBe(true);
  });
});
