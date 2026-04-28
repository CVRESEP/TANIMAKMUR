const Database = require('better-sqlite3');
const db = new Database('data/tanimakmur.db');
const settings = db.prepare('SELECT key FROM settings').all();
console.log('Settings Keys:', settings.map(s => s.key));
db.close();
