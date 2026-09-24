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
      created_at timestamptz NOT NULL DEFAULT now(), claimed_at timestamptz
    )`);
    await pool.query('INSERT INTO treasure_links (token, title, treasure) VALUES ($1, $2, $3)', [token, 'Race test', 'secret']);
    const results = await Promise.all(Array.from({ length: 100 }, async () => {
      const { rows } = await pool.query(
        'UPDATE treasure_links SET claimed_at = clock_timestamp() WHERE token = $1 AND claimed_at IS NULL RETURNING title, treasure', [token],
      );
      return rows[0] ?? null;
    }));
    assert.equal(results.filter(Boolean).length, 1, 'Exactly one request must receive the treasure');
    assert.equal(results.filter(Boolean)[0].treasure, 'secret');
    assert.equal(results.filter(value => value === null).length, 99);
    console.log('Passed: 100 simultaneous claims, exactly one winner and 99 misses.');
  } finally {
    await pool.query('DELETE FROM treasure_links WHERE token = $1', [token]);
    await pool.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
