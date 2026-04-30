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
    if (!excelDate) return new Date().toISOString().split('T')[0];
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
    console.log(`✅ Tersimpan ${dataArray.length} baris ke tabel: ${table}`);
}

async function smartRestore() {
    console.log("=== SMART RESTORE: MEMBANGUN ULANG RELASI DATA ===");
    
    // 0. Bersihkan data lama
    const tablesToWipe = ['penebusan', 'pengeluaran', 'penyaluran', 'orders', 'kas_angkutan', 'kas_umum'];
    for (const t of tablesToWipe) await turso.execute(`DELETE FROM "${t}"`);
    console.log("Data lama telah dibersihkan.");

    // Dictionary untuk menyimpan data agar bisa saling dihubungkan
    const dictPenebusan = {}; 
    const dictPenyaluran = {};

    // 1. PENEBUSAN
    const rawPenebusan = xlsx.utils.sheet_to_json(xlsx.readFile(path.join(dir, 'Export_Penebusan.xlsx')).Sheets['Data']);
    const arrPenebusan = rawPenebusan.map((item, i) => {
        const doNo = String(item['NO DO'] || `DO-TEMP-${i}`).trim();
        const product = String(item['PRODUK'] || '').trim();
        const branch = String(item['KABUPATEN'] || '').trim();
        
        const obj = {
            do: doNo,
            date: formatDate(item['TANGGAL']),
            branch: branch,
            kabupaten: branch,
            product: product,
            qty: parseFloat(item['QTY (TON)']) || 0,
            total: parseFloat(item['TOTAL NILAI']) || 0,
            notes: String(item['KETERANGAN'] || '').trim()
        };
        dictPenebusan[doNo] = obj;
        return obj;
    });
    await insertData('penebusan', arrPenebusan);

    // 2. PENGELUARAN
    const rawPengeluaran = xlsx.utils.sheet_to_json(xlsx.readFile(path.join(dir, 'Export_Pengeluaran_DO.xlsx')).Sheets['Data']);
    const arrPengeluaran = rawPengeluaran.map((item) => {
        const doNo = String(item['NO DO'] || '').trim();
        const pb = dictPenebusan[doNo] || {};
        return {
            id: 'OUT-' + doNo, // KONEKSI 1: ID Pengeluaran didasarkan pada nomor DO
            date: formatDate(item['TANGGAL']),
            do: doNo,
            keluar: parseFloat(item['JUMLAH KELUAR']) || 0,
            product: pb.product || '',
            kabupaten: pb.branch || '',
            branch: pb.branch || ''
        };
    });
    await insertData('pengeluaran', arrPengeluaran);

    // 3. PENYALURAN & ORDERS
    const rawPenyaluran = xlsx.utils.sheet_to_json(xlsx.readFile(path.join(dir, 'Export_Penyaluran_Kios.xlsx')).Sheets['Data']);
    const arrPenyaluran = [];
    const arrOrders = [];

    rawPenyaluran.forEach((item, i) => {
        const doNo = String(item['NO DO'] || '').trim();
        const pylId = String(item['NOMOR PENYALURAN'] || `PYL-TEMP-${i}`).trim();
        const orderId = 'ORD-' + pylId; // KONEKSI 2: Order ID dari Penyaluran ID
        const pengeluaranId = 'OUT-' + doNo; // KONEKSI 3: Terhubung ke Pengeluaran yg benar
        
        const nominal = parseFloat(item['TOTAL TAGIHAN']) || 0;
        const qty = parseFloat(item['QTY (TON)']) || 0;
        const statusBayar = String(item['STATUS BAYAR'] || '').trim().toUpperCase();
        
        let statusOrder = 'MENUNGGU PEMBAYARAN';
        let paidAmount = 0;
        if (statusBayar === 'LUNAS') {
            statusOrder = 'LUNAS';
            paidAmount = nominal;
        }

        // Simpan ke array orders
        arrOrders.push({
            id: orderId,
            date: formatDate(item['TANGGAL']),
            product: String(item['PRODUK'] || '').trim(),
            qty: qty,
            price: qty > 0 ? nominal / qty : 0,
            total: nominal,
            branch: String(item['WILAYAH'] || '').trim(),
            kiosk: String(item['KIOS'] || '').trim(),
            status: statusOrder,
            pylId: pylId,
            assignedDO: doNo,
            pengeluaran_id: pengeluaranId, // KONEKSI 4!
            paidAmount: paidAmount
        });

        // Simpan ke array penyaluran
        const pylObj = {
            id: pylId,
            orderId: orderId, // KONEKSI 5!
            pengeluaran_id: pengeluaranId, // KONEKSI 6!
            do: doNo,
            kios: String(item['KIOS'] || '').trim(),
            product: String(item['PRODUK'] || '').trim(),
            qty: qty,
            driver: String(item['SOPIR'] || '').trim(),
            nominal: nominal,
            statusBayar: statusBayar,
            branch: String(item['WILAYAH'] || '').trim(),
            date: formatDate(item['TANGGAL']),
            status: 'DALAM PENGIRIMAN'
        };
        arrPenyaluran.push(pylObj);
        dictPenyaluran[pylId] = pylObj;
    });
    
    await insertData('orders', arrOrders);
    await insertData('penyaluran', arrPenyaluran);

    // 4. KAS ANGKUTAN
    const rawKasAngkutan = xlsx.utils.sheet_to_json(xlsx.readFile(path.join(dir, 'Export_Kas_Angkutan.xlsx')).Sheets['Data']);
    const arrKasAngkutan = rawKasAngkutan.map((item, i) => {
        const noPyl = String(item['DOKUMEN'] || '').trim();
        const pylRef = dictPenyaluran[noPyl] || {};
        
        return {
            id: 'KA-' + Date.now() + '-' + i,
            date: formatDate(item['TANGGAL']),
            desc: String(item['KETERANGAN / SOPIR'] || '').trim(),
            noPyl: noPyl,
            noDo: pylRef.do || '', // KONEKSI 7: Kas angkutan tahu nomor DO-nya!
            kios: pylRef.kios || '', // KONEKSI 8: Kas angkutan tahu kiosnya!
            sopir: pylRef.driver || '',
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
        };
    });
    await insertData('kas_angkutan', arrKasAngkutan);

    // 5. KAS UMUM
    const rawKasUmum = xlsx.utils.sheet_to_json(xlsx.readFile(path.join(dir, 'Export_Kas_Umum.xlsx')).Sheets['Data']);
    const arrKasUmum = rawKasUmum.map((item, i) => ({
        id: 'KU-' + Date.now() + '-' + i,
        date: formatDate(item['TANGGAL']),
        desc: String(item['KETERANGAN'] || '').trim(),
        masuk: parseFloat(item['MASUK']) || 0,
        keluar: parseFloat(item['KELUAR']) || 0,
        branch: String(item['KABUPATEN'] || '').trim()
    }));
    await insertData('kas_umum', arrKasUmum);

    console.log("=== SMART RESTORE SELESAI ===");
}

smartRestore().catch(console.error);
