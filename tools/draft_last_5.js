const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function draftLast5() {
    console.log('--- SETTING LAST 5 TO DRAFT ---');
    try {
        // 1. Get the last 5 IDs ordered by date and id desc
        const res = await turso.execute('SELECT id FROM kas_angkutan ORDER BY date DESC, id DESC LIMIT 5');
        const ids = res.rows.map(r => r.id);
        
        console.log(`IDs to draft: ${ids.join(', ')}`);
        
        if (ids.length > 0) {
            const updates = ids.map(id => ({
                sql: "UPDATE kas_angkutan SET status = 'DRAFT' WHERE id = ?",
                args: [id]
            }));
            await turso.batch(updates, 'write');
            console.log('Batch update completed.');
        } else {
            console.log('No records found.');
        }
        console.log('--- DONE ---');
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        console.log('--- EXIT ---');
    }
}

draftLast5();
