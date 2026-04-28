const Database = require('better-sqlite3');
const db = new Database('data/tanimakmur.db');
const rows = db.prepare('SELECT * FROM penyaluran').all();
console.log('--- PENYALURAN ---');
console.log(JSON.stringify(rows, null, 2));
