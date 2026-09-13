import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "@neondatabase/serverless";
import { attachDatabasePool } from "@vercel/functions";
import { assertPostgresRuntime } from "@/lib/storage/runtime-mode";

export type PostgresQueryable = {
  query<R extends QueryResultRow = QueryResultRow>(
    queryText: string,
    values?: unknown[],
  ): Promise<QueryResult<R>>;
};

let pool: Pool | null = null;
const uncertainCommitErrors = new WeakSet<object>();
const committedMutationErrors = new WeakSet<object>();

export function isPostgresTransactionOutcomeUnknown(error: unknown): boolean {
  return error !== null && typeof error === "object" && uncertainCommitErrors.has(error);
}

export function markPostgresMutationCommitted(error: unknown): Error {
  const failure = error instanceof Error ? error : new Error("Saved data could not be refreshed", { cause: error });
  committedMutationErrors.add(failure);
  return failure;
}

export function isPostgresMutationCommitted(error: unknown): boolean {
  return error !== null && typeof error === "object" && committedMutationErrors.has(error);
}

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("Postgres storage modules are server-only");
  }
}

export function getPostgresDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  const databaseUrl =
    env.DATABASE_URL ||
    env.DATABASE_URL_UNPOOLED ||
    env.POSTGRES_URL_NON_POOLING;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL, DATABASE_URL_UNPOOLED, or POSTGRES_URL_NON_POOLING");
  }

  return databaseUrl;
}

export function getPostgresPool() {
  assertServerRuntime();
  assertPostgresRuntime();

  if (!pool) {
    pool = new Pool({
      connectionString: getPostgresDatabaseUrl(),
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", () => {
      // The driver already removes a failed idle client. Handle its background
      // event without exposing connection details or retrying any request.
      console.error("POSTGRES_POOL_IDLE_ERROR: an idle database connection was removed.");
    });
    // Keep Vercel alive until the driver's idle cleanup runs before suspension.
    attachDatabasePool(pool);
  }

  return pool;
}

export async function withPostgresTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPostgresPool().connect();
  let connectionFailure: Error | null = null;
  let discardConnection = false;
  let commitAttempted = false;
  const onConnectionError = (error: unknown) => {
    connectionFailure = error instanceof Error
      ? error
      : new Error("Database transaction connection failed");
    discardConnection = true;
    console.error("POSTGRES_TRANSACTION_CONNECTION_ERROR: a checked-out connection failed.");
  };
  // Pool error listeners cover idle clients only; a checked-out client needs its own.
  client.on("error", onConnectionError);

  try {
    await client.query("begin");
    if (connectionFailure) throw connectionFailure;
    const result = await callback(client);
    if (connectionFailure) throw connectionFailure;
    commitAttempted = true;
    await client.query("commit");
    if (connectionFailure) throw connectionFailure;

    return result;
  } catch (error) {
    // A failed COMMIT response cannot prove whether the server saved the write.
    // Preserve the original error and expose only this outcome classification.
    const failure = commitAttempted && (error === null || typeof error !== "object")
      ? new Error("Database commit outcome is unknown", { cause: error })
      : error;
    if (commitAttempted) {
      uncertainCommitErrors.add(failure as object);
      discardConnection = true;
    }
    if (!connectionFailure) {
      try {
        await client.query("rollback");
      } catch {
        // An unconfirmed rollback must never return a transaction to another request.
        discardConnection = true;
      }
    }
    throw failure;
  } finally {
    try {
      client.release(discardConnection);
    } finally {
      client.removeListener("error", onConnectionError);
    }
  }
}
