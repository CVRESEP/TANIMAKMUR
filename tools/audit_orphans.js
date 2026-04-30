const { createClient } = require('@libsql/client');
const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function main() {
    // 1. Orders without Penyaluran
    const r1 = await turso.execute("SELECT o.id FROM orders o LEFT JOIN penyaluran p ON o.id = p.orderId WHERE p.id IS NULL");
    console.log("Orders without Penyaluran:", r1.rows.length);
    if (r1.rows.length > 0) console.log(r1.rows.slice(0, 5));

    // 2. Penyaluran without Orders
    const r2 = await turso.execute("SELECT p.id FROM penyaluran p LEFT JOIN orders o ON p.orderId = o.id WHERE o.id IS NULL");
    console.log("Penyaluran without Orders:", r2.rows.length);
    if (r2.rows.length > 0) console.log(r2.rows.slice(0, 5));

    // 3. Penyaluran without Pengeluaran
    const r3 = await turso.execute("SELECT p.id, p.pengeluaran_id FROM penyaluran p LEFT JOIN pengeluaran ex ON p.pengeluaran_id = ex.id WHERE ex.id IS NULL");
    console.log("Penyaluran without Pengeluaran:", r3.rows.length);
    if (r3.rows.length > 0) console.log(r3.rows.slice(0, 5));
}
main();
