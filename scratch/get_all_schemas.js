const { createClient } = require('@libsql/client');
const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function run() {
  const tables = ['users', 'products', 'penebusan', 'pengeluaran', 'suppliers', 'settings'];
  for (const t of tables) {
    try {
      const rs = await turso.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${t}'`);
      if (rs.rows.length) console.log(rs.rows[0].sql);
    } catch(e) { console.error(t, e.message); }
  }
}
run();
