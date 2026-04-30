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

async function sequentialInput() {
    console.log("=== MEMULAI INPUT DATA SEKUENSIAL KE SISTEM ===");
    console.log("Menghubungkan variabel secara hirarkis...");

    // PENEBUSAN (Langkah 1)
    console.log("\n[1/5] Menginput Data Penebusan DO...");
    const rawPenebusan = xlsx.utils.sheet_to_json(xlsx.readFile(path.join(dir, 'Export_Penebusan.xlsx')).Sheets['Data']);
    const arrPenebusan = [];
    const dictPenebusan = {};

    for (let i=0; i<rawPenebusan.length; i++) {
        const item = rawPenebusan[i];
        const doNo = String(item['NO DO'] || `DO-TEMP-${i}`).trim();
        const obj = {
            do: doNo,
            date: formatDate(item['TANGGAL']),
            branch: String(item['KABUPATEN'] || '').trim(),
            kabupaten: String(item['KABUPATEN'] || '').trim(),
            product: String(item['PRODUK'] || '').trim(),
            qty: parseFloat(item['QTY (TON)']) || 0,
            total: parseFloat(item['TOTAL NILAI']) || 0,
            notes: String(item['KETERANGAN'] || '').trim()
        };
        dictPenebusan[doNo] = obj;
        arrPenebusan.push(obj);
    }
    await insertBatch('penebusan', arrPenebusan);
    console.log(`✅ ${arrPenebusan.length} Penebusan berhasil diinput.`);

    // PENGELUARAN (Langkah 2)
    console.log("\n[2/5] Menginput Data Pengeluaran & Menghubungkan ke DO...");
    const rawPengeluaran = xlsx.utils.sheet_to_json(xlsx.readFile(path.join(dir, 'Export_Pengeluaran_DO.xlsx')).Sheets['Data']);
    const arrPengeluaran = [];

    for (let i=0; i<rawPengeluaran.length; i++) {
        const item = rawPengeluaran[i];
        const doNo = String(item['NO DO'] || '').trim();
        const pb = dictPenebusan[doNo] || {};
        arrPengeluaran.push({
            id: 'OUT-' + doNo,
            date: formatDate(item['TANGGAL']),
            do: doNo,
            keluar: parseFloat(item['JUMLAH KELUAR']) || 0,
            product: pb.product || '',
            kabupaten: pb.branch || '',
            branch: pb.branch || ''
        });
    }
    await insertBatch('pengeluaran', arrPengeluaran);
    console.log(`✅ ${arrPengeluaran.length} Pengeluaran berhasil diinput dan dikoneksikan ke DO.`);

    // PENYALURAN & PESANAN/PEMBAYARAN (Langkah 3)
    console.log("\n[3/5] Membuat Pesanan, Menghubungkan ke Penyaluran & Pengeluaran...");
    const rawPenyaluran = xlsx.utils.sheet_to_json(xlsx.readFile(path.join(dir, 'Export_Penyaluran_Kios.xlsx')).Sheets['Data']);
    const arrOrders = [];
    const arrPenyaluran = [];
    const dictPenyaluran = {};

    for (let i=0; i<rawPenyaluran.length; i++) {
        const item = rawPenyaluran[i];
        const doNo = String(item['NO DO'] || '').trim();
        const pylId = String(item['NOMOR PENYALURAN'] || `PYL-TEMP-${i}`).trim();
        const orderId = 'ORD-' + pylId; 
        const pengeluaranId = 'OUT-' + doNo; 
        
        const nominal = parseFloat(item['TOTAL TAGIHAN']) || 0;
        const qty = parseFloat(item['QTY (TON)']) || 0;
        const statusBayar = String(item['STATUS BAYAR'] || '').trim().toUpperCase();
        
        let statusOrder = 'MENUNGGU PEMBAYARAN';
        let paidAmount = 0;
        if (statusBayar === 'LUNAS') {
            statusOrder = 'LUNAS';
            paidAmount = nominal;
        }

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
            pengeluaran_id: pengeluaranId,
            paidAmount: paidAmount
        });

        const pylObj = {
            id: pylId,
            orderId: orderId,
            pengeluaran_id: pengeluaranId,
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
    }
    
    await insertBatch('orders', arrOrders);
    console.log(`✅ ${arrOrders.length} Pesanan/Tagihan berhasil dibuat.`);
    await insertBatch('penyaluran', arrPenyaluran);
    console.log(`✅ ${arrPenyaluran.length} Penyaluran berhasil diinput & dikoneksikan ke Pesanan.`);

    // KAS ANGKUTAN (Langkah 4)
    console.log("\n[4/5] Menginput Kas Angkutan & Menghubungkan ke Penyaluran...");
    const rawKasAngkutan = xlsx.utils.sheet_to_json(xlsx.readFile(path.join(dir, 'Export_Kas_Angkutan.xlsx')).Sheets['Data']);
    const arrKasAngkutan = rawKasAngkutan.map((item, i) => {
        const noPyl = String(item['DOKUMEN'] || '').trim();
        const pylRef = dictPenyaluran[noPyl] || {};
        return {
            id: 'KA-' + Date.now() + '-' + i,
            date: formatDate(item['TANGGAL']),
            desc: String(item['KETERANGAN / SOPIR'] || '').trim(),
            noPyl: noPyl,
            noDo: pylRef.do || '',
            kios: pylRef.kios || '',
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
    await insertBatch('kas_angkutan', arrKasAngkutan);
    console.log(`✅ ${arrKasAngkutan.length} Kas Angkutan berhasil diinput.`);

    // KAS UMUM (Langkah 5)
    console.log("\n[5/5] Menginput Kas Umum...");
    const rawKasUmum = xlsx.utils.sheet_to_json(xlsx.readFile(path.join(dir, 'Export_Kas_Umum.xlsx')).Sheets['Data']);
    const arrKasUmum = rawKasUmum.map((item, i) => ({
        id: 'KU-' + Date.now() + '-' + i,
        date: formatDate(item['TANGGAL']),
        desc: String(item['KETERANGAN'] || '').trim(),
        masuk: parseFloat(item['MASUK']) || 0,
        keluar: parseFloat(item['KELUAR']) || 0,
        branch: String(item['KABUPATEN'] || '').trim()
    }));
    await insertBatch('kas_umum', arrKasUmum);
    console.log(`✅ ${arrKasUmum.length} Kas Umum berhasil diinput.`);

    console.log("\n=== INPUT SEKUENSIAL SELESAI, SEMUA DATA TERKONEKSI ===");
}

async function insertBatch(table, dataArray) {
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
}

sequentialInput().catch(console.error);
