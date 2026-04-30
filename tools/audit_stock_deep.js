const { createClient } = require('@libsql/client');

const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function auditStock() {
    console.log("📊 MEMULAI AUDIT STOK TOTAL (SEMUA PRODUK)...");
    
    try {
        const penebusan = (await turso.execute("SELECT * FROM penebusan")).rows;
        const pengeluaran = (await turso.execute("SELECT * FROM pengeluaran")).rows;
        const penyaluran = (await turso.execute("SELECT * FROM penyaluran")).rows;

        // Ambil semua kombinasi Produk & Branch yang ada di transaksi
        const productBranchPairs = new Set();
        penebusan.forEach(x => productBranchPairs.add(`${x.product}|${x.branch}`));
        pengeluaran.forEach(x => productBranchPairs.add(`${x.product}|${x.branch}`));
        penyaluran.forEach(x => productBranchPairs.add(`${x.product}|${x.branch}`));

        const results = [];

        productBranchPairs.forEach(pair => {
            const [prodName, branch] = pair.split('|');
            if (!prodName) return;

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

            if (totalTebus > 0 || totalMasukGudang > 0 || totalSalur > 0) {
                results.push({
                    Branch: branch,
                    Product: prodName,
                    "Total Tebus": totalTebus.toFixed(1),
                    "Masuk Gudang": totalMasukGudang.toFixed(1),
                    "Penyaluran": totalSalur.toFixed(1),
                    "Sisa Tebus": sisaTebus.toFixed(1),
                    "Sisa Gudang": sisaGudang.toFixed(1)
                });
            }
        });

        // Urutkan berdasarkan Branch lalu Product
        results.sort((a, b) => a.Branch.localeCompare(b.Branch) || a.Product.localeCompare(b.Product));

        console.table(results);

    } catch (e) {
        console.error("❌ Gagal audit stok:", e.message);
    }
}

auditStock();
