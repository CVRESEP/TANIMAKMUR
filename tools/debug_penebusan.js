const Database = require('better-sqlite3');
const db = new Database('data/tanimakmur.db');
const data = db.prepare('SELECT * FROM penebusan').all();
console.log('--- ALL PENEBUSAN ---');
data.forEach(d => console.log(`DO: [${d.do}], QTY: [${d.qty}], BRANCH: [${d.branch}]`));
db.close();
