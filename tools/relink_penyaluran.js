const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function relink() {
    console.log('🔗 Memulai penyambungan ulang link penyaluran yang terputus...');
    
    try {
        // 1. Ambil semua penyaluran
        const pylResult = await turso.execute('SELECT id, "do", pengeluaran_id FROM penyaluran');
        const penyaluran = pylResult.rows;

        // 2. Ambil semua pengeluaran yang tersisa (ID yang selamat dari penghapusan)
        const outResult = await turso.execute('SELECT id, "do" FROM pengeluaran');
        const validOuts = {};
        outResult.rows.forEach(r => {
            // Simpan ID yang masih ada berdasarkan nomor DO
            validOuts[r.do] = r.id;
        });

        let fixedCount = 0;

        for (const p of penyaluran) {
            // Cek apakah pengeluaran_id ini masih ada di tabel pengeluaran
            const exists = Object.values(validOuts).includes(p.pengeluaran_id);
            
            if (!exists && validOuts[p.do]) {
                // Link terputus! Sambungkan ke ID yang masih ada berdasarkan nomor DO yang sama
                const winnerId = validOuts[p.do];
                
                await turso.execute({
                    sql: 'UPDATE penyaluran SET pengeluaran_id = ? WHERE id = ?',
                    args: [winnerId, p.id]
                });
                fixedCount++;
                console.log(`> Fixed: Penyaluran ${p.id} (DO: ${p.do}) -> New ID: ${winnerId}`);
            }
        }

        console.log(`\n✅ BERHASIL: ${fixedCount} link penyaluran telah disambungkan kembali.`);
        console.log(`Stok Anda sekarang seharusnya sudah kembali akurat.`);

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        process.exit();
    }
}

relink();
