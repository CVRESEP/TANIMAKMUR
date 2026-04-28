const Database = require('better-sqlite3');
const db = new Database('data/tanimakmur.db');
console.log('--- Penyaluran Schema ---');
console.log(db.prepare('PRAGMA table_info(penyaluran)').all());
db.close();
