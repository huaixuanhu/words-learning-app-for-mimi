export const REVIEW_TEXT_ENTRY_SELECTOR =
  "input, textarea, select, option, [contenteditable='true'], [role='textbox'], [role='combobox']";

export const REVIEW_NATIVE_ACTION_SELECTOR =
  "button, a, summary, [role='button'], [role='menuitem']";

type ReviewShortcutGuardInput = Readonly<{
  defaultPrevented: boolean;
  isComposing: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  modalOpen: boolean;
  textEntryFocused: boolean;
}>;

export function shouldIgnoreReviewShortcutInput(
  input: ReviewShortcutGuardInput,
) {
  return (
    input.defaultPrevented ||
    input.isComposing ||
    input.altKey ||
    input.ctrlKey ||
    input.metaKey ||
    input.shiftKey ||
    input.modalOpen ||
    input.textEntryFocused
  );
}

export function elementMatchesReviewSelector(
  element: Element | null,
  selector: string,
) {
  return Boolean(element?.closest(selector));
}
