const TURSO_URL = 'https://tanimakmur-cvresep.aws-ap-northeast-1.turso.io';
const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag';

async function checkAllSchemas() {
    const tables = ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'kas_angkutan', 'kas_umum', 'suppliers'];
    const requests = tables.map(t => ({ type: "execute", stmt: { sql: `PRAGMA table_info("${t}")`, args: [] } }));
    
    const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests })
    });
    const data = await res.json();
    
    tables.forEach((t, i) => {
        console.log(`--- ${t} ---`);
        const result = data.results[i].response.result;
        console.log(result.rows.map(r => r[1].value).join(', '));
    });
}

checkAllSchemas();
