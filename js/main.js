// Inisialisasi Dasbor Tani Makmur
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    setupRouting();
    startSessionTimer();
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Tunggu status dimuat sepenuhnya (termasuk SQLite jika tersedia)
    try {
        await window._stateReady;
    } catch (e) {
        console.warn('[TM] State init error, using localStorage:', e);
    }

    // Pemuatan halaman awal
    let initialPage = window.location.hash.replace('#', '') || 'dashboard';
    
    // Alihkan KIOS dari dasbor ke pesanan mereka
    if (initialPage === 'dashboard' && STATE.currentUser.role === 'KIOS') {
        initialPage = 'orders_kiosk';
    }

    // Reset mode pemilihan saat pemuatan
    STATE.uiSelectionMode = {};
    
    updateHeaderUserInfo();
    applyRolePermissions();
    navigateTo(initialPage);

    // Pendengar klik global untuk menutup dropdown
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.action-dropdown')) {
            document.querySelectorAll('.dropdown-content.show').forEach(d => d.classList.remove('show'));
        }
    });
});
