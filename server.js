/**
 * SQLite API for menu categories/items and staff.
 * Run: npm install && npm start — open http://localhost:3000
 */
const path = require('path');
const fs = require('fs');
const express = require('express');
const Database = require('better-sqlite3');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'pos.db');

const { DEFAULT_MENU, DEFAULT_USERS } = require('./lib/defaults');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function openDb() {
  ensureDataDir();
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position INTEGER NOT NULL,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      partner TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS staff (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin TEXT NOT NULL,
      UNIQUE(name)
    );
    CREATE INDEX IF NOT EXISTS idx_menu_items_cat ON menu_items(category_id);
    CREATE TABLE IF NOT EXISTS pos_kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

function kvGet(db, key) {
  const row = db.prepare('SELECT value FROM pos_kv WHERE key = ?').get(key);
  if (!row) return undefined;
  try {
    return JSON.parse(row.value);
  } catch (e) {
    return undefined;
  }
}

function kvSet(db, key, val) {
  db.prepare('INSERT OR REPLACE INTO pos_kv (key, value) VALUES (?, ?)').run(key, JSON.stringify(val));
}

function defaultPosState() {
  return { queue: [], receipts: [], orderCounter: 0 };
}

function normalizePosState(b) {
  if (!b || typeof b !== 'object') return defaultPosState();
  const oc = b.orderCounter;
  const orderCounter = typeof oc === 'number' && !Number.isNaN(oc) && oc >= 0 ? oc : 0;
  return {
    queue: Array.isArray(b.queue) ? b.queue : [],
    receipts: Array.isArray(b.receipts) ? b.receipts : [],
    orderCounter,
  };
}

function rowCount(db, table) {
  return db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get().c;
}

function seedDefaults(db) {
  if (rowCount(db, 'categories') > 0 || rowCount(db, 'staff') > 0) return;

  const insCat = db.prepare('INSERT INTO categories (position, name) VALUES (?, ?)');
  const insItem = db.prepare(
    'INSERT INTO menu_items (category_id, position, name, description, price, partner) VALUES (?,?,?,?,?,?)'
  );
  const insStaff = db.prepare('INSERT INTO staff (name, role, pin) VALUES (?,?,?)');

  const run = db.transaction(() => {
    DEFAULT_MENU.forEach((sec, si) => {
      const r = insCat.run(si, sec.section);
      const cid = r.lastInsertRowid;
      (sec.items || []).forEach((it, ii) => {
        insItem.run(cid, ii, it.name, it.desc || '', it.price, it.partner ?? null);
      });
    });
    DEFAULT_USERS.forEach((u) => insStaff.run(u.name, u.role, u.pin));
  });
  run();
}

function menuFromDb(db) {
  const cats = db.prepare('SELECT id, name FROM categories ORDER BY position ASC, id ASC').all();
  const itemsStmt = db.prepare(
    'SELECT name, description, price, partner FROM menu_items WHERE category_id = ? ORDER BY position ASC, id ASC'
  );
  return cats.map((c) => {
    const rows = itemsStmt.all(c.id);
    return {
      section: c.name,
      items: rows.map((r) => {
        const item = { name: r.name, desc: r.description, price: r.price };
        if (r.partner) item.partner = r.partner;
        return item;
      }),
    };
  });
}

function replaceMenu(db, menu) {
  if (!Array.isArray(menu)) throw new Error('menu must be an array');
  const delItems = db.prepare('DELETE FROM menu_items');
  const delCats = db.prepare('DELETE FROM categories');
  const insCat = db.prepare('INSERT INTO categories (position, name) VALUES (?, ?)');
  const insItem = db.prepare(
    'INSERT INTO menu_items (category_id, position, name, description, price, partner) VALUES (?,?,?,?,?,?)'
  );

  const run = db.transaction(() => {
    delItems.run();
    delCats.run();
    menu.forEach((sec, si) => {
      const name = typeof sec.section === 'string' ? sec.section.trim() : '';
      if (!name) return;
      const r = insCat.run(si, name);
      const cid = r.lastInsertRowid;
      const items = Array.isArray(sec.items) ? sec.items : [];
      items.forEach((it, ii) => {
        const n = typeof it.name === 'string' ? it.name.trim() : '';
        if (!n) return;
        const price = parseInt(it.price, 10);
        if (Number.isNaN(price) || price < 0) return;
        const desc = typeof it.desc === 'string' ? it.desc : '';
        const partner = it.partner && typeof it.partner === 'string' ? it.partner : null;
        insItem.run(cid, ii, n, desc, price, partner);
      });
    });
  });
  run();
}

function usersFromDb(db) {
  return db.prepare('SELECT name, role, pin FROM staff ORDER BY id ASC').all();
}

function replaceUsers(db, users) {
  if (!Array.isArray(users)) throw new Error('users must be an array');
  const del = db.prepare('DELETE FROM staff');
  const ins = db.prepare('INSERT INTO staff (name, role, pin) VALUES (?,?,?)');
  const run = db.transaction(() => {
    del.run();
    users.forEach((u) => {
      const name = typeof u.name === 'string' ? u.name.trim() : '';
      const role = typeof u.role === 'string' ? u.role : 'staff';
      const pin = typeof u.pin === 'string' ? u.pin : '';
      if (!name || !pin) return;
      ins.run(name, role, pin);
    });
  });
  run();
}

const db = openDb();
seedDefaults(db);

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/menu', (req, res) => {
  try {
    res.json(menuFromDb(db));
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.put('/api/menu', (req, res) => {
  try {
    replaceMenu(db, req.body);
    res.json(menuFromDb(db));
  } catch (e) {
    res.status(400).json({ error: String(e.message) });
  }
});

app.get('/api/users', (req, res) => {
  try {
    res.json(usersFromDb(db));
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.put('/api/users', (req, res) => {
  try {
    replaceUsers(db, req.body);
    res.json(usersFromDb(db));
  } catch (e) {
    res.status(400).json({ error: String(e.message) });
  }
});

app.get('/api/state', (req, res) => {
  try {
    let v = kvGet(db, 'state');
    if (v === undefined) v = defaultPosState();
    else v = normalizePosState(v);
    res.json(v);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.put('/api/state', (req, res) => {
  try {
    const normalized = normalizePosState(req.body);
    kvSet(db, 'state', normalized);
    res.json(kvGet(db, 'state'));
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/audit', (req, res) => {
  try {
    let v = kvGet(db, 'audit');
    if (!Array.isArray(v)) v = [];
    res.json(v);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.put('/api/audit', (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      res.status(400).json({ error: 'audit must be an array' });
      return;
    }
    kvSet(db, 'audit', req.body);
    res.json(kvGet(db, 'audit'));
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/inventory', (req, res) => {
  try {
    let v = kvGet(db, 'inventory');
    if (!v || typeof v !== 'object' || Array.isArray(v)) v = {};
    res.json(v);
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.put('/api/inventory', (req, res) => {
  try {
    const b = req.body;
    if (!b || typeof b !== 'object' || Array.isArray(b)) {
      res.status(400).json({ error: 'inventory must be a JSON object' });
      return;
    }
    kvSet(db, 'inventory', b);
    res.json(kvGet(db, 'inventory'));
  } catch (e) {
    res.status(500).json({ error: String(e.message) });
  }
});

app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ ok: true, step: 'sqlite', message: 'Local SQLite database OK.' });
  } catch (e) {
    res.status(500).json({ ok: false, step: 'sqlite', message: e.message || String(e) });
  }
});

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`POS server at http://localhost:${PORT}  (database: ${DB_PATH})`);
});
