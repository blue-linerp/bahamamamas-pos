const { getJson, setJson, dbConfigured } = require('./kv-pg');

/**
 * Generic GET/PUT JSON handler for Vercel api/*.js routes.
 * @param {string} key - pos_kv row key
 * @param {{ getDefault?: () => any, validatePut?: (body: any) => boolean }} opts
 */
function createKvHandler(key, opts = {}) {
  const { getDefault, validatePut } = opts;

  return async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json');
    if (!dbConfigured()) {
      res.status(503).json({
        error:
          'Database not configured. Set DATABASE_URL or POSTGRES_URL (or POSTGRES_PRISMA_URL), ' +
          'or the split vars PGHOST, PGUSER, PGDATABASE, PGPASSWORD, and optional PGPORT.',
      });
      return;
    }
    try {
      if (req.method === 'GET') {
        let data = await getJson(key, null);
        if (data == null && getDefault) {
          data = getDefault();
          await setJson(key, data);
        }
        if (data == null) {
          res.status(404).json({ error: 'Not found' });
          return;
        }
        res.status(200).json(data);
        return;
      }
      if (req.method === 'PUT') {
        const body = req.body;
        if (validatePut && !validatePut(body)) {
          res.status(400).json({ error: 'Invalid body' });
          return;
        }
        await setJson(key, body);
        const saved = await getJson(key, body);
        res.status(200).json(saved);
        return;
      }
      res.setHeader('Allow', 'GET, PUT');
      res.status(405).json({ error: 'Method not allowed' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: e.message || String(e) });
    }
  };
}

module.exports = { createKvHandler };
