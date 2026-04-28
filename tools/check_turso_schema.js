const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function checkSchema() {
    const tables = ['penebusan', 'pengeluaran', 'penyaluran', 'orders', 'kas_angkutan', 'kas_umum'];
    for (const table of tables) {
        console.log(`\n--- Table: ${table} ---`);
        try {
            const rs = await turso.execute(`PRAGMA table_info("${table}")`);
            console.log(rs.rows.map(r => r.name).join(', '));
        } catch (e) {
            console.error(`Error checking ${table}:`, e.message);
        }
    }
}

checkSchema();
