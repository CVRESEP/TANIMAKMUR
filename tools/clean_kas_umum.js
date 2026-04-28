const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function clean() {
    console.log('🧹 Membersihkan data Kas Umum...');
    try {
        const r = await turso.execute("DELETE FROM kas_umum WHERE branch = '' OR branch IS NULL");
        console.log(`✅ Berhasil menghapus ${r.rowsAffected} baris data tanpa wilayah.`);

        const r2 = await turso.execute('SELECT branch, SUM(masuk) as m, SUM(keluar) as k FROM kas_umum GROUP BY branch');
        console.log('\n--- HASIL AKHIR KAS UMUM ---');
        console.table(r2.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

clean();
