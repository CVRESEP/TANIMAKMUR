const Database = require('better-sqlite3');
const db = new Database('data/tanimakmur.db');
const result = db.prepare("DELETE FROM penebusan WHERE \"do\" = 'DO-2026-002'").run();
console.log('Deleted rows:', result.changes);
