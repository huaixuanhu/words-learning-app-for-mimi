import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { PendingSaveRecoveryDialog } from "./pending-save-recovery";

const host = vi.hoisted(() => ({ cursor: 0, cells: [] as unknown[] }));
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof import("react")>();
  return { ...react,
    useState(initial: unknown) {
      const index = host.cursor++;
      if (!(index in host.cells)) host.cells[index] = initial;
      return [host.cells[index], (next: unknown) => { host.cells[index] = next; }];
    },
    useRef(initial: unknown) {
      const index = host.cursor++;
      if (!(index in host.cells)) host.cells[index] = { current: initial };
      return host.cells[index];
    },
  };
});

type Props = { children?: ReactNode; type?: string; checked?: boolean; disabled?: boolean; onClick?(): void; onChange?(event: { target: { checked: boolean } }): void };
function elements(node: ReactNode): ReactElement<Props>[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Props>(node)) return [];
  return [node, ...elements(node.props.children)];
}
const recovery = { requestId: "old-save", personId: "fixture", personName: "Fixture learner", snapshotFingerprint: "digest" };
function fixture(onContinue = vi.fn(async () => {})) {
  const onCancel = vi.fn();
  const render = () => {
    host.cursor = 0;
    return PendingSaveRecoveryDialog({ recovery, onContinue, onCancel });
  };
  const buttons = () => elements(render()).filter((element) => element.type === "button");
  const check = () => elements(render()).find((element) => element.props.type === "checkbox")!.props.onChange!({ target: { checked: true } });
  return { onContinue, onCancel, render, buttons, check };
}

beforeEach(() => { host.cells = []; });
describe("pending save review confirmation", () => {
  it("requires explicit review; cancellation never acknowledges the save", () => {
    const ui = fixture();
    expect(ui.buttons()[1].props.disabled).toBe(true);
    ui.buttons()[0].props.onClick!();
    expect(ui.onCancel).toHaveBeenCalledOnce();
    expect(ui.onContinue).not.toHaveBeenCalled();
  });

  it("coalesces repeated clicks and blocks dismissal during the read-only check", async () => {
    let finish!: () => void;
    const onContinue = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const ui = fixture(onContinue);
    ui.check();
    const confirm = ui.buttons()[1];
    expect(confirm.props.disabled).toBe(false);
    confirm.props.onClick!();
    confirm.props.onClick!();
    expect(onContinue).toHaveBeenCalledExactlyOnceWith(recovery);
    expect(ui.buttons().every((button) => button.props.disabled)).toBe(true);
    ui.render().props.onClose();
    expect(ui.onCancel).not.toHaveBeenCalled();
    finish();
    await vi.waitFor(() => expect(ui.onCancel).toHaveBeenCalledOnce());
  });

  it("keeps failed recovery open and requires review again", async () => {
    const onContinue = vi.fn(async () => { throw new Error("Fresh read failed"); });
    const ui = fixture(onContinue);
    ui.check();
    ui.buttons()[1].props.onClick!();
    await vi.waitFor(() => expect(ui.buttons()[0].props.disabled).toBe(false));
    expect(ui.onCancel).not.toHaveBeenCalled();
    expect(ui.buttons()[1].props.disabled).toBe(true);
  });
});
