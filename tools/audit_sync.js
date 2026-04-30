const { createClient } = require('@libsql/client');
const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function main() {
    const r = await turso.execute("SELECT p.id as pyl_id, o.id as order_id, o.paidAmount, o.total, p.statusBayar FROM penyaluran p JOIN orders o ON p.orderId = o.id WHERE p.statusBayar = 'LUNAS' AND o.paidAmount < o.total");
    console.log("LUNAS but paidAmount < total:", r.rows.length);
    if (r.rows.length > 0) console.log(r.rows.slice(0, 5));

    const r2 = await turso.execute("SELECT p.id as pyl_id, o.id as order_id, o.paidAmount, o.total, p.statusBayar FROM penyaluran p JOIN orders o ON p.orderId = o.id WHERE p.statusBayar != 'LUNAS' AND o.status = 'LUNAS'");
    console.log("Order LUNAS but PYL not LUNAS:", r2.rows.length);
    if (r2.rows.length > 0) console.log(r2.rows.slice(0, 5));
}
main();
