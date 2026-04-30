const { createClient } = require('@libsql/client');
const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function main() {
    const usersRes = await turso.execute("SELECT name FROM users WHERE role = 'KIOS'");
    const kiosks = new Set(usersRes.rows.map(r => r.name.toUpperCase().trim()));
    
    const ordersRes = await turso.execute("SELECT DISTINCT kiosk FROM orders");
    const invalid = ordersRes.rows.filter(r => r.kiosk && !kiosks.has(r.kiosk.toUpperCase().trim()));
    
    console.log("Orders with unknown kiosks:", invalid.length);
    if (invalid.length > 0) console.log(invalid.slice(0, 10));

    const pylRes = await turso.execute("SELECT DISTINCT kios FROM penyaluran");
    const invalidPyl = pylRes.rows.filter(r => r.kios && !kiosks.has(r.kios.toUpperCase().trim()));
    console.log("Penyaluran with unknown kiosks:", invalidPyl.length);
    if (invalidPyl.length > 0) console.log(invalidPyl.slice(0, 10));
}
main();
