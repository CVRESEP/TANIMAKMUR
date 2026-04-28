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
    const pNameUpper = (productName || '').toUpperCase();
    
    const totalOut = STATE.pengeluaran
        .filter(p => (p.product || '').toUpperCase() === pNameUpper)
        .reduce((sum, item) => sum + (parseFloat(item.keluar) || 0), 0);
    
    const totalDispatched = STATE.penyaluran
        .filter(p => (p.product || '').toUpperCase() === pNameUpper && p.status !== 'MENUNGGU PENGIRIMAN')
        .reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
        
    return totalOut - totalDispatched;
}

function getFilteredData(type) {
    const user = STATE.currentUser;
    if (!user) return [];
    
    let data = STATE[type] || [];
    if (!Array.isArray(data)) return [];

    // 1. Filter Cabang (Branch Filter)
    const filterBranch = (user.branch === 'ALL') ? (STATE.activeBranchFilter || 'ALL') : user.branch;
    let filtered = data;
    
    if (filterBranch !== 'ALL') {
        filtered = filtered.filter(d => {
            const rawBranch = d.branch || d.kabupaten || '';
            const itemBranch = rawBranch.toString().trim().toUpperCase();
            const filterBranchUpper = filterBranch.toString().trim().toUpperCase();
            return itemBranch === filterBranchUpper;
        });
    }

    // 2. Filter Tanggal (Date Filter)
    if (STATE.globalDateFilter.start || STATE.globalDateFilter.end) {
        filtered = filtered.filter(d => {
            const itemDate = d.date || d.tanggal;
            if (!itemDate) return true; // Baris tanpa tanggal tetap muncul
            
            if (STATE.globalDateFilter.start && itemDate < STATE.globalDateFilter.start) return false;
            if (STATE.globalDateFilter.end && itemDate > STATE.globalDateFilter.end) return false;
            return true;
        });
    }

    // 3. Filter Pencarian (Search Filter)
    if (STATE.globalSearch) {
        const query = STATE.globalSearch.toLowerCase();
        filtered = filtered.filter(d => {
            return Object.values(d).some(val => 
                String(val).toLowerCase().includes(query)
            );
        });
    }

    // 4. Sorting Logic
    const { column, order } = STATE.sortConfig;
    if (column) {
        filtered.sort((a, b) => {
            let valA = a[column];
            let valB = b[column];

            // Handle date sorting
            if (column === 'date' || column === 'tanggal') {
                valA = new Date(valA || 0);
                valB = new Date(valB || 0);
            }

            // Handle numeric values
            if (!isNaN(valA) && !isNaN(valB)) {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            } else {
                valA = String(valA || '').toLowerCase();
                valB = String(valB || '').toLowerCase();
            }

            if (valA < valB) return order === 'asc' ? -1 : 1;
            if (valA > valB) return order === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return filtered;
}

function handleSort(column, type) {
    if (STATE.sortConfig.column === column) {
        STATE.sortConfig.order = STATE.sortConfig.order === 'asc' ? 'desc' : 'asc';
    } else {
        STATE.sortConfig.column = column;
        STATE.sortConfig.order = 'desc'; // Default to desc for new columns
    }
    
    saveState();
    
    // Rerender current view
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
    
    // Inject icons after render
    setTimeout(injectSortIcons, 50);
}

function injectSortIcons() {
    const headers = document.querySelectorAll('th[onclick*="handleSort"]');
    headers.forEach(th => {
        // Extract column name from onclick="handleSort('columnName')"
        const match = th.getAttribute('onclick').match(/handleSort\('([^']+)'\)/);
        if (match) {
            const col = match[1];
            // Remove any existing sort icons/placeholders
            const existingIcon = th.querySelector('.sort-icon');
            if (existingIcon) existingIcon.remove();
            
            // Clean template literals if they were accidentally rendered as text
            th.innerHTML = th.innerHTML.replace(/\$\{renderSortIcon\([^)]+\)\}/g, '').trim();
            
            // Add the new icon
            th.insertAdjacentHTML('beforeend', renderSortIcon(col));
        }
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderSortIcon(column) {
    if (STATE.sortConfig.column !== column) return '<i data-lucide="chevrons-up-down" class="sort-icon inactive"></i>';
    return STATE.sortConfig.order === 'asc' 
        ? '<i data-lucide="chevron-up" class="sort-icon active"></i>' 
        : '<i data-lucide="chevron-down" class="sort-icon active"></i>';
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

function paginateData(data, type) {
    const limit = STATE.rowLimits[type] || 10;
    if (limit === 'all') return data;
    
    const limitInt = parseInt(limit);
    const currentPage = STATE.currentPages[type] || 1;
    const startIndex = (currentPage - 1) * limitInt;
    
    // Ensure we don't return an empty page if data was deleted
    if (startIndex >= data.length && data.length > 0) {
        STATE.currentPages[type] = Math.ceil(data.length / limitInt);
        return paginateData(data, type);
    }
    
    return data.slice(startIndex, startIndex + limitInt);
}

function goToPage(type, page) {
    if (!STATE.currentPages) STATE.currentPages = {};
    
    STATE.currentPages[type] = page;
    
    // Simpan state agar posisi halaman tidak hilang saat refresh
    saveState();
    
    // Render ulang halaman saat ini
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
    
    // Scroll ke atas tabel agar user tahu data sudah berubah
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

function renderRowLimitSelector(type) {
    const currentLimit = STATE.rowLimits[type] || 10;
    return `
        <div class="table-header-controls" style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; background: #fff; padding: 20px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); border: 1px solid var(--border);">
            <!-- Row 1: Search & Date Filters -->
            <div style="display: flex; gap: 15px; flex-wrap: wrap; align-items: flex-end;">
                <div class="filter-group" style="flex: 1; min-width: 250px;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-dim); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">Cari Data</label>
                    <div style="position: relative;">
                        <i data-lucide="search" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 16px; color: var(--text-dim);"></i>
                        <input type="text" placeholder="Ketik nama kios, produk, atau nomor DO..." 
                               value="${STATE.globalSearch || ''}"
                               oninput="handleSearch(this.value)"
                               style="width: 100%; padding: 10px 15px 10px 40px; border-radius: 8px; border: 1px solid var(--border); outline: none; transition: border-color 0.2s; font-size: 0.9rem;">
                    </div>
                </div>
                
                <div class="filter-group" style="min-width: 150px;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-dim); margin-bottom: 8px; text-transform: uppercase;">Dari Tanggal</label>
                    <input type="date" value="${STATE.globalDateFilter.start || ''}" 
                           onchange="handleDateFilter('start', this.value)"
                           style="width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border); outline: none; font-size: 0.9rem;">
                </div>

                <div class="filter-group" style="min-width: 150px;">
                    <label style="display: block; font-size: 0.75rem; font-weight: 700; color: var(--text-dim); margin-bottom: 8px; text-transform: uppercase;">Sampai Tanggal</label>
                    <input type="date" value="${STATE.globalDateFilter.end || ''}" 
                           onchange="handleDateFilter('end', this.value)"
                           style="width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--border); outline: none; font-size: 0.9rem;">
                </div>

                <button class="action-btn" onclick="resetFilters()" style="height: 40px; background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; font-weight: 600;">
                    RESET FILTER
                </button>
            </div>

            <hr style="border: 0; border-top: 1px solid var(--border); margin: 0;">

            <!-- Row 2: Limit Selector -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="row-limit-selector" style="font-size: 0.85rem; color: var(--text-dim); display: flex; align-items: center; gap: 8px;">
                    Tampilkan 
                    <select onchange="updateRowLimit('${type}', this.value)" style="padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); font-weight: 700; color: var(--primary); outline: none; background: #f8fafc; cursor: pointer;">
                        <option value="10" ${currentLimit == 10 ? 'selected' : ''}>10</option>
                        <option value="50" ${currentLimit == 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${currentLimit == 100 ? 'selected' : ''}>100</option>
                        <option value="all" ${currentLimit == 'all' ? 'selected' : ''}>Semua</option>
                    </select>
                    baris data per halaman
                </div>
            </div>
        </div>
    `;
}

let searchTimer;
function handleSearch(val) {
    clearTimeout(searchTimer);
    // Store current value immediately so it's visible while debouncing
    STATE.globalSearch = val;
    searchTimer = setTimeout(() => {
        // Reset page ke 1 saat cari
        Object.keys(STATE.currentPages).forEach(k => STATE.currentPages[k] = 1);
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(hash);
        // Kembalikan fokus ke input pencarian setelah re-render
        setTimeout(() => {
            const searchInput = document.querySelector('.table-header-controls input[type="text"]');
            if (searchInput) {
                searchInput.focus();
                // Pindahkan cursor ke akhir teks
                const len = searchInput.value.length;
                searchInput.setSelectionRange(len, len);
            }
        }, 50);
    }, 350);
}

function handleDateFilter(type, val) {
    STATE.globalDateFilter[type] = val;
    Object.keys(STATE.currentPages).forEach(k => STATE.currentPages[k] = 1);
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
}

function resetFilters() {
    STATE.globalSearch = '';
    STATE.globalDateFilter = { start: '', end: '' };
    STATE.sortConfig = { column: 'date', order: 'desc' }; // Reset ke default tanggal
    Object.keys(STATE.currentPages).forEach(k => STATE.currentPages[k] = 1);
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
}

function updateRowLimit(type, value) {
    STATE.rowLimits[type] = value;
    STATE.currentPages[type] = 1; // Reset to page 1
    saveState();
    
    // Rerender specifically the current page
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
}

function renderTableFooter(type, total, shown) {
    const limit = STATE.rowLimits[type] || 10;
    const currentPage = STATE.currentPages[type] || 1;
    
    let paginationHtml = '';
    
    if (limit !== 'all' && total > parseInt(limit)) {
        const totalPages = Math.ceil(total / parseInt(limit));
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        if (endPage - startPage + 1 < maxVisible) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        paginationHtml = `
            <div class="pagination-controls" style="display: flex; gap: 5px; align-items: center;">
                <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToPage('${type}', ${currentPage - 1})" style="padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border); background: #fff; cursor: ${currentPage === 1 ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === 1 ? '0.5' : '1'};">
                    <i data-lucide="chevron-left" style="width: 14px; height: 14px;"></i>
                </button>
                
                ${startPage > 1 ? `
                    <button class="pagination-btn" onclick="goToPage('${type}', 1)" style="padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border); background: #fff;">1</button>
                    ${startPage > 2 ? '<span style="color: var(--text-dim);">...</span>' : ''}
                ` : ''}

                ${Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(p => `
                    <button class="pagination-btn ${p === currentPage ? 'active' : ''}" onclick="goToPage('${type}', ${p})" style="padding: 5px 10px; border-radius: 6px; border: 1px solid ${p === currentPage ? 'var(--primary)' : 'var(--border)'}; background: ${p === currentPage ? 'var(--primary)' : '#fff'}; color: ${p === currentPage ? '#fff' : 'var(--text-main)'}; font-weight: ${p === currentPage ? '700' : '500'};">
                        ${p}
                    </button>
                `).join('')}

                ${endPage < totalPages ? `
                    ${endPage < totalPages - 1 ? '<span style="color: var(--text-dim);">...</span>' : ''}
                    <button class="pagination-btn" onclick="goToPage('${type}', ${totalPages})" style="padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border); background: #fff;">${totalPages}</button>
                ` : ''}

                <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToPage('${type}', ${currentPage + 1})" style="padding: 5px 10px; border-radius: 6px; border: 1px solid var(--border); background: #fff; cursor: ${currentPage === totalPages ? 'not-allowed' : 'pointer'}; opacity: ${currentPage === totalPages ? '0.5' : '1'};">
                    <i data-lucide="chevron-right" style="width: 14px; height: 14px;"></i>
                </button>
            </div>
        `;
    }

    const startIndex = limit === 'all' ? 1 : (currentPage - 1) * parseInt(limit) + 1;
    const endIndex = limit === 'all' ? total : Math.min(total, currentPage * parseInt(limit));

    return `
        <div class="table-footer-info" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-top: 1px solid var(--border); margin-top: 10px; font-size: 0.85rem; color: var(--text-dim);">
            <div>
                Menampilkan <strong>${total > 0 ? startIndex : 0} - ${endIndex}</strong> dari <strong>${total}</strong> total data
            </div>
            ${paginationHtml}
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
        } else if (type === 'penebusan') {
            const processedPenebusan = jsonData.map(item => {
                const qtyVal = parseFloat(item['QTY (TON)'] || item.qty || item.QTY || item.jumlah || 0);
                const totalVal = parseFloat(item['TOTAL NILAI'] || item.total || item.TOTAL || 0);
                const hargaVal = parseFloat(item.harga || item.HARGA || 0);
                
                return {
                    do: String(item['NO DO'] || item['no do'] || item.do || item.DO || '').toUpperCase().trim(),
                    date: String(item['TANGGAL'] || item.tanggal || item.date || item.DATE || '').trim(),
                    kabupaten: String(item['KABUPATEN'] || item.kabupaten || item.branch || item.BRANCH || 'MAGETAN').toUpperCase().trim(),
                    branch: String(item['KABUPATEN'] || item.kabupaten || item.branch || item.BRANCH || 'MAGETAN').toUpperCase().trim(),
                    product: String(item['PRODUK'] || item.product || item.PRODUCT || '').toUpperCase().trim(),
                    qty: qtyVal,
                    harga: hargaVal,
                    total: totalVal,
                    notes: String(item['KETERANGAN'] || item.notes || item.NOTES || '').trim(),
                };
            });
            // Filter invalid records where DO might be completely empty
            const validData = processedPenebusan.filter(p => p.do !== '');
            STATE.penebusan = [...(STATE.penebusan || []), ...validData];
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
