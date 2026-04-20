const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, 'data', 'tanimakmur.db'));
const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('settings');
console.log(row ? row.value : 'No settings found');
db.close();
