import { createHash, randomBytes } from 'node:crypto';
import { chooseLossMessage, type LossMessage } from './loser-messages';
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

export async function claimTreasure(token: string, recoveryKey?: string, visitKey?: string): Promise<{ state: 'won'; title: string; treasure: string; winnerKey: string } | { state: 'claimed'; gapMs: number; rank: number; message: string | null; tier: LossMessage['tier']; visitKey: string; stored: false } | { state: 'claimed'; gapMs: number; rank: number; message: string | null; tier: LossMessage['tier']; stored: true } | { state: 'missing' }> {
  await ready();
  const winnerKey = randomBytes(32).toString('base64url');
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Serialize claims for this token on its row, across all app processes.
    // Once a losing request acquires this lock, its next DB timestamp is captured
    // immediately so a second read round-trip does not inflate the displayed gap.
    const locked = await client.query<{ title: string; treasure: string; claimed: boolean; gap_us: string | null; winner_key_hash: string | null; loser_count: number }>(`
      SELECT title, treasure, claimed_at IS NOT NULL AS claimed, winner_key_hash, loser_count,
        CASE WHEN claimed_at IS NULL THEN NULL ELSE
          GREATEST(0, floor(extract(epoch FROM (clock_timestamp() - claimed_at)) * 1000000))::text
        END AS gap_us
      FROM treasure_links WHERE token = $1 FOR UPDATE
    `, [token]);
    const link = locked.rows[0];
    if (!link) {
      await client.query('COMMIT');
      return { state: 'missing' };
    }
    if (!link.claimed) {
      const won = await client.query<{ title: string; treasure: string }>(
        'UPDATE treasure_links SET claimed_at = clock_timestamp(), winner_key_hash = $2 WHERE token = $1 RETURNING title, treasure', [token, winnerKeyHash(winnerKey)],
      );
      await client.query('COMMIT');
      return { state: 'won', ...won.rows[0], winnerKey };
    }
    // The hashed HttpOnly recovery key allows only this browser to retrieve its
    // own winning result after a reload. Never return the secret to other visitors.
    if (recoveryKey && link.winner_key_hash && winnerKeyHash(recoveryKey) === link.winner_key_hash) {
      await client.query('COMMIT');
      return { state: 'won', title: link.title, treasure: link.treasure, winnerKey: recoveryKey };
    }
    // Return a signed-cookie-backed prior result on same-device reload without
    // incrementing the rank or selecting a different message.
    if (visitKey) {
      const prior = await client.query<{ result: { gapMs: number; rank: number; message: string | null; tier: LossMessage['tier'] } | null }>(
        'SELECT result FROM treasure_visits WHERE token = $1 AND visit_key_hash = $2', [token, winnerKeyHash(visitKey)],
      );
      if (prior.rows[0]?.result) {
        await client.query('COMMIT');
        return { state: 'claimed', ...prior.rows[0].result, stored: true };
      }
    }

    // The gap and rank are measured/assigned while holding the prize row lock.
    // Timestamp arithmetic is server-side; no client device clock is compared.
    const gapMicroseconds = Math.max(0, Number(link.gap_us ?? 0));
    const rank = link.loser_count + 1;
    const { message, tier } = chooseLossMessage(rank, gapMicroseconds);
    const gapMs = gapMicroseconds / 1000;
    await client.query('UPDATE treasure_links SET loser_count = loser_count + 1 WHERE token = $1', [token]);

    if (visitKey) {
      const visitResult = { gapMs, rank, message, tier };
      await client.query(
        'INSERT INTO treasure_visits (token, visit_key_hash, result) VALUES ($1, $2, $3) ON CONFLICT (token, visit_key_hash) DO NOTHING',
        [token, winnerKeyHash(visitKey), JSON.stringify(visitResult)],
      );
      await client.query('COMMIT');
      return { state: 'claimed', ...visitResult, visitKey, stored: false };
    }
    await client.query('COMMIT');
    return { state: 'claimed', gapMs, rank, message, tier, stored: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
