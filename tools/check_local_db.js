const sqlite3 = require('better-sqlite3');
try {
  const db = new sqlite3('e:/PROJECT/SEMUA WEBSITE/TANI MAKMUR/data/tanimakmur.db');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  for (const t of tables) {
    try {
      const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c;
      console.log(t.name + ': ' + count);
    } catch(e) {}
  }
} catch(e) {
  console.log("Error opening DB:", e.message);
}
