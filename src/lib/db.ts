import { Pool } from 'pg';

const globalForDb = globalThis as typeof globalThis & { pgPool?: Pool };

export const db = globalForDb.pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_SIZE ?? 20),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
globalForDb.pgPool = db;

let schemaReady: Promise<void> | undefined;
export function ready() {
  // Retry on the next request if initialization failed (e.g. a temporary DB outage).
  schemaReady ??= db.query(`
    CREATE TABLE IF NOT EXISTS treasure_links (
      token text PRIMARY KEY,
      title text NOT NULL,
      treasure text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      claimed_at timestamptz,
      winner_key_hash text,
      winner_name text,
      loser_count integer NOT NULL DEFAULT 0
    );
    ALTER TABLE treasure_links ADD COLUMN IF NOT EXISTS winner_key_hash text;
    ALTER TABLE treasure_links ADD COLUMN IF NOT EXISTS winner_name text;
    ALTER TABLE treasure_links ADD COLUMN IF NOT EXISTS loser_count integer NOT NULL DEFAULT 0;
    CREATE TABLE IF NOT EXISTS treasure_visits (
      token text NOT NULL REFERENCES treasure_links(token) ON DELETE CASCADE,
      visit_key_hash text NOT NULL,
      result jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (token, visit_key_hash)
    );
  `).then(() => undefined).catch(error => { schemaReady = undefined; throw error; });
  return schemaReady;
}
