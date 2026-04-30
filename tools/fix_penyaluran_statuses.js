/**
 * TANI MAKMUR - DATA CORRECTION SCRIPT
 * Fixes Penyaluran statuses:
 * 1. 'DALAM PENGIRIMAN' -> 'SELESAI'
 * 2. If linked Order is 'LUNAS' -> 'SELESAI'
 */

const { createClient } = require('@libsql/client');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function fixData() {
    console.log('--- DATA FIX START ---');
    try {
        // 1. Fetch Orders and Penyaluran
        console.log('Fetching data...');
        const ordersRes = await turso.execute('SELECT * FROM orders');
        const penyaluranRes = await turso.execute('SELECT * FROM penyaluran');

        const orders = ordersRes.rows;
        const penyaluran = penyaluranRes.rows;

        console.log(`Found ${orders.length} orders and ${penyaluran.length} penyaluran records.`);

        const updates = [];

        // 2. Process Penyaluran
        for (const pyl of penyaluran) {
            let needsUpdate = false;
            let newStatus = pyl.status;

            // Rule 1: Remove 'DALAM PENGIRIMAN'
            if (pyl.status === 'DALAM PENGIRIMAN') {
                newStatus = 'SELESAI';
                needsUpdate = true;
                console.log(`[FIX] PYL ${pyl.id}: DALAM PENGIRIMAN -> SELESAI`);
            }

            // Rule 2: If LUNAS -> SELESAI
            const linkedOrder = orders.find(o => o.id === pyl.orderId);
            if (linkedOrder && linkedOrder.status === 'LUNAS' && newStatus !== 'SELESAI') {
                newStatus = 'SELESAI';
                needsUpdate = true;
                console.log(`[FIX] PYL ${pyl.id}: Order LUNAS -> SELESAI`);
            }

            if (needsUpdate) {
                updates.push({
                    sql: 'UPDATE penyaluran SET status = ? WHERE id = ?',
                    args: [newStatus, pyl.id]
                });
            }
        }

        if (updates.length > 0) {
            console.log(`Applying ${updates.length} updates...`);
            // Batch update in chunks of 50
            const chunkSize = 50;
            for (let i = 0; i < updates.length; i += chunkSize) {
                const chunk = updates.slice(i, i + chunkSize);
                await turso.batch(chunk, 'write');
                console.log(`Chunk ${Math.floor(i/chunkSize) + 1} applied.`);
            }
            console.log('--- ALL UPDATES COMPLETED ---');
        } else {
            console.log('No records need updating.');
        }

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        console.log('--- DATA FIX END ---');
    }
}

fixData();
