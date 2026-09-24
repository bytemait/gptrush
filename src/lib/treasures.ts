import { randomBytes } from 'node:crypto';
import { db, ready } from './db';

export type TreasureSummary = { token: string; title: string; created_at: string; claimed_at: string | null };

export async function listTreasures(): Promise<TreasureSummary[]> {
  await ready();
  const result = await db.query<TreasureSummary>('SELECT token, title, created_at, claimed_at FROM treasure_links ORDER BY created_at DESC LIMIT 200');
  return result.rows;
}

export async function createTreasure(title: string, treasure: string): Promise<TreasureSummary> {
  await ready();
  const token = randomBytes(24).toString('base64url');
  const result = await db.query<TreasureSummary>('INSERT INTO treasure_links (token, title, treasure) VALUES ($1, $2, $3) RETURNING token, title, created_at, claimed_at', [token, title, treasure]);
  return result.rows[0];
}

export async function getPublicTreasure(token: string): Promise<Pick<TreasureSummary, 'title' | 'claimed_at'> | null> {
  await ready();
  const result = await db.query<Pick<TreasureSummary, 'title' | 'claimed_at'>>('SELECT title, claimed_at FROM treasure_links WHERE token = $1', [token]);
  return result.rows[0] ?? null;
}

export async function claimTreasure(token: string): Promise<{ state: 'won'; title: string; treasure: string } | { state: 'claimed' | 'missing' }> {
  await ready();
  // One SQL statement is the linearization point. PostgreSQL locks the matching row;
  // after a concurrent UPDATE commits it rechecks claimed_at IS NULL. Only one
  // request can receive the treasure, even across processes or app replicas.
  const result = await db.query<{ title: string; treasure: string }>(
    'UPDATE treasure_links SET claimed_at = clock_timestamp() WHERE token = $1 AND claimed_at IS NULL RETURNING title, treasure', [token],
  );
  if (result.rows[0]) return { state: 'won', ...result.rows[0] };
  const exists = await db.query('SELECT 1 FROM treasure_links WHERE token = $1', [token]);
  return { state: exists.rows.length ? 'claimed' : 'missing' };
}
