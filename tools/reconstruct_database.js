const { createClient } = require('@libsql/client');
const xlsx = require('xlsx');
const path = require('path');

const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

const EXCEL_PATH = 'e:/PROJECT/SEMUA WEBSITE/TANI MAKMUR/backups_excel';

async function reconstruct() {
    console.log("🚀 MEMULAI REKONSTRUKSI DATABASE SEKUENSIAL (PER NO DO)...");

    try {
        // 1. WIPE TABLES
        console.log("🧹 Membersihkan tabel lama...");
        await turso.execute("DELETE FROM penebusan");
        await turso.execute("DELETE FROM pengeluaran");
        await turso.execute("DELETE FROM penyaluran");
        await turso.execute("DELETE FROM orders");
        await turso.execute("DELETE FROM products");
        // Catatan: Kiosks (users) tetap dipertahankan agar login tetap bisa dilakukan

        // 2. LOAD EXCEL DATA
        console.log("📂 Membaca file Excel...");
        const readSheet = (file) => xlsx.utils.sheet_to_json(xlsx.readFile(path.join(EXCEL_PATH, file)).Sheets['Data'] || xlsx.readFile(path.join(EXCEL_PATH, file)).Sheets[0]);
        
        const rawProducts = readSheet('Export_Products.xlsx');
        const rawPenebusan = readSheet('Export_Penebusan.xlsx');
        const rawPengeluaran = readSheet('Export_Pengeluaran_DO.xlsx');
        const rawPenyaluran = readSheet('Export_Penyaluran_Kios.xlsx');

        // 3. INPUT PRODUK
        console.log("📦 Menginput data Produk...");
        const productStmts = [];
        rawProducts.forEach(p => {
            const name = String(p['Nama Produk'] || '').toUpperCase().trim();
            let branch = 'SRAGEN'; // Default
            if (name.includes('MAGETAN')) branch = 'MAGETAN';
            else if (name.includes('SRAGEN')) branch = 'SRAGEN';

            productStmts.push({
                sql: "INSERT INTO products (code, name, supplier, buyPrice, price, category, branch) VALUES (?, ?, ?, ?, ?, ?, ?)",
                args: [
                    name,
                    name,
                    String(p['Supplier'] || '').trim(),
                    parseFloat(p['Harga Beli']) || 0,
                    parseFloat(p['Harga Jual']) || 0,
                    'PUPUK',
                    branch
                ]
            });
        });
        await turso.batch(productStmts, 'write');
        console.log(`✅ ${productStmts.length} Produk berhasil diinput.`);

        // 4. SEQUENTIAL PROCESSING PER NO DO
        console.log("🔄 Memproses data per NO DO secara sekuensial...");
        
        // Group raw data for faster access
        const pengeluaranMap = {};
        rawPengeluaran.forEach(p => {
            const doNo = String(p['NO DO'] || '').trim();
            if (!pengeluaranMap[doNo]) pengeluaranMap[doNo] = [];
            pengeluaranMap[doNo].push(p);
        });

        const penyaluranMap = {};
        rawPenyaluran.forEach(p => {
            const doNo = String(p['NO DO'] || '').trim();
            if (!penyaluranMap[doNo]) penyaluranMap[doNo] = [];
            penyaluranMap[doNo].push(p);
        });

        let countPenebusan = 0;
        let countPengeluaran = 0;
        let countPenyaluran = 0;
        let countOrders = 0;

        // Iterate through Penebusan
        for (const pb of rawPenebusan) {
            const doNo = String(pb['NO DO'] || '').trim();
            if (!doNo) continue;

            const stmts = [];

            // A. Input Penebusan
            stmts.push({
                sql: "INSERT OR REPLACE INTO penebusan (\"do\", date, product, qty, harga, total, branch, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                args: [
                    doNo,
                    String(pb['TANGGAL'] || '').trim(),
                    String(pb['PRODUK'] || '').toUpperCase().trim(),
                    parseFloat(pb['QTY (TON)']) || 0,
                    (parseFloat(pb['TOTAL NILAI']) / parseFloat(pb['QTY (TON)'])) || 0,
                    parseFloat(pb['TOTAL NILAI']) || 0,
                    String(pb['KABUPATEN'] || 'SRAGEN').trim().toUpperCase(),
                    String(pb['KETERANGAN'] || '').trim()
                ]
            });
            countPenebusan++;

            // B. Input Pengeluaran (matching DO)
            const matchesEx = pengeluaranMap[doNo] || [];
            matchesEx.forEach((ex, idx) => {
                const exId = `OUT-${doNo}${idx > 0 ? '-' + idx : ''}`;
                stmts.push({
                    sql: "INSERT OR REPLACE INTO pengeluaran (id, date, \"do\", keluar, product, branch) VALUES (?, ?, ?, ?, ?, ?)",
                    args: [
                        exId,
                        String(pb['TANGGAL'] || '').trim(), // Gunakan tanggal penebusan karena file pengeluaran tidak punya tanggal
                        doNo,
                        parseFloat(ex['JUMLAH KELUAR']) || 0,
                        String(pb['PRODUK'] || '').toUpperCase().trim(),
                        String(pb['KABUPATEN'] || 'SRAGEN').trim().toUpperCase()
                    ]
                });
                countPengeluaran++;
            });

            // C. Input Penyaluran & D. Pembayaran (matching DO)
            const matchesPyl = penyaluranMap[doNo] || [];
            matchesPyl.forEach((pyl, idx) => {
                const pylId = String(pyl['NOMOR PENYALURAN'] || `PYL-${doNo}-${idx}`).trim();
                const orderId = `ORD-${pylId}`;
                const totalTagihan = parseFloat(pyl['TOTAL TAGIHAN']) || 0;
                const statusBayarRaw = String(pyl['STATUS BAYAR'] || 'BELUM LUNAS').toUpperCase().trim();
                
                // C. Penyaluran
                stmts.push({
                    sql: "INSERT OR REPLACE INTO penyaluran (id, date, orderId, pengeluaran_id, \"do\", kios, product, qty, driver, nominal, status, statusBayar, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    args: [
                        pylId,
                        String(pyl['TANGGAL'] || '').trim(),
                        orderId,
                        `OUT-${doNo}`,
                        doNo,
                        String(pyl['KIOS'] || '').trim(),
                        String(pyl['PRODUK'] || '').toUpperCase().trim(),
                        parseFloat(pyl['QTY (TON)']) || 0,
                        String(pyl['SOPIR'] || '').trim(),
                        totalTagihan,
                        'DALAM PENGIRIMAN',
                        statusBayarRaw,
                        String(pyl['WILAYAH'] || pb['KABUPATEN'] || 'SRAGEN').trim().toUpperCase()
                    ]
                });
                countPenyaluran++;

                // D. Orders (Pembayaran)
                stmts.push({
                    sql: "INSERT OR REPLACE INTO orders (id, date, product, qty, price, total, branch, kiosk, status, pylId, assignedDO, pengeluaran_id, paidAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    args: [
                        orderId,
                        String(pyl['TANGGAL'] || '').trim(),
                        String(pyl['PRODUK'] || '').toUpperCase().trim(),
                        parseFloat(pyl['QTY (TON)']) || 0,
                        totalTagihan / (parseFloat(pyl['QTY (TON)']) || 1),
                        totalTagihan,
                        String(pyl['WILAYAH'] || pb['KABUPATEN'] || 'SRAGEN').trim().toUpperCase(),
                        String(pyl['KIOS'] || '').trim(),
                        statusBayarRaw === 'LUNAS' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN',
                        pylId,
                        doNo,
                        `OUT-${doNo}`,
                        statusBayarRaw === 'LUNAS' ? totalTagihan : 0
                    ]
                });
                countOrders++;
            });

            // Jalankan batch per DO untuk menjaga sekuensialitas relasional
            if (stmts.length > 0) {
                await turso.batch(stmts, 'write');
                if (countPenebusan % 50 === 0) console.log(`... memproses DO ke-${countPenebusan}`);
            }
        }

        console.log(`\n✅ REKONSTRUKSI SELESAI!`);
        console.log(`📊 Ringkasan Data:`);
        console.log(`- Penebusan: ${countPenebusan}`);
        console.log(`- Pengeluaran: ${countPengeluaran}`);
        console.log(`- Penyaluran: ${countPenyaluran}`);
        console.log(`- Pembayaran (Orders): ${countOrders}`);

    } catch (e) {
        console.error("❌ ERROR FATAL:", e.message);
    }
}

reconstruct();
