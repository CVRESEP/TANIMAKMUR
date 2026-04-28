const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data', 'tanimakmur.db'));
console.log('--- Penebusan Schema ---');
console.log(db.prepare('PRAGMA table_info(penebusan)').all());
console.log('--- Pengeluaran Schema ---');
console.log(db.prepare('PRAGMA table_info(pengeluaran)').all());
db.close();
