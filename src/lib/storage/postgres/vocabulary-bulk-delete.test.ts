import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
  poolQuery: vi.fn(),
  transactionQuery: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("./client", () => ({
  getPostgresPool: () => ({ query: database.poolQuery }),
  withPostgresTransaction: database.transaction,
  markPostgresMutationCommitted: vi.fn(),
}));

import { createPostgresRepository } from "./repository";

const context = {
  personId: "00000000-0000-4000-8000-000000000001",
  now: "2026-10-17T09:00:00.000Z",
  timezone: "Australia/Melbourne",
};
const firstId = "a0000000-0000-4000-8000-000000000002";
const secondId = "00000000-0000-4000-8000-000000000003";

describe("Postgres selected vocabulary deletion", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    database.transaction.mockImplementation((callback) =>
      callback({ query: database.transactionQuery }),
    );
  });

  it("locks the exact person-scoped selection and deletes it once in one transaction", async () => {
    database.transactionQuery
      .mockResolvedValueOnce({ rows: [{ id: secondId }, { id: firstId }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 2 });

    await expect(createPostgresRepository().vocabulary.deleteItems(
      context, [firstId.toUpperCase(), secondId],
    )).resolves.toEqual({ deletedItemsCount: 2 });

    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(database.transactionQuery).toHaveBeenCalledTimes(2);
    const [selectSql, selectValues] = database.transactionQuery.mock.calls[0];
    expect(selectSql.replace(/\s+/g, " ").trim()).toBe(
      "select id from vocabulary_items where person_id = $1 and id = any($2::uuid[]) order by id for update",
    );
    expect(selectValues).toEqual([context.personId, [firstId, secondId]]);
    const [deleteSql, deleteValues] = database.transactionQuery.mock.calls[1];
    expect(deleteSql.replace(/\s+/g, " ").trim()).toBe(
      "delete from vocabulary_items where person_id = $1 and id = any($2::uuid[])",
    );
    expect(deleteValues).toEqual(selectValues);
    expect(database.poolQuery).not.toHaveBeenCalled();
  });

  it.each([
    { label: "missing selection", ids: undefined },
    { label: "empty selection", ids: [] },
    { label: "duplicate ID", ids: [firstId, firstId] },
    { label: "duplicate UUID with different casing", ids: [firstId, firstId.toUpperCase()] },
    { label: "invalid ID", ids: [firstId, "not-an-id"] },
    { label: "non-string ID", ids: [firstId, 12] },
  ])("rejects $label before starting a transaction", async ({ ids }) => {
    await expect(createPostgresRepository().vocabulary.deleteItems(
      context, ids as string[],
    )).rejects.toThrow();
    expect(database.transaction).not.toHaveBeenCalled();
    expect(database.transactionQuery).not.toHaveBeenCalled();
    expect(database.poolQuery).not.toHaveBeenCalled();
  });

  it.each([
    { label: "one stale or other-person ID", rows: [{ id: firstId }] },
    { label: "only stale or other-person IDs", rows: [] },
  ])("rejects $label without deleting the matching subset", async ({ rows }) => {
    database.transactionQuery.mockResolvedValueOnce({ rows });

    await expect(createPostgresRepository().vocabulary.deleteItems(
      context, [firstId, secondId],
    )).rejects.toThrow("Some selected words are no longer available");

    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(database.transactionQuery).toHaveBeenCalledTimes(1);
    expect(database.transactionQuery.mock.calls[0][1]).toEqual([
      context.personId, [firstId, secondId],
    ]);
    expect(database.poolQuery).not.toHaveBeenCalled();
  });

  it("propagates a delete failure through the same transaction without retrying", async () => {
    const failure = new Error("fixture deletion failure");
    database.transactionQuery
      .mockResolvedValueOnce({ rows: [{ id: firstId }, { id: secondId }] })
      .mockRejectedValueOnce(failure);

    await expect(createPostgresRepository().vocabulary.deleteItems(
      context, [firstId, secondId],
    )).rejects.toBe(failure);

    expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(database.transactionQuery).toHaveBeenCalledTimes(2);
    expect(database.poolQuery).not.toHaveBeenCalled();
  });
});
