const { createClient } = require('@libsql/client');
const turso = createClient({
  url:'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken:'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

async function main() {
    const orders = (await turso.execute("SELECT * FROM orders")).rows;
    const penyaluran = (await turso.execute("SELECT * FROM penyaluran")).rows;

    console.log("=== AUDIT KESELURUHAN ===");
    
    // 1. Status LUNAS tapi paidAmount < total
    const mismatch1 = orders.filter(o => o.status === 'LUNAS' && (parseFloat(o.paidAmount) || 0) < (parseFloat(o.total) || 0));
    console.log("LUNAS tapi paidAmount < total:", mismatch1.length);

    // 2. paidAmount >= total tapi status bukan LUNAS
    const mismatch2 = orders.filter(o => o.status !== 'LUNAS' && (parseFloat(o.paidAmount) || 0) >= (parseFloat(o.total) || 0) && (parseFloat(o.total) || 0) > 0);
    console.log("paidAmount >= total tapi bukan LUNAS:", mismatch2.length);

    // 3. Status Bayar PYL tidak cocok dengan Order status
    const mismatch3 = penyaluran.filter(p => {
        const o = orders.find(ord => ord.id === p.orderId);
        if (!o) return false;
        let ordStatus = o.status;
        if (ordStatus === 'MENUNGGU PEMBAYARAN') ordStatus = 'BELUM LUNAS';
        return p.statusBayar !== ordStatus;
    });
    console.log("Status PYL vs Order mismatch:", mismatch3.length);

    // 4. Cek apakah ada PYL yang nominalnya beda dengan Order total
    const mismatch4 = penyaluran.filter(p => {
        const o = orders.find(ord => ord.id === p.orderId);
        if (!o) return false;
        return Math.abs((parseFloat(p.nominal) || 0) - (parseFloat(o.total) || 0)) > 1;
    });
    console.log("Nominal PYL vs Total Order mismatch:", mismatch4.length);

    // 5. Cek apakah ada PYL yang duplikat NO DO dalam 1 PYL ID? (tidak mungkin tapi cek saja)
    // Cek duplikat orderId di penyaluran
    const orderIdCounts = {};
    penyaluran.forEach(p => {
        orderIdCounts[p.orderId] = (orderIdCounts[p.orderId] || 0) + 1;
    });
    const duplicates = Object.keys(orderIdCounts).filter(id => orderIdCounts[id] > 1);
    console.log("Penyaluran dengan orderId duplikat:", duplicates.length);
}
main();
