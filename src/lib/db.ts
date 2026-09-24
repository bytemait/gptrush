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
      claimed_at timestamptz
    );
  `).then(() => undefined).catch(error => { schemaReady = undefined; throw error; });
  return schemaReady;
}
