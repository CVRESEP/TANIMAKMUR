const { createClient } = require('@libsql/client');
const path = require('path');
const xlsx = require('xlsx');

const TURSO_URL = 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag';

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function importPenebusan() {
    try {
        console.log('Membaca file excel...');
        const filePath = path.join(__dirname, 'tani_makmur_penebusan_2026-04-22.xlsx');
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        console.log(`Ditemukan ${jsonData.length} baris data.`);

        const processedPenebusan = jsonData.map(item => {
            const qtyVal = parseFloat(item['QTY (TON)'] || item.qty || item.QTY || item.jumlah || 0);
            const totalVal = parseFloat(item['TOTAL NILAI'] || item.total || item.TOTAL || 0);
            const hargaVal = parseFloat(item.harga || item.HARGA || 0);
            
            return {
                do: String(item['NO DO'] || item['no do'] || item.do || item.DO || '').toUpperCase().trim(),
                date: String(item['TANGGAL'] || item.tanggal || item.date || item.DATE || '').trim(),
                kabupaten: String(item['KABUPATEN'] || item.kabupaten || item.branch || item.BRANCH || 'MAGETAN').toUpperCase().trim(),
                branch: String(item['KABUPATEN'] || item.kabupaten || item.branch || item.BRANCH || 'MAGETAN').toUpperCase().trim(),
                product: String(item['PRODUK'] || item.product || item.PRODUCT || '').toUpperCase().trim(),
                qty: qtyVal,
                harga: hargaVal,
                total: totalVal,
                notes: String(item['KETERANGAN'] || item.notes || item.NOTES || '').trim(),
            };
        }).filter(p => p.do !== '');

        console.log(`Data valid untuk di-import: ${processedPenebusan.length} baris.`);
        
        const batch = [];
        for (const row of processedPenebusan) {
            batch.push({
                sql: `INSERT OR REPLACE INTO penebusan ("do", "date", "kabupaten", "branch", "product", "qty", "harga", "total", "notes") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [row.do, row.date, row.kabupaten, row.branch, row.product, row.qty, row.harga, row.total, row.notes]
            });
        }

        const chunkSize = 50;
        console.log(`Memasukkan ke Turso dalam potongan ${chunkSize}...`);
        
        for (let i = 0; i < batch.length; i += chunkSize) {
            const chunk = batch.slice(i, i + chunkSize);
            await turso.batch(chunk, 'write');
            console.log(`Berhasil meng-import baris ${i + 1} sampai ${Math.min(i + chunkSize, batch.length)}`);
        }
        
        console.log('✅ SELESAI! Semua data penebusan berhasil masuk ke database.');
    } catch (e) {
        console.error('❌ GAGAL:', e);
    }
}

importPenebusan();
