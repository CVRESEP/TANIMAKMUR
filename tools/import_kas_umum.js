const XLSX = require('xlsx');
const { createClient } = require('@libsql/client');
const path = require('path');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function importKasUmum() {
    console.log('Importing Kas Umum...');
    const wb = XLSX.readFile(path.join('backups_excel', 'Export_Kas_Umum.xlsx'));
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

    for (const row of data) {
        const id = 'KU-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        await turso.execute({
            sql: 'INSERT OR REPLACE INTO kas_umum (id, date, "desc", masuk, keluar, kabupaten, branch) VALUES (?, ?, ?, ?, ?, ?, ?)',
            args: [
                id,
                String(row['TANGGAL'] || ''),
                String(row['KETERANGAN'] || ''),
                parseFloat(row['MASUK'] || 0),
                parseFloat(row['KELUAR'] || 0),
                String(row['KABUPATEN'] || ''),
                String(row['KABUPATEN'] || '')
            ]
        });
    }
    console.log(`✅ Berhasil import ${data.length} baris Kas Umum.`);
}

importKasUmum();
