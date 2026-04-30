const { createClient } = require('@libsql/client');
const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function main() {
    const r = await turso.execute("SELECT do, product, branch FROM pengeluaran WHERE product = '' OR product IS NULL");
    console.log('Pengeluaran with empty product:', r.rows.length);
    if(r.rows.length > 0) console.log(r.rows.slice(0, 10));

    // Also check for Penebusan that might be missing from the summary
    const r2 = await turso.execute("SELECT DISTINCT product, branch FROM penebusan");
    console.log('Distinct Penebusan Product/Branch:', r2.rows.length);
}
main();
