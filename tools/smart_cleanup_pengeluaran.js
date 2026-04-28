const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function repair() {
    console.log('🔧 Memulai perbaikan data pengeluaran ganda...');
    
    try {
        // 1. Ambil semua data pengeluaran untuk mencari duplikat
        const allOut = await turso.execute('SELECT id, "do", product, keluar FROM pengeluaran');
        const groups = {};
        
        allOut.rows.forEach(r => {
            const key = `${r.do}|${r.product}|${r.keluar}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(r.id);
        });

        // 2. Ambil semua pengeluaran_id yang sedang dipakai di penyaluran
        const inUse = await turso.execute('SELECT DISTINCT pengeluaran_id FROM penyaluran');
        const inUseSet = new Set(inUse.rows.map(r => r.pengeluaran_id));

        let deletedCount = 0;
        let updatedLinks = 0;

        for (const key in groups) {
            const ids = groups[key];
            if (ids.length <= 1) continue; // Bukan duplikat

            // Cari apakah ada salah satu ID yang sedang dipakai
            let winnerId = ids.find(id => inUseSet.has(id));
            
            // Jika tidak ada yang dipakai, pilih ID pertama sebagai pemenang
            if (!winnerId) winnerId = ids[0];

            console.log(`> Grup [${key}]: Pemenang ${winnerId}, Duplikat: ${ids.length - 1}`);

            for (const id of ids) {
                if (id === winnerId) continue;

                // Alihkan semua penyaluran yang mungkin menunjuk ke ID yang salah ini ke winnerId
                const up = await turso.execute({
                    sql: 'UPDATE penyaluran SET pengeluaran_id = ? WHERE pengeluaran_id = ?',
                    args: [winnerId, id]
                });
                updatedLinks += up.rowsAffected;

                // Hapus data duplikat yang kalah
                await turso.execute({
                    sql: 'DELETE FROM pengeluaran WHERE id = ?',
                    args: [id]
                });
                deletedCount++;
            }
        }

        console.log(`\n✅ PERBAIKAN SELESAI:`);
        console.log(`- Data ganda dihapus: ${deletedCount}`);
        console.log(`- Link penyaluran diperbaiki: ${updatedLinks}`);

    } catch (e) {
        console.error('❌ Terjadi kesalahan:', e);
    } finally {
        process.exit();
    }
}

repair();
