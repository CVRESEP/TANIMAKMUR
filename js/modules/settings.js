function renderSettings() {
    const container = document.getElementById('content-area');
    if (!container) return;
    
    const role = (STATE.currentUser.role || '').toUpperCase();
    
    // Update Profile Fields from State
    const nameInput = container.querySelector('input[placeholder="Administrator TM"]') || container.querySelector('.profile-name-input');
    const usernameInput = container.querySelector('input[placeholder="admin"]') || container.querySelector('.profile-username-input');
    const roleBadge = container.querySelector('.profile-role-badge');
    
    if (nameInput) nameInput.value = STATE.currentUser.name;
    if (usernameInput) {
        usernameInput.value = STATE.currentUser.username;
        usernameInput.readOnly = true;
    }
    if (roleBadge) {
        roleBadge.textContent = STATE.currentUser.role;
        roleBadge.className = `profile-role-badge badge ${STATE.currentUser.role.toLowerCase()}`;
    }

    if (role !== 'OWNER' && role !== 'ADMINISTRATOR' && role !== 'SUPER ADMIN') return;

    // Remove existing RBAC cards if any
    const existing = document.getElementById('rbac-section');
    if (existing) existing.remove();

    const rbacSection = document.createElement('div');
    rbacSection.id = 'rbac-section';
    rbacSection.style.marginTop = '20px';
    rbacSection.style.width = '100%';

    const modules = [
        { id: 'dashboard', name: 'Dashboard Monitoring' },
        { id: 'products', name: 'Daftar Produk' },
        { id: 'penebusan', name: 'Penebusan' },
        { id: 'pengeluaran', name: 'Pengeluaran DO' },
        { id: 'penyaluran', name: 'Penyaluran Kios' },
        { id: 'approvals', name: 'Persetujuan Pesanan' },
        { id: 'payments', name: 'Pembayaran' },
        { id: 'kiosks', name: 'Daftar Kios' },
        { id: 'orders_kiosk', name: 'Pesanan Saya (Halaman Kios)' },
        { id: 'kas_angkutan', name: 'Kas Angkutan' },
        { id: 'kas_umum', name: 'Kas Umum' },
        { id: 'reports', name: 'Laporan Ringkas' },
        { id: 'daily-report', name: 'Laporan Harian' },
        { id: 'users', name: 'Kelola Akun' }
    ];

    const roles = [
        { id: 'OWNER', name: 'OWNER (Pemilik Utama)' },
        { id: 'MANAJER', name: 'MANAJER (Manajer Operasional)' },
        { id: 'ADMIN', name: 'ADMIN (Staf Administrasi)' },
        { id: 'KIOS', name: 'KIOS (Aplikasi Kios Tani)' }
    ];

    rbacSection.innerHTML = `
        <div class="card glass" style="margin-bottom: 20px;">
            <div style="padding: 20px; border-bottom: 1px solid var(--border); background: #f1f5f9;">
                <h3 style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);">KONTROL HAK AKSES SISTEM (RBAC)</h3>
                <p style="font-size: 0.85rem; color: var(--text-dim);">Tentukan fitur apa saja yang dapat dibuka oleh setiap level pengguna.</p>
            </div>
            
            <div style="padding: 24px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                    ${roles.map(r => `
                        <div style="background: white; border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
                            <div style="padding: 12px 15px; background: var(--bg-main); border-bottom: 1px solid var(--border); font-weight: 700; font-size: 0.85rem; color: var(--primary);">
                                ROLE: ${r.name}
                            </div>
                            <div style="padding: 15px; display: grid; gap: 10px;">
                                ${modules.map(mod => `
                                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 0.85rem;">
                                        <input type="checkbox" 
                                               class="rbac-checkbox-${r.id}"
                                               data-role="${r.id}"
                                               data-module="${mod.id}"
                                               ${(STATE.permissions[r.id] || []).includes(mod.id) ? 'checked' : ''} 
                                               onchange="updateRolePermission('${r.id}', '${mod.id}', this.checked)">
                                        <span>${mod.name}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--border); display: flex; justify-content: center;">
                    <button class="action-btn primary" onclick="saveAllPermissions()" style="background: #1e40af; padding: 12px 40px; font-weight: 800; border-radius: 99px; height: auto;">
                        <i data-lucide="shield-check" style="width: 18px;"></i> SIMPAN SEMUA HAK AKSES
                    </button>
                </div>
            </div>
        </div>
    `;

    const waCard = document.createElement('div');
    waCard.style.marginTop = '20px';
    waCard.innerHTML = `
        <div class="card glass" style="margin-bottom: 20px;">
            <div style="padding: 20px; border-bottom: 1px solid var(--border); background: #f0fdf4;">
                <h3 style="font-size: 1.15rem; font-weight: 800; color: #15803d; display: flex; align-items: center; gap: 10px;">
                    <i data-lucide="message-circle"></i> KONFIGURASI WHATSAPP OWNER
                </h3>
                <p style="font-size: 0.85rem; color: #166534;">Atur nomor WhatsApp tujuan untuk menerima notifikasi Permohonan Dana Otomatis.</p>
            </div>
            <div style="padding: 24px;">
                <div style="max-width: 500px;">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-dim); margin-bottom: 8px;">NOMOR WHATSAPP OWNER (Format: 628xxx)</label>
                        <input type="text" id="setting-wa-number" value="${STATE.settings?.wa_number || ''}" 
                               style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; outline: none; font-weight: 600;"
                               placeholder="Contoh: 628123456789">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-dim); margin-bottom: 8px;">WHATSAPP API TOKEN (Fonnte)</label>
                        <input type="password" id="setting-wa-token" value="${STATE.settings?.wa_gateway_token || ''}" 
                               style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; outline: none; font-weight: 600;"
                               placeholder="Masukkan Token dari Fonnte.com">
                        <p style="font-size: 0.7rem; color: #166534; margin-top: 5px;">*Gunakan layanan <b>Fonnte</b> untuk pengiriman otomatis tanpa buka tab baru.</p>
                    </div>

                    <div style="margin-bottom: 20px; padding-top: 20px; border-top: 1px dashed #bbf7d0;">
                        <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #0369a1; margin-bottom: 8px;">TELEGRAM BOT TOKEN (Gratis & Unlimited)</label>
                        <input type="password" id="setting-tg-token" value="${STATE.settings?.tg_bot_token || ''}" 
                               style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; outline: none; font-weight: 600;"
                               placeholder="Contoh: 123456:ABC-DEF...">
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="display: block; font-size: 0.8rem; font-weight: 700; color: #0369a1; margin-bottom: 8px;">CHAT ID OWNER (TELEGRAM)</label>
                        <input type="text" id="setting-tg-chatid" value="${STATE.settings?.tg_owner_chat_id || ''}" 
                               style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; outline: none; font-weight: 600;"
                               placeholder="Contoh: 98765432">
                        <p style="font-size: 0.7rem; color: #64748b; margin-top: 5px;">*Cari di Telegram: <b>@userinfobot</b> untuk tau Chat ID Anda.</p>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button class="action-btn primary" onclick="updateWASetting()" style="background: #0284c7; border-color: #0369a1; flex: 1; justify-content: center; height: 45px; font-weight: 700;">
                            SIMPAN PENGATURAN
                        </button>
                        <button class="action-btn secondary" onclick="testTelegram()" style="border-color: #0369a1; color: #0369a1; background: #f0f9ff; flex: 1; justify-content: center; height: 45px; font-weight: 700;">
                            TEST TELEGRAM
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const companyCard = document.createElement('div');
    companyCard.style.marginTop = '20px';
    companyCard.innerHTML = `
        <div class="card glass" style="margin-bottom: 20px;">
            <div style="padding: 20px; border-bottom: 1px solid var(--border); background: #eff6ff;">
                <h3 style="font-size: 1.15rem; font-weight: 800; color: #1e40af; display: flex; align-items: center; gap: 10px;">
                    <i data-lucide="building-2"></i> DATA PERUSAHAAN & CABANG
                </h3>
                <p style="font-size: 0.85rem; color: #1e3a8a;">Atur identitas perusahaan dan kelola daftar cabang operasional.</p>
            </div>
            <div style="padding: 24px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
                    <div class="form-group">
                        <label>NAMA PERUSAHAAN</label>
                        <input type="text" id="setting-company-name" value="${STATE.settings?.company_name || 'TANI MAKMUR'}" 
                               style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px;">
                    </div>
                    <div class="form-group">
                        <label>LOGO URL (Opsional)</label>
                        <input type="text" id="setting-company-logo" value="${STATE.settings?.company_logo || ''}" 
                               style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px;"
                               placeholder="https://link-ke-logo.png">
                    </div>
                    <div class="form-group" style="grid-column: span 2;">
                        <label>ALAMAT PUSAT / HEAD OFFICE</label>
                        <textarea id="setting-company-address" 
                                  style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 8px; min-height: 80px;">${STATE.settings?.company_address || ''}</textarea>
                    </div>
                </div>

                <div style="border-top: 1px solid var(--border); padding-top: 20px;">
                    <label style="display: block; font-size: 0.9rem; font-weight: 800; color: var(--text-main); margin-bottom: 15px;">DAFTAR CABANG OPERASIONAL</label>
                    <div id="branch-list-container" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px;">
                        ${(STATE.settings?.branches || []).map(b => `
                            <div class="badge" style="padding: 8px 15px; background: #dbeafe; color: #1e40af; font-weight: 700; border: 1px solid #bfdbfe; display: flex; align-items: center; gap: 8px;">
                                ${b}
                                <i data-lucide="x" style="width: 14px; cursor: pointer;" onclick="removeBranch('${b}')"></i>
                            </div>
                        `).join('')}
                    </div>
                    <div style="display: flex; gap: 10px; max-width: 400px;">
                        <input type="text" id="new-branch-input" placeholder="Nama Kabupaten/Cabang Baru" 
                               style="flex: 1; padding: 10px; border: 1px solid var(--border); border-radius: 8px;">
                        <button class="action-btn primary" onclick="addBranch()">TAMBAH</button>
                    </div>
                </div>

                <button class="action-btn primary" onclick="updateCompanySetting()" style="background: #1e40af; margin-top: 30px; width: 100%; justify-content: center; height: 48px;">
                    SIMPAN IDENTITAS PERUSAHAAN
                </button>
            </div>
        </div>
    `;

    container.appendChild(companyCard);
    container.appendChild(waCard);
    container.appendChild(rbacSection);
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateWASetting() {
    const num = document.getElementById('setting-wa-number').value.replace(/[^0-9]/g, '');
    const waToken = document.getElementById('setting-wa-token').value.trim();
    const tgToken = document.getElementById('setting-tg-token').value.trim();
    const tgChatId = document.getElementById('setting-tg-chatid').value.trim();
    
    if (!STATE.settings) STATE.settings = {};
    STATE.settings.wa_number = num;
    STATE.settings.wa_gateway_token = waToken;
    STATE.settings.tg_bot_token = tgToken;
    STATE.settings.tg_owner_chat_id = tgChatId;
    
    saveState();
    showToast('Pengaturan Notifikasi (WA & Telegram) diperbarui.');
}

function updateRolePermission(roleId, moduleId, isChecked) {
    if (!STATE.permissions[roleId]) STATE.permissions[roleId] = [];
    
    if (isChecked) {
        if (!STATE.permissions[roleId].includes(moduleId)) {
            STATE.permissions[roleId].push(moduleId);
        }
    } else {
        STATE.permissions[roleId] = STATE.permissions[roleId].filter(id => id !== moduleId);
    }
}

function saveAllPermissions() {
    saveState();
    showToast(`Semua hak akses berhasil disimpan ke server cloud.`);
}

function downloadBackup() {
    const dataStr = JSON.stringify(STATE, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tani_makmur_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function updateCompanySetting() {
    const name = document.getElementById('setting-company-name').value.trim();
    const logo = document.getElementById('setting-company-logo').value.trim();
    const address = document.getElementById('setting-company-address').value.trim();
    
    if (!STATE.settings) STATE.settings = {};
    STATE.settings.company_name = name;
    STATE.settings.company_logo = logo;
    STATE.settings.company_address = address;
    
    saveState();
    showToast('Data identitas perusahaan berhasil diperbarui.');
}

function addBranch() {
    const input = document.getElementById('new-branch-input');
    const branchName = input.value.trim().toUpperCase();
    
    if (!branchName) return;
    if (!STATE.settings) STATE.settings = { branches: [] };
    if (!STATE.settings.branches) STATE.settings.branches = [];
    
    if (STATE.settings.branches.includes(branchName)) {
        return openErrorModal('CABANG SUDAH ADA', 'Nama cabang tersebut sudah terdaftar.');
    }
    
    STATE.settings.branches.push(branchName);
    saveState();
    input.value = '';
    renderSettings();
    showToast(`Cabang ${branchName} berhasil ditambahkan.`);
}

function removeBranch(branchName) {
    const usageCount = 
        STATE.users.filter(u => u.branch === branchName).length +
        STATE.products.filter(p => p.branch === branchName).length;

    if (usageCount > 0) {
        return openErrorModal('HAPUS GAGAL', `Cabang ${branchName} tidak bisa dihapus karena masih digunakan oleh ${usageCount} data (Akun/Produk). Kosongkan data di cabang ini terlebih dahulu.`);
    }

    if (confirm(`Hapus cabang ${branchName}?`)) {
        STATE.settings.branches = STATE.settings.branches.filter(b => b !== branchName);
        saveState();
        renderSettings();
        showToast(`Cabang ${branchName} telah dihapus.`);
    }
}

async function testTelegram() {
    const tgToken = document.getElementById('setting-tg-token').value.trim();
    const tgChatId = document.getElementById('setting-tg-chatid').value.trim();
    
    if (!tgToken || !tgChatId) {
        return openErrorModal('DATA TIDAK LENGKAP', 'Mohon isi Token Bot dan Chat ID Owner terlebih dahulu.');
    }
    
    showToast('Sedang mengirim pesan tes...');
    
    // We update state temporarily for the test
    if (!STATE.settings) STATE.settings = {};
    STATE.settings.tg_bot_token = tgToken;
    STATE.settings.tg_owner_chat_id = tgChatId;

    try {
        await sendAutoNotification('', '🔔 TES NOTIFIKASI TANI MAKMUR\n\nJika Anda menerima pesan ini, berarti pengaturan Telegram Anda sudah BENAR.', 'Cek Telegram Anda...', tgChatId);
    } catch (e) {
        console.error(e);
    }
}
