/**
 * TANI MAKMUR - CLOUDFLARE PAGES FUNCTIONS
 * Proxy requests directly to Turso
 */

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // Turso Config from Environment Variables (set these in Cloudflare Dashboard)
    const TURSO_URL = 'libsql://tanimakmur-cvresep.aws-ap-northeast-1.turso.io';
    const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag';

    // Simple router for GET /api/load-state
    if (path.endsWith('/api/load-state')) {
        try {
            const tables = ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'kas_angkutan', 'kas_umum', 'suppliers', 'settings'];
            const state = {};

            for (const table of tables) {
                const res = await fetch(`${TURSO_URL.replace('libsql://', 'https://')}/v1/execute`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ statements: [{ q: `SELECT * FROM "${table}"` }] })
                });
                const data = await res.json();
                const rows = data[0].results.rows;
                
                // Convert Turso format to plain objects
                const cols = data[0].results.columns;
                const formattedRows = rows.map(r => {
                    const obj = {};
                    cols.forEach((c, i) => obj[c] = r[i]);
                    return obj;
                });

                if (table === 'settings') {
                    formattedRows.forEach(row => {
                        try { state[row.key] = JSON.parse(row.value); }
                        catch { state[row.key] = row.value; }
                    });
                } else {
                    state[table] = formattedRows;
                }
            }

            return new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    // Proxy other API routes eventually...
    return new Response(JSON.stringify({ ok: true, note: 'Tani Makmur Cloud API' }), { headers: { 'Content-Type': 'application/json' } });
}
