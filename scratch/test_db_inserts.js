const { createClient } = require('@libsql/client');
const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function testInsert() {
  const testData = {
    penebusan: {
      do: 'TEST-DO-' + Date.now(),
      date: '2026-04-30',
      product: 'TEST PRODUCT',
      qty: 1,
      harga: 1000,
      total: 1000,
      branch: 'TEST'
    },
    pengeluaran: {
      id: 'TEST-OUT-' + Date.now(),
      do: 'TEST-DO',
      date: '2026-04-30',
      product: 'TEST PRODUCT',
      keluar: 1,
      tebus: 1,
      branch: 'TEST'
    },
    penyaluran: {
      id: 'TEST-PYL-' + Date.now(),
      orderId: 'TEST-ORD',
      kios: 'TEST KIOS',
      product: 'TEST PRODUCT',
      qty: 1,
      branch: 'TEST',
      date: '2026-04-30',
      status: 'TEST',
      "do": 'TEST-DO'
    },
    orders: {
      id: 'TEST-ORD-' + Date.now(),
      date: '2026-04-30',
      product: 'TEST PRODUCT',
      qty: 1,
      price: 1000,
      total: 1000,
      branch: 'TEST',
      kiosk: 'TEST KIOS',
      status: 'TEST'
    }
  };

  for (const [table, data] of Object.entries(testData)) {
    try {
      const cols = Object.keys(data);
      const placeholders = cols.map(() => '?').join(', ');
      const sql = `INSERT OR REPLACE INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
      const values = cols.values();
      await turso.execute({ sql, args: Object.values(data) });
      console.log(`✅ ${table} insert OK`);
      // Cleanup
      if (table === 'penebusan') await turso.execute({ sql: `DELETE FROM "${table}" WHERE "do" = ?`, args: [data.do] });
      else await turso.execute({ sql: `DELETE FROM "${table}" WHERE id = ?`, args: [data.id] });
    } catch (e) {
      console.error(`❌ ${table} insert FAILED:`, e.message);
    }
  }
}

testInsert();
