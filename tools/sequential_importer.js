const XLSX = require('xlsx');
const { createClient } = require('@libsql/client');
const path = require('path');

const turso = createClient({
  url: 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag'
});

const EXCEL_DIR = 'backups_excel';

function readExcel(filename) {
    const wb = XLSX.readFile(path.join(EXCEL_DIR, filename));
    return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
}

async function startImport() {
    console.log('\n\x1b[32m🚀 MEMULAI IMPORT DATA BERURUTAN (V3 - ROBUST MODE)\x1b[0m');
    
    const rawPenebusan = readExcel('Export_Penebusan.xlsx');
    const rawPengeluaran = readExcel('Export_Pengeluaran_DO.xlsx');
    const rawPenyaluran = readExcel('Export_Penyaluran_Kios.xlsx');
    const rawKasAngkutan = readExcel('Export_Kas_Angkutan.xlsx');

    let countPenebusan = 0;
    let countPengeluaran = 0;
    let countPenyaluran = 0;

    for (const p of rawPenebusan) {
        const doNum = String(p['NO DO'] || p['do'] || '').trim();
        if (!doNum) continue;

        try {
            console.log(`\x1b[33mImporting DO: ${doNum}\x1b[0m`);

            // A. Penebusan
            const penebusanArgs = [
                doNum, 
                String(p['TANGGAL'] || p['date'] || ''), 
                String(p['KABUPATEN'] || p['kabupaten'] || ''), 
                String(p['KABUPATEN'] || p['branch'] || ''),
                String(p['PRODUK'] || p['product'] || ''), 
                parseFloat(p['QTY (TON)'] || p['qty'] || 0), 
                parseFloat(p['TOTAL NILAI'] || p['total'] || 0), 
                String(p['KETERANGAN'] || p['notes'] || '')
            ];

            await turso.execute({
                sql: 'INSERT OR REPLACE INTO penebusan ("do", date, kabupaten, branch, product, qty, total, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                args: penebusanArgs
            });
            countPenebusan++;

            // B. Pengeluaran
            const relatedOut = rawPengeluaran.filter(out => String(out['NO DO'] || '').trim() === doNum);
            const pengeluaranIds = [];

            for (const out of relatedOut) {
                const outId = 'OUT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
                const outArgs = [
                    outId,
                    doNum,
                    String(out['TANGGAL'] || out['date'] || p['TANGGAL'] || ''),
                    String(p['PRODUK'] || p['product'] || ''),
                    parseFloat(out['JUMLAH KELUAR'] || out['keluar'] || 0),
                    String(p['KABUPATEN'] || p['kabupaten'] || ''),
                    String(p['KABUPATEN'] || p['branch'] || '')
                ];

                await turso.execute({
                    sql: 'INSERT OR REPLACE INTO pengeluaran (id, "do", date, product, keluar, kabupaten, branch) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    args: outArgs
                });
                pengeluaranIds.push({ id: outId, qty: parseFloat(out['JUMLAH KELUAR'] || 0), used: 0 });
                countPengeluaran++;
            }

            // C. Penyaluran
            const relatedSalur = rawPenyaluran.filter(s => String(s['NO DO'] || '').trim() === doNum);
            
            for (const s of relatedSalur) {
                const salurId = String(s['NOMOR PENYALURAN'] || s['id'] || ('PYL-' + Date.now() + '-' + Math.floor(Math.random() * 1000)));
                
                let targetOutId = pengeluaranIds[0]?.id || null;
                for (const outObj of pengeluaranIds) {
                    if (outObj.used < outObj.qty) {
                        targetOutId = outObj.id;
                        outObj.used += parseFloat(s['QTY (TON)'] || 0);
                        break;
                    }
                }

                const salurArgs = [
                    salurId,
                    'ORD-' + salurId,
                    String(s['KIOS'] || s['kios'] || ''),
                    String(s['PRODUK'] || s['product'] || ''),
                    parseFloat(s['QTY (TON)'] || s['qty'] || 0),
                    String(s['WILAYAH'] || s['branch'] || p['KABUPATEN'] || ''),
                    String(s['TANGGAL'] || s['date'] || ''),
                    'DALAM PENGIRIMAN',
                    String(s['SOPIR'] || s['driver'] || ''),
                    targetOutId,
                    doNum,
                    parseFloat(s['TOTAL TAGIHAN'] || 0)
                ];

                await turso.execute({
                    sql: 'INSERT OR REPLACE INTO penyaluran (id, orderId, kios, product, qty, branch, date, status, driver, pengeluaran_id, "do", nominal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    args: salurArgs
                });

                // D. Orders
                const orderArgs = [
                    'ORD-' + salurId,
                    String(s['TANGGAL'] || s['date'] || ''),
                    String(s['PRODUK'] || s['product'] || ''),
                    parseFloat(s['QTY (TON)'] || s['qty'] || 0),
                    parseFloat(s['TOTAL TAGIHAN'] || 0),
                    String(s['WILAYAH'] || s['branch'] || p['KABUPATEN'] || ''),
                    String(s['KIOS'] || s['kios'] || ''),
                    String(s['STATUS BAYAR'] || '').toUpperCase() === 'LUNAS' ? 'LUNAS' : 'MENUNGGU PEMBAYARAN',
                    salurId
                ];

                await turso.execute({
                    sql: 'INSERT OR REPLACE INTO orders (id, date, product, qty, total, branch, kiosk, status, pylId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    args: orderArgs
                });

                // E. Kas Angkutan
                const kasMatch = rawKasAngkutan.find(k => 
                    (k['TANGGAL'] === s['TANGGAL']) && 
                    (String(k['KETERANGAN / SOPIR'] || '').toUpperCase().includes(String(s['SOPIR'] || '').toUpperCase()))
                );

                if (kasMatch) {
                    const kasArgs = [
                        'KAS-' + salurId,
                        String(kasMatch['TANGGAL'] || ''),
                        String(kasMatch['KETERANGAN / SOPIR'] || ''),
                        parseFloat(kasMatch['MASUK'] || 0),
                        parseFloat(kasMatch['KELUAR'] || 0),
                        String(kasMatch['WILAYAH'] || ''),
                        doNum,
                        salurId,
                        String(s['SOPIR'] || s['driver'] || ''),
                        String(s['KIOS'] || s['kios'] || ''),
                        parseFloat(kasMatch['ADMIN'] || 0),
                        parseFloat(kasMatch['SOLAR'] || 0),
                        parseFloat(kasMatch['UPAH'] || 0),
                        parseFloat(kasMatch['MAKAN'] || 0),
                        parseFloat(kasMatch['PALANG'] || 0),
                        parseFloat(kasMatch['LEMBUR'] || 0),
                        parseFloat(kasMatch['HELPER'] || 0),
                        parseFloat(kasMatch['LAIN-LAIN'] || 0)
                    ];

                    await turso.execute({
                        sql: 'INSERT OR REPLACE INTO kas_angkutan (id, date, "desc", masuk, keluar, branch, noDo, noPyl, sopir, kios, admin, solar, upahSopir, uangMakan, palang, lembur, helper, lainLain) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        args: kasArgs
                    });
                }
                countPenyaluran++;
            }
        } catch (err) {
            console.error(`\x1b[31mError on DO ${doNum}: ${err.message}\x1b[0m`);
        }
    }

    console.log(`\n\x1b[32m✅ IMPORT SELESAI!\x1b[0m`);
    console.log(`Penebusan: ${countPenebusan}, Pengeluaran: ${countPengeluaran}, Penyaluran/Kas: ${countPenyaluran}`);
}

startImport();
