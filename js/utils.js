function formatCurrency(val) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(val || 0);
}

function formatDate(isoDate) {
    if (!isoDate) return '-';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function calculateStock(productName) {
    if (!STATE.pengeluaran || !STATE.penyaluran) return 0;
    
    const totalOut = STATE.pengeluaran
        .filter(p => p.product === productName)
        .reduce((sum, item) => sum + (parseFloat(item.keluar) || 0), 0);
    
    const totalDispatched = STATE.penyaluran
        .filter(p => p.product === productName && p.status !== 'MENUNGGU PENGIRIMAN')
        .reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
        
    return totalOut - totalDispatched;
}

function getFilteredData(type) {
    const user = STATE.currentUser;
    if (!user) return [];
    
    let data = STATE[type] || [];
    if (!Array.isArray(data)) return [];

    // Use activeBranchFilter if user has ALL access, otherwise use their assigned branch
    const filterBranch = (user.branch === 'ALL') ? (STATE.activeBranchFilter || 'ALL') : user.branch;
    
    if (filterBranch === 'ALL') return data;
    
    // Restricted filtering
    return data.filter(d => {
        let rawBranch = d.branch;
        if (rawBranch === 'ALL' && d.kabupaten) rawBranch = d.kabupaten;
        
        let itemBranch = (rawBranch || d.kabupaten || '').trim().toUpperCase();
        if (itemBranch === '') itemBranch = 'MAGETAN'; // Fallback for old data without branch

        const filterBranchUpper = filterBranch.toUpperCase();

        if (filterBranchUpper === 'ALL') return true;
        if (itemBranch === 'ALL') return true;
        
        return itemBranch === filterBranchUpper;
    });
}

function updateGlobalBranchFilter(val) {
    STATE.activeBranchFilter = val;
    saveState();
    
    // Rerender current page
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
}

function renderGlobalBranchFilter() {
    const user = STATE.currentUser;
    const role = (user.role || '').toUpperCase();
    if (user.branch !== 'ALL' || !['OWNER', 'MANAJER'].includes(role)) return '';

    const current = STATE.activeBranchFilter || 'ALL';
    
    return `
        <div class="global-branch-filter" style="display: flex; align-items: center; gap: 10px; background: #f1f5f9; padding: 5px 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <i data-lucide="filter" style="width: 14px; color: var(--text-dim);"></i>
            <span style="font-size: 0.75rem; font-weight: 600; color: var(--text-dim); text-transform: uppercase;">Filter Wilayah:</span>
            <select onchange="updateGlobalBranchFilter(this.value)" style="border: none; background: transparent; font-weight: 700; color: var(--primary); cursor: pointer; padding: 2px 5px; outline: none; font-size: 0.85rem;">
                <option value="ALL" ${current === 'ALL' ? 'selected' : ''}>SEMUA WILAYAH</option>
                ${(STATE.settings?.branches || ['MAGETAN', 'SRAGEN']).map(b => 
                    `<option value="${b}" ${current === b ? 'selected' : ''}>${b}</option>`
                ).join('')}
            </select>
        </div>
    `;
}

function paginateData(data, page) {
    const limit = STATE.rowLimits[page] || 10;
    if (limit === 'all') return data;
    return data.slice(0, parseInt(limit));
}
function renderBranchSelector(name = 'branch', selectedBranch = '', label = 'Cabang', includeAll = false) {
    const user = STATE.currentUser;
    const isRestricted = !['OWNER', 'MANAJER'].includes(user.role.toUpperCase());
    
    // Default branch for the selector
    let finalBranch = selectedBranch || (user.branch === 'ALL' ? 'MAGETAN' : user.branch);
    if (finalBranch === 'ALL' && isRestricted) finalBranch = user.branch;

    // We only show the read-only view if the user is truly restricted AND it's not for a selection
    // But in most cases like product/user creation, we want the dropdown restricted to their branch
    if (isRestricted && user.branch !== 'ALL' && !includeAll) {
        return `
            <div class="form-group">
                <label>${label}</label>
                <div style="padding: 10px; background: #f1f5f9; border-radius: 6px; font-weight: 600; color: var(--primary); border: 1px solid var(--border); opacity: 0.8;">
                    ${finalBranch === 'ALL' ? 'SEMUA CABANG' : finalBranch}
                </div>
                <input type="hidden" name="${name}" value="${finalBranch}">
            </div>
        `;
    }

    return `
        <div class="form-group">
            <label>${label}</label>
            <select name="${name}" required>
                ${(includeAll && !isRestricted) ? `<option value="ALL" ${selectedBranch === 'ALL' ? 'selected' : ''}>SEMUA CABANG</option>` : ''}
                ${(STATE.settings?.branches || ['MAGETAN', 'SRAGEN']).map(b => 
                    `<option value="${b}" ${finalBranch === b ? 'selected' : ''}>${b}</option>`
                ).join('')}
            </select>
        </div>
    `;
}

function renderRowLimitSelector(page) {
    const currentLimit = STATE.rowLimits[page] || 10;
    return `
        <div class="table-header-controls">
            <div class="row-limit-selector">
                Tampilkan 
                <select onchange="updateRowLimit('${page}', this.value)">
                    <option value="10" ${currentLimit == 10 ? 'selected' : ''}>10</option>
                    <option value="50" ${currentLimit == 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${currentLimit == 100 ? 'selected' : ''}>100</option>
                    <option value="all" ${currentLimit == 'all' ? 'selected' : ''}>Semua</option>
                </select>
                data per halaman
            </div>
        </div>
    `;
}

function updateRowLimit(page, value) {
    STATE.rowLimits[page] = value;
    saveState();
    
    // Rerender specifically the current page
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
}

function renderTableFooter(total, shown) {
    return `
        <div class="table-footer-info">
            Menampilkan ${shown} dari ${total} total data
        </div>
    `;
}

function formatNumberInput(value) {
    if (!value) return '';
    const cleanValue = value.toString().replace(/\D/g, '');
    if (!cleanValue) return '';
    return new Intl.NumberFormat('id-ID').format(cleanValue);
}

function parseNumberInput(value) {
    if (!value) return 0;
    return parseFloat(value.toString().replace(/\./g, '')) || 0;
}

// Excel Import/Export Logic
function exportToExcel(type) {
    let data = [];
    let filename = `tani_makmur_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Special handling for kiosks_dir which is a filtered 'users' view
    if (type === 'kiosks_dir') {
        data = STATE.users.filter(u => u.role === 'KIOS');
    } else {
        data = STATE[type] || [];
    }

    if (data.length === 0) {
        openErrorModal('EKSPOR GAGAL', 'Tidak ada data untuk diekspor.');
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, filename);
}

function triggerImport(type) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls, .csv';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) importFromExcel(type, file);
    };
    input.click();
}

function importFromExcel(type, file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            openErrorModal('IMPORT GAGAL', 'File kosong atau format tidak didukung.');
            return;
        }

        // Merge logic with data processing
        if (type === 'kiosks_dir') {
            const processedKiosks = jsonData.map(item => {
                // Determine name from various possible columns and trim values
                const rawName = String(item['NAMA KIOS'] || item.name || 'TANPA NAMA').trim();
                const baseUsername = String(item.username || rawName).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
                
                // Ensure Unique Username
                let finalUsername = baseUsername;
                let counter = 1;
                while (STATE.users.find(u => u.username === finalUsername)) {
                    finalUsername = baseUsername + counter;
                    counter++;
                }

                return {
                    name: rawName,
                    username: finalUsername,
                    password: String(item.password || item['PASSWORD'] || '123').trim(),
                    role: String(item['PERAN'] || item['ROLE'] || 'KIOS').trim().toUpperCase(),
                    branch: String(item['KABUPATEN'] || item.branch || 'MAGETAN').trim().toUpperCase(),
                    kecamatan: String(item['KECAMATAN'] || item.kecamatan || '').trim(),
                    desa: String(item['DESA'] || item.desa || '').trim(),
                    pic: String(item['PENANGGUNG JAWAB'] || item.pic || '').trim(),
                    phone: String(item['NOMOR TELEPON'] || item.phone || '').trim()
                };
            });
            STATE.users = [...STATE.users, ...processedKiosks];
        } else {
            // Generic import: also trim all keys and values
            const processedData = jsonData.map(row => {
                const cleanRow = {};
                Object.keys(row).forEach(k => {
                    let val = row[k];
                    cleanRow[k] = (typeof val === 'string') ? val.trim() : val;
                });
                return cleanRow;
            });
            STATE[type] = [...(STATE[type] || []), ...processedData];
        }

        saveState();
        openSuccessModal('IMPORT BERHASIL', `${jsonData.length} data telah berhasil diimpor ke sistem.`);
        
        // Refresh Current Page
        const currentHash = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(currentHash);
    };
    reader.readAsArrayBuffer(file);
}

function toggleSelectionMode(type) {
    if (!STATE.uiSelectionMode) STATE.uiSelectionMode = {};
    STATE.uiSelectionMode[type] = !STATE.uiSelectionMode[type];
    
    // Rerender current page
    const currentHash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(currentHash);
}

function bulkDelete(type) {
    const checked = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) return openErrorModal('HAPUS GAGAL', 'Pilih data yang akan dihapus!');
    
    if (confirm(`Hapus ${checked.length} data terpilih?`)) {
        // ID mapping based on type
        const idMap = {
            'products': 'code',
            'penebusan': 'do',
            'pengeluaran': 'id',
            'penyaluran': 'id',
            'users': 'username',
            'kiosks_dir': 'username',
            'kas_angkutan': 'id',
            'kas_umum': 'id'
        };

        const idField = idMap[type] || 'id';
        const targetState = (type === 'kiosks_dir') ? 'users' : type;

        STATE[targetState] = STATE[targetState].filter(item => {
            const val = item[idField];
            return !checked.includes(String(val));
        });

        saveState(true);
        STATE.uiSelectionMode[type] = false;
        const currentHash = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(currentHash);
        openSuccessModal('MASAL BERHASIL', `${checked.length} data telah dihapus.`);
    }
}

function toggleSelectAll(masterCheckbox) {
    const checkboxes = document.querySelectorAll('.row-checkbox');
    checkboxes.forEach(cb => cb.checked = masterCheckbox.checked);
}

function renderSelectionActions(type) {
    if (!STATE.uiSelectionMode) STATE.uiSelectionMode = {};
    const isSelectMode = STATE.uiSelectionMode[type];
    const container = document.getElementById(`${type}-selection-actions`);
    
    // Select all buttons that toggle this specific mode
    const toggleBtns = document.querySelectorAll(`button[onclick*="toggleSelectionMode('${type}')"]`);
    toggleBtns.forEach(btn => {
        if (isSelectMode) {
            btn.style.background = 'var(--primary)';
            btn.style.color = '#fff';
            btn.style.borderColor = 'var(--primary)';
            btn.innerHTML = `<i data-lucide="x"></i> BATAL PILIH`;
        } else {
            btn.style.background = '';
            btn.style.color = '';
            btn.style.borderColor = '';
            btn.innerHTML = `<i data-lucide="check-square"></i> PILIH`;
        }
    });

    if (!container) return;
    if (isSelectMode) {
        container.innerHTML = `
            <div style="background: #fff1f2; padding: 15px; border-radius: 10px; margin-bottom: 15px; display: flex; align-items: center; justify-content: space-between; border: 1px solid #fda4af; animation: slideDown 0.3s ease;">
                <div style="color: #be123c; font-weight: 700; display: flex; align-items: center; gap: 10px;">
                    <div style="width: 8px; height: 8px; background: #be123c; border-radius: 50%; animation: pulse 1s infinite;"></div>
                    MODE PILIH AKTIF: Pilih data pada tabel untuk penghapusan masal.
                </div>
                <div style="display: flex; gap: 10px;">
                    ${(type === 'kas_angkutan' || type === 'kas_umum') ? `
                        ${['OWNER', 'MANAJER'].includes(STATE.currentUser.role.toUpperCase()) ? `
                            <button class="action-btn primary" onclick="approveFinanceTransactions('${type}')" style="background: #10b981; border-color: #059669;">
                                <i data-lucide="check-circle"></i> SETUJUI (APPROVE)
                            </button>
                        ` : `
                            <button class="action-btn primary" onclick="submitFinanceForApproval('${type}')" style="background: #0ea5e9; border-color: #0284c7;">
                                <i data-lucide="send"></i> MINTA DANA (AJUKAN)
                            </button>
                        `}
                    ` : ''}
                    <button class="action-btn primary" onclick="bulkDelete('${type}')" style="background: #e11d48; border-color: #be123c; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.2);">
                        <i data-lucide="trash-2"></i> HAPUS TERPILIH
                    </button>
                    <button class="action-btn secondary" onclick="toggleSelectionMode('${type}')">TUTUP</button>
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } else {
        container.innerHTML = '';
    }
}


async function sendAutoNotification(to, message, label = 'Pesan', tgChatId = null) {
    if (!to && !tgChatId) return console.warn(`Penerima ${label} belum diatur (WA & TG)`);

    const apiBaseRaw = API_BASE.replace('/load-state', '');

    // 1. Send WhatsApp (if phone provided)
    if (to) {
        try {
            const response = await fetch(`${apiBaseRaw}/send-wa`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to, message })
            });
            const result = await response.json();
            if (result.status) console.log(`Bot WA: ${label} terkirim`);
        } catch (e) {}
    }

    // 2. Send Telegram (if TG Chat ID provided)
    const effectiveTgId = tgChatId || STATE.settings?.tg_owner_chat_id;
    if (effectiveTgId && STATE.settings?.tg_bot_token) {
        try {
            const response = await fetch(`${apiBaseRaw}/send-tg`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: effectiveTgId, message })
            });
            const result = await response.json();
            if (result.ok) console.log(`Bot TG: ${label} terkirim`);
        } catch (e) {}
    }

    showToast(`Bot: Notifikasi ${label} sedang dikirim...`);
}
