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
        kas_angkutan: 10, kas_umum: 10, users: 10, payments: 10,
        drivers: 10
    },
    currentPages: {
        penebusan: 1, pengeluaran: 1, penyaluran: 1,
        approvals: 1, orders_kiosk: 1, products: 1, kiosks: 1,
        kas_angkutan: 1, kas_umum: 1, users: 1, payments: 1,
        drivers: 1
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
    // Tidak lagi diblok oleh DB_SYNC_DIRTY — refresh data tetap berjalan
    try {
        const r = await fetch(`${API_BASE}/load-state`, { signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw new Error('Server error ' + r.status);
        const serverState = await r.json();

        if (serverState && typeof serverState === 'object' && !serverState.error) {
            const keys = ['users', 'products', 'penebusan', 'pengeluaran', 'penyaluran', 'orders', 'drivers', 'permissions', 'rowLimits', 'activeBranchFilter', 'kas_angkutan', 'kas_umum', 'settings'];
            
            keys.forEach(key => {
                if (serverState[key] !== undefined) {
                    STATE[key] = serverState[key];
                }
            });

            loadSession(); // Re-apply session over loaded state
            STATE_LOADED_FROM_SERVER = true;
            showDatabaseBadge(true);
            return true;
        }
    } catch (e) {
        if (!silent) {
            console.warn('[TM CLOUD] Connection error:', e.message);
            showDatabaseBadge(false);
        } else {
            // Silent mode: update badge tapi jangan log
            updateSyncBadge('offline');
        }
    }
    return false;
}

function showDatabaseBadge(isOnline) {
    let badge = document.getElementById('db-mode-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'db-mode-badge';
        document.body.appendChild(badge);
    }

    badge.style.cssText = `
        position: fixed; bottom: 16px; left: 16px; z-index: 9999;
        display: flex; align-items: center; gap: 8px;
        padding: 8px 14px; border-radius: 999px;
        font-size: 0.72rem; font-weight: 700; letter-spacing: 0.5px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
        ${isOnline ? 'background: #0369a1; color: #fff; cursor: default;' : 'background: #ef4444; color: #fff; cursor: pointer;'}
    `;
    
    badge.innerHTML = isOnline 
        ? '☁️ Cloud Connected — Turso Sync Aktif' 
        : '⚠️ Terputus — Klik untuk Menghubungkan Kembali...';
    
    badge.onclick = isOnline ? null : () => {
        badge.innerHTML = '🔄 Mencoba Menghubungkan...';
        initializeState();
    };
}

function updateSyncBadge(status) {
    if (status === 'offline') showDatabaseBadge(false);
    if (status === 'online') showDatabaseBadge(true);
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
        console.error('[TM CLOUD] Gagal memuat data dari database cloud. Mencoba ulang...');
        // Retry sekali setelah 3 detik
        setTimeout(async () => {
            const retry = await loadFromServer();
            if (!retry) showDatabaseBadge(false);
        }, 3000);
    }

    if (typeof navigateTo === 'function') {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(hash);
    }

    // Auto-refresh dari cloud setiap 30 detik (lebih agresif dari sebelumnya)
    setInterval(() => {
        if (!DB_SYNC_DIRTY) loadFromServer(true); 
    }, 30000);

    // Ping monitor: cek koneksi ke server setiap 15 detik
    let pingFailures = 0;
    let wasOffline = false;

    setInterval(async () => {
        try {
            const r = await fetch(`${API_BASE}/ping`, { signal: AbortSignal.timeout(5000) });
            const data = await r.json();

            if (r.ok && data.connected) {
                pingFailures = 0;
                if (wasOffline) {
                    wasOffline = false;
                    console.log('[TM CLOUD] ✅ Koneksi pulih.');
                    await loadFromServer(true);
                    updateSyncBadge('online');
                }
            } else {
                throw new Error(data.error || 'Database disconnected');
            }
        } catch (err) {
            pingFailures++;
            // Hanya anggap offline jika gagal 2x berturut-turut (menghindari flicker internet sesaat)
            if (pingFailures >= 2 && !wasOffline) {
                wasOffline = true;
                console.warn('[TM CLOUD] ⚠️ Server/Database tidak merespons:', err.message);
                updateSyncBadge('offline');
            }
        }
    }, 15000);
}

window._stateReady = initializeState();
