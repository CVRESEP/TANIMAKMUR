// Initialize Tani Makmur Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    checkAuth();
    setupRouting();
    startSessionTimer();
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Wait for state to be fully loaded (including SQLite if available)
    try {
        await window._stateReady;
    } catch (e) {
        console.warn('[TM] State init error, using localStorage:', e);
    }

    // Initial page load
    let initialPage = window.location.hash.replace('#', '') || 'dashboard';
    
    // Redirect KIOS from dashboard to their orders
    if (initialPage === 'dashboard' && STATE.currentUser.role === 'KIOS') {
        initialPage = 'orders_kiosk';
    }

    // Reset selection modes on load
    STATE.uiSelectionMode = {};
    
    updateHeaderUserInfo();
    applyRolePermissions();
    navigateTo(initialPage);

    // Global click listener to close dropdowns
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.action-dropdown')) {
            document.querySelectorAll('.dropdown-content.show').forEach(d => d.classList.remove('show'));
        }
    });
});
