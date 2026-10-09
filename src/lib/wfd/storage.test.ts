import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createEmptyWfdData, exportWfdBackup, parseWfdBackup, readWfdData,
  restoreWfdBackup, wfdStorageKey, writeWfdData,
} from "./storage";
import { scheduleWfdAttempt } from "./scheduling";
import type { WfdAttempt } from "./types";

const now = "2026-10-09T08:00:00.000Z";
const attempt: WfdAttempt = {
  id: "attempt-1", sentenceId: "built-in-1", submittedAt: now, mode: "dictation",
  answer: "The lecture begins tomorrow.", assisted: false, playCount: 1,
  correct: true, accuracy: 1,
};

function dataWithAttempt(personId = "mimi") {
  return {
    ...createEmptyWfdData(personId, now), attempts: [attempt],
    progress: { "built-in-1": scheduleWfdAttempt(undefined, attempt) },
  };
}

describe("separate person-scoped WFD local storage", () => {
  let bytes: Map<string, string>;
  let storage: Storage;
  beforeEach(() => {
    bytes = new Map();
    storage = {
      get length() { return bytes.size; },
      clear: () => bytes.clear(),
      getItem: (key) => bytes.get(key) ?? null,
      key: (index) => [...bytes.keys()][index] ?? null,
      removeItem: (key) => { bytes.delete(key); },
      setItem: vi.fn((key: string, value: string) => { bytes.set(key, value); }),
    };
    vi.stubGlobal("window", { localStorage: storage });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("round-trips attempts/progress and keeps learners separate from each other and vocabulary", () => {
    bytes.set("mimi-vocabulary", "existing vocabulary data");
    writeWfdData(dataWithAttempt());
    writeWfdData(createEmptyWfdData("other", now));
    expect(readWfdData("mimi")).toEqual(dataWithAttempt());
    expect(readWfdData("other").attempts).toEqual([]);
    expect(bytes.get("mimi-vocabulary")).toBe("existing vocabulary data");
    expect(parseWfdBackup(exportWfdBackup(dataWithAttempt()), "mimi")).toEqual(dataWithAttempt());
    expect(() => parseWfdBackup(exportWfdBackup(dataWithAttempt()), "other")).toThrow("another learner");
  });

  it("keeps malformed saved bytes and refuses normal writes instead of resetting to empty", () => {
    const key = wfdStorageKey("mimi");
    bytes.set(key, "{damaged-json");
    expect(() => readWfdData("mimi")).toThrow("cannot be read");
    expect(() => writeWfdData(createEmptyWfdData("mimi", now))).toThrow("cannot be read");
    expect(bytes.get(key)).toBe("{damaged-json");
  });

  it("validates the entire backup before any write", () => {
    writeWfdData(dataWithAttempt());
    const before = bytes.get(wfdStorageKey("mimi"));
    const malformed = { ...dataWithAttempt(), attempts: [{ ...attempt, playCount: -1 }] };
    expect(() => restoreWfdBackup("mimi", JSON.stringify(malformed))).toThrow("play count");
    expect(() => parseWfdBackup(JSON.stringify({ ...dataWithAttempt(), attempts: [attempt, attempt] }))).toThrow("duplicate attempt");
    expect(() => parseWfdBackup(JSON.stringify({ ...dataWithAttempt(), progress: { item: { dueAt: "bad-date" } } }))).toThrow("ISO date");
    expect(() => parseWfdBackup(JSON.stringify({ ...dataWithAttempt(), updatedAt: "2026-02-30" }))).toThrow("ISO date");
    expect(bytes.get(wfdStorageKey("mimi"))).toBe(before);
    expect(bytes.size).toBe(1);
  });

  it("explicit restore preserves original malformed bytes in a recovery copy", () => {
    bytes.set(wfdStorageKey("mimi"), "original damaged bytes");
    const restored = restoreWfdBackup("mimi", exportWfdBackup(dataWithAttempt()));
    expect(restored.recoveryStorageKey).toBeTruthy();
    expect(bytes.get(restored.recoveryStorageKey!)).toBe("original damaged bytes");
    expect(readWfdData("mimi")).toEqual(dataWithAttempt());
  });

  it("a full browser store cannot destroy the previous value during save or restore", () => {
    writeWfdData(dataWithAttempt());
    const before = bytes.get(wfdStorageKey("mimi"));
    vi.mocked(storage.setItem).mockImplementation(() => { throw new Error("QuotaExceededError"); });
    expect(() => writeWfdData(dataWithAttempt())).toThrow("could not be saved");
    expect(() => restoreWfdBackup("mimi", exportWfdBackup(createEmptyWfdData("mimi", now)))).toThrow("original data has been preserved");
    expect(bytes.get(wfdStorageKey("mimi"))).toBe(before);
  });

  it("refuses stale-tab saves that would discard an already saved attempt", () => {
    const stale = createEmptyWfdData("mimi", now);
    writeWfdData(dataWithAttempt());
    expect(() => writeWfdData(stale)).toThrow("another tab");
    expect(readWfdData("mimi").attempts).toEqual([attempt]);
  });

  it("preserves learning-only progress when an older tab has no new attempts", () => {
    const stale = createEmptyWfdData("mimi", now);
    writeWfdData({ ...stale, progress: { "built-in-1": { learnedAt: now, dueAt: "2026-10-09T08:10:00.000Z" } } });
    expect(() => writeWfdData(stale)).toThrow("progress changed");
    expect(readWfdData("mimi").progress["built-in-1"].learnedAt).toBe(now);
  });

  it("compares the caller's saved revision even when attempt history is unchanged", () => {
    const original = createEmptyWfdData("mimi", now);
    writeWfdData(original);
    const newer = { ...original, updatedAt: "2026-10-09T08:01:00.000Z" };
    writeWfdData(newer, now);
    expect(() => writeWfdData({ ...original, updatedAt: "2026-10-09T08:02:00.000Z" }, now)).toThrow("data changed in another tab");
    expect(readWfdData("mimi").updatedAt).toBe(newer.updatedAt);
  });

  it("rejects untrusted prototype keys and unavailable storage", () => {
    const malicious = JSON.stringify(createEmptyWfdData("mimi", now)).replace('"progress":{}', '"progress":{"__proto__":{}}');
    expect(() => parseWfdBackup(malicious)).toThrow("valid ID");
    vi.stubGlobal("window", undefined);
    expect(() => readWfdData("mimi")).toThrow("this browser");
  });
});
