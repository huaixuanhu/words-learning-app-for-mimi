import { describe, expect, it } from "vitest";
import { waitForStableQueue } from "./async-queue";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

describe("stable async mutation queue", () => {
  it("waits for a mutation appended while an older mutation is still pending", async () => {
    const first = deferred();
    const second = deferred();
    let current = first.promise;
    let settled = false;
    const waiting = waitForStableQueue(() => current).then(() => {
      settled = true;
    });

    current = second.promise;
    first.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(settled).toBe(false);

    second.resolve();
    await waiting;

    expect(settled).toBe(true);
  });
});
