const Database = require('better-sqlite3');
const db = new Database('data/tanimakmur.db');

const branches = db.prepare('SELECT DISTINCT branch FROM penebusan').all();
console.log('Branches in Penebusan:', branches);

const data = db.prepare('SELECT * FROM penebusan').all();
console.log('Penebusan Sample:', data.slice(0, 3));

const pen = db.prepare('SELECT * FROM pengeluaran').all();
console.log('Pengeluaran Sample:', pen.slice(0, 3));

db.close();
