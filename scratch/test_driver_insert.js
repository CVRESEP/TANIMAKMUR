const { createClient } = require('@libsql/client');
const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function testDriverInsert() {
  const data = {
    id: 'DRV-TEST-' + Date.now(),
    name: 'TEST DRIVER',
    plat: 'AD 1234 TEST',
    branch: 'MAGETAN'
  };

  try {
    const cols = Object.keys(data);
    const placeholders = cols.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO "drivers" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
    await turso.execute({ sql, args: Object.values(data) });
    console.log(`✅ Driver insert OK`);
    // Cleanup
    await turso.execute({ sql: `DELETE FROM "drivers" WHERE id = ?`, args: [data.id] });
  } catch (e) {
    console.error(`❌ Driver insert FAILED:`, e.message);
  }
}

testDriverInsert();
