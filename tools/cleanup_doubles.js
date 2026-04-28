const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function cleanup() {
    console.log('🔍 Mencari duplikat di Pengeluaran DO...');
    try {
        // Hapus data yang memiliki nomor DO, produk, dan Qty yang sama (sisakan 1 ID terkecil)
        const result = await turso.execute('DELETE FROM pengeluaran WHERE id NOT IN (SELECT MIN(id) FROM pengeluaran GROUP BY "do", product, keluar)');
        console.log(`✅ Berhasil menghapus ${result.rowsAffected} data ganda.`);
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        process.exit();
    }
}

cleanup();
