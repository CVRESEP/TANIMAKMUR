const { createClient } = require('@libsql/client');

const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function auditStock() {
    console.log("📊 MEMULAI AUDIT STOK KESELURUHAN...");
    
    try {
        const products = (await turso.execute("SELECT * FROM products")).rows;
        const penebusan = (await turso.execute("SELECT * FROM penebusan")).rows;
        const pengeluaran = (await turso.execute("SELECT * FROM pengeluaran")).rows;
        const penyaluran = (await turso.execute("SELECT * FROM penyaluran")).rows;

        const results = [];

        products.forEach(p => {
            const prodName = p.name;
            const branch = p.branch;

            // 1. Total Penebusan
            const totalTebus = penebusan
                .filter(x => x.product === prodName && x.branch === branch)
                .reduce((s, x) => s + (parseFloat(x.qty) || 0), 0);

            // 2. Total Masuk Gudang (Pengeluaran Supplier)
            const totalMasukGudang = pengeluaran
                .filter(x => x.product === prodName && x.branch === branch)
                .reduce((s, x) => s + (parseFloat(x.keluar) || 0), 0);

            // 3. Total Keluar Gudang (Penyaluran Kios)
            const totalSalur = penyaluran
                .filter(x => x.product === prodName && x.branch === branch && x.status !== 'MENUNGGU PENGIRIMAN')
                .reduce((s, x) => s + (parseFloat(x.qty) || 0), 0);

            const sisaTebus = totalTebus - totalMasukGudang;
            const sisaGudang = totalMasukGudang - totalSalur;

            results.push({
                Branch: branch,
                Product: prodName,
                "Total Tebus": totalTebus.toFixed(1),
                "Masuk Gudang": totalMasukGudang.toFixed(1),
                "Penyaluran": totalSalur.toFixed(1),
                "Sisa Tebus": sisaTebus.toFixed(1),
                "Sisa Gudang": sisaGudang.toFixed(1)
            });
        });

        console.table(results);

        // Ringkasan per Cabang
        const summary = {};
        results.forEach(r => {
            if (!summary[r.Branch]) summary[r.Branch] = { sisaTebus: 0, sisaGudang: 0 };
            summary[r.Branch].sisaTebus += parseFloat(r["Sisa Tebus"]);
            summary[r.Branch].sisaGudang += parseFloat(r["Sisa Gudang"]);
        });
        
        console.log("\n📈 RINGKASAN PER CABANG:");
        Object.keys(summary).forEach(b => {
            console.log(`📍 ${b}: Sisa Tebus = ${summary[b].sisaTebus.toFixed(1)} T, Sisa Gudang = ${summary[b].sisaGudang.toFixed(1)} T`);
        });

    } catch (e) {
        console.error("❌ Gagal audit stok:", e.message);
    }
}

auditStock();
