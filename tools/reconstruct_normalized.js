const { createClient } = require('@libsql/client');
const xlsx = require('xlsx');
const path = require('path');

const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

const EXCEL_PATH = 'e:/PROJECT/SEMUA WEBSITE/TANI MAKMUR/backups_excel';

function normalizeProduct(rawName, branch) {
    const name = String(rawName || '').toUpperCase().trim();
    const isMagetan = branch === 'MAGETAN' || name.includes('MAGETAN');
    const isSragen = branch === 'SRAGEN' || name.includes('SRAGEN') || name.includes('SRG');

    if (name.includes('UREA')) {
        return isMagetan ? 'UREA MAGETAN' : '1. UREA 2026 SRAGEN';
    }
    if (name.includes('PHONSKA') || name.includes('NPK')) {
        return isMagetan ? 'PHONSKA MAGETAN' : '2. NPK 2026 SRAGEN';
    }
    if (name.includes('PETROGANIK') || name.includes('PGANIK') || name.includes('PG ')) {
        return isMagetan ? 'PGANIK MAGETAN' : '4. PETROGANIK SRAGEN';
    }
    if (name.includes('ZA')) {
        return isMagetan ? 'ZA MAGETAN' : '3. ZA 2026 SRAGEN';
    }
    return name;
}

async function reconstruct() {
    console.log("🚀 REKONSTRUKSI DATABASE DENGAN PENYELARASAN PRODUK...");

    try {
        await turso.execute("DELETE FROM penebusan");
        await turso.execute("DELETE FROM pengeluaran");
        await turso.execute("DELETE FROM penyaluran");
        await turso.execute("DELETE FROM orders");
        await turso.execute("DELETE FROM products");

        const readSheet = (file) => xlsx.utils.sheet_to_json(xlsx.readFile(path.join(EXCEL_PATH, file)).Sheets['Data'] || xlsx.readFile(path.join(EXCEL_PATH, file)).Sheets[0]);
        const rawProducts = readSheet('Export_Products.xlsx');
        const rawPenebusan = readSheet('Export_Penebusan.xlsx');
        const rawPengeluaran = readSheet('Export_Pengeluaran_DO.xlsx');
        const rawPenyaluran = readSheet('Export_Penyaluran_Kios.xlsx');

        // 1. Input Produk Standar
        const productStmts = rawProducts.map(p => {
            const name = String(p['Nama Produk'] || '').toUpperCase().trim();
            let branch = name.includes('MAGETAN') ? 'MAGETAN' : 'SRAGEN';
            return {
                sql: "INSERT INTO products (code, name, supplier, buyPrice, price, category, branch) VALUES (?, ?, ?, ?, ?, ?, ?)",
                args: [name, name, String(p['Supplier'] || '').trim(), parseFloat(p['Harga Beli']) || 0, parseFloat(p['Harga Jual']) || 0, 'PUPUK', branch]
            };
        });
        await turso.batch(productStmts, 'write');

        // Maps for lookup
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

        // 2. Sequential per NO DO
        for (const pb of rawPenebusan) {
            const doNo = String(pb['NO DO'] || '').trim();
            if (!doNo) continue;
            const branch = String(pb['KABUPATEN'] || 'SRAGEN').toUpperCase().trim();
            const stdProduct = normalizeProduct(pb['PRODUK'], branch);

            const stmts = [];
            // A. Penebusan
            stmts.push({
                sql: "INSERT OR REPLACE INTO penebusan (\"do\", date, product, qty, harga, total, branch, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                args: [doNo, String(pb['TANGGAL'] || '').trim(), stdProduct, parseFloat(pb['QTY (TON)']) || 0, (parseFloat(pb['TOTAL NILAI'])/parseFloat(pb['QTY (TON)'])) || 0, parseFloat(pb['TOTAL NILAI']) || 0, branch, String(pb['KETERANGAN'] || '').trim()]
            });

            // B. Pengeluaran
            const matchesEx = pengeluaranMap[doNo] || [];
            matchesEx.forEach((ex, idx) => {
                stmts.push({
                    sql: "INSERT OR REPLACE INTO pengeluaran (id, date, \"do\", keluar, product, branch) VALUES (?, ?, ?, ?, ?, ?)",
                    args: [`OUT-${doNo}${idx>0?'-'+idx:''}`, String(pb['TANGGAL'] || '').trim(), doNo, parseFloat(ex['JUMLAH KELUAR']) || 0, stdProduct, branch]
                });
            });

            // C. Penyaluran & D. Orders
            const matchesPyl = penyaluranMap[doNo] || [];
            matchesPyl.forEach((pyl, idx) => {
                const pylId = String(pyl['NOMOR PENYALURAN'] || `PYL-${doNo}-${idx}`).trim();
                const totalTagihan = parseFloat(pyl['TOTAL TAGIHAN']) || 0;
                const statusBayarRaw = String(pyl['STATUS BAYAR'] || 'BELUM LUNAS').toUpperCase().trim();
                const pylBranch = String(pyl['WILAYAH'] || branch).toUpperCase().trim();
                const stdPylProduct = normalizeProduct(pyl['PRODUK'], pylBranch);

                stmts.push({
                    sql: "INSERT OR REPLACE INTO penyaluran (id, date, orderId, pengeluaran_id, \"do\", kios, product, qty, driver, nominal, status, statusBayar, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    args: [pylId, String(pyl['TANGGAL'] || '').trim(), `ORD-${pylId}`, `OUT-${doNo}`, doNo, String(pyl['KIOS'] || '').trim(), stdPylProduct, parseFloat(pyl['QTY (TON)']) || 0, String(pyl['SOPIR'] || '').trim(), totalTagihan, 'DALAM PENGIRIMAN', statusBayarRaw, pylBranch]
                });

                stmts.push({
                    sql: "INSERT OR REPLACE INTO orders (id, date, product, qty, price, total, branch, kiosk, status, pylId, assignedDO, pengeluaran_id, paidAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    args: [`ORD-${pylId}`, String(pyl['TANGGAL'] || '').trim(), stdPylProduct, parseFloat(pyl['QTY (TON)']) || 0, totalTagihan/(parseFloat(pyl['QTY (TON)'])||1), totalTagihan, pylBranch, String(pyl['KIOS'] || '').trim(), statusBayarRaw === 'LUNAS' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN', pylId, doNo, `OUT-${doNo}`, statusBayarRaw === 'LUNAS' ? totalTagihan : 0]
                });
            });

            if (stmts.length > 0) await turso.batch(stmts, 'write');
        }
        console.log("✅ SELESAI!");
    } catch (e) { console.error("❌ ERROR:", e.message); }
}
reconstruct();
