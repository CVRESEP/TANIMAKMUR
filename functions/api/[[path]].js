/**
 * TANI MAKMUR - UNIFIED CLOUD API
 * Handles /api/load-state and /api/sync via Cloudflare Functions
 */

export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    const TURSO_URL = 'https://tanimakmur-cvresep.aws-ap-northeast-1.turso.io';
    const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzY3MDg2NDUsImlkIjoiMDE5ZGFjMTQtZjAwMS03NTZiLWIxNmEtZjliYzE1YWExODE0IiwicmlkIjoiZTBkMWFhODUtOTg0OC00MjVkLWI5N2EtMWU0ODA1ZmJlYTNkIn0.HuGaB5DogClfIH9r3KzzcBSU5jrpWIIuTW1-A2hciSJmJZOHzitYnMlHemsMhrcRaw6pCmigb-avnyIwHUs9Ag';

    async function queryTurso(statements) {
        const res = await fetch(`${TURSO_URL}/v1/execute`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ statements })
        });
        return await res.json();
    }

    // ── LOAD STATE ─────────────────────────────────────────────────────────────
    if (path.endsWith('/api/load-state')) {
        try {
            const tables = ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'kas_angkutan', 'kas_umum', 'suppliers', 'settings'];
            const statements = tables.map(t => ({ q: `SELECT * FROM "${t}"` }));
            const data = await queryTurso(statements);

            const state = {};
            tables.forEach((table, idx) => {
                const result = data[idx].results;
                const rows = result.rows.map(r => {
                    const obj = {};
                    result.columns.forEach((c, i) => obj[c] = r[i]);
                    return obj;
                });

                if (table === 'settings') {
                    rows.forEach(row => {
                        try { state[row.key] = JSON.parse(row.value); }
                        catch { state[row.key] = row.value; }
                    });
                } else {
                    state[table] = rows;
                }
            });

            return new Response(JSON.stringify(state), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    // ── SYNC STATE ─────────────────────────────────────────────────────────────
    if (path.endsWith('/api/sync') && method === 'POST') {
        try {
            const { state } = await request.json();
            const tableMap = {
                users: 'users', products: 'products', penebusan: 'penebusan',
                pengeluaran: 'pengeluaran', penyaluran: 'penyaluran', orders: 'orders',
                kas_angkutan: 'kas_angkutan', kas_umum: 'kas_umum', suppliers: 'suppliers'
            };

            const batch = [];
            
            // Delete and Re-insert for each table
            for (const [stateKey, table] of Object.entries(tableMap)) {
                if (!Array.isArray(state[stateKey])) continue;
                batch.push({ q: `DELETE FROM "${table}"` });
                for (const row of state[stateKey]) {
                    const cols = Object.keys(row);
                    const placeholders = cols.map(() => '?').join(', ');
                    const args = cols.map(c => (typeof row[c] === 'object' && row[c] !== null) ? JSON.stringify(row[c]) : row[c]);
                    batch.push({ 
                        q: `INSERT OR REPLACE INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
                        args 
                    });
                }
            }

            // Sync Settings metadata
            const metadataKeys = ['permissions', 'rowLimits', 'activeBranchFilter', 'settings'];
            for (const key of metadataKeys) {
                if (state[key] !== undefined) {
                    batch.push({
                        q: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                        args: [key, JSON.stringify(state[key])]
                    });
                }
            }

            await queryTurso(batch);
            return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
