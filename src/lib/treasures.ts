import { createHash, randomBytes } from 'node:crypto';
import { db, ready } from './db';

export type TreasureSummary = { token: string; title: string; created_at: string; claimed_at: string | null; winner_name: string | null };

export function winnerKeyHash(key: string) { return createHash('sha256').update(key).digest('hex'); }

export async function listTreasures(): Promise<TreasureSummary[]> {
  await ready();
  const result = await db.query<TreasureSummary>('SELECT token, title, created_at, claimed_at, winner_name FROM treasure_links ORDER BY created_at DESC LIMIT 200');
  return result.rows;
}

export async function createTreasure(title: string, treasure: string): Promise<TreasureSummary> {
  await ready();
  const token = randomBytes(24).toString('base64url');
  const result = await db.query<TreasureSummary>('INSERT INTO treasure_links (token, title, treasure) VALUES ($1, $2, $3) RETURNING token, title, created_at, claimed_at, winner_name', [token, title, treasure]);
  return result.rows[0];
}

export async function getPublicTreasure(token: string): Promise<Pick<TreasureSummary, 'title' | 'claimed_at'> | null> {
  await ready();
  const result = await db.query<Pick<TreasureSummary, 'title' | 'claimed_at'>>('SELECT title, claimed_at FROM treasure_links WHERE token = $1', [token]);
  return result.rows[0] ?? null;
}

export async function claimTreasure(token: string): Promise<{ state: 'won'; title: string; treasure: string; winnerKey: string } | { state: 'claimed'; gapMs: number } | { state: 'missing' }> {
  await ready();
  const winnerKey = randomBytes(32).toString('base64url');
  // One SQL statement is the linearization point. PostgreSQL locks the matching row;
  // after a concurrent UPDATE commits it rechecks claimed_at IS NULL. Only one
  // request can receive the treasure, even across processes or app replicas.
  const result = await db.query<{ title: string; treasure: string }>(
    'UPDATE treasure_links SET claimed_at = clock_timestamp(), winner_key_hash = $2 WHERE token = $1 AND claimed_at IS NULL RETURNING title, treasure', [token, winnerKeyHash(winnerKey)],
  );
  if (result.rows[0]) return { state: 'won', ...result.rows[0], winnerKey };
  // Measure the miss after it has waited on the same row lock as the winner.
  // Both timestamps are from PostgreSQL; visitor device clocks are never compared.
  const outcome = await db.query<{ gap_ms: number | null }>(`
    SELECT CASE WHEN claimed_at IS NULL THEN NULL
      ELSE GREATEST(0, floor(extract(epoch FROM (clock_timestamp() - claimed_at)) * 1000))::int
    END AS gap_ms
    FROM treasure_links WHERE token = $1
  `, [token]);
  if (!outcome.rows[0]) return { state: 'missing' };
  return { state: 'claimed', gapMs: Math.max(0, outcome.rows[0].gap_ms ?? 0) };
}

export async function saveWinnerName(token: string, key: string, name: string): Promise<'saved' | 'already-set' | 'unauthorized'> {
  await ready();
  const hash = winnerKeyHash(key);
  const updated = await db.query('UPDATE treasure_links SET winner_name = $3 WHERE token = $1 AND winner_key_hash = $2 AND winner_name IS NULL RETURNING token', [token, hash, name]);
  if (updated.rowCount) return 'saved';
  const existing = await db.query<{ winner_name: string | null }>('SELECT winner_name FROM treasure_links WHERE token = $1 AND winner_key_hash = $2', [token, hash]);
  if (!existing.rows[0]) return 'unauthorized';
  return existing.rows[0].winner_name === name ? 'saved' : 'already-set';
}
