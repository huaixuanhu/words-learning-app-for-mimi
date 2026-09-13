import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  poolQuery: vi.fn(), transactionQuery: vi.fn(), transaction: vi.fn(), markCommitted: vi.fn(),
}));
vi.mock("./client", () => ({
  getPostgresPool: () => ({ query: database.poolQuery }),
  withPostgresTransaction: database.transaction,
  markPostgresMutationCommitted: database.markCommitted,
}));
import { createPostgresRepository } from "./repository";

const context = {
  personId: "00000000-0000-4000-8000-000000000001",
  now: "2026-09-13T09:00:00.000Z", timezone: "Australia/Melbourne",
};
const itemId = "00000000-0000-4000-8000-000000000002";

describe("storage mutation transaction outcome boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    database.markCommitted.mockImplementation((error) => error);
    database.transaction.mockImplementation((callback) => callback({ query: database.transactionQuery }));
  });

  it.each(["archiveItem", "restoreItem"] as const)("runs %s in the transaction whose COMMIT outcome can be tracked", async (method) => {
    database.transactionQuery.mockResolvedValue({ rows: [] });
    await expect(createPostgresRepository().vocabulary[method](context, itemId)).rejects.toThrow("Vocabulary item not found");
    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(database.transactionQuery).toHaveBeenCalledTimes(1);
    expect(database.poolQuery).not.toHaveBeenCalled();
  });

  it("marks a failed import readback after the transaction has returned as committed", async () => {
    const error = new Error("snapshot connection failed after commit");
    database.transaction.mockResolvedValue({ batch: {}, items: [] });
    database.poolQuery.mockRejectedValue(error);
    await expect(createPostgresRepository().vocabulary.commitImportCandidates(
      context, { sourceType: "pasted_text" }, [], [],
    )).rejects.toBe(error);
    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(database.markCommitted).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("does not mark a failed import transaction as committed", async () => {
    const error = new Error("import validation failed");
    database.transaction.mockRejectedValue(error);
    await expect(createPostgresRepository().vocabulary.commitImportCandidates(
      context, { sourceType: "pasted_text" }, [], [],
    )).rejects.toBe(error);
    expect(database.markCommitted).not.toHaveBeenCalled();
    expect(database.poolQuery).not.toHaveBeenCalled();
  });
});
