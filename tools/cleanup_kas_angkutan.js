const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function cleanup() {
    console.log('🔍 Mencari duplikat di Kas Angkutan...');
    try {
        const result = await turso.execute('DELETE FROM kas_angkutan WHERE id NOT IN (SELECT MIN(id) FROM kas_angkutan GROUP BY date, "desc", masuk, keluar, branch)');
        console.log(`✅ Berhasil menghapus ${result.rowsAffected} duplikat di Kas Angkutan.`);
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        process.exit();
    }
}

cleanup();
