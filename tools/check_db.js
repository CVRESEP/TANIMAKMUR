const Database = require('better-sqlite3');
const db = new Database('data/tanimakmur.db');
console.log('--- PENEBUSAN ---');
console.log(JSON.stringify(db.prepare('SELECT * FROM penebusan').all(), null, 2));
console.log('--- PENGELUARAN ---');
console.log(JSON.stringify(db.prepare('SELECT * FROM pengeluaran').all(), null, 2));
