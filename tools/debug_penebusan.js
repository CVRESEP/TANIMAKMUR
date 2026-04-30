const { createClient } = require('@libsql/client');
const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function main() {
  // 1. Cek skema tabel penebusan
  const schema = await turso.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='penebusan'");
  console.log('=== SKEMA TABEL penebusan ===');
  console.log(schema.rows[0] ? schema.rows[0].sql : 'TABEL TIDAK DITEMUKAN!');

  // 2. Jumlah data sekarang
  const count = await turso.execute('SELECT COUNT(*) as total FROM penebusan');
  console.log('\n=== JUMLAH DATA ===');
  console.log('Total:', count.rows[0].total);

  // 3. Sample data (3 baris pertama)
  const sample = await turso.execute('SELECT * FROM penebusan LIMIT 3');
  console.log('\n=== SAMPLE DATA (3 baris) ===');
  console.log('Kolom tersedia:', sample.columns);
  sample.rows.forEach((r, i) => console.log(`  Row ${i+1}:`, Object.fromEntries(sample.columns.map((c,j) => [c, r[j]]))));

  // 4. Test insert langsung
  console.log('\n=== TEST INSERT PENEBUSAN ===');
  const testData = {
    do: 'TEST-DEBUG-001',
    date: '2026-04-29',
    product: 'PUPUK TEST',
    kabupaten: 'MAGETAN',
    branch: 'MAGETAN',
    qty: 1.5,
    harga: 100000,
    total: 150000,
    productCode: 'TEST01',
    notes: ''
  };

  const cols = Object.keys(testData);
  const placeholders = cols.map(() => '?').join(', ');
  const sql = `INSERT INTO "penebusan" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
  const values = cols.map(c => testData[c]);

  console.log('SQL:', sql);
  console.log('Values:', values);

  try {
    await turso.execute({ sql, args: values });
    console.log('✅ INSERT BERHASIL!');
    // Cleanup
    await turso.execute({ sql: 'DELETE FROM penebusan WHERE "do" = ?', args: ['TEST-DEBUG-001'] });
    console.log('✅ Cleanup berhasil.');
  } catch(err) {
    console.log('❌ INSERT GAGAL:', err.message);
  }
}

main().catch(err => console.error('FATAL ERROR:', err.message));
