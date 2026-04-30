const { createClient } = require('@libsql/client');
const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function main() {
    console.log("Memulai rekonstruksi Orders...");
    
    // 1. Alter Table to add paidAmount if not exists
    try {
        await turso.execute('ALTER TABLE orders ADD COLUMN paidAmount REAL DEFAULT 0');
        console.log("Kolom paidAmount berhasil ditambahkan ke orders.");
    } catch(e) {
        if(e.message.includes('duplicate column name')) {
            console.log("Kolom paidAmount sudah ada.");
        } else {
            console.log("Info Alter Table:", e.message);
        }
    }

    // 2. Fetch all penyaluran
    console.log("Mengambil data penyaluran...");
    const pylRes = await turso.execute('SELECT * FROM penyaluran');
    const pylData = pylRes.rows;
    console.log(`Ditemukan ${pylData.length} data penyaluran.`);

    if (pylData.length === 0) {
        console.log("Tidak ada data penyaluran, selesai.");
        return;
    }

    // 3. Prepare inserts for orders
    const orderStmts = [];
    const updatePylStmts = [];

    for (const pyl of pylData) {
        const orderId = 'ORD-' + pyl.id;
        const total = parseFloat(pyl.nominal) || 0;
        const qty = parseFloat(pyl.qty) || 0;
        const price = qty > 0 ? total / qty : 0;
        
        let status = 'MENUNGGU PEMBAYARAN';
        let paidAmount = 0;
        
        if (pyl.statusBayar === 'LUNAS') {
            status = 'LUNAS';
            paidAmount = total;
        }

        orderStmts.push({
            sql: `INSERT OR REPLACE INTO orders (id, date, product, qty, price, total, branch, kiosk, status, pylId, assignedDO, paidAmount) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                orderId, pyl.date, pyl.product, qty, price, total, 
                pyl.branch, pyl.kios, status, pyl.id, pyl.do, paidAmount
            ]
        });

        // Update penyaluran to link to this order
        updatePylStmts.push({
            sql: `UPDATE penyaluran SET orderId = ? WHERE id = ?`,
            args: [orderId, pyl.id]
        });
    }

    // 4. Execute inserts in batches
    console.log("Memasukkan data orders...");
    const chunkSize = 50;
    for (let i = 0; i < orderStmts.length; i += chunkSize) {
        await turso.batch(orderStmts.slice(i, i + chunkSize), 'write');
    }
    console.log(`✅ Berhasil membuat ${orderStmts.length} orders.`);

    console.log("Mengupdate orderId di penyaluran...");
    for (let i = 0; i < updatePylStmts.length; i += chunkSize) {
        await turso.batch(updatePylStmts.slice(i, i + chunkSize), 'write');
    }
    console.log(`✅ Berhasil mengupdate ${updatePylStmts.length} penyaluran.`);
    
    console.log("Selesai!");
}

main().catch(console.error);
