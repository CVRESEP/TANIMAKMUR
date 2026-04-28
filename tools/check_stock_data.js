const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data', 'tanimakmur.db'));

const penebusan = db.prepare('SELECT SUM(qty) as total FROM penebusan').get();
const pengeluaran = db.prepare('SELECT SUM(qty) as total FROM pengeluaran').get();

console.log('Total Penebusan Qty:', penebusan.total);
console.log('Total Pengeluaran Qty:', pengeluaran.total);

db.close();
