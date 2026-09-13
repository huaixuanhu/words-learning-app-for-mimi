import type { PoolClient } from "@neondatabase/serverless";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Postgres pool error handling", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("MIMI_STORAGE_RUNTIME", "postgres-preview");
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("DATABASE_URL", "postgresql://fixture:fixture@localhost/fixture");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("handles an idle connection error without throwing, closing the pool, or leaking details", async () => {
    const { getPostgresPool } = await import("./client");
    const pool = getPostgresPool();
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const end = vi.spyOn(pool, "end");
    const idleFailure = Object.assign(
      new Error("WebSocket failed at postgresql://fixture:private-password@private-host/fixture"),
      { code: "private-error-detail", client: { connectionString: "private-connection" } },
    );

    expect(() => pool.emit("error", idleFailure)).not.toThrow();
    expect(log.mock.calls).toEqual([
      ["POSTGRES_POOL_IDLE_ERROR: an idle database connection was removed."],
    ]);
    expect(end).not.toHaveBeenCalled();
    expect(pool.ending).toBe(false);
    expect(getPostgresPool()).toBe(pool);
  });

  it("installs one listener when the shared pool is first requested", async () => {
    const { getPostgresPool } = await import("./client");
    const first = getPostgresPool();

    expect(getPostgresPool()).toBe(first);
    expect(getPostgresPool()).toBe(first);
    expect(first.listenerCount("error")).toBe(1);
  });

  it("keeps a failed request rejected without issuing another query", async () => {
    const { getPostgresPool } = await import("./client");
    const failure = new Error("fixture query failed");
    const query = vi.spyOn(getPostgresPool(), "query").mockRejectedValue(failure);

    await expect(getPostgresPool().query("select 1")).rejects.toBe(failure);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("rolls back a failed mutation without replaying the callback", async () => {
    const { getPostgresPool, withPostgresTransaction } = await import("./client");
    const failure = new Error("fixture mutation failed");
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const connect = vi.spyOn(getPostgresPool(), "connect").mockImplementation(() => Promise.resolve(client));
    const callback = vi.fn().mockRejectedValue(failure);

    await expect(withPostgresTransaction(callback)).rejects.toBe(failure);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith(client);
    expect(query.mock.calls).toEqual([["begin"], ["rollback"]]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("preserves an uncertain commit error even when rollback also fails", async () => {
    const { getPostgresPool, withPostgresTransaction } = await import("./client");
    const commitFailure = new Error("fixture connection lost during commit");
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(commitFailure)
      .mockRejectedValueOnce(new Error("fixture rollback failed"));
    const release = vi.fn();
    const client = { query, release } as unknown as PoolClient;
    const connect = vi.spyOn(getPostgresPool(), "connect").mockImplementation(() => Promise.resolve(client));
    const callback = vi.fn().mockResolvedValue("fixture saved");

    await expect(withPostgresTransaction(callback)).rejects.toBe(commitFailure);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledExactlyOnceWith(client);
    expect(query.mock.calls).toEqual([["begin"], ["commit"], ["rollback"]]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("does not run a mutation or retry when acquiring a connection fails", async () => {
    const { getPostgresPool, withPostgresTransaction } = await import("./client");
    const failure = new Error("fixture connection failed");
    const connect = vi.spyOn(getPostgresPool(), "connect").mockRejectedValue(failure);
    const callback = vi.fn();

    await expect(withPostgresTransaction(callback)).rejects.toBe(failure);
    expect(connect).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
  });
});
