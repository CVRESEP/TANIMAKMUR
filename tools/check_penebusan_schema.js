const Database = require('better-sqlite3');
const db = new Database('data/tanimakmur.db');
console.log(db.prepare('PRAGMA table_info(penebusan)').all());
db.close();
