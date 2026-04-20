/**
 * TANI MAKMUR - LOCAL DATABASE SERVER
 * Backend: Node.js + Express + SQLite (better-sqlite3)
 * Database tersimpan di: ./data/tanimakmur.db
 */

const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Detect local network IP
function getLocalIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}
const LOCAL_IP = getLocalIP();

const app = express();
const PORT = 3737;

// ── Ensure data directory exists ──────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ── Open SQLite database ──────────────────────────────────────────────────────
const DB_PATH = path.join(DATA_DIR, 'tanimakmur.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// ── Create Tables ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    username    TEXT PRIMARY KEY,
    name        TEXT,
    role        TEXT DEFAULT 'KIOS',
    branch      TEXT DEFAULT 'MAGETAN',
    password    TEXT DEFAULT '123',
    kecamatan   TEXT DEFAULT '',
    desa        TEXT DEFAULT '',
    pic         TEXT DEFAULT '',
    phone       TEXT DEFAULT '',
    tg_chat_id  TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS suppliers (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    phone       TEXT DEFAULT '',
    address     TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS products (
    code        TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    unit        TEXT DEFAULT 'Ton',
    buyPrice    REAL DEFAULT 0,
    sellPrice   REAL DEFAULT 0,
    price       REAL DEFAULT 0,
    branch      TEXT DEFAULT 'MAGETAN',
    category    TEXT DEFAULT '',
    supplier    TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS penebusan (
    "do"        TEXT PRIMARY KEY,
    date        TEXT,
    branch      TEXT DEFAULT '',
    kabupaten   TEXT DEFAULT '',
    product     TEXT,
    qty         REAL DEFAULT 0,
    harga       REAL DEFAULT 0,
    total       REAL DEFAULT 0,
    notes       TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS pengeluaran (
    id          TEXT PRIMARY KEY,
    "do"        TEXT,
    date        TEXT,
    product     TEXT,
    keluar      REAL DEFAULT 0,
    tebus       REAL DEFAULT 0,
    kabupaten   TEXT DEFAULT '',
    branch      TEXT DEFAULT '',
    notes       TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS penyaluran (
    id          TEXT PRIMARY KEY,
    orderId     TEXT DEFAULT '',
    kios        TEXT,
    product     TEXT,
    qty         REAL DEFAULT 0,
    branch      TEXT DEFAULT '',
    date        TEXT,
    status      TEXT DEFAULT 'MENUNGGU PENGIRIMAN',
    driver      TEXT DEFAULT '',
    plat        TEXT DEFAULT '',
    pengeluaran_id TEXT DEFAULT '',
    "do"        TEXT DEFAULT '',
    nominal     REAL DEFAULT 0,
    statusBayar TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS orders (
    id          TEXT PRIMARY KEY,
    date        TEXT,
    product     TEXT,
    qty         REAL DEFAULT 0,
    price       REAL DEFAULT 0,
    total       REAL DEFAULT 0,
    branch      TEXT DEFAULT '',
    kiosk       TEXT DEFAULT '',
    status      TEXT DEFAULT 'MENUNGGU PERSETUJUAN',
    pylId       TEXT DEFAULT '',
    assignedDO  TEXT DEFAULT '',
    pengeluaran_id TEXT DEFAULT '',
    proof       TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    plat        TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS kas_angkutan (
    id          TEXT PRIMARY KEY,
    date        TEXT,
    "desc"      TEXT,
    masuk       REAL DEFAULT 0,
    keluar      REAL DEFAULT 0,
    branch      TEXT DEFAULT '',
    kabupaten   TEXT DEFAULT '',
    noDo        TEXT DEFAULT '',
    noPyl       TEXT DEFAULT '',
    sopir       TEXT DEFAULT '',
    kios        TEXT DEFAULT '',
    admin       REAL DEFAULT 0,
    solar       REAL DEFAULT 0,
    upahSopir   REAL DEFAULT 0,
    uangMakan   REAL DEFAULT 0,
    palang      REAL DEFAULT 0,
    lembur      REAL DEFAULT 0,
    helper      REAL DEFAULT 0,
    lainLain    REAL DEFAULT 0,
    status      TEXT DEFAULT 'BELUM DIAJUKAN'
  );

  CREATE TABLE IF NOT EXISTS kas_umum (
    id          TEXT PRIMARY KEY,
    date        TEXT,
    "desc"      TEXT,
    masuk       REAL DEFAULT 0,
    keluar      REAL DEFAULT 0,
    branch      TEXT DEFAULT '',
    kabupaten   TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS settings (
    key         TEXT PRIMARY KEY,
    value       TEXT
  );
`);

// ── Seed admin user if empty ──────────────────────────────────────────────────
const adminExists = db.prepare("SELECT username FROM users WHERE username = 'admin'").get();
if (!adminExists) {
  db.prepare("INSERT OR IGNORE INTO users (username, name, role, branch, password) VALUES (?, ?, ?, ?, ?)")
    .run('admin', 'Administrator Utama', 'OWNER', 'ALL', 'admin');
}

// ── Schema Migrations: add missing columns + fix broken schemas ───────────────
// Fix: penebusan table may have been created with wrong PK ('id' instead of 'do')
// Detect by checking if 'do' column exists as PK
try {
  const penebusanInfo = db.prepare("PRAGMA table_info(penebusan)").all();
  const hasBadSchema = penebusanInfo.some(c => c.name === 'id' && c.pk === 1);
  if (hasBadSchema) {
    console.log('[DB] Fixing penebusan schema: migrating id→do primary key...');
    // Backup existing data
    const existing = db.prepare('SELECT * FROM penebusan').all();
    // Drop & recreate with correct schema
    db.prepare('DROP TABLE penebusan').run();
    db.prepare(`
      CREATE TABLE penebusan (
        "do"        TEXT PRIMARY KEY,
        date        TEXT,
        branch      TEXT DEFAULT '',
        kabupaten   TEXT DEFAULT '',
        product     TEXT,
        qty         REAL DEFAULT 0,
        harga       REAL DEFAULT 0,
        total       REAL DEFAULT 0,
        notes       TEXT DEFAULT ''
      )
    `).run();
    // Restore data (using do field as PK)
    const insertPen = db.prepare(`INSERT OR IGNORE INTO penebusan ("do", date, branch, kabupaten, product, qty, harga, total, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const row of existing) {
      const doVal = row.do || row.id;
      if (doVal) insertPen.run(doVal, row.date, row.branch||'', row.kabupaten||'', row.product, row.qty||0, row.harga||0, row.total||0, row.notes||'');
    }
    console.log(`[DB] penebusan schema fixed. Restored ${existing.length} rows.`);
  }
} catch(e) { console.error('[DB] penebusan migration error:', e.message); }

// Add missing columns to existing tables (safe: try/catch per column)
const migrations = [
  `ALTER TABLE products ADD COLUMN price    REAL DEFAULT 0`,
  `ALTER TABLE products ADD COLUMN branch   TEXT DEFAULT 'MAGETAN'`,
  `ALTER TABLE products ADD COLUMN category TEXT DEFAULT ''`,
  `ALTER TABLE products ADD COLUMN supplier TEXT DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN tg_chat_id TEXT DEFAULT ''`,
  `ALTER TABLE penebusan ADD COLUMN harga      REAL DEFAULT 0`,
  `ALTER TABLE penebusan ADD COLUMN total      REAL DEFAULT 0`,
  `ALTER TABLE penebusan ADD COLUMN notes      TEXT DEFAULT ''`,
  `ALTER TABLE penebusan ADD COLUMN kabupaten  TEXT DEFAULT ''`,
  `ALTER TABLE penebusan ADD COLUMN branch     TEXT DEFAULT ''`,
  `ALTER TABLE pengeluaran ADD COLUMN tebus    REAL DEFAULT 0`,
  `ALTER TABLE pengeluaran ADD COLUMN kabupaten TEXT DEFAULT ''`,
  `ALTER TABLE pengeluaran ADD COLUMN branch   TEXT DEFAULT ''`,
  `ALTER TABLE pengeluaran ADD COLUMN notes    TEXT DEFAULT ''`,
  `ALTER TABLE penyaluran ADD COLUMN nominal     REAL DEFAULT 0`,
  `ALTER TABLE penyaluran ADD COLUMN statusBayar TEXT DEFAULT ''`,
  `ALTER TABLE orders ADD COLUMN pylId          TEXT DEFAULT ''`,
  `ALTER TABLE orders ADD COLUMN assignedDO     TEXT DEFAULT ''`,
  `ALTER TABLE orders ADD COLUMN pengeluaran_id TEXT DEFAULT ''`,
  `ALTER TABLE orders ADD COLUMN proof          TEXT DEFAULT ''`,
  `ALTER TABLE kas_angkutan ADD COLUMN kabupaten   TEXT DEFAULT ''`,
  `ALTER TABLE kas_angkutan ADD COLUMN noDo        TEXT DEFAULT ''`,
  `ALTER TABLE kas_angkutan ADD COLUMN noPyl       TEXT DEFAULT ''`,
  `ALTER TABLE kas_angkutan ADD COLUMN sopir       TEXT DEFAULT ''`,
  `ALTER TABLE kas_angkutan ADD COLUMN kios        TEXT DEFAULT ''`,
  `ALTER TABLE kas_angkutan ADD COLUMN admin       REAL DEFAULT 0`,
  `ALTER TABLE kas_angkutan ADD COLUMN solar       REAL DEFAULT 0`,
  `ALTER TABLE kas_angkutan ADD COLUMN upahSopir   REAL DEFAULT 0`,
  `ALTER TABLE kas_angkutan ADD COLUMN uangMakan   REAL DEFAULT 0`,
  `ALTER TABLE kas_angkutan ADD COLUMN palang      REAL DEFAULT 0`,
  `ALTER TABLE kas_angkutan ADD COLUMN lembur      REAL DEFAULT 0`,
  `ALTER TABLE kas_angkutan ADD COLUMN helper      REAL DEFAULT 0`,
  `ALTER TABLE kas_angkutan ADD COLUMN lainLain    REAL DEFAULT 0`,
  `ALTER TABLE kas_angkutan ADD COLUMN status      TEXT DEFAULT 'BELUM DIAJUKAN'`,
  `ALTER TABLE kas_umum ADD COLUMN kabupaten   TEXT DEFAULT ''`,
  `ALTER TABLE products ADD COLUMN supplier TEXT DEFAULT ''`
];
for (const sql of migrations) {
  try { db.prepare(sql).run(); } catch { /* column already exists — skip */ }
}

// ═════════════════════════════════════════════════════════════════════════════
// GENERIC CRUD HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/** Map table name → primary key field */
const PRIMARY_KEYS = {
  users: 'username',
  products: 'code',
  penebusan: 'do',      // JS uses 'do' as the unique identifier
  pengeluaran: 'id',
  penyaluran: 'id',
  orders: 'id',
  drivers: 'id',
  kas_angkutan: 'id',
  kas_umum: 'id',
  suppliers: 'id'
};

// ═════════════════════════════════════════════════════════════════════════════
// API ROUTES - STATUS
// ═════════════════════════════════════════════════════════════════════════════
app.get('/api/status', (req, res) => {
  const counts = {};
  ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'kas_angkutan', 'kas_umum'].forEach(t => {
    counts[t] = db.prepare(`SELECT COUNT(*) as c FROM "${t}"`).get().c;
  });
  res.json({ ok: true, dbPath: DB_PATH, counts });
});

// ═════════════════════════════════════════════════════════════════════════════
// API ROUTES - BULK IMPORT (used for migration from localStorage)
// ═════════════════════════════════════════════════════════════════════════════
app.post('/api/migrate', (req, res) => {
  const { table, rows } = req.body;
  const ALLOWED = ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'kas_angkutan', 'kas_umum'];
  if (!ALLOWED.includes(table)) return res.status(400).json({ error: 'Tabel tidak valid' });
  if (!Array.isArray(rows) || rows.length === 0) return res.json({ inserted: 0 });

  const pk = PRIMARY_KEYS[table];
  
  const insertMany = db.transaction((items) => {
    let count = 0;
    for (const row of items) {
      if (!row || typeof row !== 'object') continue;
      
      // Clean row: only keep valid column keys
      const cols = Object.keys(row).filter(k => k !== undefined && row[k] !== undefined);
      if (cols.length === 0) continue;

      const placeholders = cols.map(() => '?').join(', ');
      const colNames = cols.map(c => `"${c}"`).join(', ');
      const values = cols.map(c => {
        const v = row[c];
        if (v === null || v === undefined) return null;
        if (typeof v === 'object') return JSON.stringify(v);
        return v;
      });

      try {
        db.prepare(`INSERT OR REPLACE INTO "${table}" (${colNames}) VALUES (${placeholders})`).run(...values);
        count++;
      } catch (e) {
        // Skip rows with schema mismatch
      }
    }
    return count;
  });

  const inserted = insertMany(rows);
  res.json({ ok: true, inserted });
});

// ═════════════════════════════════════════════════════════════════════════════
// API ROUTES - ALL DATA (GET)
// ═════════════════════════════════════════════════════════════════════════════
const TABLES = ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'kas_angkutan', 'kas_umum', 'suppliers'];

TABLES.forEach(table => {
  // GET ALL
  app.get(`/api/${table}`, (req, res) => {
    try {
      const rows = db.prepare(`SELECT * FROM "${table}"`).all();
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET ONE
  app.get(`/api/${table}/:id`, (req, res) => {
    const pk = PRIMARY_KEYS[table];
    const row = db.prepare(`SELECT * FROM "${table}" WHERE "${pk}" = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Tidak ditemukan' });
    res.json(row);
  });

  // CREATE / UPSERT
  app.post(`/api/${table}`, (req, res) => {
    const row = req.body;
    if (!row || typeof row !== 'object') return res.status(400).json({ error: 'Data tidak valid' });

    const cols = Object.keys(row);
    const colNames = cols.map(c => `"${c}"`).join(', ');
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map(c => {
      const v = row[c];
      if (v === null || v === undefined) return null;
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });

    try {
      db.prepare(`INSERT OR REPLACE INTO "${table}" (${colNames}) VALUES (${placeholders})`).run(...values);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // UPDATE
  app.put(`/api/${table}/:id`, (req, res) => {
    const pk = PRIMARY_KEYS[table];
    const row = req.body;
    const cols = Object.keys(row).filter(k => k !== pk);
    if (cols.length === 0) return res.status(400).json({ error: 'Tidak ada field untuk diupdate' });

    const setClause = cols.map(c => `"${c}" = ?`).join(', ');
    const values = cols.map(c => {
      const v = row[c];
      if (v === null || v === undefined) return null;
      if (typeof v === 'object') return JSON.stringify(v);
      return v;
    });
    values.push(req.params.id);

    try {
      db.prepare(`UPDATE "${table}" SET ${setClause} WHERE "${pk}" = ?`).run(...values);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE
  app.delete(`/api/${table}/:id`, (req, res) => {
    const pk = PRIMARY_KEYS[table];
    try {
      db.prepare(`DELETE FROM "${table}" WHERE "${pk}" = ?`).run(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// BULK SAVE (full state sync - replaces entire table)
// ═════════════════════════════════════════════════════════════════════════════
app.post('/api/sync', (req, res) => {
  const { state } = req.body;
  if (!state) return res.status(400).json({ error: 'State tidak ada' });

  const syncAll = db.transaction(() => {
    const tableMap = {
      users: 'users', products: 'products', penebusan: 'penebusan',
      pengeluaran: 'pengeluaran', penyaluran: 'penyaluran', orders: 'orders',
      kas_angkutan: 'kas_angkutan', kas_umum: 'kas_umum', suppliers: 'suppliers'
    };

    for (const [stateKey, table] of Object.entries(tableMap)) {
      const rows = state[stateKey];
      if (!Array.isArray(rows)) continue;

      db.prepare(`DELETE FROM "${table}"`).run();
      for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const colNames = cols.map(c => `"${c}"`).join(', ');
        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map(c => {
          const v = row[c];
          if (v === null || v === undefined) return null;
          if (typeof v === 'object') return JSON.stringify(v);
          return v;
        });
        try {
          db.prepare(`INSERT OR REPLACE INTO "${table}" (${colNames}) VALUES (${placeholders})`).run(...values);
        } catch (e) { /* skip malformed */ }
      }
    }

    // Drivers
    if (Array.isArray(state.drivers)) {
      db.prepare(`DELETE FROM drivers`).run();
      for (const d of state.drivers) {
        if (d.name && d.plat) {
          db.prepare(`INSERT INTO drivers (name, plat) VALUES (?, ?)`).run(d.name, d.plat);
        }
      }
    }

    // Sync other state metadata to settings table
    const metadataKeys = ['permissions', 'rowLimits', 'activeBranchFilter', 'settings'];
    for (const key of metadataKeys) {
      if (state[key] !== undefined) {
        const val = JSON.stringify(state[key]);
        db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, val);
      }
    }
  });

  syncAll();
  res.json({ ok: true });
});

// ═════════════════════════════════════════════════════════════════════════════
// LOAD FULL STATE (for frontend init)
// ═════════════════════════════════════════════════════════════════════════════
app.get('/api/load-state', (req, res) => {
  try {
    const state = {
      users:       db.prepare('SELECT * FROM users').all(),
      products:    db.prepare('SELECT * FROM products').all(),
      penebusan:   db.prepare('SELECT * FROM penebusan').all(),
      pengeluaran: db.prepare('SELECT * FROM pengeluaran').all(),
      penyaluran:  db.prepare('SELECT * FROM penyaluran').all(),
      orders:      db.prepare('SELECT * FROM orders').all(),
      drivers:     db.prepare('SELECT * FROM drivers').all(),
      kas_angkutan: db.prepare('SELECT * FROM kas_angkutan').all(),
      kas_umum:    db.prepare('SELECT * FROM kas_umum').all(),
      suppliers:   db.prepare('SELECT * FROM suppliers').all(),
    };

    // Load metadata from settings table
    const settings = db.prepare('SELECT * FROM settings').all();
    settings.forEach(row => {
      try { state[row.key] = JSON.parse(row.value); }
      catch { state[row.key] = row.value; }
    });

    res.json(state);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Settings CRUD
// ═════════════════════════════════════════════════════════════════════════════
app.get('/api/settings/:key', (req, res) => {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
  if (!row) return res.json({ value: null });
  try { res.json({ value: JSON.parse(row.value) }); }
  catch { res.json({ value: row.value }); }
});

app.post('/api/settings/:key', (req, res) => {
  const value = JSON.stringify(req.body.value);
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.params.key, value);
  res.json({ ok: true });
});

// ═════════════════════════════════════════════════════════════════════════════
// DATABASE RESET (DANGEROUS)
// ═════════════════════════════════════════════════════════════════════════════
app.post('/api/reset-db', (req, res) => {
  try {
    db.transaction(() => {
      TABLES.forEach(t => {
        if (t === 'users') {
          // Keep admin, delete others
          db.prepare("DELETE FROM users WHERE username != 'admin'").run();
        } else if (t === 'drivers') {
          db.prepare("DELETE FROM drivers").run();
          // Reset autoincrement
          db.prepare("DELETE FROM sqlite_sequence WHERE name = 'drivers'").run();
        } else {
          db.prepare(`DELETE FROM "${t}"`).run();
        }
      });
      // Delete settings except permissions (optional)
      db.prepare("DELETE FROM settings WHERE key NOT IN ('permissions', 'rowLimits')").run();
    })();
    res.json({ ok: true, message: 'Database telah dikosongkan' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// WHATSAPP BOT RELAY (via Fonnte)
// ═════════════════════════════════════════════════════════════════════════════
app.post('/api/send-wa', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'Data tidak lengkap' });

  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('settings');
    if (!row) throw new Error('Pengaturan bot belum dikonfigurasi');
    const settings = JSON.parse(row.value);
    const token = settings.wa_gateway_token;
    if (!token) throw new Error('Token bot WA tidak ditemukan');

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: to, message: message })
    });
    const result = await response.json();
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/send-tg', async (req, res) => {
  let { chat_id, message } = req.body;
  if (!chat_id || !message) return res.status(400).json({ error: 'Data tidak lengkap' });

  try {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('settings');
    if (!row) throw new Error('Pengaturan bot belum dikonfigurasi');
    const settings = JSON.parse(row.value);
    const token = settings.tg_bot_token;
    if (!token) throw new Error('Token bot Telegram tidak ditemukan');

    // Sanitasi Chat ID: pastikan hanya angka (dan minus untuk grup)
    const cleanId = String(chat_id).replace(/[^\d-]/g, '').trim();
    
    // Masked token for debugging (only show last 4 chars)
    const tokenMasked = token.length > 8 ? `...${token.slice(-4)}` : '****';
    console.log(`[Telegram API] Menggunakan bot dengan token akhiran: ${tokenMasked}`);
    console.log(`[Telegram API] Mencoba mengirim ke ID: '${cleanId}'`);

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cleanId, text: message })
    });
    const result = await response.json();
    console.log(`[Telegram API Controller] Status: ${result.ok ? '✅ Sukses' : '❌ Gagal'}`);
    if (!result.ok) console.log(`[Telegram API Reason] ${result.description}`);
    res.json(result);
  } catch (e) {
    console.error(`[Telegram API Error] ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n\x1b[32m🚀 SERVER TANI MAKMUR AKTIF\x1b[0m`);
    console.log(`\x1b[36m🔗 Dashboard: http://localhost:${PORT}/dashboard.html\x1b[0m\n`);
});
