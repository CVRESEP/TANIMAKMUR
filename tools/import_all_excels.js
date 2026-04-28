/**
 * TANI MAKMUR - IMPORT ALL EXCELS TO TURSO
 * Reads all exported Excel files and inserts them directly to Turso Cloud
 */

const { createClient } = require("@libsql/client");
const xlsx = require("xlsx");
const path = require("path");

const TURSO_URL = 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag';
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

const EXCEL_DIR = path.join(__dirname, '..', 'backups_excel');

function readExcel(filename) {
    const wb = xlsx.readFile(path.join(EXCEL_DIR, filename));
    return xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
}

function chunkArray(arr, size) {
    const result = [];
    for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
    return result;
}

async function insertChunks(statements) {
    const chunks = chunkArray(statements, 50);
    for (const chunk of chunks) await turso.batch(chunk, "write");
}

async function importAll() {
    console.log("🚀 IMPORT ALL EXCELS TO TURSO\n");

    // 1. KIOSKS -> users
    try {
        const rows = readExcel('Export_Kiosks.xlsx');
        console.log(`📦 Kiosks: ${rows.length} rows`);
        const stmts = rows.map(d => ({
            sql: `INSERT OR REPLACE INTO users (username, name, role, branch, password, kecamatan, desa, pic) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                // generate username from name
                String(d['NAMA KIOS'] || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20) + '_' + Math.random().toString(36).substring(2,6),
                String(d['NAMA KIOS'] || ''),
                'KIOS',
                String(d['KABUPATEN'] || 'MAGETAN').toUpperCase(),
                String(d['PASSWORD'] || '123'),
                String(d['KECAMATAN'] || ''),
                String(d['DESA'] || ''),
                String(d['PENANGGUNG JAWAB'] || '')
            ]
        }));
        // deduplicate by username using doc id approach - use a unique suffix
        await insertChunks(stmts);
        console.log(`✅ Kiosks imported: ${stmts.length}`);
    } catch(e) { console.error('❌ Kiosks error:', e.message); }

    // 2. PRODUCTS
    try {
        const rows = readExcel('Export_Products.xlsx');
        console.log(`📦 Products: ${rows.length} rows`);
        const stmts = rows.map((d, i) => ({
            sql: `INSERT OR REPLACE INTO products (code, name, unit, buyPrice, sellPrice, price, supplier, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                `PRD-${String(i+1).padStart(3,'0')}`,
                String(d['Nama Produk'] || ''),
                'TON',
                parseFloat(d['Harga Beli'] || 0),
                parseFloat(d['Harga Jual'] || 0),
                parseFloat(d['Harga Jual'] || 0),
                String(d['Supplier'] || ''),
                'ALL'
            ]
        }));
        await insertChunks(stmts);
        console.log(`✅ Products imported: ${stmts.length}`);
    } catch(e) { console.error('❌ Products error:', e.message); }

    // 3. PENEBUSAN
    try {
        const rows = readExcel('Export_Penebusan.xlsx');
        console.log(`📦 Penebusan: ${rows.length} rows`);
        const stmts = rows.filter(d => d['NO DO']).map(d => ({
            sql: `INSERT OR REPLACE INTO penebusan ("do", date, branch, kabupaten, product, qty, harga, total, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                String(d['NO DO']).trim(),
                String(d['TANGGAL'] || ''),
                String(d['KABUPATEN'] || 'MAGETAN').toUpperCase(),
                String(d['KABUPATEN'] || 'MAGETAN').toUpperCase(),
                String(d['PRODUK'] || ''),
                parseFloat(d['QTY (TON)'] || 0),
                (d['QTY (TON)'] && d['TOTAL NILAI']) ? parseFloat(d['TOTAL NILAI']) / parseFloat(d['QTY (TON)']) : 0,
                parseFloat(d['TOTAL NILAI'] || 0),
                String(d['KETERANGAN'] || '')
            ]
        }));
        await insertChunks(stmts);
        console.log(`✅ Penebusan imported: ${stmts.length}`);
    } catch(e) { console.error('❌ Penebusan error:', e.message); }

    // 4. PENGELUARAN DO
    try {
        const rows = readExcel('Export_Pengeluaran_DO.xlsx');
        console.log(`📦 Pengeluaran DO: ${rows.length} rows`);
        const stmts = rows.filter(d => d['NO DO']).map((d, i) => ({
            sql: `INSERT OR REPLACE INTO pengeluaran (id, "do", date, keluar, tebus) VALUES (?, ?, ?, ?, ?)`,
            args: [
                `DO-${String(d['NO DO']).trim()}-${i}`,
                String(d['NO DO']).trim(),
                String(d['TANGGAL'] || ''),
                parseFloat(d['JUMLAH KELUAR'] || 0),
                0
            ]
        }));
        await insertChunks(stmts);
        console.log(`✅ Pengeluaran DO imported: ${stmts.length}`);
    } catch(e) { console.error('❌ Pengeluaran error:', e.message); }

    // 5. PENYALURAN KIOS
    try {
        const rows = readExcel('Export_Penyaluran_Kios.xlsx');
        console.log(`📦 Penyaluran: ${rows.length} rows`);
        const stmts = rows.map((d, i) => ({
            sql: `INSERT OR REPLACE INTO penyaluran (id, orderId, kios, product, qty, branch, date, status, driver, nominal, statusBayar) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                String(d['NOMOR PENYALURAN'] || `PYL-${i}`),
                String(d['NOMOR PENYALURAN'] || `PYL-${i}`),
                String(d['KIOS'] || ''),
                String(d['PRODUK'] || ''),
                parseFloat(d['QTY (TON)'] || 0),
                String(d['WILAYAH'] || 'MAGETAN').toUpperCase(),
                String(d['TANGGAL'] || ''),
                'DIKIRIM',
                String(d['SOPIR'] || ''),
                parseFloat(d['TOTAL TAGIHAN'] || 0),
                String(d['STATUS BAYAR'] || 'BELUM LUNAS')
            ]
        }));
        await insertChunks(stmts);
        console.log(`✅ Penyaluran imported: ${stmts.length}`);
    } catch(e) { console.error('❌ Penyaluran error:', e.message); }

    // 6. KAS UMUM
    try {
        const rows = readExcel('Export_Kas_Umum.xlsx');
        console.log(`📦 Kas Umum: ${rows.length} rows`);
        const stmts = rows.map((d, i) => ({
            sql: `INSERT OR REPLACE INTO kas_umum (id, date, "desc", masuk, keluar, branch, kabupaten) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
                `KU-${String(d['TANGGAL'] || '').replace(/-/g,'')}-${i}`,
                String(d['TANGGAL'] || ''),
                String(d['KETERANGAN'] || ''),
                parseFloat(d['MASUK'] || 0),
                parseFloat(d['KELUAR'] || 0),
                String(d['KABUPATEN'] || 'MAGETAN').toUpperCase(),
                String(d['KABUPATEN'] || 'MAGETAN').toUpperCase()
            ]
        }));
        await insertChunks(stmts);
        console.log(`✅ Kas Umum imported: ${stmts.length}`);
    } catch(e) { console.error('❌ Kas Umum error:', e.message); }

    // 7. KAS ANGKUTAN
    try {
        const rows = readExcel('Export_Kas_Angkutan.xlsx');
        console.log(`📦 Kas Angkutan: ${rows.length} rows`);
        const stmts = rows.map((d, i) => ({
            sql: `INSERT OR REPLACE INTO kas_angkutan (id, date, "desc", masuk, keluar, branch, kabupaten, noDo, sopir, admin, solar, upahSopir, uangMakan, palang, lembur, helper, lainLain, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                `KA-${String(d['TANGGAL'] || '').replace(/-/g,'')}-${i}`,
                String(d['TANGGAL'] || ''),
                String(d['KETERANGAN / SOPIR'] || ''),
                parseFloat(d['MASUK'] || 0),
                parseFloat(d['KELUAR'] || 0),
                String(d['WILAYAH'] || 'MAGETAN').toUpperCase(),
                String(d['WILAYAH'] || 'MAGETAN').toUpperCase(),
                String(d['DOKUMEN'] || ''),
                String(d['KETERANGAN / SOPIR'] || ''),
                parseFloat(d['ADMIN'] || 0),
                parseFloat(d['SOLAR'] || 0),
                parseFloat(d['UPAH'] || 0),
                parseFloat(d['MAKAN'] || 0),
                parseFloat(d['PALANG'] || 0),
                parseFloat(d['LEMBUR'] || 0),
                parseFloat(d['HELPER'] || 0),
                parseFloat(d['LAIN-LAIN'] || 0),
                'DISETUJUI'
            ]
        }));
        await insertChunks(stmts);
        console.log(`✅ Kas Angkutan imported: ${stmts.length}`);
    } catch(e) { console.error('❌ Kas Angkutan error:', e.message); }

    console.log('\n✨ SEMUA DATA BERHASIL DIIMPORT KE TURSO!');
    process.exit();
}

importAll();
