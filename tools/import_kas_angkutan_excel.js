const xlsx = require('xlsx');
const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function importFromExcel() {
    console.log('📊 Memulai Impor Kas Angkutan (Mapping Header Indonesia)...');
    
    try {
        const workbook = xlsx.readFile('backups_excel/Export_Kas_Angkutan.xlsx');
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        console.log(`📦 Memproses ${rows.length} baris data...`);
        
        // 1. Kosongkan dulu agar tidak duplikat
        await turso.execute('DELETE FROM kas_angkutan');
        
        let count = 0;
        const statements = [];

        for (const row of rows) {
            const id = 'TX-XL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            const date = row['TANGGAL'] || '';
            const desc = row['KETERANGAN / SOPIR'] || '';
            const masuk = parseFloat(row['MASUK']) || 0;
            const keluar = parseFloat(row['KELUAR']) || 0;
            const branch = (row['WILAYAH'] || 'MAGETAN').toUpperCase().trim();
            const noDo = row['DOKUMEN'] || '';
            
            statements.push({
                sql: `INSERT INTO kas_angkutan (id, date, desc, masuk, keluar, branch, kabupaten, noDo, noPyl, sopir, status) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [id, date, desc, masuk, keluar, branch, branch, noDo, '', '', 'DISETUJUI']
            });
        }

        // Jalankan dalam batch besar (per 50 record)
        const chunks = [];
        for (let i = 0; i < statements.length; i += 50) {
            chunks.push(statements.slice(i, i + 50));
        }

        for (let i = 0; i < chunks.length; i++) {
            await turso.batch(chunks[i], 'write');
            count += chunks[i].length;
            process.stdout.write(`\r✅ Berhasil Impor: ${count}/${rows.length}`);
        }

        console.log(`\n\n🎉 PEMULIHAN SELESAI! ${count} data Kas Angkutan berhasil dipulihkan dari Excel.`);
        
    } catch (err) {
        console.error('❌ Gagal mengimpor:', err);
    } finally {
        process.exit();
    }
}

importFromExcel();
