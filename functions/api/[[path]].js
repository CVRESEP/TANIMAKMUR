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
        const requests = statements.map(s => ({
            type: "execute",
            stmt: { sql: s.q, args: s.args || [] }
        }));
        const res = await fetch(`${TURSO_URL}/v2/pipeline`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests })
        });
        const data = await res.json();
        if (!data.results) throw new Error(data.message || 'Pipeline error');
        return data.results.map(r => r.response?.result || r.response || r);
    }

    // ── LOAD STATE ─────────────────────────────────────────────────────────────
    if (path.endsWith('/api/load-state')) {
        try {
            const tables = ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'kas_angkutan', 'kas_umum', 'suppliers', 'settings'];
            const statements = tables.map(t => ({ q: `SELECT * FROM "${t}"` }));
            const results = await queryTurso(statements);

            const state = {};
            tables.forEach((table, idx) => {
                const result = results[idx];
                if (!result || !result.rows) return;
                
                const rows = result.rows.map(r => {
                    const obj = {};
                    result.cols.forEach((col, i) => {
                        obj[col.name] = r[i].value;
                    });
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
                kas_angkutan: 'kas_angkutan', kas_umum: 'kas_umum', suppliers: 'suppliers',
                drivers: 'drivers'
            };

            const batch = [];
            
            for (const [stateKey, table] of Object.entries(tableMap)) {
                const rows = state[stateKey];
                if (!Array.isArray(rows)) continue;

                // SAFETY: Jangan hapus data jika array kosong (mungkin karena kegagalan load di frontend)
                const isVital = ['users', 'products'].includes(table);
                if (isVital && rows.length === 0) {
                    console.warn(`[SYNC] Skipped table ${table} due to empty data (Safety Guard)`);
                    continue;
                }

                batch.push({ q: `DELETE FROM "${table}"` });
                for (const row of rows) {
                    const cols = Object.keys(row);
                    const placeholders = cols.map(() => '?').join(', ');
                    const args = cols.map(c => {
                        let val = row[c];
                        if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
                        
                        if (val === null) return { type: "null" };
                        if (typeof val === "number") {
                            return Number.isInteger(val) 
                                ? { type: "integer", value: val.toString() }
                                : { type: "float", value: val };
                        }
                        return { type: "text", value: String(val) };
                    });
                    
                    batch.push({ 
                        q: `INSERT OR REPLACE INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`,
                        args 
                    });
                }
            }

            const metadataKeys = ['permissions', 'rowLimits', 'activeBranchFilter', 'settings'];
            for (const key of metadataKeys) {
                if (state[key] !== undefined) {
                    batch.push({
                        q: 'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
                        args: [
                            { type: "text", value: key },
                            { type: "text", value: JSON.stringify(state[key]) }
                        ]
                    });
                }
            }

            if (batch.length > 0) {
                // Chunk the batches to avoid hitting Turso payload limits (max 50 statements per chunk)
                const chunkSize = 50;
                for (let i = 0; i < batch.length; i += chunkSize) {
                    const chunk = batch.slice(i, i + chunkSize);
                    await queryTurso(chunk);
                }
            }
            return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
            return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
        }
    }

    // ── NOTIFICATIONS ────────────────────────────────────────────────────────
    if (path.endsWith('/api/send-wa') && method === 'POST') {
        try {
            const { to, message } = await request.json();
            const rs = await queryTurso([{ q: "SELECT value FROM settings WHERE key = 'settings'" }]);
            if (!rs[0] || !rs[0].rows || !rs[0].rows.length) throw new Error('Settings not found');
            
            const settingsStr = rs[0].rows[0][0].value;
            const settings = JSON.parse(settingsStr);
            
            const response = await fetch('https://api.fonnte.com/send', {
                method: 'POST',
                headers: { 'Authorization': settings.wa_gateway_token || '', 'Content-Type': 'application/json' },
                body: JSON.stringify({ target: to, message })
            });
            const result = await response.json();
            return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
            return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
        }
    }

    if (path.endsWith('/api/send-tg') && method === 'POST') {
        try {
            const { chat_id, message } = await request.json();
            const rs = await queryTurso([{ q: "SELECT value FROM settings WHERE key = 'settings'" }]);
            if (!rs[0] || !rs[0].rows || !rs[0].rows.length) throw new Error('Settings not found');
            
            const settingsStr = rs[0].rows[0][0].value;
            const settings = JSON.parse(settingsStr);
            
            const cleanId = String(chat_id).replace(/[^\d-]/g, '').trim();
            const response = await fetch(`https://api.telegram.org/bot${settings.tg_bot_token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: cleanId, text: message })
            });
            const result = await response.json();
            return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
            return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
        }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
}
