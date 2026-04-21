/**
 * STATE MANAGEMENT - TANI MAKMUR (CLOUD EDITION)
 * Database : Turso Cloud DB via Cloudflare Workers
 * Mode: Full Cloud (No localStorage fallback/migration)
 */

const _hostname = window.location.hostname;
const IS_CLOUD = true; 
const API_BASE = '/api'; 

let DB_MODE = true; 
let DB_SYNC_DIRTY = false; 

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

let STATE = Object.assign({}, DEFAULT_STATE);
let STATE_LOADED_FROM_SERVER = false; // Guard to prevent overwriting cloud data with defaults

// Session only in localStorage
function loadSession() {
    const session = localStorage.getItem('tm_current_user');
    if (session) {
        try { STATE.currentUser = JSON.parse(session); } catch {}
    }
}

async function loadFromServer(silent = false) {
    if (DB_SYNC_DIRTY) return false; 

    try {
        const r = await fetch(`${API_BASE}/load-state`, { signal: AbortSignal.timeout(10000) });
        if (!r.ok) throw new Error('Server error');
        const serverState = await r.json();

        if (serverState && typeof serverState === 'object' && !serverState.error) {
            const keys = ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'permissions', 'rowLimits', 'activeBranchFilter', 'kas_angkutan', 'kas_umum', 'settings'];
            
            keys.forEach(key => {
                if (serverState[key] !== undefined) {
                    STATE[key] = serverState[key];
                }
            });

            loadSession(); // Re-apply session over loaded state
            STATE_LOADED_FROM_SERVER = true; // IMPORTANT: Data is now safe to sync back
            showDatabaseBadge(true);
            return true;
        }
    } catch (e) {
        if (!silent) {
            console.warn('[TM CLOUD] Connection error:', e.message);
            showDatabaseBadge(false);
        }
    }
    return false;
}

function showDatabaseBadge(isOnline) {
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
        cursor: default;
        ${isOnline ? 'background: #0369a1; color: #fff;' : 'background: #ef4444; color: #fff;'}
    `;
    badge.innerHTML = isOnline 
        ? '☁️ Cloud Connected — Turso Sync Aktif' 
        : '⚠️ Terputus — Periksa Koneksi Internet';
    
    document.body.appendChild(badge);
}

function saveState(immediate = false) {
    // Session is the only thing we keep in localStorage
    localStorage.setItem('tm_current_user', JSON.stringify(STATE.currentUser));
    
    // Sync other data to server
    syncToServer(immediate);

    if (typeof updateSidebarBadges === 'function') updateSidebarBadges();
}

let syncTimer = null;
let isSyncing = false;
let needAnotherSync = false;

function syncToServer(immediate = false) {
    DB_SYNC_DIRTY = true;
    needAnotherSync = true;
    clearTimeout(syncTimer);
    
    const performSync = async (retryCount = 0) => {
        if (isSyncing) return; // Jika sedang sync, biarkan yang berjalan, nanti di-catch di finally block
        
        if (!STATE_LOADED_FROM_SERVER) {
            console.warn('[TM CLOUD] Sync ditunda: Data belum termuat sempurna dari server.');
            return;
        }

        try {
            isSyncing = true;
            needAnotherSync = false;
            updateSyncBadge('syncing');

            // Kita capture data pada saat mau fetch (TERBARU)
            const payload = {
                users: STATE.users, products: STATE.products, penebusan: STATE.penebusan,
                pengeluaran: STATE.pengeluaran, penyaluran: STATE.penyaluran, 
                orders: STATE.orders, drivers: STATE.drivers,
                permissions: STATE.permissions, rowLimits: STATE.rowLimits,
                activeBranchFilter: STATE.activeBranchFilter,
                kas_angkutan: STATE.kas_angkutan, kas_umum: STATE.kas_umum,
                settings: STATE.settings
            };
            
            const r = await fetch(`${API_BASE}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ state: payload }),
                keepalive: true
            });
            
            if (r.ok) {
                if (!needAnotherSync) {
                    DB_SYNC_DIRTY = false;
                }
                updateSyncBadge('online');
            } else {
                throw new Error('Sync failed with status: ' + r.status);
            }
        } catch (e) {
            console.warn('[TM CLOUD] Sync error:', e.message);
            updateSyncBadge('offline');
            
            // Auto retry
            if (retryCount < 3) {
                console.log(`[TM CLOUD] Retrying sync... (${retryCount + 1}/3)`);
                setTimeout(() => performSync(retryCount + 1), 3000);
            } else {
                // If it totally fails, flag it so next action retries
                needAnotherSync = true;
            }
        } finally {
            isSyncing = false;
            if (needAnotherSync) {
                // Jika ada data baru tapi sync di atas sedang jalan, jalankan lagi sync nya!
                syncTimer = setTimeout(() => performSync(0), 1000);
            }
        }
    };

    if (immediate) {
        performSync(0); 
    } else {
        syncTimer = setTimeout(() => performSync(0), 2000); 
    }
}

function updateSyncBadge(status) {
    const badge = document.getElementById('db-mode-badge');
    if (!badge) {
        showDatabaseBadge(status === 'online' || status === 'syncing');
        return;
    }

    if (status === 'syncing') {
        badge.style.background = '#0ea5e9';
        badge.innerHTML = '🔄 Sedang Menyimpan ke Cloud...';
    } else if (status === 'online') {
        badge.style.background = '#0369a1';
        badge.innerHTML = '☁️ Cloud Connected — Turso Sync Aktif';
    } else {
        badge.style.background = '#ef4444';
        badge.innerHTML = '⚠️ Terputus — Mencoba Menghubungkan Kembali...';
    }
}

async function forceSync() {
    showToast('🔄 Menyinkronkan ke Cloud...', 'success');
    await syncToServer(true);
}

window.addEventListener('beforeunload', () => {
    if (DB_SYNC_DIRTY) syncToServer(true);
});

async function initializeState() {
    loadSession(); 

    // Critical: Load data from server
    const serverOk = await loadFromServer();
    
    if (!serverOk) {
        console.error('[TM CLOUD] Gagal memuat data dari database cloud.');
    }

    if (typeof navigateTo === 'function') {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(hash);
    }

    // Auto-refresh from cloud every 60s
    setInterval(() => {
        loadFromServer(true); 
    }, 60000);
}

window._stateReady = initializeState();
