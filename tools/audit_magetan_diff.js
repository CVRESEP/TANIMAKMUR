const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function audit() {
    console.log('🔍 Menganalisis selisih data Magetan...');
    try {
        const r = await turso.execute("SELECT id, date, branch, masuk, keluar, \"desc\" FROM kas_angkutan WHERE branch = 'MAGETAN'");
        const rows = r.rows;
        
        const totalMasuk = rows.reduce((s, r) => s + (r.masuk || 0), 0);
        const totalKeluar = rows.reduce((s, r) => s + (r.keluar || 0), 0);
        
        console.log(`Current Magetan: Masuk=${totalMasuk}, Keluar=${totalKeluar}`);
        console.log(`Target  Magetan: Masuk=76170000, Keluar=75579166.67`);
        console.log(`Diff: Masuk=${totalMasuk - 76170000}, Keluar=${totalKeluar - 75579166.67}`);
        
        // Cari baris yang kemungkinan duplikat atau salah masuk (misal nominal 2jt)
        const suspects = rows.filter(r => r.masuk === 2000000 || r.masuk === 1000000);
        console.log('\nSuspects (Nominal 1jt/2jt):');
        console.table(suspects);

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

audit();
