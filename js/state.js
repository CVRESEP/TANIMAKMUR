/**
 * STATE MANAGEMENT - TANI MAKMUR
 * Mode Hybrid: SQLite lokal (via server) → fallback localStorage
 *
 * API Base : Auto-detect dari URL yang diakses (localhost atau IP LAN)
 * Database : data/tanimakmur.db (di PC server)
 */

const _hostname = window.location.hostname;
const IS_CLOUD = _hostname.includes('pages.dev') || _hostname.includes('github.io') || _hostname.includes('vercel.app');

// Jika di Cloud (internet), gunakan path relatif agar ditangkap oleh Cloudflare Functions.
// Jika di localhost/IP, gunakan port 3737.
const API_BASE = IS_CLOUD ? '/api' : `http://${_hostname}:3737/api`;
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

// ── Load from SQLite server / Cloud ──────────────────────────────────────────
async function loadFromServer(silent = false) {
    if (DB_SYNC_DIRTY) return false; 

    try {
        const r = await fetch(`${API_BASE}/load-state`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) throw new Error('Server error');
        const serverState = await r.json();

        // Data arrays to sync
        const keys = ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'permissions', 'rowLimits', 'activeBranchFilter', 'kas_angkutan', 'kas_umum', 'settings'];
        let hasChanges = false;
        
        keys.forEach(key => {
            if (serverState[key] !== undefined) {
                const current = JSON.stringify(STATE[key]);
                const cloud = JSON.stringify(serverState[key]);
                if (current !== cloud) {
                    STATE[key] = serverState[key];
                    hasChanges = true;
                }
            }
        });

        // Update current user session from local storage if needed
        const session = localStorage.getItem('tm_current_user');
        if (session) { try { STATE.currentUser = JSON.parse(session); } catch {} }

        DB_MODE = true;
        showDatabaseBadge(true);
        
        if (hasChanges) {
            if (!silent) console.log('%c[TM DB] Data updated from Cloud. Refreshing UI...', 'color:#0369a1; font-weight:bold');
            const hash = window.location.hash.replace('#', '') || 'dashboard';
            if (typeof navigateTo === 'function') navigateTo(hash);
        }

        return true;
    } catch (e) {
        if (!silent) {
            DB_MODE = false;
            showDatabaseBadge(false);
            console.warn('[TM DB] Connection error:', e.message);
        }
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
    badge.innerHTML = IS_CLOUD
        ? '☁️ Cloud Sync — Data Tersimpan di Turso'
        : (isServer
            ? '🗄️ SQLite Lokal — Data Aman di PC'
            : '⚠️ localStorage — Jalankan server.js');
    
    badge.style.background = IS_CLOUD ? '#0369a1' : (isServer ? '#15803d' : '#d97706');
    
    badge.onclick = () => {
        if (!isServer && !IS_CLOUD) window.open('/migrate.html', '_blank');
    };
    badge.title = IS_CLOUD 
        ? 'Data terhubung langsung ke Turso Cloud DB'
        : (isServer ? 'Database tersimpan di PC via SQLite' : 'Klik untuk buka halaman migrasi');
    document.body.appendChild(badge);
}

// ─────────────────────────────────────────────────────────────────────────────
// SAVE STATE
// ─────────────────────────────────────────────────────────────────────────────
function saveState() {
    // 1. Local backup
    const persistState = Object.assign({}, STATE);
    delete persistState.currentUser;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistState));

    // 2. Immediate push to Cloud if online
    syncToServer();

    if (typeof updateSidebarBadges === 'function') updateSidebarBadges();
}

let syncTimer = null;
function syncToServer(immediate = false) {
    DB_SYNC_DIRTY = true;
    clearTimeout(syncTimer);
    
    const performSync = async () => {
        if (!DB_SYNC_DIRTY) return;
        try {
            const payload = {
                users: STATE.users, products: STATE.products, penebusan: STATE.penebusan,
                pengeluaran: STATE.pengeluaran, penyaluran: STATE.penyaluran, 
                orders: STATE.orders, drivers: STATE.drivers,
                permissions: STATE.permissions, rowLimits: STATE.rowLimits,
                activeBranchFilter: STATE.activeBranchFilter,
                kas_angkutan: STATE.kas_angkutan, kas_umum: STATE.kas_umum,
                suppliers: STATE.suppliers, settings: STATE.settings
            };
            
            const r = await fetch(`${API_BASE}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: payload }),
                keepalive: true
            });
            
            if (r.ok) {
                DB_SYNC_DIRTY = false;
                DB_MODE = true;
                showDatabaseBadge(true);
            }
        } catch (e) {
            console.warn('[TM] Sync error:', e.message);
        }
    };

    if (immediate || IS_CLOUD) performSync(); 
    else syncTimer = setTimeout(performSync, 500); 
}

// Force manual sync
async function forceSync() {
    showToast('🔄 Memulai Sinkronisasi Data ke Cloud...', 'success');
    try {
        await syncToServer(true);
        // Wait a bit to ensure sync finishes
        setTimeout(() => {
            showToast('✅ Sinkronisasi Berhasil! Cek di HP Anda sekarang.', 'success');
        }, 1500);
    } catch (e) {
        showToast('❌ Sinkronisasi Gagal: ' + e.message, 'error');
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

    // Step 5: Start background auto-refresh (Polling every 30 seconds)
    setInterval(() => {
        loadFromServer(true); 
    }, 30000);
}

// ── Start initialization ──────────────────────────────────────────────────────
// Use a promise so main.js can await if needed
window._stateReady = initializeState();
