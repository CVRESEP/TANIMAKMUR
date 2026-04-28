/**
 * SCRIPT RESET DATA OPERASIONAL - TANI MAKMUR
 * Menghapus semua transaksi agar bisa di-input ulang secara berurutan.
 * Menjaga data Master (Users, Products, Suppliers) tetap aman.
 */

const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

const TABLES_TO_RESET = [
    'penebusan',
    'pengeluaran',
    'penyaluran',
    'orders',
    'kas_angkutan',
    'kas_umum'
];

async function resetData() {
    console.log('\n\x1b[33m⚠️  MEMULAI PROSES RESET DATA OPERASIONAL...\x1b[0m');
    
    for (const table of TABLES_TO_RESET) {
        try {
            console.log(`[RESET] Menghapus data dari tabel: ${table}...`);
            await turso.execute(`DELETE FROM "${table}"`);
            console.log(`[OK] Tabel ${table} sekarang kosong.`);
        } catch (e) {
            console.error(`[ERROR] Gagal mengosongkan tabel ${table}:`, e.message);
        }
    }

    console.log('\n\x1b[32m✅ PROSES RESET SELESAI.\x1b[0m');
    console.log('\x1b[36mData Master (Users & Products) TETAP TERJAGA.\x1b[0m\n');
}

resetData();
