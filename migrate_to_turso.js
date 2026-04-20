/**
 * TANI MAKMUR - MIGRATION SCRIPT (WITH TABLE CREATION)
 * Local SQLite -> Turso Cloud
 */

const { createClient } = require('@libsql/client');
const Database = require('better-sqlite3');
const path = require('path');

const TURSO_URL = 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag';

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const localDb = new Database(path.join(__dirname, 'data', 'tanimakmur.db'));

const SCHEMAS = [
  `CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, name TEXT, role TEXT, branch TEXT, password TEXT, kecamatan TEXT, desa TEXT, pic TEXT, phone TEXT, tg_chat_id TEXT)`,
  `CREATE TABLE IF NOT EXISTS suppliers (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT, address TEXT)`,
  `CREATE TABLE IF NOT EXISTS products (code TEXT PRIMARY KEY, name TEXT NOT NULL, unit TEXT, buyPrice REAL, sellPrice REAL, price REAL, branch TEXT, category TEXT, supplier TEXT)`,
  `CREATE TABLE IF NOT EXISTS penebusan ("do" TEXT PRIMARY KEY, date TEXT, branch TEXT, kabupaten TEXT, product TEXT, qty REAL, harga REAL, total REAL, notes TEXT)`,
  `CREATE TABLE IF NOT EXISTS pengeluaran (id TEXT PRIMARY KEY, "do" TEXT, date TEXT, product TEXT, keluar REAL, tebus REAL, kabupaten TEXT, branch TEXT, notes TEXT)`,
  `CREATE TABLE IF NOT EXISTS penyaluran (id TEXT PRIMARY KEY, orderId TEXT, kios TEXT, product TEXT, qty REAL, branch TEXT, date TEXT, status TEXT, driver TEXT, plat TEXT, pengeluaran_id TEXT, "do" TEXT, nominal REAL, statusBayar TEXT)`,
  `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, date TEXT, product TEXT, qty REAL, price REAL, total REAL, branch TEXT, kiosk TEXT, status TEXT, pylId TEXT, assignedDO TEXT, pengeluaran_id TEXT, proof TEXT)`,
  `CREATE TABLE IF NOT EXISTS drivers (id TEXT PRIMARY KEY, name TEXT NOT NULL, plat TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS kas_angkutan (id TEXT PRIMARY KEY, date TEXT, "desc" TEXT, masuk REAL, keluar REAL, branch TEXT, kabupaten TEXT, noDo TEXT, noPyl TEXT, sopir TEXT, kios TEXT, admin REAL, solar REAL, upahSopir REAL, uangMakan REAL, palang REAL, lembur REAL, helper REAL, lainLain REAL, status TEXT)`,
  `CREATE TABLE IF NOT EXISTS kas_umum (id TEXT PRIMARY KEY, date TEXT, "desc" TEXT, masuk REAL, keluar REAL, branch TEXT, kabupaten TEXT)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`
];

const TABLES = ['users', 'suppliers', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'kas_angkutan', 'kas_umum', 'settings'];

async function migrate() {
    console.log('🚀 Memulai Migrasi ke Turso Cloud (dengan pembuatan tabel)...');

    try {
        console.log('🛠 Membuat skema tabel di Turso...');
        for (const sql of SCHEMAS) {
            await turso.execute(sql);
        }
        console.log('✅ Skema tabel siap.');

        for (const table of TABLES) {
            console.log(`📦 Memproses tabel: ${table}...`);
            const rows = localDb.prepare(`SELECT * FROM "${table}"`).all();
            if (rows.length === 0) continue;

            for (const row of rows) {
                const cols = Object.keys(row);
                const placeholders = cols.map(() => '?').join(', ');
                const colNames = cols.map(c => `"${c}"`).join(', ');
                const values = cols.map(c => row[c]);
                await turso.execute({
                    sql: `INSERT OR REPLACE INTO "${table}" (${colNames}) VALUES (${placeholders})`,
                    args: values
                });
            }
            console.log(`✅ Berhasil memindahkan ${rows.length} data ke ${table}.`);
        }
        console.log('\n✨ MIGRASI SELESAI! Semua data Anda sudah aman di Cloud.');
    } catch (err) {
        console.error('\n💥 ERROR:', err.message);
    } finally {
        process.exit();
    }
}

migrate();
