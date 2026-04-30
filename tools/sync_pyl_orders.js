const { createClient } = require('@libsql/client');
const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function syncData() {
    console.log("=== MEMULAI SINKRONISASI DATA PEMBAYARAN & PENYALURAN ===");
    
    try {
        // 1. Ambil semua data orders dan penyaluran
        const ordersRes = await turso.execute("SELECT * FROM orders");
        const orders = ordersRes.rows;
        
        const pylRes = await turso.execute("SELECT * FROM penyaluran");
        const penyaluran = pylRes.rows;

        console.log(`Menganalisis ${orders.length} pesanan dan ${penyaluran.length} penyaluran...`);

        const stmts = [];

        // 2. Sinkronkan statusBayar di penyaluran berdasarkan status di orders
        for (const pyl of penyaluran) {
            const order = orders.find(o => o.id === pyl.orderId || o.pylId === pyl.id);
            
            if (order) {
                // Pastikan statusBayar di penyaluran sama dengan status di orders
                let targetStatusBayar = order.status;
                if (targetStatusBayar === 'MENUNGGU PEMBAYARAN') targetStatusBayar = 'BELUM LUNAS';
                
                if (pyl.statusBayar !== targetStatusBayar) {
                    console.log(`Sync PYL ${pyl.id}: ${pyl.statusBayar} -> ${targetStatusBayar}`);
                    stmts.push({
                        sql: "UPDATE penyaluran SET statusBayar = ? WHERE id = ?",
                        args: [targetStatusBayar, pyl.id]
                    });
                }
                
                // Pastikan orderId di penyaluran terisi benar
                if (!pyl.orderId) {
                    stmts.push({
                        sql: "UPDATE penyaluran SET orderId = ? WHERE id = ?",
                        args: [order.id, pyl.id]
                    });
                }
            }
        }

        // 3. Pastikan status order LUNAS jika paidAmount >= total
        for (const ord of orders) {
            const total = parseFloat(ord.total) || 0;
            const paid = parseFloat(ord.paidAmount) || 0;
            
            if (paid >= total && total > 0 && ord.status !== 'LUNAS') {
                console.log(`Fix Order ${ord.id}: Mark as LUNAS (Paid: ${paid}/${total})`);
                stmts.push({
                    sql: "UPDATE orders SET status = 'LUNAS' WHERE id = ?",
                    args: [ord.id]
                });
            }
        }

        if (stmts.length === 0) {
            console.log("Data sudah sinkron. Tidak ada perubahan yang diperlukan.");
        } else {
            console.log(`Menjalankan ${stmts.length} perintah update untuk sinkronisasi...`);
            const chunkSize = 50;
            for (let i = 0; i < stmts.length; i += chunkSize) {
                await turso.batch(stmts.slice(i, i + chunkSize), 'write');
            }
            console.log("✅ Sinkronisasi database selesai.");
        }
    } catch (e) {
        console.error("❌ Gagal melakukan sinkronisasi:", e.message);
    }
}

syncData();
