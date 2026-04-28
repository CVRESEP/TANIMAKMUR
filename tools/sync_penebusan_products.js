const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function sync() {
    console.log('🔄 Memulai sinkronisasi nama produk Penebusan...');
    try {
        let updateCount = 0;

        const syncList = [
            { old: 'UREA', new: 'UREA MAGETAN', branch: 'MAGETAN' },
            { old: 'UREA', new: '1. UREA 2026 SRAGEN', branch: 'SRAGEN' },
            { old: 'PHONSKA', new: 'PHONSKA MAGETAN', branch: 'MAGETAN' },
            { old: 'PHONSKA SRAGEN', new: 'PHONSKA SRAGEN', branch: 'SRAGEN' },
            { old: 'ZA', new: 'ZA MAGETAN', branch: 'MAGETAN' },
            { old: 'ZA', new: '3. ZA 2026 SRAGEN', branch: 'SRAGEN' },
            { old: 'PETROGANIK', new: 'PGANIK MAGETAN', branch: 'MAGETAN' },
            { old: 'PETROGANIK', new: '4. PETROGANIK SRAGEN', branch: 'SRAGEN' },
            { old: 'NPK', new: '2. NPK 2026 SRAGEN', branch: 'SRAGEN' }
        ];

        for (const item of syncList) {
            // 1. Update Penebusan
            await turso.execute({
                sql: "UPDATE penebusan SET product = ? WHERE (product = ? OR product = ?) AND kabupaten = ?",
                args: [item.new, item.old, item.old + ' ' + item.branch, item.branch]
            });
            
            // 2. Update Pengeluaran
            await turso.execute({
                sql: "UPDATE pengeluaran SET product = ? WHERE (product = ? OR product = ?) AND kabupaten = ?",
                args: [item.new, item.old, item.old + ' ' + item.branch, item.branch]
            });
            
            // 3. Update Penyaluran
            const r3 = await turso.execute({
                sql: "UPDATE penyaluran SET product = ? WHERE (product = ? OR product = ?) AND branch = ?",
                args: [item.new, item.old, item.old + ' ' + item.branch, item.branch]
            });
            updateCount += r3.rowsAffected;
        }

        console.log(`✅ Sinkronisasi SELESAI. Nama produk di Penebusan, Pengeluaran, dan Penyaluran sudah diselaraskan.`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

sync();
