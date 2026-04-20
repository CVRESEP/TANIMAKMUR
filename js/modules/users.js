// User Management Module
function renderUsers() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    renderSelectionActions('users');
    const isSelectMode = STATE.uiSelectionMode['users'];
    
    // Update Header
    const table = tbody.closest('table');
    const thead = table.querySelector('thead tr');
    if (thead) {
        const hasCheck = thead.querySelector('.col-check');
        if (isSelectMode && !hasCheck) {
            thead.insertAdjacentHTML('afterbegin', `
                <th class="col-check" style="width: 40px;">
                    <input type="checkbox" onclick="toggleSelectAll(this)">
                </th>
            `);
        } else if (!isSelectMode && hasCheck) {
            hasCheck.remove();
        }
    }

    // Filter out KIOS accounts as they are managed in Daftar Kios page
    const staffUsers = STATE.users.filter(u => u.role !== 'KIOS');

    tbody.innerHTML = staffUsers.map(u => `
        <tr>
            ${isSelectMode ? `<td>${u.username === 'admin' ? '' : `<input type="checkbox" class="row-checkbox" value="${u.username}">`}</td>` : ''}
            <td><strong>${u.username}</strong></td>
            <td>${u.name}</td>
            <td><span class="badge ${u.role.toLowerCase()}">${u.role}</span></td>
            <td>${u.branch}</td>
            <td>
                <div style="font-size: 0.75rem; color: #166534;">WA: ${u.phone || '-'}</div>
                <div style="font-size: 0.75rem; color: #0369a1;">TG ID: ${u.tg_chat_id || '-'}</div>
            </td>
            <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${u.username === 'admin' ? '********' : (u.password || '-')}</code></td>
            <td>
                <div style="display: flex; gap: 8px;">
                    <button class="action-btn small t-icon" title="Edit" onclick="openEditUserModal('${u.username}')" style="color: var(--primary);">
                        <i data-lucide="edit-3"></i>
                    </button>
                    ${u.username !== 'admin' ? `
                        <button class="action-btn small t-icon" title="Hapus" onclick="deleteUser('${u.username}')" style="color: #ff4d4d;">
                            <i data-lucide="trash-2"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
    
    lucide.createIcons();
}

function openAddUserModal() {
    const content = `
        <form onsubmit="saveUser(event)">
            <div class="form-group">
                <label>Username</label>
                <input type="text" name="username" required>
            </div>
            <div class="form-group">
                <label>Nama Lengkap</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>Role</label>
                <select name="role" required onchange="handleUserRoleChange(this)">
                    <option value="ADMIN" selected>ADMIN</option>
                    <option value="MANAJER">MANAJER</option>
                    <option value="OWNER">OWNER</option>
                </select>
            </div>
            <div class="form-group">
                <label>Password Akun</label>
                <input type="password" name="password" placeholder="Masukkan password login" required>
            </div>
            <div class="form-group">
                <label>Nomor WhatsApp (628xxx)</label>
                <input type="text" name="phone" placeholder="Contoh: 628123456789">
            </div>
            <div class="form-group">
                <label>Telegram Chat ID (Owner/Admin)</label>
                <input type="text" name="tg_chat_id" placeholder="Contoh: 12345678">
            </div>
            <div id="user-branch-container">
                ${renderBranchSelector('branch', 'MAGETAN', 'Cabang Penugasan', false)}
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center;">SIMPAN PENGGUNA</button>
        </form>
    `;
    openModal('Tambah Pengguna Baru', content);
}

// Helper to handle role-based branch logic
window.handleUserRoleChange = function(select) {
    const role = select.value;
    const container = document.getElementById('user-branch-container');
    if (!container) return;

    if (role === 'OWNER' || role === 'MANAJER') {
        // Auto set to ALL and show read-only info
        container.innerHTML = `
            <div class="form-group">
                <label>Cabang Penugasan</label>
                <div style="padding: 10px; background: #f1f5f9; border-radius: 6px; font-weight: 600; color: var(--primary); border: 1px solid var(--border); opacity: 0.8;">
                    SEMUA CABANG (Otomatis)
                </div>
                <input type="hidden" name="branch" value="ALL">
            </div>
        `;
    } else {
        // Admin must pick Magetan or Sragen
        container.innerHTML = renderBranchSelector('branch', '', 'Cabang Penugasan', false);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
};

function saveUser(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newUser = {
        username: fd.get('username').toLowerCase(),
        name: fd.get('name'),
        role: fd.get('role'),
        password: fd.get('password'),
        phone: fd.get('phone').replace(/[^0-9]/g, ''),
        tg_chat_id: fd.get('tg_chat_id').trim(),
        branch: fd.get('branch')
    };

    if (STATE.users.find(u => u.username === newUser.username)) {
        return openErrorModal('USERNAME TERPAKAI', 'Username yang Anda masukkan sudah digunakan oleh akun lain. Silakan gunakan username yang berbeda.');
    }

    STATE.users.push(newUser);
    saveState();
    closeModal();
    renderUsers();
    openSuccessModal('AKUN DIBUAT', `Akun <strong>${newUser.name}</strong> berhasil dibuat.`);
}

function openEditUserModal(username) {
    const u = STATE.users.find(user => user.username === username);
    if (!u) return;

    const content = `
        <form onsubmit="updateUser(event, '${username}')">
            <div class="form-group">
                <label>Username</label>
                <input type="text" value="${u.username}" disabled style="background: #f8fafc; color: #64748b;">
            </div>
            <div class="form-group">
                <label>Nama Lengkap</label>
                <input type="text" name="name" value="${u.name}" required>
            </div>
            <div class="form-group">
                <label>Role</label>
                <select name="role" required onchange="handleUserRoleChange(this)">
                    <option value="ADMIN" ${u.role === 'ADMIN' ? 'selected' : ''}>ADMIN</option>
                    <option value="MANAJER" ${u.role === 'MANAJER' ? 'selected' : ''}>MANAJER</option>
                    <option value="OWNER" ${u.role === 'OWNER' ? 'selected' : ''}>OWNER</option>
                </select>
            </div>
            <div class="form-group">
                <label>Password Akun</label>
                <input type="password" name="password" value="${u.password || ''}" placeholder="Masukkan password baru" required>
            </div>
            <div class="form-group">
                <label>Nomor WhatsApp (628xxx)</label>
                <input type="text" name="phone" value="${u.phone || ''}" placeholder="Contoh: 628123456789">
            </div>
            <div class="form-group">
                <label>Telegram Chat ID</label>
                <input type="text" name="tg_chat_id" value="${u.tg_chat_id || ''}" placeholder="Contoh: 12345678">
            </div>
            <div id="user-branch-container">
                ${(u.role === 'OWNER' || u.role === 'MANAJER') ? `
                    <div class="form-group">
                        <label>Cabang Penugasan</label>
                        <div style="padding: 10px; background: #f1f5f9; border-radius: 6px; font-weight: 600; color: var(--primary); border: 1px solid var(--border); opacity: 0.8;">
                            SEMUA CABANG (Otomatis)
                        </div>
                        <input type="hidden" name="branch" value="ALL">
                    </div>
                ` : renderBranchSelector('branch', u.branch, 'Cabang Penugasan', false)}
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center;">UPDATE PENGGUNA</button>
        </form>
    `;
    openModal(`Edit Akun: ${u.name}`, content);
}

function updateUser(e, username) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const userIndex = STATE.users.findIndex(u => u.username === username);
    
    if (userIndex !== -1) {
        STATE.users[userIndex] = {
            ...STATE.users[userIndex],
            name: fd.get('name'),
            role: fd.get('role'),
            password: fd.get('password'),
            phone: fd.get('phone').replace(/[^0-9]/g, ''),
            tg_chat_id: fd.get('tg_chat_id').trim(),
            branch: fd.get('branch')
        };
        
        saveState();
        closeModal();
        renderUsers();
        openSuccessModal('PERUBAHAN DISIMPAN', `Data akun <strong>${username}</strong> telah diperbarui.`);
    }
}

function deleteUser(username) {
    if (username === 'admin') return alert('Admin utama tidak bisa dihapus!');
    if (confirm('Hapus akun ' + username + '?')) {
        STATE.users = STATE.users.filter(u => u.username !== username);
        saveState();
        renderUsers();
        openSuccessModal('AKUN DIHAPUS', `Akun <strong>${username}</strong> berhasil dihapus dari sistem.`);
    }
}

// Driver Management
function renderDrivers() {
    const tbody = document.getElementById('drivers-table-body');
    if (!tbody) return;

    tbody.innerHTML = STATE.drivers.map(d => `
        <tr>
            <td><strong>${d.name}</strong></td>
            <td>${d.plat}</td>
            <td>
                <button class="action-btn small t-icon" title="Hapus" onclick="deleteDriver('${d.id}')" style="color: #ff4d4d;">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="3" style="text-align:center; padding: 20px; color: var(--text-dim);">Belum ada sopir terdaftar</td></tr>`;
    
    lucide.createIcons();
}

function openAddDriverModal() {
    const content = `
        <form onsubmit="saveDriver(event)">
            <div class="form-group">
                <label>Nama Sopir</label>
                <input type="text" name="name" placeholder="Masukkan nama lengkap" required>
            </div>
            <div class="form-group">
                <label>Nomor Plat Kendaraan</label>
                <input type="text" name="plat" placeholder="Contoh: AD 1234 XX" required>
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center;">DAFTARKAN SOPIR</button>
        </form>
    `;
    openModal('Tambah Sopir Master', content);
}

function saveDriver(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newDriver = {
        id: 'DRV-' + Date.now(),
        name: fd.get('name'),
        plat: fd.get('plat').toUpperCase()
    };

    STATE.drivers.push(newDriver);
    saveState();
    closeModal();
    renderDrivers();
    openSuccessModal('SOPIR TERDAFTAR', `Sopir <strong>${newDriver.name}</strong> dengan plat <strong>${newDriver.plat}</strong> berhasil ditambahkan.`);
}

function deleteDriver(id) {
    if (confirm('Hapus master data sopir ini?')) {
        STATE.drivers = STATE.drivers.filter(d => d.id !== id);
        saveState();
        renderDrivers();
        openSuccessModal('DATA DIHAPUS', 'Data sopir berhasil dihapus dari master.');
    }
}
