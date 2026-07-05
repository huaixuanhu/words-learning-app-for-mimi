import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "@neondatabase/serverless";
import { assertPostgresPreviewRuntime } from "@/lib/storage/runtime-mode";

export type PostgresQueryable = {
  query<R extends QueryResultRow = QueryResultRow>(
    queryText: string,
    values?: unknown[],
  ): Promise<QueryResult<R>>;
};

let pool: Pool | null = null;

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
  assertPostgresPreviewRuntime();

  if (!pool) {
    pool = new Pool({ connectionString: getPostgresDatabaseUrl() });
  }

  return pool;
}

export async function withPostgresTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPostgresPool().connect();

  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");

    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
