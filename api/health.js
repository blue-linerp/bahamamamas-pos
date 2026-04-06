/**
 * GET /api/health — database wiring check (no secrets in response).
 */
const { getConnectionString, withPool, dbConfigured } = require('../lib/kv-pg');

function maskConnectionString(u) {
  if (!u) return '';
  return u.replace(/:([^:@/]+)@/, ':****@');
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!dbConfigured()) {
    return res.status(200).json({
      ok: false,
      step: 'env',
      message:
        'No Postgres URL found. In Vercel: Project → Settings → Environment Variables — add DATABASE_URL (or POSTGRES_URL) from your Vercel Postgres / Neon dashboard. Enable for Production and redeploy.',
    });
  }

  try {
    await withPool(async (pool) => {
      await pool.query('SELECT 1 AS ok');
    });
    return res.status(200).json({
      ok: true,
      step: 'connect',
      message: 'Database reachable.',
      connectionPreview: maskConnectionString(getConnectionString()),
    });
  } catch (e) {
    return res.status(200).json({
      ok: false,
      step: 'connect',
      message: 'Env is set but connection failed.',
      error: e.message || String(e),
      connectionPreview: maskConnectionString(getConnectionString()),
      hint:
        'Confirm the password, that the DB allows external SSL connections, and the URL is for pooler/direct as your host requires.',
    });
  }
};
