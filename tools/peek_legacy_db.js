const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join('backups_excel', 'tani_makmur.db');

try {
    const db = new Database(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables in tani_makmur.db:', tables.map(t => t.name).join(', '));
    
    for (const table of tables) {
        if (table.name === 'orders') {
            const count = db.prepare(`SELECT count(*) as count FROM ${table.name}`).get();
            console.log(`\n--- Table: ${table.name} (${count.count} rows) ---`);
            const sample = db.prepare(`SELECT * FROM ${table.name} LIMIT 1`).get();
            console.log('Sample Row:', sample);
        }
    }
} catch (e) {
    console.error('Error reading sqlite db:', e.message);
}
