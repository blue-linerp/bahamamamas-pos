const { getJson, setJson, dbConfigured } = require('../lib/kv-pg');

function defaultState() {
  return { queue: [], receipts: [], orderCounter: 0 };
}

function normalizeState(b) {
  if (!b || typeof b !== 'object') return defaultState();
  const oc = b.orderCounter;
  const orderCounter = typeof oc === 'number' && !Number.isNaN(oc) && oc >= 0 ? oc : 0;
  return {
    queue: Array.isArray(b.queue) ? b.queue : [],
    receipts: Array.isArray(b.receipts) ? b.receipts : [],
    orderCounter,
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (!dbConfigured()) {
    res.status(503).json({
      error:
        'Database not configured. Set DATABASE_URL or POSTGRES_URL, or PGHOST+PGUSER+PGDATABASE+PGPASSWORD (+ PGPORT).',
    });
    return;
  }
  try {
    if (req.method === 'GET') {
      let data = await getJson('state', null);
      if (data == null) {
        data = defaultState();
        await setJson('state', data);
      } else {
        data = normalizeState(data);
      }
      res.status(200).json(data);
      return;
    }
    if (req.method === 'PUT') {
      const normalized = normalizeState(req.body);
      await setJson('state', normalized);
      res.status(200).json(await getJson('state', normalized));
      return;
    }
    res.setHeader('Allow', 'GET, PUT');
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || String(e) });
  }
};
