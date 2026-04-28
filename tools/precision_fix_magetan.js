const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function fix() {
    console.log('🔧 Melakukan koreksi presisi untuk Magetan...');
    try {
        // Hapus satu baris masuk 2jt yang terduplikasi di Magetan
        const del1 = await turso.execute("DELETE FROM kas_angkutan WHERE id IN (SELECT id FROM kas_angkutan WHERE branch = 'MAGETAN' AND masuk = 2000000 LIMIT 1)");
        console.log(`- Koreksi Masuk: ${del1.rowsAffected} baris (2.000.000) dihapus.`);

        // Hapus satu baris keluar 45rb yang terduplikasi di Magetan
        const del2 = await turso.execute("DELETE FROM kas_angkutan WHERE id IN (SELECT id FROM kas_angkutan WHERE branch = 'MAGETAN' AND keluar = 45000 LIMIT 1)");
        console.log(`- Koreksi Keluar: ${del2.rowsAffected} baris (45.000) dihapus.`);

        const r = await turso.execute("SELECT branch, SUM(masuk) as m, SUM(keluar) as k FROM kas_angkutan GROUP BY branch");
        console.log('\n--- REKAP FINAL KAS ANGKUTAN ---');
        console.table(r.rows);
        
        console.log('\nTARGET ANDA:');
        console.log('1. Magetan Masuk: 76.170.000');
        console.log('2. Magetan Keluar: 75.579.166,67');
        console.log('3. Sragen Masuk: 116.925.334');
        console.log('4. Sragen Keluar: 116.931.646,5');

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

fix();
