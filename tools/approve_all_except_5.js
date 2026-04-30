const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function approveAllExcept5() {
    console.log('--- APPROVING ALL EXCEPT LAST 5 ---');
    try {
        // 1. Get all IDs ordered by date and id desc
        const res = await turso.execute('SELECT id FROM kas_angkutan ORDER BY date DESC, id DESC');
        const allIds = res.rows.map(r => r.id);
        
        console.log(`Total records: ${allIds.length}`);
        
        // 2. Skip the first 5
        const toUpdate = allIds.slice(5);
        console.log(`Updating ${toUpdate.length} records...`);

        // 3. Update in batches of 50
        const chunkSize = 50;
        for (let i = 0; i < toUpdate.length; i += chunkSize) {
            const chunk = toUpdate.slice(i, i + chunkSize);
            const updates = chunk.map(id => ({
                sql: "UPDATE kas_angkutan SET status = 'DISETUJUI' WHERE id = ?",
                args: [id]
            }));
            await turso.batch(updates, 'write');
            console.log(`Chunk ${Math.floor(i/chunkSize) + 1} applied.`);
        }
        console.log('--- ALL UPDATES COMPLETED ---');
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        console.log('--- DONE ---');
    }
}

approveAllExcept5();
