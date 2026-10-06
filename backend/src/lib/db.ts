import { Pool, types, type QueryResultRow, type PoolClient } from "pg";

// A calendar deadline has no timezone; JSON must not shift it to the previous day.
types.setTypeParser(1082, value => value);

export const pool = new Pool({
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  connectionString:
    process.env.DATABASE_URL ??
    "postgresql://mastercota:mastercota@localhost:5432/mastercota",
});

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  return pool.query<T>(text, params);
}
