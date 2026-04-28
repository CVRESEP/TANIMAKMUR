const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function fix() {
    console.log('🔄 Menyelaraskan cabang produk berdasarkan nama...');
    try {
        const r1 = await turso.execute("UPDATE products SET branch = 'MAGETAN' WHERE name LIKE '%MAGETAN%'");
        console.log(`- Update Magetan: ${r1.rowsAffected} produk.`);
        
        const r2 = await turso.execute("UPDATE products SET branch = 'SRAGEN' WHERE name LIKE '%SRAGEN%'");
        console.log(`- Update Sragen: ${r2.rowsAffected} produk.`);

        const r = await turso.execute("SELECT name, branch FROM products");
        console.table(r.rows);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

fix();
