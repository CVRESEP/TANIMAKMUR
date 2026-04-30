const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function approveRecords() {
    console.log('--- APPROVING KAS ANGKUTAN RECORDS ---');
    try {
        const res = await turso.execute("UPDATE kas_angkutan SET status = 'DISETUJUI' WHERE status IS NULL OR status = 'MENUNGGU PERSETUJUAN'");
        console.log(`Updated ${res.rowsAffected} records.`);
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        console.log('--- DONE ---');
    }
}

approveRecords();
