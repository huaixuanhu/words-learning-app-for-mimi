import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { PressableButton } from "@/components/ui/motion-primitives";
import { addVocabularyItem, archiveVocabularyItem, createEmptyVocabularyData } from "@/lib/vocabulary/repository";
import type { VocabularyData } from "@/lib/vocabulary/types";
import { BulkDeleteDialog } from "./bulk-delete-dialog";
import { VocabularyLibraryContent } from "./vocabulary-library";
import type { useVocabularyData } from "./use-vocabulary-data";

// As in the workspace recovery tests, use a synchronous hook host in Node.
// These tests cover event/state transitions; browser focus and layout are separate evidence.
const host = vi.hoisted(() => ({
  cursor: 0,
  active: "library" as "library" | "dialog",
  cells: { library: [] as unknown[], dialog: [] as unknown[] },
}));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return {
    ...react,
    useState(initial: unknown) {
      const cells = host.cells[host.active];
      const index = host.cursor++;
      if (!(index in cells)) cells[index] = typeof initial === "function" ? initial() : initial;
      return [cells[index], (next: unknown) => {
        cells[index] = typeof next === "function" ? next(cells[index]) : next;
      }];
    },
    useRef(initial: unknown) {
      const cells = host.cells[host.active];
      const index = host.cursor++;
      if (!(index in cells)) cells[index] = { current: initial };
      return cells[index];
    },
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
    useEffect() {},
  };
});

type ElementProps = {
  children?: ReactNode;
  disabled?: boolean;
  checked?: boolean;
  role?: string;
  type?: string;
  placeholder?: string;
  "aria-label"?: string;
  onClick?: () => void;
  onChange?: (event: { target: { value?: string; checked?: boolean } }) => void;
};
function elements(node: ReactNode): ReactElement<ElementProps>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<ElementProps>(node)) return [];
  return [node, ...elements(node.props.children)];
}
function text(node: ReactNode): string {
  if (Array.isArray(node)) return node.map(text).join("");
  if (isValidElement<ElementProps>(node)) return text(node.props.children);
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}
function buttons(node: ReactNode) {
  return elements(node).filter((element) => element.type === PressableButton || element.type === "button");
}
function button(node: ReactNode, label: string) {
  const found = buttons(node).find((element) => text(element) === label);
  expect(found, `button ${label}`).toBeDefined();
  return found!;
}
function click(node: ReactNode, label: string) {
  const target = button(node, label);
  expect(target.props.disabled).not.toBe(true);
  target.props.onClick!();
}
function renderDialog(props: ComponentProps<typeof BulkDeleteDialog>) {
  host.active = "dialog";
  host.cursor = 0;
  return BulkDeleteDialog(props);
}
type Workspace = ReturnType<typeof useVocabularyData>;
function renderLibrary(workspace: Workspace) {
  host.active = "library";
  host.cursor = 0;
  return VocabularyLibraryContent({ workspace });
}
function pendingDialog(workspace: Workspace) {
  const found = elements(renderLibrary(workspace)).find((element) => element.type === BulkDeleteDialog);
  return found as ReactElement<ComponentProps<typeof BulkDeleteDialog>> | undefined;
}
function checkbox(node: ReactNode, word: string) {
  const found = elements(node).find((element) => element.props["aria-label"] === `Select ${word}`);
  expect(found, `checkbox ${word}`).toBeDefined();
  return found!;
}
function select(workspace: Workspace, word: string, checked = true) {
  checkbox(renderLibrary(workspace), word).props.onChange!({ target: { checked } });
}
function search(workspace: Workspace, value: string) {
  const input = elements(renderLibrary(workspace)).find((element) => element.props.placeholder === "word, meaning, example");
  input!.props.onChange!({ target: { value } });
}
function filter(workspace: Workspace, label: string) {
  const target = buttons(renderLibrary(workspace)).find((element) =>
    element.type === "button" && text(element).startsWith(label),
  );
  expect(target).toBeDefined();
  target!.props.onClick!();
}
function checkedWords(workspace: Workspace) {
  return elements(renderLibrary(workspace))
    .filter((element) => element.props.type === "checkbox" && element.props.checked)
    .map((element) => element.props["aria-label"]);
}
function makeWorkspace(data: VocabularyData = createEmptyVocabularyData()): Workspace {
  return {
    data,
    isLoaded: true,
    loadError: null,
    isRefreshing: false,
    localRecoveryRequired: false,
    pendingSaveRecovery: null,
    acknowledgePendingSave: vi.fn(),
    storageRuntime: "local",
    commit: vi.fn(async (nextData) => nextData),
    restoreLocalBackup: vi.fn(),
    revalidateAfterMutation: vi.fn(),
    getRuntimeNow: () => null,
    updateServerClock: vi.fn(),
    updateClientSnapshot: vi.fn(),
  };
}
function fixture() {
  const now = "2026-10-17T00:00:00.000Z";
  let data = createEmptyVocabularyData(now);
  for (const input of [
    { id: "one", surfaceText: "alpha", learningTrack: "recognition" as const, importBatchId: "batch-one" },
    { id: "two", surfaceText: "alphabet", learningTrack: "active" as const, importBatchId: "batch-two" },
    { id: "three", surfaceText: "beta", learningTrack: "recognition" as const },
    { id: "four", surfaceText: "archived", learningTrack: "recognition" as const },
  ]) {
    data = addVocabularyItem(data, { ...input, source: "manual", timezone: "Australia/Melbourne" }, now).data;
  }
  data = archiveVocabularyItem(data, "four", now);
  data.people.push({ ...data.people[0], id: "other-person", displayName: "Other learner" });
  data = addVocabularyItem(data, {
    id: "other-word", personId: "other-person", surfaceText: "alpha private",
    source: "manual", timezone: "Australia/Melbourne",
  }, now).data;
  return makeWorkspace(data);
}

beforeEach(() => {
  host.cursor = 0;
  host.cells = { library: [], dialog: [] };
});

describe("bulk deletion confirmations", () => {
  function props() {
    return {
      items: [{ id: "one", surfaceText: "alpha" }, { id: "two", surfaceText: "alphabet" }],
      onCancel: vi.fn(),
      onDelete: vi.fn(async () => {}),
    };
  }

  it("requires two distinct confirmations and reverses No/Yes order for the final prompt", async () => {
    const input = props();
    const first = renderDialog(input);
    expect(buttons(first).map(text)).toEqual(["No · 取消", "Yes · 继续"]);
    expect(text(first)).toContain("复习记录");
    expect(elements(first).filter((element) => element.type === "li").map(text)).toEqual(["alpha", "alphabet"]);
    expect(first.props.dismissOnBackdrop).toBe(false);

    click(first, "Yes · 继续");
    expect(input.onDelete).not.toHaveBeenCalled();
    const final = renderDialog(input);
    expect(text(final)).toContain("再次确认真的确认要删除吗？");
    expect(buttons(final).map(text)).toEqual(["Yes · 确认删除", "No · 取消"]);
    expect(final.key).not.toBe(first.key);
    click(final, "Yes · 确认删除");
    await vi.waitFor(() => expect(input.onDelete).toHaveBeenCalledTimes(1));
  });

  it.each(["review", "final"])("No cancels the %s confirmation without deleting", (step) => {
    const input = props();
    if (step === "final") click(renderDialog(input), "Yes · 继续");
    click(renderDialog(input), "No · 取消");
    expect(input.onCancel).toHaveBeenCalledTimes(1);
    expect(input.onDelete).not.toHaveBeenCalled();
  });

  it("blocks duplicate confirmation and all dismissal while the deletion is pending", async () => {
    const input = props();
    let finish!: () => void;
    input.onDelete.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    click(renderDialog(input), "Yes · 继续");
    const final = renderDialog(input);
    // Both events arrive before React can render disabled buttons.
    button(final, "Yes · 确认删除").props.onClick!();
    button(final, "Yes · 确认删除").props.onClick!();
    button(final, "No · 取消").props.onClick!();
    final.props.onClose();
    const pending = renderDialog(input);
    expect(buttons(pending).every((element) => element.props.disabled)).toBe(true);
    expect(input.onDelete).toHaveBeenCalledTimes(1);
    expect(input.onCancel).not.toHaveBeenCalled();
    finish();
    await vi.waitFor(() => expect(button(renderDialog(input), "Yes · 确认删除").props.disabled).toBe(false));
  });

  it("keeps the final confirmation open after a failed deletion and permits a deliberate retry", async () => {
    const input = props();
    input.onDelete.mockRejectedValueOnce(new Error("Could not save deletion"));
    click(renderDialog(input), "Yes · 继续");
    click(renderDialog(input), "Yes · 确认删除");
    await vi.waitFor(() => expect(elements(renderDialog(input)).find((element) => element.props.role === "alert")?.props.children).toBe("Could not save deletion"));
    expect(input.onCancel).not.toHaveBeenCalled();
    expect(text(renderDialog(input))).toContain("再次确认真的确认要删除吗？");
    click(renderDialog(input), "Yes · 确认删除");
    await vi.waitFor(() => expect(input.onDelete).toHaveBeenCalledTimes(2));
  });
});

describe("Library selection and bulk deletion", () => {
  it("supports individual selection across batches and disables deleting an empty selection", () => {
    const workspace = fixture();
    click(renderLibrary(workspace), "Select words");
    expect(button(renderLibrary(workspace), "Delete selected (0)").props.disabled).toBe(true);
    select(workspace, "alpha");
    select(workspace, "alphabet");
    expect(checkedWords(workspace)).toEqual(["Select alphabet", "Select alpha"]);
    select(workspace, "alpha", false);
    expect(checkedWords(workspace)).toEqual(["Select alphabet"]);
    click(renderLibrary(workspace), "Clear selection");
    expect(checkedWords(workspace)).toEqual([]);
    expect(button(renderLibrary(workspace), "Delete selected (0)").props.disabled).toBe(true);
    expect(workspace.commit).not.toHaveBeenCalled();
  });

  it("selects only shown search/filter results belonging to the selected learner", () => {
    const workspace = fixture();
    click(renderLibrary(workspace), "Select words");
    search(workspace, "alpha");
    click(renderLibrary(workspace), "Select all shown");
    expect(checkedWords(workspace)).toEqual(["Select alphabet", "Select alpha"]);
    filter(workspace, "Recognition");
    expect(checkedWords(workspace)).toEqual([]);
    click(renderLibrary(workspace), "Select all shown");
    expect(checkedWords(workspace)).toEqual(["Select alpha"]);
    expect(text(renderLibrary(workspace))).not.toContain("alpha private");
  });

  it("clears selection on search, filter change and leaving selection mode", () => {
    const workspace = fixture();
    click(renderLibrary(workspace), "Select words");
    select(workspace, "alpha");
    search(workspace, "alpha");
    expect(checkedWords(workspace)).toEqual([]);
    select(workspace, "alpha");
    filter(workspace, "Recognition");
    expect(checkedWords(workspace)).toEqual([]);
    select(workspace, "alpha");
    click(renderLibrary(workspace), "Done");
    click(renderLibrary(workspace), "Select words");
    expect(checkedWords(workspace)).toEqual([]);
  });

  it("disables selection before data loads and with no matching words", () => {
    const workspace = fixture();
    expect(button(renderLibrary({ ...workspace, isLoaded: false }), "Select words").props.disabled).toBe(true);
    search(workspace, "no matching words");
    expect(button(renderLibrary(workspace), "Select words").props.disabled).toBe(true);
    search(workspace, "");
    click(renderLibrary(workspace), "Select words");
    search(workspace, "no matching words");
    expect(button(renderLibrary(workspace), "Select all shown").props.disabled).toBe(true);
    expect(button(renderLibrary(workspace), "Delete selected (0)").props.disabled).toBe(true);
  });

  it("freezes the reviewed word list and sends one deleteMany only after final confirmation", async () => {
    let workspace = fixture();
    click(renderLibrary(workspace), "Select words");
    select(workspace, "alpha");
    select(workspace, "alphabet");
    click(renderLibrary(workspace), "Delete selected (2)");
    expect(workspace.commit).not.toHaveBeenCalled();
    const originalItems = pendingDialog(workspace)!.props.items;

    // An unrelated refresh while the dialog is open must not expand its deletion scope.
    workspace = { ...workspace, data: addVocabularyItem(workspace.data, {
      id: "new-word", surfaceText: "alphanumeric", source: "manual", timezone: "Australia/Melbourne",
    }).data };
    expect(pendingDialog(workspace)!.props.items).toBe(originalItems);
    expect(originalItems.map((item) => item.id)).toEqual(["two", "one"]);
    click(renderDialog(pendingDialog(workspace)!.props), "Yes · 继续");
    expect(workspace.commit).not.toHaveBeenCalled();
    click(renderDialog(pendingDialog(workspace)!.props), "Yes · 确认删除");
    await vi.waitFor(() => expect(pendingDialog(workspace)).toBeUndefined());
    expect(workspace.commit).toHaveBeenCalledTimes(1);
    const [saved, mutation] = vi.mocked(workspace.commit).mock.calls[0];
    expect(mutation).toMatchObject({ type: "vocabulary.deleteMany", vocabularyItemIds: ["two", "one"] });
    expect(saved.items.map((item) => item.id).sort()).toEqual(["four", "new-word", "other-word", "three"]);
    expect(text(renderLibrary(workspace))).toContain("Deleted 2 words.");
    expect(button(renderLibrary(workspace), "Select words")).toBeDefined();
  });

  it("preserves the selection and shows no success message when saving fails", async () => {
    const workspace = fixture();
    vi.mocked(workspace.commit).mockRejectedValueOnce(new Error("Storage unavailable"));
    click(renderLibrary(workspace), "Select words");
    select(workspace, "alpha");
    click(renderLibrary(workspace), "Delete selected (1)");
    click(renderDialog(pendingDialog(workspace)!.props), "Yes · 继续");
    click(renderDialog(pendingDialog(workspace)!.props), "Yes · 确认删除");
    await vi.waitFor(() => expect(text(renderDialog(pendingDialog(workspace)!.props))).toContain("Storage unavailable"));
    expect(pendingDialog(workspace)).toBeDefined();
    expect(checkedWords(workspace)).toEqual(["Select alpha"]);
    expect(text(renderLibrary(workspace))).not.toContain("Deleted 1 word.");
  });
});
