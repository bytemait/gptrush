// Run with DATABASE_URL set to an isolated PostgreSQL test database.
const assert = require('node:assert/strict');
const { createHash, randomBytes } = require('node:crypto');
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
    await pool.query('ALTER TABLE treasure_links ADD COLUMN IF NOT EXISTS loser_count integer NOT NULL DEFAULT 0');
    await pool.query(`CREATE TABLE IF NOT EXISTS treasure_visits (
      token text NOT NULL REFERENCES treasure_links(token) ON DELETE CASCADE,
      visit_key_hash text NOT NULL,
      result jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (token, visit_key_hash)
    )`);
    await pool.query('INSERT INTO treasure_links (token, title, treasure) VALUES ($1, $2, $3)', [token, 'Race test', 'secret']);
    const results = await Promise.all(Array.from({ length: 100 }, async () => {
      const recoveryKey = randomBytes(32).toString('base64url');
      const keyHash = createHash('sha256').update(recoveryKey).digest('hex');
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows } = await client.query(`SELECT title, treasure, claimed_at IS NOT NULL AS claimed,
          loser_count, CASE WHEN claimed_at IS NULL THEN NULL ELSE
            GREATEST(0, floor(extract(epoch FROM (clock_timestamp() - claimed_at)) * 1000000))::text
          END AS gap_us FROM treasure_links WHERE token = $1 FOR UPDATE`, [token]);
        const row = rows[0];
        if (!row) { await client.query('COMMIT'); return null; }
        if (!row.claimed) {
          await client.query('UPDATE treasure_links SET claimed_at = clock_timestamp(), winner_key_hash = $2 WHERE token = $1', [token, keyHash]);
          await client.query('COMMIT');
          return { ...row, keyHash, recoveryKey };
        }
        const prior = await client.query('SELECT result FROM treasure_visits WHERE token = $1 AND visit_key_hash = $2', [token, keyHash]);
        if (prior.rows[0]) { await client.query('COMMIT'); return { ...prior.rows[0].result, keyHash, stored: true }; }
        const rank = row.loser_count + 1;
        const gapMs = Number(row.gap_us) / 1000;
        const tier = rank === 1 ? 'second' : rank === 2 ? 'third' : gapMs < 15000 ? 'first-few-seconds' : gapMs < 30000 ? '15-30-seconds' : gapMs <= 45000 ? '30-45-seconds' : null;
        const message = `${tier ?? 'no-tier'}-message-${rank}`;
        await client.query('UPDATE treasure_links SET loser_count = loser_count + 1 WHERE token = $1', [token]);
        const saved = { state: 'claimed', gapMs, rank, tier, message };
        await client.query('INSERT INTO treasure_visits (token, visit_key_hash, result) VALUES ($1, $2, $3)', [token, keyHash, JSON.stringify(saved)]);
        await client.query('COMMIT');
        return { ...saved, keyHash, recoveryKey, stored: false };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    }));
    const winner = results.find(Boolean);
    assert.ok(winner, 'Exactly one request must receive the treasure');
    assert.equal(winner.treasure, 'secret');
    const ownerReload = await pool.query('SELECT treasure FROM treasure_links WHERE token = $1 AND winner_key_hash = $2', [token, createHash('sha256').update(winner.recoveryKey).digest('hex')]);
    assert.equal(ownerReload.rows[0].treasure, 'secret', 'The stored winner credential can restore the winning treasure');
    const strangerReload = await pool.query('SELECT treasure FROM treasure_links WHERE token = $1 AND winner_key_hash = $2', [token, createHash('sha256').update(randomBytes(32).toString('base64url')).digest('hex')]);
    assert.equal(strangerReload.rowCount, 0, 'A different device cannot restore the winning treasure');
    const misses = results.filter(value => value?.state === 'claimed');
    assert.equal(misses.length, 99);
    assert.ok(misses.every(value => Number.isFinite(value.gapMs) && value.gapMs >= 0), 'Each miss gets a nonnegative fractional-millisecond database-clock processing gap');
    const orderedMisses = [...misses].sort((a, b) => a.rank - b.rank);
    const orderedRanks = orderedMisses.map(value => value.rank);
    assert.deepEqual(orderedRanks, Array.from({ length: 99 }, (_, i) => i + 1), 'Each unique loser gets a stable unique sequential rank');
    assert.equal(orderedMisses[0].tier, 'second', 'The first miss is the second-place tier');
    assert.equal(orderedMisses[1].tier, 'third', 'The second miss is the third-place tier');
    const firstMiss = orderedMisses[0];
    const repeat = await pool.query('SELECT result FROM treasure_visits WHERE token = $1 AND visit_key_hash = $2', [token, firstMiss.keyHash]);
    assert.deepEqual(repeat.rows[0].result, { state: 'claimed', gapMs: firstMiss.gapMs, rank: firstMiss.rank, tier: firstMiss.tier, message: firstMiss.message }, 'Reload returns the same saved message and rank');
    const wrongKey = randomBytes(32).toString('hex');
    const denied = await pool.query('UPDATE treasure_links SET winner_name = $3 WHERE token = $1 AND winner_key_hash = $2 AND winner_name IS NULL RETURNING token', [token, wrongKey, 'Impostor']);
    assert.equal(denied.rowCount, 0, 'A non-winner key cannot set a winner name');
    const nameWrite = await pool.query('UPDATE treasure_links SET winner_name = $3 WHERE token = $1 AND winner_key_hash = $2 AND winner_name IS NULL RETURNING winner_name', [token, winner.keyHash, 'Concurrent Winner']);
    assert.equal(nameWrite.rows[0].winner_name, 'Concurrent Winner');
    console.log('Passed: 100 simultaneous claims, one winner, 99 misses, winner-only reload recovery, and winner-only name submission.');
  } finally {
    await pool.query('DELETE FROM treasure_links WHERE token = $1', [token]);
    await pool.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
