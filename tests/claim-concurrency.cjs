// Run with DATABASE_URL set to an isolated PostgreSQL test database.
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL to a test database.');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 32 });
  const token = randomBytes(24).toString('base64url');
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS treasure_links (
      token text PRIMARY KEY, title text NOT NULL, treasure text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(), claimed_at timestamptz,
      winner_key_hash text, winner_name text
    )`);
    await pool.query('ALTER TABLE treasure_links ADD COLUMN IF NOT EXISTS winner_key_hash text');
    await pool.query('ALTER TABLE treasure_links ADD COLUMN IF NOT EXISTS winner_name text');
    await pool.query('INSERT INTO treasure_links (token, title, treasure) VALUES ($1, $2, $3)', [token, 'Race test', 'secret']);
    const results = await Promise.all(Array.from({ length: 100 }, async () => {
      const keyHash = randomBytes(32).toString('hex');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(`SELECT title, treasure, claimed_at IS NOT NULL AS claimed,
          CASE WHEN claimed_at IS NULL THEN NULL ELSE
            GREATEST(0, floor(extract(epoch FROM (clock_timestamp() - claimed_at)) * 1000000))::text
          END AS gap_us FROM treasure_links WHERE token = $1 FOR UPDATE`, [token]);
        const row = rows[0];
        if (!row) { await client.query('COMMIT'); return null; }
        if (!row.claimed) {
          await client.query('UPDATE treasure_links SET claimed_at = clock_timestamp(), winner_key_hash = $2 WHERE token = $1', [token, keyHash]);
          await client.query('COMMIT');
          return { ...row, keyHash };
        }
        await client.query('COMMIT');
        return { state: 'claimed', gapMs: Number(row.gap_us) / 1000 };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }));
    const winner = results.find(Boolean);
    assert.ok(winner, 'Exactly one request must receive the treasure');
    assert.equal(winner.treasure, 'secret');
    const misses = results.filter(value => value?.state === 'claimed');
    assert.equal(misses.length, 99);
    assert.ok(misses.every(value => Number.isFinite(value.gapMs) && value.gapMs >= 0), 'Each miss gets a nonnegative fractional-millisecond database-clock processing gap');
    const wrongKey = randomBytes(32).toString('hex');
    const denied = await pool.query('UPDATE treasure_links SET winner_name = $3 WHERE token = $1 AND winner_key_hash = $2 AND winner_name IS NULL RETURNING token', [token, wrongKey, 'Impostor']);
    assert.equal(denied.rowCount, 0, 'A non-winner key cannot set a winner name');
    const nameWrite = await pool.query('UPDATE treasure_links SET winner_name = $3 WHERE token = $1 AND winner_key_hash = $2 AND winner_name IS NULL RETURNING winner_name', [token, winner.keyHash, 'Concurrent Winner']);
    assert.equal(nameWrite.rows[0].winner_name, 'Concurrent Winner');
    console.log('Passed: 100 simultaneous claims, one winner, 99 misses, and winner-only name submission.');
  } finally {
    await pool.query('DELETE FROM treasure_links WHERE token = $1', [token]);
    await pool.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
