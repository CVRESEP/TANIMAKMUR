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

/**
 * Pembulatan aman ke 2 angka desimal untuk menghindari floating point error.
 * Contoh: 4.9 - 4.8999999999999995 = 8.88e-16 → round2() = 0.00 ✅
 */
function round2(val) {
    return Math.round((parseFloat(val) || 0) * 100) / 100;
}

function initDatePickers() {
    if (typeof flatpickr === 'undefined') return;
    
    const inputs = document.querySelectorAll('input[type="date"], .datepicker');
    
    inputs.forEach(input => {
        if (input._flatpickr) {
            // Jika sudah diinisialisasi, pastikan tampilan benar jika nilai berubah
            if (input.value && input._flatpickr.currentDateStr !== input.value) {
                input._flatpickr.setDate(input.value, false);
            }
            return;
        }
        
        flatpickr(input, {
            dateFormat: "Y-m-d", 
            altInput: true,      
            altFormat: "d/m/Y",  
            altInputClass: "flatpickr-premium-input",
            allowInput: true,
            disableMobile: true,
            onReady: function(selectedDates, dateStr, instance) {
                // Sinkronisasi awal jika input memiliki nilai
                if (input.value) {
                    instance.setDate(input.value, false);
                }
            },
            onChange: function(selectedDates, dateStr, instance) {
                // Perbarui nilai input tersembunyi
                input.value = dateStr;
                
                // Pemicu event
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Tangani onchange inline
                const onchangeAttr = input.getAttribute('onchange');
                if (onchangeAttr) {
                    try {
                        const funcName = onchangeAttr.replace('()', '').trim();
                        if (typeof window[funcName] === 'function') {
                            window[funcName]();
                        } else {
                            new Function(onchangeAttr).call(input);
                        }
                    } catch (e) {}
                }
            }
        });
    });
}

function calculateStock(productName, branchName) {
    if (!STATE.pengeluaran || !STATE.penyaluran) return 0;
    const pNameUpper = (productName || '').toUpperCase();
    const branchUpper = (branchName || '').toUpperCase();
    
    const totalOut = STATE.pengeluaran
        .filter(p => 
            (p.product || '').toUpperCase() === pNameUpper && 
            (p.kabupaten || p.branch || '').toUpperCase() === branchUpper
        )
        .reduce((sum, item) => round2(sum + (parseFloat(item.keluar) || 0)), 0);
    
    const totalDispatched = STATE.penyaluran
        .filter(p => 
            (p.product || '').toUpperCase() === pNameUpper && 
            (p.branch || p.kabupaten || '').toUpperCase() === branchUpper &&
            p.status !== 'MENUNGGU PENGIRIMAN'
        )
        .reduce((sum, item) => round2(sum + (parseFloat(item.qty) || 0)), 0);
        
    return round2(totalOut - totalDispatched);
}

/**
 * Menghitung sisa penebusan yang belum dikeluarkan DO-nya ke gudang.
 * Sisa = Total Penebusan - Total Pengeluaran
 */
function calculateRemainingRedemption(productName, branchName) {
    if (!STATE.penebusan || !STATE.pengeluaran) return 0;
    const pNameUpper = (productName || '').toUpperCase();
    const branchUpper = (branchName || '').toUpperCase();
    
    const totalPurchased = STATE.penebusan
        .filter(p => 
            (p.product || '').toUpperCase() === pNameUpper && 
            (p.branch || p.kabupaten || '').toUpperCase() === branchUpper
        )
        .reduce((sum, item) => round2(sum + (parseFloat(item.qty) || 0)), 0);
        
    const totalOut = STATE.pengeluaran
        .filter(p => 
            (p.product || '').toUpperCase() === pNameUpper && 
            (p.kabupaten || p.branch || '').toUpperCase() === branchUpper
        )
        .reduce((sum, item) => round2(sum + (parseFloat(item.keluar) || 0)), 0);
        
    return round2(totalPurchased - totalOut);
}

function getFilteredData(type) {
    const user = STATE.currentUser;
    if (!user) return [];
    
    let data = STATE[type] || [];
    if (!Array.isArray(data)) return [];

    // 1. Filter Cabang
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

    // 2. Filter Tanggal
    const hasSelectedMonths = Array.isArray(STATE.globalDateFilter.selectedMonths);

    if (hasSelectedMonths || STATE.globalDateFilter.start || STATE.globalDateFilter.end) {
        filtered = filtered.filter(d => {
            const itemDate = d.date || d.tanggal;
            if (!itemDate) return true; 
            
            if (hasSelectedMonths) {
                // Jika array kosong, berarti pengguna menghapus semua centang secara eksplisit.
                if (STATE.globalDateFilter.selectedMonths.length === 0) return false;
                
                const itemMonth = String(itemDate).substring(0, 7); // YYYY-MM
                if (!STATE.globalDateFilter.selectedMonths.includes(itemMonth)) return false;
            }
            
            if (STATE.globalDateFilter.start && itemDate < STATE.globalDateFilter.start) return false;
            if (STATE.globalDateFilter.end && itemDate > STATE.globalDateFilter.end) return false;
            return true;
        });
    }

    // 3. Filter Pencarian
    if (STATE.globalSearch) {
        const query = STATE.globalSearch.toLowerCase();
        filtered = filtered.filter(d => {
            return Object.values(d).some(val => 
                String(val).toLowerCase().includes(query)
            );
        });
    }

    // 4. Logika Pengurutan
    const { column, order } = STATE.sortConfig;
    if (column) {
        filtered.sort((a, b) => {
            let valA = a[column];
            let valB = b[column];

            // Tangani pengurutan tanggal — string ISO YYYY-MM-DD diurutkan dengan benar sebagai string
            if (column === 'date' || column === 'tanggal') {
                valA = valA || '';
                valB = valB || '';
                if (valA < valB) return order === 'asc' ? -1 : 1;
                if (valA > valB) return order === 'asc' ? 1 : -1;
                return 0;
            }

            // Tangani nilai numerik
            const numA = parseFloat(valA);
            const numB = parseFloat(valB);
            if (!isNaN(numA) && !isNaN(numB)) {
                valA = numA;
                valB = numB;
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
    
    // Render ulang tampilan saat ini
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
    
    // Masukkan ikon setelah render
    setTimeout(injectSortIcons, 50);
}

function injectSortIcons() {
    const headers = document.querySelectorAll('th[onclick*="handleSort"]');
    headers.forEach(th => {
        // Ambil nama kolom dari onclick="handleSort('columnName')"
        const match = th.getAttribute('onclick').match(/handleSort\('([^']+)'\)/);
        if (match) {
            const col = match[1];
            // Hapus ikon/placeholder pengurutan yang ada
            const existingIcon = th.querySelector('.sort-icon');
            if (existingIcon) existingIcon.remove();
            
            // Bersihkan literal template jika tidak sengaja dirender sebagai teks
            th.innerHTML = th.innerHTML.replace(/\$\{renderSortIcon\([^)]+\)\}/g, '').trim();
            
            // Tambahkan ikon baru
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
    
    // Render ulang halaman saat ini
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
}

function renderGlobalBranchFilter() {
    const user = STATE.currentUser;
    const role = (user.role || '').toUpperCase();
    if (user.branch !== 'ALL' || !['OWNER', 'MANAJER'].includes(role)) return '';

    const current = STATE.activeBranchFilter || 'ALL';
    
    return `
        <div class="global-branch-filter" style="display: flex; align-items: center; gap: 6px; background: #f8fafc; padding: 2px 10px; border-radius: 6px; border: 1px solid #e2e8f0;">
            <i data-lucide="filter" style="width: 12px; color: var(--text-dim);"></i>
            <span style="font-size: 0.6rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.3px;">WILAYAH:</span>
            <select onchange="updateGlobalBranchFilter(this.value)" style="border: none; background: transparent; font-weight: 800; color: var(--primary); cursor: pointer; padding: 2px 0; outline: none; font-size: 0.75rem;">
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
    
    // Pastikan tidak mengembalikan halaman kosong jika data dihapus
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
    
    // Cabang default untuk selektor
    let finalBranch = selectedBranch || (user.branch === 'ALL' ? 'MAGETAN' : user.branch);
    if (finalBranch === 'ALL' && isRestricted) finalBranch = user.branch;

    // Kami hanya menampilkan tampilan baca-saja jika pengguna benar-benar dibatasi DAN ini bukan untuk pemilihan
    // Tetapi dalam kebanyakan kasus seperti pembuatan produk/pengguna, kami ingin dropdown dibatasi ke cabang mereka
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
    return `
        <div class="table-header-controls" style="position: relative; background: #fff; padding: 12px 16px; border: 1px solid var(--border); border-bottom: none; border-radius: 12px 12px 0 0; display: flex; flex-direction: column; gap: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 15px;">
                <!-- Kiri: Pencarian -->
                <div style="flex: 1; min-width: 200px; position: relative;">
                    <i data-lucide="search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; color: var(--primary); opacity: 0.6;"></i>
                    <input type="text" placeholder="Ketik untuk mencari data..." 
                           value="${STATE.globalSearch || ''}"
                           oninput="handleSearch(this.value)"
                           style="width: 100%; padding: 10px 15px 10px 42px; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; font-size: 0.85rem; outline: none; transition: all 0.2s;">
                </div>

                <!-- Tengah: Tombol Filter Bulan -->
                <div style="display: flex; justify-content: center; position: relative;">
                    <button onclick="toggleMonthTree(event)" class="action-btn" style="background: #fff; border: 1px solid var(--primary); border-radius: 10px; height: 38px; padding: 0 15px; font-weight: 700; font-size: 0.75rem; color: var(--primary); display: flex; align-items: center; gap: 8px; position: relative; z-index: 10001;">
                        <i data-lucide="calendar" style="width: 18px; height: 18px;"></i> 
                        Pilih Bulan
                        <i data-lucide="chevron-down" style="width: 14px;"></i>
                    </button>

                    <!-- Menu Dropdown Pohon Bulan Kompak (Sekarang tertambat ke tombol) -->
                    <div id="month-tree-dropdown" class="month-tree-menu ${STATE.uiMonthFilterExpanded ? 'show' : ''}" 
                         style="display: ${STATE.uiMonthFilterExpanded ? 'block' : 'none'}; position: absolute; top: calc(100% + 5px); left: 50%; transform: translateX(-50%); width: 240px; padding: 12px; border-radius: 10px; background: #fff; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15); z-index: 10000; border: 1px solid #e2e8f0; text-align: left;">
                        <div style="margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px;">
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.8rem; font-weight: 700; cursor: pointer; color: var(--primary);">
                        <input type="checkbox" id="all-months-checkbox" ${STATE.globalDateFilter.selectedMonths.length === 24 ? 'checked' : ''} onchange="handleAllMonthsCheckbox(this.checked)" style="width: 14px; height: 14px;">
                        Pilih Semua
                            </label>
                        </div>
                        
                        ${(() => {
                            if (!STATE.availableMonths || STATE.availableMonths.length === 0) updateAvailableMonths();
                            
                            // Kelompokkan bulan yang tersedia berdasarkan tahun
                            const yearsMap = {};
                            STATE.availableMonths.forEach(m => {
                                const y = m.split('-')[0];
                                if (!yearsMap[y]) yearsMap[y] = [];
                                yearsMap[y].push(m);
                            });

                            const sortedYears = Object.keys(yearsMap).sort().reverse();
                            const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

                            return sortedYears.map(year => {
                                const monthsInYear = yearsMap[year].sort();
                                const selectedInYear = monthsInYear.filter(m => STATE.globalDateFilter.selectedMonths.includes(m));
                                const isYearChecked = selectedInYear.length === monthsInYear.length;
                                const isExpanded = (STATE.uiExpandedYears || []).includes(parseInt(year));
                                
                                return `
                                    <div class="tree-node ${isExpanded ? 'expanded' : ''}" style="margin-bottom: 5px;">
                                        <div style="display: flex; align-items: center; gap: 5px;">
                                            <span onclick="toggleYearExpand(event, ${year})" style="cursor: pointer; font-weight: 800; color: #64748b; width: 15px; font-family: monospace; display: inline-block; text-align: center;">${isExpanded ? '-' : '+'}</span>
                                            <label style="display: flex; align-items: center; gap: 6px; font-weight: 800; font-size: 0.85rem; cursor: pointer;">
                                                <input type="checkbox" id="year-checkbox-${year}" ${isYearChecked ? 'checked' : ''} onchange="handleYearCheckbox(${year}, this.checked)" style="width: 14px; height: 14px;">
                                                ${year}
                                            </label>
                                        </div>
                                        <div class="tree-children" style="margin-left: 20px; display: ${isExpanded ? 'block' : 'none'}; border-left: 1px dashed #cbd5e1; padding-left: 8px;">
                                            ${monthsInYear.map(monthStr => {
                                                const monthIndex = parseInt(monthStr.split('-')[1]) - 1;
                                                const monthName = monthNames[monthIndex];
                                                const isMonthChecked = STATE.globalDateFilter.selectedMonths.includes(monthStr);
                                                return `
                                                    <label style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem; cursor: pointer; padding: 2px 0;">
                                                        <input type="checkbox" ${isMonthChecked ? 'checked' : ''} onchange="handleMonthCheckbox(${year}, ${monthIndex}, this.checked)" style="width: 12px; height: 12px;">
                                                        <span>${monthName}</span>
                                                    </label>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('');
                        })()}
                    </div>
                </div>

                <!-- Kanan: Rentang Tanggal & Reset -->
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="date-range-pill">
                        <span class="label">RENTANG</span>
                        <div class="date-input-group">
                            <i data-lucide="calendar"></i>
                            <input type="date" value="${STATE.globalDateFilter.start || ''}" 
                                   onchange="handleDateFilter('start', this.value)">
                        </div>
                        <span class="separator">|</span>
                        <div class="date-input-group">
                            <i data-lucide="calendar"></i>
                            <input type="date" value="${STATE.globalDateFilter.end || ''}" 
                                   onchange="handleDateFilter('end', this.value)">
                        </div>
                    </div>
                    <button class="action-btn" onclick="resetFilters()" style="background: #fff; border: 1px solid #e2e8f0; color: #64748b; border-radius: 12px; height: 42px; padding: 0 15px; font-weight: 700; font-size: 0.75rem; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: all 0.2s;">
                        <i data-lucide="refresh-cw" style="width: 14px;"></i> RESET
                    </button>
                </div>
            </div>

            </div>
        </div>
    `;
}

let searchTimer;
function handleSearch(val) {
    clearTimeout(searchTimer);
    STATE.globalSearch = val;
    searchTimer = setTimeout(() => {
        Object.keys(STATE.currentPages).forEach(k => STATE.currentPages[k] = 1);
        
        // Render ulang tabel saja, jangan reload seluruh DOM halaman
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        const renderers = {
            'dashboard': typeof renderDashboard === 'function' ? renderDashboard : null,
            'products': typeof renderProducts === 'function' ? renderProducts : null,
            'penebusan': typeof renderPenebusan === 'function' ? renderPenebusan : null,
            'pengeluaran': typeof renderPengeluaran === 'function' ? renderPengeluaran : null,
            'penyaluran': typeof renderPenyaluran === 'function' ? renderPenyaluran : null,
            'payments': typeof renderPayments === 'function' ? renderPayments : null,
            'reports': typeof renderReports === 'function' ? renderReports : null,
            'daily-report': typeof renderDailyReport === 'function' ? renderDailyReport : null,
            'users': () => { if(typeof renderUsers === 'function') renderUsers(); if(typeof renderDrivers === 'function') renderDrivers(); },
            'settings': typeof renderSettings === 'function' ? renderSettings : null,
            'orders_kiosk': typeof renderOrdersKiosk === 'function' ? renderOrdersKiosk : null,
            'approvals': typeof renderApprovals === 'function' ? renderApprovals : null,
            'kiosks': typeof renderKiosks === 'function' ? renderKiosks : null,
            'kas_angkutan': typeof renderKasAngkutan === 'function' ? renderKasAngkutan : null,
            'kas_umum': typeof renderKasUmum === 'function' ? renderKasUmum : null
        };
        
        if (renderers[hash]) {
            renderers[hash]();
            if (typeof injectSortIcons === 'function') injectSortIcons();
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } else {
            navigateTo(hash);
        }

        // Pastikan fokus kembali ke input yang baru dirender oleh fungsi di atas
        setTimeout(() => {
            const searchInput = document.querySelector('.table-header-controls input[type="text"]');
            if (searchInput) {
                searchInput.focus();
                const len = searchInput.value.length;
                searchInput.setSelectionRange(len, len);
            }
        }, 10);
    }, 250); // Dipercepat menjadi 250ms agar lebih responsif
}

function handleDateFilter(type, val) {
    STATE.globalDateFilter[type] = val;
    Object.keys(STATE.currentPages).forEach(k => STATE.currentPages[k] = 1);
    
    // Gunakan trik render parsial yang sama untuk date filter
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    handleSearch(STATE.globalSearch); // Panggil handleSearch untuk memicu render parsial
}

function handleMonthFilter(monthNum) {
    // Fungsi ini sekarang sudah usang karena pemilih pohon tetapi tetap dipertahankan untuk kompatibilitas jika diperlukan
    if (!monthNum) return;
    const year = new Date().getFullYear();
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(year, monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay}`;
    
    STATE.globalDateFilter.start = startDate;
    STATE.globalDateFilter.end = endDate;
    STATE.globalDateFilter.selectedMonths = []; // Clear tree selection when using range
    
    navigateToCurrentPage();
}

// Tree Selector Helpers
window.toggleMonthTree = function(e) {
    if (e) e.stopPropagation();
    STATE.uiMonthFilterExpanded = !STATE.uiMonthFilterExpanded;
    
    // Render ulang halaman untuk menampilkan/menyembunyikan area
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
};

document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('month-tree-dropdown');
    const trigger = e.target.closest('button[onclick*="toggleMonthTree"]');
    
    if (STATE.uiMonthFilterExpanded && dropdown && !dropdown.contains(e.target) && !trigger) {
        STATE.uiMonthFilterExpanded = false;
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(hash);
    }
});

window.toggleYearExpand = function(e, year) {
    e.stopPropagation();
    if (!STATE.uiExpandedYears) STATE.uiExpandedYears = [];
    
    if (STATE.uiExpandedYears.includes(year)) {
        STATE.uiExpandedYears = STATE.uiExpandedYears.filter(y => y !== year);
    } else {
        STATE.uiExpandedYears.push(year);
    }
    
    // Render ulang halaman saat ini secara khusus untuk mencerminkan ekspansi
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
};

window.handleMonthCheckbox = function(year, monthIndex, checked) {
    const monthStr = `${year}-${(monthIndex + 1).toString().padStart(2, '0')}`;
    
    if (checked) {
        if (!STATE.globalDateFilter.selectedMonths.includes(monthStr)) {
            STATE.globalDateFilter.selectedMonths.push(monthStr);
        }
    } else {
        STATE.globalDateFilter.selectedMonths = STATE.globalDateFilter.selectedMonths.filter(m => m !== monthStr);
    }
    
    // Hapus rentang jika bulan dipilih untuk menghindari konflik
    if (STATE.globalDateFilter.selectedMonths.length > 0) {
        STATE.globalDateFilter.start = '';
        STATE.globalDateFilter.end = '';
    }
    navigateToCurrentPage();
};

window.handleYearCheckbox = function(year, checked) {
    const monthsInYear = STATE.availableMonths.filter(m => m.startsWith(`${year}-`));
    
    if (checked) {
        monthsInYear.forEach(m => {
            if (!STATE.globalDateFilter.selectedMonths.includes(m)) {
                STATE.globalDateFilter.selectedMonths.push(m);
            }
        });
    } else {
        STATE.globalDateFilter.selectedMonths = STATE.globalDateFilter.selectedMonths.filter(m => !monthsInYear.includes(m));
    }
    
    if (STATE.globalDateFilter.selectedMonths.length > 0) {
        STATE.globalDateFilter.start = '';
        STATE.globalDateFilter.end = '';
    }
    navigateToCurrentPage();
};

window.handleAllMonthsCheckbox = function(checked) {
    if (checked) {
        STATE.globalDateFilter.selectedMonths = [...STATE.availableMonths];
        STATE.globalDateFilter.start = '';
        STATE.globalDateFilter.end = '';
    } else {
        STATE.globalDateFilter.selectedMonths = [];
    }
    navigateToCurrentPage();
};

function navigateToCurrentPage() {
    Object.keys(STATE.currentPages).forEach(k => STATE.currentPages[k] = 1);
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(hash);
}

function resetFilters() {
    STATE.globalSearch = '';
    STATE.globalDateFilter = { 
        start: '', 
        end: '', 
        selectedMonths: STATE.availableMonths.slice(0, 2)
    };
    STATE.uiExpandedYears = [];
    STATE.uiMonthFilterExpanded = false;
    STATE.sortConfig = { column: 'date', order: 'desc' };
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

window.updateAvailableMonths = function() {
    const months = new Set();
    const dataKeys = ['penebusan', 'pengeluaran', 'penyaluran', 'kas_angkutan', 'kas_umum'];
    
    dataKeys.forEach(key => {
        const data = STATE[key] || [];
        data.forEach(item => {
            const dateStr = item.date || item.tanggal;
            if (dateStr && typeof dateStr === 'string' && dateStr.length >= 7) {
                // Ensure format YYYY-MM
                const parts = dateStr.split('-');
                if (parts.length >= 2) {
                    months.add(`${parts[0]}-${parts[1].padStart(2, '0')}`);
                }
            }
        });
    });

    STATE.availableMonths = Array.from(months).sort().reverse();
    
    // Default ke 2 BULAN TERAKHIR dari data yang tersedia
    if (STATE.globalDateFilter.selectedMonths.length === 0 && STATE.availableMonths.length > 0) {
        STATE.globalDateFilter.selectedMonths = STATE.availableMonths.slice(0, 2);
    }
};

window.updateIndeterminateStates = function() {
    const allCount = STATE.globalDateFilter.selectedMonths.length;
    const availableCount = STATE.availableMonths.length;
    const allCheckbox = document.getElementById('all-months-checkbox');
    if (allCheckbox) {
        allCheckbox.indeterminate = (allCount > 0 && allCount < availableCount);
    }

    const years = [...new Set(STATE.availableMonths.map(m => m.split('-')[0]))];
    years.forEach(year => {
        const yearCheckbox = document.getElementById(`year-checkbox-${year}`);
        if (yearCheckbox) {
            const monthsInYear = STATE.availableMonths.filter(m => m.startsWith(`${year}-`));
            const selectedInYear = monthsInYear.filter(m => STATE.globalDateFilter.selectedMonths.includes(m));
            yearCheckbox.indeterminate = (selectedInYear.length > 0 && selectedInYear.length < monthsInYear.length);
        }
    });
};

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
        <div class="table-footer-info" style="display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-top: 1px solid var(--border); margin-top: 0; font-size: 0.8rem; color: var(--text-dim); background: #f8fafc;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <div>
                    Menampilkan <strong>${total > 0 ? startIndex : 0} - ${endIndex}</strong> dari <strong>${total}</strong> total data
                </div>
                <div style="display: flex; align-items: center; gap: 5px; border-left: 1px solid #e2e8f0; padding-left: 15px;">
                    Tampilkan:
                    <select onchange="updateRowLimit('${type}', this.value)" style="border: 1px solid #cbd5e1; background: #fff; font-weight: 700; color: var(--primary); cursor: pointer; padding: 2px 4px; border-radius: 4px; outline: none; font-size: 0.75rem;">
                        <option value="10" ${limit == 10 ? 'selected' : ''}>10</option>
                        <option value="50" ${limit == 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${limit == 100 ? 'selected' : ''}>100</option>
                        <option value="all" ${limit == 'all' ? 'selected' : ''}>Semua</option>
                    </select>
                </div>
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

// Logika Impor/Ekspor Excel
function exportToExcel(type) {
    let data = [];
    let filename = `tani_makmur_${type}_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Penanganan khusus untuk kiosks_dir yang merupakan tampilan 'pengguna' yang difilter
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
                // Tentukan nama dari berbagai kolom yang memungkinkan dan rapikan nilai
                const rawName = String(item['NAMA KIOS'] || item.name || 'TANPA NAMA').trim();
                const baseUsername = String(item.username || rawName).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
                
                // Pastikan Username Unik
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
            // Filter catatan tidak valid di mana DO mungkin benar-benar kosong
            const validData = processedPenebusan.filter(p => p.do !== '');
            STATE.penebusan = [...(STATE.penebusan || []), ...validData];
        } else {
            // Impor generik: juga rapikan semua kunci dan nilai
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
        
        // Muat Ulang Halaman Saat Ini
        const currentHash = window.location.hash.replace('#', '') || 'dashboard';
        navigateTo(currentHash);
    };
    reader.readAsArrayBuffer(file);
}

function toggleSelectionMode(type) {
    if (!STATE.uiSelectionMode) STATE.uiSelectionMode = {};
    STATE.uiSelectionMode[type] = !STATE.uiSelectionMode[type];
    
    // Render ulang halaman saat ini
    const currentHash = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(currentHash);
}

function bulkDelete(type) {
    const checked = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) return openErrorModal('HAPUS GAGAL', 'Pilih data yang akan dihapus!');
    
    if (confirm(`Hapus ${checked.length} data terpilih?`)) {
        // Pemetaan ID berdasarkan tipe
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
        const targetTable = (type === 'kiosks_dir') ? 'users' : type;

        // Gunakan deleteRecord untuk setiap ID terpilih agar sinkron ke server secara eksplisit
        checked.forEach(id => {
            deleteRecord(targetTable, id, idField);
        });
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
    
    // Pilih semua tombol yang mengaktifkan mode spesifik ini
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

    // 1. Kirim WhatsApp (jika nomor telepon disediakan)
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

    // 2. Kirim Telegram (jika ID Chat TG disediakan)
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
