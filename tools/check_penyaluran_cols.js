const Database = require('better-sqlite3');
const db = new Database('data/tanimakmur.db');
const cols = db.prepare('PRAGMA table_info(penyaluran)').all();
console.log(JSON.stringify(cols.map(c => c.name)));
db.close();
