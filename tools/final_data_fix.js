const { createClient } = require('@libsql/client');
const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function runFixes() {
    console.log("=== MEMULAI PERBAIKAN DATA SISTEM ===");
    
    try {
        const stmts = [];

        // 1. Perbaiki Tanggal Pengeluaran (Ambil dari Penebusan)
        console.log("Sinkronkan tanggal Pengeluaran dengan Penebusan...");
        const penebusan = (await turso.execute("SELECT do, date FROM penebusan")).rows;
        for (const p of penebusan) {
            stmts.push({
                sql: "UPDATE pengeluaran SET date = ? WHERE do = ?",
                args: [p.date, p.do]
            });
        }

        // 2. Tambahkan User AMANAH TANI jika belum ada
        const userExists = await turso.execute("SELECT * FROM users WHERE name = 'AMANAH TANI'");
        if (userExists.rows.length === 0) {
            console.log("Menambahkan user AMANAH TANI...");
            stmts.push({
                sql: "INSERT INTO users (username, password, name, role, branch) VALUES (?, ?, ?, ?, ?)",
                args: ['amanahtani', '123', 'AMANAH TANI', 'KIOS', 'MAGETAN']
            });
        }

        // 3. Sinkronkan Status SELESAI untuk Penyaluran yang sudah LUNAS
        console.log("Sinkronkan status pengiriman (SELESAI) untuk pesanan LUNAS...");
        const lunasOrders = (await turso.execute("SELECT id FROM orders WHERE status = 'LUNAS'")).rows;
        for (const o of lunasOrders) {
            stmts.push({
                sql: "UPDATE penyaluran SET status = 'SELESAI' WHERE orderId = ?",
                args: [o.id]
            });
        }

        if (stmts.length > 0) {
            console.log(`Menjalankan ${stmts.length} perintah perbaikan...`);
            const chunkSize = 50;
            for (let i = 0; i < stmts.length; i += chunkSize) {
                await turso.batch(stmts.slice(i, i + chunkSize), 'write');
            }
            console.log("✅ Perbaikan data selesai.");
        } else {
            console.log("Tidak ada perbaikan yang diperlukan.");
        }
    } catch (e) {
        console.error("❌ Gagal melakukan perbaikan:", e.message);
    }
}

runFixes();
