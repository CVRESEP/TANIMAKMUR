/**
 * Debug Script: Simulasi sync persis seperti yang dilakukan frontend
 * Jalankan: node tools/debug_sync.js
 */
const http = require('http');

const testPayload = {
  state: {
    penebusan: [
      {
        do: 'SYNC-TEST-001',
        date: '2026-04-29',
        product: 'PUPUK TEST',
        kabupaten: 'MAGETAN',
        branch: 'MAGETAN',
        qty: 2.5,
        harga: 100000,
        total: 250000,
        productCode: 'TEST01',
        notes: 'debug test'
      }
    ],
    // Kirim array kosong untuk tabel lain (supaya tidak dihapus/diubah)
    users: [],
    products: [],
    pengeluaran: [],
    penyaluran: [],
    orders: [],
    drivers: [],
    kas_angkutan: [],
    kas_umum: [],
    suppliers: []
  }
};

const body = JSON.stringify(testPayload);

const options = {
  hostname: 'localhost',
  port: 3737,
  path: '/api/sync',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('=== MENGIRIM TEST SYNC KE SERVER ===');
console.log('Payload penebusan: 1 record (SYNC-TEST-001)');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('\n=== RESPONSE SERVER ===');
    console.log('Status HTTP:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('Response:', parsed);
      if (res.statusCode === 200 && parsed.ok) {
        console.log('\n✅ SYNC BERHASIL! Sekarang cek database...');
        // Verifikasi dengan load-state
        checkDatabase();
      } else {
        console.log('\n❌ SYNC GAGAL!');
        console.log('Error:', parsed.error || data);
      }
    } catch(e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ TIDAK BISA CONNECT KE SERVER:', e.message);
  console.error('Pastikan server berjalan di port 3737!');
});

req.write(body);
req.end();

function checkDatabase() {
  const opts2 = { hostname: 'localhost', port: 3737, path: '/api/load-state', method: 'GET' };
  const req2 = http.request(opts2, (res2) => {
    let d = '';
    res2.on('data', chunk => d += chunk);
    res2.on('end', () => {
      try {
        const state = JSON.parse(d);
        const found = (state.penebusan || []).find(p => p.do === 'SYNC-TEST-001');
        if (found) {
          console.log('✅ DATA DITEMUKAN DI DATABASE:', found);
        } else {
          console.log('❌ DATA TIDAK ADA DI DATABASE SETELAH SYNC!');
          console.log('Total penebusan di DB:', (state.penebusan || []).length);
        }
      } catch(e) {
        console.log('Error parse load-state:', e.message);
      }
    });
  });
  req2.on('error', e => console.error('load-state error:', e.message));
  req2.end();
}
