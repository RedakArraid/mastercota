import { readFile } from 'node:fs/promises';
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
const files = ['schema.sql','migrate-pages.sql','migrate-admin.sql','migrate-billing.sql','migrate-wave-p2p.sql','migrate-wave-link.sql','migrate-wave-mode.sql','migrate-cms-legal.sql','migrate-landing-copy.sql','migrate-no-emdash.sql','migrate-reliability.sql'];
try {
  await client.query('SELECT pg_advisory_lock(76419026)');
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  // The current baseline indexes role, which older installations do not yet have.
  const { rows } = await client.query("SELECT to_regclass('public.users') AS users");
  if (rows[0].users) await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'");
  for (const file of files) {
    if ((await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [file])).rowCount) continue;
    await client.query('BEGIN');
    try {
      await client.query(await readFile(new URL(`../db/${file}`, import.meta.url), 'utf8'));
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  }
} finally {
  await client.query('SELECT pg_advisory_unlock(76419026)').catch(() => {});
  client.release();
  await pool.end();
}
