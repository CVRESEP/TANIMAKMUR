const Database = require('better-sqlite3');
const db = new Database('e:/PROJECT/SEMUA WEBSITE/TANI MAKMUR/data/tanimakmur.db');
try {
    console.log(db.prepare('SELECT COUNT(*) as count FROM orders').get());
    console.log(db.prepare("SELECT COUNT(*) as count FROM orders WHERE status='LUNAS'").get());
    const sample = db.prepare("SELECT * FROM orders WHERE status='LUNAS' LIMIT 1").get();
    console.log(sample);
} catch (e) {
    console.log(e.message);
}
