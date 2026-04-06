/**
 * PostgreSQL for Vercel serverless: short-lived Pool per request (avoid stale connections).
 * Env: DATABASE_URL, POSTGRES_URL, SUPABASE_DATABASE_URL, POSTGRES_PRISMA_URL, etc., or PG* split vars.
 */
const { Pool } = require('pg');

function buildUrlFromPgEnv() {
  const host = process.env.PGHOST;
  const user = process.env.PGUSER;
  const database = process.env.PGDATABASE;
  if (!host || !user || !database) return '';
  const port = process.env.PGPORT || '5432';
  const password = process.env.PGPASSWORD != null ? String(process.env.PGPASSWORD) : '';
  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  const d = encodeURIComponent(database);
  return `postgresql://${u}:${p}@${host}:${port}/${d}`;
}

function getConnectionString() {
  return (
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.NEON_DATABASE_URL ||
    process.env.PRISMA_DATABASE_URL ||
    buildUrlFromPgEnv() ||
    ''
  );
}

function dbConfigured() {
  return !!getConnectionString();
}

function isLocalHost(connectionString) {
  if (/localhost|127\.0\.0\.1/.test(connectionString)) return true;
  const h = process.env.PGHOST;
  return !!(h && (/localhost/i.test(h) || h === '127.0.0.1'));
}

/** Run callback with a fresh Pool; always ends the pool (recommended for serverless). */
async function withPool(callback) {
  const connectionString = getConnectionString();
  if (!connectionString) return null;
  const local = isLocalHost(connectionString);
  const pool = new Pool({
    connectionString,
    ssl: local ? false : { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 5000,
  });
  try {
    return await callback(pool);
  } finally {
    await pool.end().catch(() => {});
  }
}

async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pos_kv (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getJson(key, fallback) {
  if (!dbConfigured()) return fallback;
  return await withPool(async (pool) => {
    await ensureSchema(pool);
    const r = await pool.query('SELECT value FROM pos_kv WHERE key = $1', [key]);
    if (r.rows.length === 0) return fallback;
    return r.rows[0].value;
  });
}

async function setJson(key, val) {
  if (!dbConfigured()) throw new Error('No database connection string');
  return await withPool(async (pool) => {
    await ensureSchema(pool);
    await pool.query(
      `INSERT INTO pos_kv (key, value, updated_at) VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, JSON.stringify(val)]
    );
  });
}

module.exports = {
  getConnectionString,
  withPool,
  ensureSchema,
  getJson,
  setJson,
  dbConfigured,
};
