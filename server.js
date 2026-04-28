/**
 * TANI MAKMUR - CLOUD DATABASE SERVER
 * Backend: Node.js + Express + Turso (libsql)
 */

const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');
const path = require('path');

// Turso Connection dengan Timeout & Retry
const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

const app = express();
const PORT = 3737;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '100mb' })); // Naikkan limit untuk sync data besar
app.use(express.static(__dirname));

let isConnectedToTurso = true;
let lastError = null;

// ── TURSO KEEPALIVE & HEALTH MONITOR ──────────────────────────────────────────
async function pingTurso(retryCount = 0) {
  try {
    const start = Date.now();
    await turso.execute('SELECT 1');
    const latency = Date.now() - start;
    
    if (!isConnectedToTurso) {
      console.log(`\x1b[32m[DATABASE] ✅ Koneksi pulih (Latency: ${latency}ms).\x1b[0m`);
      isConnectedToTurso = true;
      lastError = null;
    }
  } catch (e) {
    // Jika gagal, coba lagi sampai 3x sebelum benar-benar dianggap putus
    if (retryCount < 3) {
      setTimeout(() => pingTurso(retryCount + 1), 2000);
      return;
    }

    lastError = e.message;
    if (isConnectedToTurso) {
      console.warn('\x1b[31m[DATABASE] ⚠️ Koneksi Cloud Terputus:', e.message, '\x1b[0m');
      isConnectedToTurso = false;
    }
  }
}

// Ping setiap 20 detik (lebih sering agar koneksi tetap panas)
setInterval(pingTurso, 20000);
pingTurso();

// ── API ROUTES ────────────────────────────────────────────────────────────────

app.get('/api/ping', (req, res) => {
  res.json({ 
    ok: true, 
    connected: isConnectedToTurso, 
    error: lastError,
    ts: Date.now() 
  });
});

app.get('/api/load-state', async (req, res) => {
  try {
    const tables = ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'kas_angkutan', 'kas_umum', 'suppliers', 'settings'];
    const state = {};
    
    // Gunakan batch jika didukung untuk efisiensi, atau tetap loop dengan proteksi
    for (const table of tables) {
      const rs = await turso.execute(`SELECT * FROM "${table}"`);
      if (table === 'settings') {
        rs.rows.forEach(row => {
          try { state[row.key] = JSON.parse(row.value); }
          catch { state[row.key] = row.value; }
        });
      } else {
        state[table] = rs.rows;
      }
    }
    isConnectedToTurso = true;
    res.json(state);
  } catch (e) {
    isConnectedToTurso = false;
    lastError = e.message;
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/sync', async (req, res) => {
  const { state } = req.body;
  if (!state) return res.status(400).json({ error: 'State missing' });

  try {
    const tableMap = {
      users: 'users', products: 'products', penebusan: 'penebusan',
      pengeluaran: 'pengeluaran', penyaluran: 'penyaluran', orders: 'orders',
      kas_angkutan: 'kas_angkutan', kas_umum: 'kas_umum', suppliers: 'suppliers',
      drivers: 'drivers'
    };

    // Jalankan sync dalam urutan tertentu
    for (const [stateKey, table] of Object.entries(tableMap)) {
      const rows = state[stateKey];
      if (!Array.isArray(rows)) continue;

      if (['users', 'products'].includes(table) && rows.length === 0) continue;

      const stmts = [`DELETE FROM "${table}"`];
      
      for (const row of rows) {
        const cols = Object.keys(row);
        const placeholders = cols.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
        const values = cols.map(c => {
           let v = row[c];
           return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
        });
        stmts.push({ sql, args: values });
      }
      
      // Execute all inserts for this table in a single batch
      await turso.batch(stmts, 'write');
    }

    // Metadata
    const metadataKeys = ['permissions', 'rowLimits', 'activeBranchFilter', 'settings'];
    for (const key of metadataKeys) {
      if (state[key] !== undefined) {
        const val = JSON.stringify(state[key]);
        await turso.execute({
          sql: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          args: [key, val]
        });
      }
    }

    isConnectedToTurso = true;
    res.json({ ok: true });
  } catch (e) {
    isConnectedToTurso = false;
    lastError = e.message;
    res.status(500).json({ error: e.message });
  }
});

// Notifications
app.post('/api/send-wa', async (req, res) => {
    const { to, message } = req.body;
    try {
      const rs = await turso.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['settings'] });
      if (!rs.rows.length) throw new Error('Settings not found');
      const settings = JSON.parse(rs.rows[0].value);
      const response = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { 'Authorization': settings.wa_gateway_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: to, message })
      });
      res.json(await response.json());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/send-tg', async (req, res) => {
    const { chat_id, message } = req.body;
    try {
      const rs = await turso.execute({ sql: 'SELECT value FROM settings WHERE key = ?', args: ['settings'] });
      if (!rs.rows.length) throw new Error('Settings not found');
      const settings = JSON.parse(rs.rows[0].value);
      const response = await fetch(`https://api.telegram.org/bot${settings.tg_bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: String(chat_id).replace(/[^\d-]/g, ''), text: message })
      });
      res.json(await response.json());
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── ERROR HANDLING ───────────────────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('\x1b[31m[CRITICAL] Uncaught Exception:\x1b[0m', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('\x1b[31m[CRITICAL] Unhandled Rejection:\x1b[0m', reason);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n\x1b[32m🚀 SERVER TANI MAKMUR AKTIF\x1b[0m`);
    console.log(`\x1b[36m🔗 http://localhost:${PORT}/dashboard.html\x1b[0m`);
    console.log(`\x1b[33m💡 Tips: Jika server hang, klik kanan bar judul jendela ini -> Properties -> Matikan "QuickEdit Mode".\x1b[0m\n`);
});
