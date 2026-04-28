const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

const DO_NUM = '3101404136';

async function audit() {
    try {
        console.log(`\n📋 AUDIT DO: ${DO_NUM}\n`);

        // 1. Penebusan
        const pen = await turso.execute({ sql: "SELECT * FROM penebusan WHERE do = ?", args: [DO_NUM] });
        console.log('=== PENEBUSAN (DO master) ===');
        console.table(pen.rows);

        // 2. Pengeluaran
        const kel = await turso.execute({ sql: "SELECT * FROM pengeluaran WHERE do = ?", args: [DO_NUM] });
        console.log('=== PENGELUARAN (stok keluar) ===');
        console.table(kel.rows);

        // 3. Penyaluran terhubung via pengeluaran_id
        if (kel.rows.length > 0) {
            const kelId = kel.rows[0].id;
            const pyl = await turso.execute({ sql: "SELECT * FROM penyaluran WHERE pengeluaran_id = ?", args: [kelId] });
            console.log(`=== PENYALURAN (terhubung pengeluaran_id: ${kelId}) ===`);
            console.table(pyl.rows);

            const totalKeluar = parseFloat(kel.rows[0].keluar) || 0;
            const totalSalur = pyl.rows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
            const sisa = totalKeluar - totalSalur;

            console.log(`\n📊 RINGKASAN:`);
            console.log(`   Keluar (stok masuk gudang) : ${totalKeluar} Ton`);
            console.log(`   Total disalurkan           : ${totalSalur} Ton`);
            console.log(`   Sisa (raw)                 : ${sisa} Ton`);
            console.log(`   Sisa > 0?                  : ${sisa > 0}`);
            console.log(`   Kemungkinan floating point? : ${Math.abs(sisa) < 0.01 ? '✅ YA (floating point issue!)' : '❌ Tidak'}`);
        }

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

audit();
