// UI Core Logic: Routing, Modals, Nav
function setupRouting() {
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            window.location.hash = page;
            navigateTo(page);

            // Close sidebar on mobile after clicking menu
            if (window.innerWidth <= 768) {
                document.getElementById('sidebar').classList.remove('active');
                document.body.classList.remove('sidebar-open');
            }
        });
    });

    window.addEventListener('hashchange', () => {
        const page = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(page);
    });

    setupMobileNav();
}

function setupMobileNav() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const mainWrapper = document.querySelector('.main-wrapper');
    const sidebarHeader = document.querySelector('.sidebar-header');
    const closeBtn = document.getElementById('close-sidebar');
    
    const toggleNav = (e) => {
        if (e) e.stopPropagation();
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('active');
            document.body.classList.toggle('sidebar-open');
        } else {
            sidebar.classList.toggle('collapsed');
            if (mainWrapper) mainWrapper.classList.toggle('full-width');
        }
    };

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', toggleNav);
        if (closeBtn) closeBtn.addEventListener('click', toggleNav);
        
        // Also allow clicking the logo header to close
        if (sidebarHeader) {
            sidebarHeader.style.cursor = 'pointer';
            sidebarHeader.addEventListener('click', (e) => {
                if (window.innerWidth <= 768 && sidebar.classList.contains('active')) {
                    toggleNav(e);
                }
            });
        }

        // Close when clicking overlay (outside)
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) && 
                !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
                document.body.classList.remove('sidebar-open');
            }
        });
    }
}

function navigateTo(pageId) {
    const contentArea = document.getElementById('content-area');
    const template = document.getElementById(`tpl-${pageId}`);
    const titleDisplay = document.getElementById('page-display-title');
    
    // Clear selection modes ONLY when truly switching to a DIFFERENT page
    // This allows toggleSelectionMode to refresh the current page without losing the state
    if (!window.location.hash || window.location.hash.replace('#', '') !== pageId) {
        STATE.uiSelectionMode = {};
    }
    
    if (!template) return;

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.nav-link[data-page="${pageId}"]`);
    if (activeLink) activeLink.classList.add('active');

    const rawTitle = activeLink ? activeLink.querySelector('span').textContent : 'DASBOR';
    const branchSuffix = STATE.currentUser.branch === 'ALL' ? 'PUSAT' : STATE.currentUser.branch;
    titleDisplay.textContent = `${rawTitle.toUpperCase()} ${branchSuffix}`;

    contentArea.innerHTML = '';
    contentArea.appendChild(template.content.cloneNode(true));

    // Inject Global Branch Filter if user has ALL access
    const globalFilter = renderGlobalBranchFilter();
    if (globalFilter) {
        const header = contentArea.querySelector('.header-actions');
        if (header) {
            header.insertAdjacentHTML('afterbegin', globalFilter);
        }
    }
    
    // Register page specific renderers here
    const renderers = {
        'dashboard': renderDashboard,
        'products': renderProducts,
        'penebusan': renderPenebusan,
        'pengeluaran': renderPengeluaran,
        'penyaluran': renderPenyaluran,
        'payments': renderPayments,
        'reports': renderReports,
        'users': () => { renderUsers(); renderDrivers(); },
        'settings': renderSettings,
        'orders_kiosk': renderOrdersKiosk,
        'approvals': renderApprovals,
        'kiosks': renderKiosks,
        'kas_angkutan': renderKasAngkutan,
        'kas_umum': renderKasUmum
    };

    if (renderers[pageId]) renderers[pageId]();
    if (typeof lucide !== 'undefined') lucide.createIcons();
    updateSidebarBadges();
}

function updateSidebarBadges() {
    const approvalBadge = document.getElementById('approval-badge');
    const paymentBadge = document.getElementById('payment-badge');
    
    // 1. APPROVAL BADGE (RED)
    if (approvalBadge) {
        const approvalCount = STATE.orders.filter(o => {
            if (o.status !== 'MENUNGGU PERSETUJUAN') return false;
            if (STATE.currentUser.branch === 'ALL') {
                return STATE.activeBranchFilter === 'ALL' || o.branch === STATE.activeBranchFilter;
            }
            return o.branch === STATE.currentUser.branch;
        }).length;

        if (approvalCount > 0) {
            approvalBadge.textContent = approvalCount;
            approvalBadge.style.display = 'flex';
        } else {
            approvalBadge.style.display = 'none';
        }
    }

    // 2. PAYMENT BADGE (BLUE)
    if (paymentBadge) {
        const paymentCount = STATE.orders.filter(o => {
            if (o.status !== 'MENUNGGU KONFIRMASI PEMBAYARAN') return false;
            if (STATE.currentUser.branch === 'ALL') {
                return STATE.activeBranchFilter === 'ALL' || o.branch === STATE.activeBranchFilter;
            }
            return o.branch === STATE.currentUser.branch;
        }).length;

        if (paymentCount > 0) {
            paymentBadge.textContent = paymentCount;
            paymentBadge.classList.add('blue');
            paymentBadge.style.display = 'flex';
        } else {
            paymentBadge.style.display = 'none';
        }
    }
}

// Modal System
function openModal(title, content, width = '500px') {
    const modal = document.getElementById('modal-container');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const contentEl = modal ? modal.querySelector('.modal-content') : null;
    
    if (modal && titleEl && bodyEl) {
        titleEl.innerHTML = title;
        bodyEl.innerHTML = content;
        if (contentEl) contentEl.style.maxWidth = width;
        modal.style.display = 'flex';
        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Auto-focus the first enabled input or button
        setTimeout(() => {
            const focusable = bodyEl.querySelector('input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
            if (focusable) focusable.focus();
        }, 100);
    }
}

function closeModal() {
    const modal = document.getElementById('modal-container');
    if (modal) modal.style.display = 'none';
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openSuccessModal(title, message) {
    const modal = document.getElementById('success-modal');
    if (!modal) return;
    
    modal.querySelector('.success-title').textContent = title;
    modal.querySelector('.success-message').innerHTML = message;
    modal.classList.add('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Auto-focus the "Mengerti" button so user can press Enter
    const successBtn = modal.querySelector('.success-btn');
    if (successBtn) {
        setTimeout(() => successBtn.focus(), 100);
    }
}

function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) modal.classList.remove('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openErrorModal(title, message) {
    const modal = document.getElementById('error-modal');
    if (!modal) return;
    
    modal.querySelector('.success-title').textContent = title;
    modal.querySelector('.success-message').innerHTML = message;
    modal.classList.add('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Auto-focus the "Tutup" button so user can press Enter
    const closeBtn = modal.querySelector('.success-btn');
    if (closeBtn) {
        setTimeout(() => closeBtn.focus(), 100);
    }
}

function closeErrorModal() {
    const modal = document.getElementById('error-modal');
    if (modal) modal.classList.remove('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Toast System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'check-circle' : 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Initialization Helpers
function updateHeaderUserInfo() {
    const nameEl = document.getElementById('header-user-name');
    const roleEl = document.getElementById('header-user-role');
    if (nameEl && roleEl) {
        nameEl.textContent = STATE.currentUser.name;
        roleEl.textContent = STATE.currentUser.role;
        roleEl.className = `badge ${STATE.currentUser.role.toLowerCase()}`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function applyRolePermissions() {
    const role = STATE.currentUser.role;
    if (role === 'OWNER') {
        document.querySelectorAll('.nav-link').forEach(el => el.parentElement.style.display = 'block');
        document.querySelectorAll('.group-label').forEach(el => el.style.display = 'block');
        return;
    }

    const allowedPages = STATE.permissions[role] || [];
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    
    navLinks.forEach(link => {
        const page = link.getAttribute('data-page');
        let isAllowed = allowedPages.includes(page) || page === 'settings';
        
        // Dashboard is hidden for KIOSK role
        if (page === 'dashboard' && role !== 'KIOS') {
            isAllowed = true;
        }

        link.parentElement.style.display = isAllowed ? 'block' : 'none';
    });

    document.querySelectorAll('.group-label').forEach(label => {
        let sibling = label.nextElementSibling;
        let hasVisible = false;
        while (sibling && !sibling.classList.contains('group-label')) {
            if (sibling.style.display !== 'none') hasVisible = true;
            sibling = sibling.nextElementSibling;
        }
        label.style.display = hasVisible ? 'block' : 'none';
    });
}

function toggleDropdown(event) {
    event.stopPropagation();
    const dropdown = event.currentTarget.querySelector('.dropdown-content');
    
    // Close others
    document.querySelectorAll('.dropdown-content.show').forEach(d => {
        if (d !== dropdown) d.classList.remove('show');
    });

    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}
