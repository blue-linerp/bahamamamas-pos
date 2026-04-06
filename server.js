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

const DEFAULT_MENU = [
  { section: 'Main Meals', items: [
    { name: 'Fish N Chips', price: 160, desc: 'Crispy battered fish with seasoned fries.' },
    { name: 'Banger Mash', price: 140, desc: 'Juicy sausage over creamy mash with gravy.' },
    { name: 'Patty Melt', price: 150, desc: 'Grilled beef, melted cheese, toasted bread.' },
    { name: 'Mexican Taco', price: 125, desc: 'Seasoned meat with fresh, zesty toppings.' },
    { name: 'Spicy Wings', price: 155, desc: 'Saucy wings with a bold, spicy kick.' },
  ]},
  { section: 'Desserts', items: [
    { name: 'New York Cheesecake', price: 135, desc: 'Smooth, rich cheesecake with buttery crust.' },
    { name: 'Sticky Toffee Pudding', price: 130, desc: 'Warm cake topped with sweet toffee sauce.' },
  ]},
  { section: 'Sides', items: [
    { name: 'Mozzarella Sticks', price: 130, desc: 'Crispy outside, gooey melted cheese inside.' },
    { name: 'Fried Pickles', price: 135, desc: 'Tangy pickles fried to golden perfection.' },
    { name: 'Onion Rings', price: 125, desc: 'Thick-cut onions, crispy and golden.' },
    { name: 'Creamy Mac N Cheese', price: 130, desc: 'Rich, cheesy macaroni comfort classic.' },
    { name: 'Sausage Roll', price: 130, desc: 'Flaky pastry stuffed with savory sausage.' },
  ]},
  { section: 'Bottled Beer', items: [
    { name: 'Stella Artois', price: 160, desc: 'Crisp lager with a smooth finish.' },
    { name: 'Miller Lite', price: 140, desc: 'Light beer, easy and refreshing.' },
    { name: 'Coors Lite', price: 130, desc: 'Clean, cold lager with smooth taste.' },
    { name: 'Heineken', price: 165, desc: 'Balanced lager with slight bitterness.' },
    { name: 'Guinness', price: 170, desc: 'Dark stout with creamy, roasted flavor.' },
    { name: 'Modelo Especial', price: 155, desc: 'Smooth lager with rich, full flavor.' },
  ]},
  { section: 'Cocktails', items: [
    { name: 'Long Island Iced Tea', price: 320, desc: 'Strong mix of spirits with citrus.' },
    { name: 'Shirley Temple', price: 200, desc: 'Sweet, fizzy drink with cherry flavor.' },
  ]},
  { section: 'Quick Hits', items: [
    { name: 'Jägerbomb', price: 300, desc: 'Energy drink mixed with herbal liqueur.' },
    { name: 'Lemon Drop Shot', price: 260, desc: 'Sweet, tart citrus vodka shot.' },
    { name: 'Fireball Shot', price: 240, desc: 'Cinnamon whiskey with a fiery kick.' },
    { name: 'Jose Cuervo Shot', price: 250, desc: 'Classic smooth tequila shot.' },
    { name: "Tito's Vodka Shot", price: 275, desc: 'Clean, crisp vodka with smooth finish.' },
  ]},
  { section: 'Top Shelf', items: [
    { name: 'Whiskey', price: 400, desc: 'Premium pour, bold and smooth.' },
  ]},
  { section: 'Block Budz', items: [
    { name: 'Joint', price: 1300, desc: 'Premium joint — see staff for availability.', partner: 'budz' },
    { name: 'Lighter', price: 300, desc: 'Complimentary lighter to go with your purchase.', partner: 'budz' },
  ]},
  { section: 'Sweet Requiem', items: [
    { name: 'Cake', price: 450, desc: 'Signature Sweet Requiem cake slice.', partner: 'requiem' },
    { name: 'Signature Drink', price: 300, desc: 'House-crafted Sweet Requiem beverage.', partner: 'requiem' },
    { name: 'Dessert Platter', price: 700, desc: 'Assorted premium sweets platter.', partner: 'requiem' },
  ]},
];

const DEFAULT_USERS = [
  { name: 'Admin', role: 'admin', pin: '0000' },
];

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
  `);
  return db;
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

app.use(express.static(__dirname));

app.listen(PORT, () => {
  console.log(`POS server at http://localhost:${PORT}  (database: ${DB_PATH})`);
});
