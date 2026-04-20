/**
 * STATE MANAGEMENT - TANI MAKMUR
 * Mode Hybrid: SQLite lokal (via server) → fallback localStorage
 *
 * API Base : Auto-detect dari URL yang diakses (localhost atau IP LAN)
 * Database : data/tanimakmur.db (di PC server)
 */

// Auto-detect server host: gunakan hostname yang sama dengan URL yang dibuka
// Ini memungkinkan PC lain di jaringan LAN mengakses tanpa perlu setting apapun
const _serverHost = window.location.hostname || 'localhost';
const API_BASE = `http://${_serverHost}:3737/api`;
const STORAGE_KEY = 'tm_state_v1';

let DB_MODE = false;       // true = pakai SQLite server, false = localStorage
let DB_SYNC_DIRTY = false; // ada perubahan yang belum disinkronkan

const DEFAULT_STATE = {
    currentUser: { username: 'admin', name: 'Administrator Utama', role: 'OWNER', branch: 'ALL', password: 'admin' },
    users: [
        { username: 'admin', name: 'Administrator Utama', role: 'OWNER', branch: 'ALL', password: 'admin' }
    ],
    permissions: {
        OWNER: ['dashboard', 'products', 'penebusan', 'pengeluaran', 'approvals', 'penyaluran', 'reports', 'users', 'settings', 'payments', 'kiosks', 'kas_angkutan', 'kas_umum'],
        MANAJER: ['dashboard', 'products', 'penebusan', 'pengeluaran', 'approvals', 'penyaluran', 'reports', 'users', 'settings', 'payments', 'kiosks', 'kas_angkutan', 'kas_umum'],
        ADMIN: ['dashboard', 'products', 'penebusan', 'pengeluaran', 'approvals', 'penyaluran', 'reports', 'users', 'settings', 'payments', 'kiosks', 'kas_angkutan', 'kas_umum'],
        KIOS: ['dashboard', 'orders_kiosk', 'settings']
    },
    orders: [],
    penebusan: [],
    pengeluaran: [],
    penyaluran: [],
    drivers: [],
    products: [],
    kas_angkutan: [],
    kas_umum: [],
    rowLimits: {
        penebusan: 10, pengeluaran: 10, penyaluran: 10,
        approvals: 10, orders_kiosk: 10, products: 10, kiosks: 10,
        kas_angkutan: 10, kas_umum: 10
    },
    uiSelectionMode: {},
    activeBranchFilter: 'ALL',
    settings: {
        company_name: 'TANI MAKMUR',
        company_address: 'Alamat Perusahaan Belum Diatur',
        company_logo: '',
        branches: ['MAGETAN', 'SRAGEN'],
        wa_number: '6281234567890',
        wa_gateway_token: '',
        tg_bot_token: '',
        tg_owner_chat_id: ''
    }
};

// ── STATE object (in-memory) ──────────────────────────────────────────────────
let STATE = Object.assign({}, DEFAULT_STATE);

// ── Load stored state from localStorage ──────────────────────────────────────
function loadFromLocalStorage() {
    const stored = localStorage.getItem(STORAGE_KEY);
    const session = localStorage.getItem('tm_current_user');
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            Object.assign(STATE, parsed);
        } catch (e) {}
    }
    if (session) {
        try { STATE.currentUser = JSON.parse(session); } catch {}
    }
}

// ── Load from SQLite server ──────────────────────────────────────────────────
async function loadFromServer() {
    try {
        const r = await fetch(`${API_BASE}/load-state`, { signal: AbortSignal.timeout(2000) });
        if (!r.ok) throw new Error('Server error');
        const serverState = await r.json();

        // Overwrite data arrays and metadata from server, keep UI state from localStorage
        const keys = ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'permissions', 'rowLimits', 'activeBranchFilter', 'kas_angkutan', 'kas_umum', 'settings'];
        keys.forEach(key => {
            if (serverState[key] !== undefined) {
                STATE[key] = serverState[key];
            }
        });

        // Preserve current user session
        const session = localStorage.getItem('tm_current_user');
        if (session) { try { STATE.currentUser = JSON.parse(session); } catch {} }

        DB_MODE = true;
        showDatabaseBadge(true);
        console.log('%c[TM DB] Mode: SQLite Server ✓', 'color:#16a34a; font-weight:bold');
        return true;
    } catch (e) {
        DB_MODE = false;
        showDatabaseBadge(false);
        console.warn('[TM DB] Server offline. Mode: localStorage');
        return false;
    }
}

// ── UI Badge: show current storage mode in header ─────────────────────────────
function showDatabaseBadge(isServer) {
    // Remove old badge if exists
    const old = document.getElementById('db-mode-badge');
    if (old) old.remove();

    const badge = document.createElement('div');
    badge.id = 'db-mode-badge';
    badge.style.cssText = `
        position: fixed; bottom: 16px; left: 16px; z-index: 9999;
        display: flex; align-items: center; gap: 8px;
        padding: 8px 14px; border-radius: 999px;
        font-size: 0.72rem; font-weight: 700; letter-spacing: 0.5px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        cursor: pointer; transition: all 0.2s;
        ${isServer
            ? 'background: #15803d; color: #fff;'
            : 'background: #d97706; color: #fff;'
        }
    `;
    badge.innerHTML = isServer
        ? '🗄️ SQLite Lokal — Data Aman di PC'
        : '⚠️ localStorage — Jalankan server.js';
    badge.onclick = () => {
        if (!isServer) window.open('/migrate.html', '_blank');
    };
    badge.title = isServer
        ? 'Database tersimpan di PC via SQLite'
        : 'Klik untuk buka halaman migrasi';
    document.body.appendChild(badge);
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE STATE
// Jika server aktif → sync ke SQLite; selalu juga ke localStorage (backup)
// ─────────────────────────────────────────────────────────────────────────────
function saveState() {
    // 1. Always save to localStorage as backup
    const persistState = Object.assign({}, STATE);
    delete persistState.currentUser; // currentUser pakai tm_current_user
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistState));

    // 2. Sync to SQLite if mode is active
    if (DB_MODE) {
        syncToServer();
    }

    // Update UI badges
    if (typeof updateSidebarBadges === 'function') {
        updateSidebarBadges();
    }
}

// Debounced sync to server (avoid hammering on rapid saves)
let syncTimer = null;
function syncToServer(immediate = false) {
    DB_SYNC_DIRTY = true;
    clearTimeout(syncTimer);
    
    const performSync = async () => {
        if (!DB_SYNC_DIRTY) return;
        try {
            const payload = {
                users: STATE.users,
                products: STATE.products,
                penebusan: STATE.penebusan,
                pengeluaran: STATE.pengeluaran,
                penyaluran: STATE.penyaluran,
                orders: STATE.orders,
                drivers: STATE.drivers,
                permissions: STATE.permissions,
                rowLimits: STATE.rowLimits,
                activeBranchFilter: STATE.activeBranchFilter,
                kas_angkutan: STATE.kas_angkutan,
                kas_umum: STATE.kas_umum,
                suppliers: STATE.suppliers,
                settings: STATE.settings
            };
            
            const r = await fetch(`${API_BASE}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: payload }),
                keepalive: true, // Crucial for sync on unload
                signal: AbortSignal.timeout(10000)
            });
            
            if (r.ok) {
                DB_SYNC_DIRTY = false;
                console.log('%c[TM DB] Sync OK ✓', 'color:#16a34a');
                DB_MODE = true;
                showDatabaseBadge(true);
            }
        } catch (e) {
            console.warn('[TM DB] Sync delayed/failed:', e.message);
            // Don't immediately switch to offline mode unless we're sure
        }
    };

    if (immediate) {
        performSync();
    } else {
        syncTimer = setTimeout(performSync, 300); // Reduced debounce to 300ms
    }
}

// Ensure data is synced before user leaves or refreshes the page
window.addEventListener('beforeunload', () => {
    if (DB_SYNC_DIRTY) {
        syncToServer(true);
    }
});


// ─────────────────────────────────────────────────────────────────────────────
// MIGRATIONS (schema upgrades for existing data)
// ─────────────────────────────────────────────────────────────────────────────
function runMigrations() {
    if (!STATE.rowLimits) STATE.rowLimits = { ...DEFAULT_STATE.rowLimits };
    if (!STATE.permissions) STATE.permissions = { ...DEFAULT_STATE.permissions };

    // Update permissions for existing users
    STATE.permissions = { ...DEFAULT_STATE.permissions };

    // Ensure arrays
    ['users', 'orders', 'penebusan', 'pengeluaran', 'penyaluran', 'drivers', 'products', 'kas_angkutan', 'kas_umum'].forEach(key => {
        if (!STATE[key] || !Array.isArray(STATE[key])) STATE[key] = [];
    });

    // Ensure admin exists
    if (STATE.users.length === 0) {
        STATE.users = [...DEFAULT_STATE.users];
    }

    // Seed Kiosk Data from master list
    const seedKiosks = [
        { name: 'SUBUR TANI', branch: 'MAGETAN', kecamatan: 'MAOSPATI', desa: 'SEMPOL', pic: 'KASIYANTO' },
        { name: 'UD MITRA USAHA', branch: 'MAGETAN', kecamatan: 'BARAT', desa: 'JONGGRANG', pic: 'CHINTIA' },
        { name: 'BASUKI RAHMAT PUTRA', branch: 'MAGETAN', kecamatan: 'BARAT', desa: 'MANGGE', pic: 'DIDIK HARIYANTO' },
        { name: 'UD. MITRA TANI', branch: 'MAGETAN', kecamatan: 'BARAT', desa: 'JONGGRANG', pic: 'TRI WALUYO' },
        { name: 'TUNAS MEKAR', branch: 'MAGETAN', kecamatan: 'KARANGREJO', desa: 'GANDRI', pic: 'SULASTRI' },
        { name: 'ARRIN, UD', branch: 'MAGETAN', kecamatan: 'KARANGREJO', desa: 'GRABAHAN', pic: 'SUWARSININGSIN' },
        { name: 'SUMBER AGUNG, TOKO', branch: 'MAGETAN', kecamatan: 'KARANGREJO', desa: 'GEBYOK', pic: 'SUYADI' },
        { name: 'SAHABAT TANI, UD', branch: 'MAGETAN', kecamatan: 'KARANGREJO', desa: 'MARON', pic: 'SUYATMI' },
        { name: 'PERNADI MAKMUR', branch: 'MAGETAN', kecamatan: 'MAOSPATI', desa: 'KRATON', pic: 'NANI' },
        { name: 'JASA TANI', branch: 'MAGETAN', kecamatan: 'BARAT', desa: 'PANGGUNG', pic: 'MURYATI' },
        { name: 'TANI MAJU', branch: 'MAGETAN', kecamatan: 'BARAT', desa: 'BOGOREJO', pic: 'PAIMUN' },
        { name: 'PANGESTU, UD', branch: 'MAGETAN', kecamatan: 'KARANGREJO', desa: 'PRAMPELAN', pic: 'LINAFSIATUROHMI' },
        { name: 'AKBAR TANI', branch: 'MAGETAN', kecamatan: 'BARAT', desa: 'BLARAN', pic: 'HERI SUPRIYONO' },
        { name: 'TANI BERKAH', branch: 'MAGETAN', kecamatan: 'MAOSPATI', desa: 'SUGIHWARAS', pic: 'SRI ENDARWATI' },
        { name: 'ENDAH TANI', branch: 'MAGETAN', kecamatan: 'MAOSPATI', desa: 'NGUJUNG', pic: 'WIJI' },
        { name: 'MITRO TANI', branch: 'MAGETAN', kecamatan: 'MAOSPATI', desa: 'KRATON', pic: 'NUNUS ARDHI N' },
        { name: 'WIDODO TANI', branch: 'MAGETAN', kecamatan: 'MAOSPATI', desa: 'MRANGGEN', pic: 'DIDIK SUPRASETYO' },
        { name: 'SUMBER TANI BAROKAH, UD', branch: 'MAGETAN', kecamatan: 'KARANGREJO', desa: 'SAMBIREMBE', pic: 'SITI ISMINAH' }
    ];

    seedKiosks.forEach(sk => {
        const exists = STATE.users.find(u => u.name === sk.name);
        if (!exists) {
            STATE.users.push({
                ...sk,
                username: sk.name.toLowerCase().replace(/[^a-z0-9]/g, ''),
                password: '123',
                role: 'KIOS'
            });
        }
    });

    saveState();
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZE: Load data then run migrations
// ─────────────────────────────────────────────────────────────────────────────
async function initializeState() {
    // Step 1: Load localStorage first (fast, synchronous)
    loadFromLocalStorage();

    // Step 2: Try to load from SQLite server (async)
    const serverOk = await loadFromServer();

    // Step 3: Run data migrations/seeds
    runMigrations();

    // Step 4: Trigger initial render if navigateTo exists
    if (typeof navigateTo === 'function') {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(hash);
    }
}

// ── Start initialization ──────────────────────────────────────────────────────
// Use a promise so main.js can await if needed
window._stateReady = initializeState();
