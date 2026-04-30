const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

const dir = 'e:/PROJECT/SEMUA WEBSITE/TANI MAKMUR/backups_excel';

function formatDate(excelDate) {
    if (typeof excelDate === 'number') {
        const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    return String(excelDate).trim();
}

async function insertData(table, dataArray) {
    if (!dataArray || dataArray.length === 0) return;
    const allStmts = [];
    for (const row of dataArray) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        const sql = `INSERT OR REPLACE INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
        const values = cols.map(c => {
            let v = row[c];
            return (typeof v === 'object' && v !== null) ? JSON.stringify(v) : v;
        });
        allStmts.push({ sql, args: values });
    }
    const chunkSize = 50;
    for (let i = 0; i < allStmts.length; i += chunkSize) {
        const chunk = allStmts.slice(i, i + chunkSize);
        await turso.batch(chunk, 'write');
    }
    console.log(`✅ Restored ${dataArray.length} rows to ${table}`);
}

async function restore() {
    console.log("Mulai restore database...");
    
    // 1. Kiosks
    try {
        const wb = xlsx.readFile(path.join(dir, 'Export_Kiosks.xlsx'));
        const raw = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const mapped = raw.map((item, i) => {
            const rawName = String(item['NAMA KIOS'] || 'TANPA NAMA ' + i).trim();
            const username = String(item.username || rawName).toLowerCase().replace(/[^a-z0-9]/g, '').trim() + '_' + i;
            return {
                username: username,
                name: rawName,
                role: 'KIOS',
                branch: String(item['KABUPATEN'] || 'MAGETAN').trim().toUpperCase(),
                kecamatan: String(item['KECAMATAN'] || '').trim(),
                desa: String(item['DESA'] || '').trim(),
                pic: String(item['PENANGGUNG JAWAB'] || '').trim(),
                phone: String(item['NOMOR TELEPON'] || '').trim(),
                password: String(item['PASSWORD'] || '123').trim()
            };
        });
        // Default admin
        mapped.push({username: 'admin', name: 'Administrator Utama', role: 'OWNER', branch: 'ALL', password: 'admin'});
        await insertData('users', mapped);
    } catch(e) { console.log("Gagal import Kiosks:", e.message); }

    // 2. Products
    try {
        const wb = xlsx.readFile(path.join(dir, 'Export_Products.xlsx'));
        const raw = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const mapped = raw.map((item, i) => ({
            code: 'PRD-' + Date.now() + '-' + i,
            name: String(item['Nama Produk'] || '').trim(),
            supplier: String(item['Supplier'] || '').trim(),
            buyPrice: parseFloat(item['Harga Beli']) || 0,
            sellPrice: parseFloat(item['Harga Jual']) || 0,
            price: parseFloat(item['Harga Jual']) || 0,
            branch: 'ALL'
        }));
        await insertData('products', mapped);
    } catch(e) { console.log("Gagal import Products:", e.message); }

    // 3. Penebusan
    try {
        const wb = xlsx.readFile(path.join(dir, 'Export_Penebusan.xlsx'));
        const raw = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const mapped = raw.map((item, i) => ({
            do: String(item['NO DO'] || `DO-TEMP-${i}`).trim(),
            date: formatDate(item['TANGGAL'] || ''),
            branch: String(item['KABUPATEN'] || '').trim(),
            kabupaten: String(item['KABUPATEN'] || '').trim(),
            product: String(item['PRODUK'] || '').trim(),
            qty: parseFloat(item['QTY (TON)']) || 0,
            total: parseFloat(item['TOTAL NILAI']) || 0,
            notes: String(item['KETERANGAN'] || '').trim()
        }));
        await insertData('penebusan', mapped);
    } catch(e) { console.log("Gagal import Penebusan:", e.message); }

    // 4. Pengeluaran
    try {
        const wb = xlsx.readFile(path.join(dir, 'Export_Pengeluaran_DO.xlsx'));
        const raw = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const mapped = raw.map((item, i) => ({
            id: 'OUT-' + Date.now() + '-' + i,
            date: formatDate(item['TANGGAL'] || ''),
            do: String(item['NO DO'] || '').trim(),
            keluar: parseFloat(item['JUMLAH KELUAR']) || 0
        }));
        await insertData('pengeluaran', mapped);
    } catch(e) { console.log("Gagal import Pengeluaran:", e.message); }

    // 5. Penyaluran
    try {
        const wb = xlsx.readFile(path.join(dir, 'Export_Penyaluran_Kios.xlsx'));
        const raw = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const mapped = raw.map((item, i) => ({
            id: String(item['NOMOR PENYALURAN'] || 'PYL-' + Date.now() + '-' + i).trim(),
            date: formatDate(item['TANGGAL'] || ''),
            do: String(item['NO DO'] || '').trim(),
            kios: String(item['KIOS'] || '').trim(),
            product: String(item['PRODUK'] || '').trim(),
            qty: parseFloat(item['QTY (TON)']) || 0,
            driver: String(item['SOPIR'] || '').trim(),
            nominal: parseFloat(item['TOTAL TAGIHAN']) || 0,
            statusBayar: String(item['STATUS BAYAR'] || '').trim(),
            branch: String(item['WILAYAH'] || '').trim(),
            status: 'DALAM PENGIRIMAN'
        }));
        await insertData('penyaluran', mapped);
    } catch(e) { console.log("Gagal import Penyaluran:", e.message); }

    // 6. Kas Angkutan
    try {
        const wb = xlsx.readFile(path.join(dir, 'Export_Kas_Angkutan.xlsx'));
        const raw = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const mapped = raw.map((item, i) => ({
            id: 'KA-' + Date.now() + '-' + i,
            date: formatDate(item['TANGGAL'] || ''),
            desc: String(item['KETERANGAN / SOPIR'] || '').trim(),
            noPyl: String(item['DOKUMEN'] || '').trim(),
            masuk: parseFloat(item['MASUK']) || 0,
            keluar: parseFloat(item['KELUAR']) || 0,
            branch: String(item['WILAYAH'] || '').trim(),
            admin: parseFloat(item['ADMIN']) || 0,
            solar: parseFloat(item['SOLAR']) || 0,
            upahSopir: parseFloat(item['UPAH']) || 0,
            uangMakan: parseFloat(item['MAKAN']) || 0,
            palang: parseFloat(item['PALANG']) || 0,
            lembur: parseFloat(item['LEMBUR']) || 0,
            helper: parseFloat(item['HELPER']) || 0,
            lainLain: parseFloat(item['LAIN-LAIN']) || 0,
            status: 'LUNAS'
        }));
        await insertData('kas_angkutan', mapped);
    } catch(e) { console.log("Gagal import Kas Angkutan:", e.message); }

    // 7. Kas Umum
    try {
        const wb = xlsx.readFile(path.join(dir, 'Export_Kas_Umum.xlsx'));
        const raw = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const mapped = raw.map((item, i) => ({
            id: 'KU-' + Date.now() + '-' + i,
            date: formatDate(item['TANGGAL'] || ''),
            desc: String(item['KETERANGAN'] || '').trim(),
            masuk: parseFloat(item['MASUK']) || 0,
            keluar: parseFloat(item['KELUAR']) || 0,
            branch: String(item['KABUPATEN'] || '').trim()
        }));
        await insertData('kas_umum', mapped);
    } catch(e) { console.log("Gagal import Kas Umum:", e.message); }

    console.log("Selesai restore dari Excel.");
}

restore();
