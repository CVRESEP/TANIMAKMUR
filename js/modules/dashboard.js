// Main Dashboard View Module
function getDefaultWeekRange() {
    const now = new Date();
    const day = now.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
    };
}

function updateDashboardRange() {
    const startInput = document.getElementById('dash-start-date');
    const endInput = document.getElementById('dash-end-date');
    
    if (startInput && endInput) {
        if (!STATE.dashboardRange) STATE.dashboardRange = {};
        STATE.dashboardRange.start = startInput.value;
        STATE.dashboardRange.end = endInput.value;
        renderDashboard();
    }
}

function renderDashboard() {
    const statsGrid = document.getElementById('dashboard-stats-grid');
    const activityTitle = document.getElementById('dashboard-activity-title');
    const activityHead = document.getElementById('dashboard-activity-head');
    const activityBody = document.getElementById('recent-activity-body');
    
    // Date Range Setup
    if (!STATE.dashboardRange) {
        STATE.dashboardRange = getDefaultWeekRange();
    }

    const startInput = document.getElementById('dash-start-date');
    const endInput = document.getElementById('dash-end-date');
    const rangeDisplay = document.getElementById('range-label-display');

    if (startInput && endInput) {
        startInput.value = STATE.dashboardRange.start;
        endInput.value = STATE.dashboardRange.end;
    }
    
    if (rangeDisplay) {
        rangeDisplay.textContent = `${formatDate(STATE.dashboardRange.start)} - ${formatDate(STATE.dashboardRange.end)}`;
    }

    const { start, end } = STATE.dashboardRange;

    // Helper to check if date within range
    const isWithinRange = (dateStr) => {
        if (!dateStr) return false;
        return dateStr >= start && dateStr <= end;
    };

    if (!statsGrid || !activityBody) return;

    if (STATE.currentUser.role === 'KIOS') {
        // Kiosk Dashboard Logic
        const myOrders = STATE.orders.filter(o => o.kiosk === STATE.currentUser.name && isWithinRange(o.date));
        const totalOrdered = myOrders.reduce((sum, o) => sum + (parseFloat(o.qty) || 0), 0);
        const pendingCount = myOrders.filter(o => o.status === 'MENUNGGU PERSETUJUAN').length;
        const totalPaid = myOrders.filter(o => o.status === 'LUNAS').reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);

        const stats = [
            { title: 'TOTAL PESANAN', value: `${totalOrdered.toFixed(1)} TON`, color: 'var(--primary)', icon: 'shopping-bag' },
            { title: 'MENUNGGU PROSES', value: `${pendingCount}`, color: '#b45309', icon: 'clock' },
            { title: 'TOTAL PEMBAYARAN', value: formatCurrency(totalPaid), color: '#15803d', icon: 'credit-card' }
        ];

        statsGrid.innerHTML = stats.map(s => `
            <div class="card stat-card">
                <div class="stat-content">
                    <div class="card-title">${s.title}</div>
                    <div class="card-value" style="color: ${s.color}">${s.value}</div>
                </div>
                <div class="stat-icon" style="background: ${s.color}15; color: ${s.color}">
                    <i data-lucide="${s.icon}"></i>
                </div>
            </div>
        `).join('');

        activityTitle.textContent = 'Riwayat Transaksi Terakhir';
        activityHead.innerHTML = `
            <tr>
                <th>ID Pesanan</th>
                <th>Tanggal</th>
                <th>Produk</th>
                <th>Qty</th>
                <th>Status</th>
            </tr>
        `;
        activityBody.innerHTML = myOrders.slice(0, 8).map(o => `
            <tr>
                <td><code>${o.id}</code></td>
                <td>${formatDate(o.date)}</td>
                <td><strong>${o.product}</strong></td>
                <td>${o.qty} Ton</td>
                <td><span class="status-text ${o.status === 'LUNAS' ? 'lunas' : (o.status === 'MENUNGGU PERSETUJUAN' ? 'waiting' : 'process')}">${o.status}</span></td>
            </tr>
        `).join('') || `<tr><td colspan="5" align="center" style="padding:40px; color:var(--text-dim);">Belum ada riwayat pesanan di periode ini</td></tr>`;

    } else {
        // Distributor Dashboard Logic
        const user = STATE.currentUser;
        const isExecutive = ['OWNER', 'MANAJER'].includes(user.role.toUpperCase());
        
        const penebusanData = (isExecutive ? (STATE.penebusan || []) : getFilteredData('penebusan')).filter(p => isWithinRange(p.date));
        const ordersData = (isExecutive ? (STATE.orders || []) : getFilteredData('orders')).filter(o => isWithinRange(o.date));
        const penyaluranData = (isExecutive ? (STATE.penyaluran || []) : getFilteredData('penyaluran')).filter(p => isWithinRange(p.date));
        const pengeluaranFull = (STATE.pengeluaran || []).filter(ex => isWithinRange(ex.date));
        
        // 1. Get Product Categories mapping
        const productCategoryMap = {};
        const allProducts = STATE.products || [];
        allProducts.forEach(p => {
            productCategoryMap[p.name.toUpperCase()] = p.category || 'PUPUK';
        });

        // 2. Initial Setup
        const itemColors = {
            'UREA': '#10b981',   // Emerald
            'NPK': '#3b82f6',    // Blue
            'PHONSKA': '#f97316', // Orange
            'ZA': '#8b5cf6',      // Purple
            'ORGANIK': '#854d0e', // Brown
            'PETROGANIK': '#854d0e',
            'DEFAULT': '#64748b'
        };

        const productStats = {};
        
        // Initialize with all products from STATE.products, using code as key to distinguish same-name across branches
        (STATE.products || []).forEach(p => {
            const key = p.code; // Use code for uniqueness
            const displayName = `${p.name} (${p.branch})`;
            const colorName = (p.name || '').toUpperCase();
            
            if (!productStats[key]) {
                productStats[key] = { 
                    name: displayName,
                    qty: 0, val: 0, 
                    color: itemColors[colorName] || itemColors.DEFAULT,
                    category: p.category || 'PUPUK'
                };
            }
        });

        // Sisa DO filtering is tricky because Sisa DO is cumulative usually.
        // However, if the user picks a range, they might expect stats for that range.
        // For "SISA STOK DO", we use CURRENT stock regardless of range, 
        // OR we filter the transactions and calculate stock based on history.
        // Usually, a dashboard "Sisa DO" card shows REALTIME stock.
        // But "TERKIRIM" and finance should definitely be within range.
        
        penebusanData.forEach(p => {
            const prodName = (p.product || '').toUpperCase();
            const doNum = (p.do || '').toString().trim().toUpperCase();
            if (!doNum || !prodName) return;

            const targetProduct = (STATE.products || []).find(it => it.code === p.product || it.name.toUpperCase() === prodName);
            const key = targetProduct ? targetProduct.code : prodName;

            if (!productStats[key]) {
                productStats[key] = { 
                    name: targetProduct ? `${targetProduct.name} (${targetProduct.branch})` : prodName,
                    qty: 0, val: 0, 
                    color: itemColors[prodName] || itemColors.DEFAULT,
                    category: productCategoryMap[prodName] || 'PUPUK'
                };
            }

            const keluarUntukDO = pengeluaranFull.filter(ex => 
                (ex.do || '').toString().trim().toUpperCase() === doNum &&
                (ex.product || '').toUpperCase() === prodName
            );
            const qtyKeluar = keluarUntukDO.reduce((sum, ex) => sum + (parseFloat(ex.keluar) || 0), 0);
            
            const sisaInDO = Math.max(0, (parseFloat(p.qty) || 0) - qtyKeluar);
            productStats[key].qty += sisaInDO;
            if (p.qty > 0) {
                productStats[key].val += (sisaInDO / p.qty) * (p.total || 0);
            }
        });

        // 3. Group by Category
        const categories = {};
        Object.values(productStats).forEach((data) => {
            if (!categories[data.category]) categories[data.category] = [];
            categories[data.category].push(data);
        });

        // 4. Operational Stats
        const pendingOrders = ordersData.filter(o => o.status === 'MENUNGGU PERSETUJUAN').length;
        
        // Group penyaluran in range by product and branch
        const filteredPenyaluranData = penyaluranData.filter(p => p.status !== 'MENUNGGU PENGIRIMAN');
        
        const byproductBranch = {};
        const branches = STATE.settings?.branches || ['MAGETAN', 'SRAGEN'];
        const allProductNames = [...new Set((STATE.products || []).map(p => (p.name || '').toUpperCase().trim()))].filter(n => n);
        
        allProductNames.forEach(name => {
            byproductBranch[name] = {};
            branches.forEach(b => byproductBranch[name][b] = 0);
        });

        filteredPenyaluranData.forEach(p => {
            const prodRaw = (p.product || '').toUpperCase().trim();
            const branch = (p.branch || p.kabupaten || '').trim().toUpperCase();
            
            const info = (STATE.products || []).find(it => 
                it.code === prodRaw || (it.name && it.name.toUpperCase().trim() === prodRaw)
            );
            
            const finalName = info ? info.name.toUpperCase().trim() : prodRaw;
            const finalBranch = info ? (info.branch || info.kabupaten || '').trim().toUpperCase() : branch;

            if (finalName && branches.includes(finalBranch)) {
                if (!byproductBranch[finalName]) {
                    byproductBranch[finalName] = {};
                    branches.forEach(b => byproductBranch[finalName][b] = 0);
                }
                byproductBranch[finalName][finalBranch] += (parseFloat(p.qty) || 0);
            }
        });

        const penyaluranBreakdown = `
            <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px; border-top: 1px solid rgba(0,0,0,0.05); padding-top: 10px;">
                <div style="display: grid; grid-template-columns: repeat(${branches.length}, 1fr); gap: 10px; font-size: 0.55rem; font-weight: 800; color: var(--text-dim); text-transform: uppercase;">
                    ${branches.map(b => `<span>${b}</span>`).join('')}
                </div>
                ${Object.entries(byproductBranch).map(([name, data]) => {
                    const hasData = Object.values(data).some(v => v > 0);
                    if (!hasData) return '';
                    return `
                        <div style="display: grid; grid-template-columns: repeat(${branches.length}, 1fr); gap: 10px; align-items: center; background: rgba(0,0,0,0.02); padding: 6px 10px; border-radius: 4px;">
                            ${branches.map(b => `
                                <div style="font-size: 0.75rem; font-weight: 600;">
                                    <div style="font-size: 0.5rem; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</div>
                                    <span style="color: var(--primary);">${(data[b] || 0).toFixed(1)}</span>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        const totalPenyaluranQty = filteredPenyaluranData.reduce((acc, curr) => acc + (parseFloat(curr.qty) || 0), 0);
        
        const kasUmumRange = (isExecutive ? (STATE.kas_umum || []) : getFilteredData('kas_umum')).filter(k => isWithinRange(k.date));
        const kasAngkutRange = (isExecutive ? (STATE.kas_angkutan || []) : getFilteredData('kas_angkutan')).filter(k => isWithinRange(k.date));
        
        // Saldo is cumulative, but for a "Range" filter, maybe show "Starting Saldo", "Changes", "Ending Saldo"?
        // But usually "SALDO" in dashboard means current absolute balance.
        // Let's calculate balance based on ALL time for "SALDO", but "TOTAL KELUAR" should be range.
        const kasUmumFull = isExecutive ? (STATE.kas_umum || []) : getFilteredData('kas_umum');
        const kasAngkutFull = isExecutive ? (STATE.kas_angkutan || []) : getFilteredData('kas_angkutan');
        
        const saldoUmum = kasUmumFull.reduce((sum, item) => sum + (parseFloat(item.masuk) || 0) - (parseFloat(item.keluar) || 0), 0);
        const keluarUmumRange = kasUmumRange.reduce((sum, item) => sum + (parseFloat(item.keluar) || 0), 0);
        
        const saldoAngkut = kasAngkutFull.reduce((sum, item) => sum + (parseFloat(item.masuk) || 0) - (parseFloat(item.keluar) || 0), 0);
        const keluarAngkutRange = kasAngkutRange.reduce((sum, item) => sum + (parseFloat(item.keluar) || 0), 0);

        const financeStats = [
            { title: 'SALDO KAS UMUM', value: formatCurrency(saldoUmum), color: '#10b981', icon: 'wallet' },
            { title: 'PENGELUARAN UMUM', value: formatCurrency(keluarUmumRange), color: '#f59e0b', icon: 'minus-circle' },
            { title: 'SALDO KAS ANGKUTAN', value: formatCurrency(saldoAngkut), color: '#0ea5e9', icon: 'truck' },
            { title: 'PENGELUARAN ANGKUTAN', value: formatCurrency(keluarAngkutRange), color: '#ef4444', icon: 'minus-circle' }
        ];

        const operationalStats = [
            { 
                title: 'TOTAL TERKIRIM', 
                value: `<div style="font-size: 1.2rem;">${totalPenyaluranQty.toFixed(1)} TON</div>`, 
                extra: `<div style="margin-top: 8px;">${penyaluranBreakdown}</div>`,
                color: '#8b5cf6', 
                icon: 'send' 
            },
            { title: 'PESANAN PERIODE INI', value: `${ordersData.length} TOTAL`, color: '#f59e0b', icon: 'clipboard-list' }
        ];

        // Update HTML generation
        let dashboardHtml = `
            <!-- Keuangan Section -->
            <div class="dashboard-section-header">
                <i data-lucide="circle-dollar-sign" style="width: 20px; color: #10b981;"></i>
                <h3>RINGKASAN KEUANGAN</h3>
                <div class="line"></div>
            </div>
            <div class="section-grid">
                ${financeStats.map(s => `
                    <div class="card stat-card" style="border-left: 4px solid ${s.color}">
                        <div class="stat-content">
                            <div class="card-title">${s.title}</div>
                            <div class="card-value" style="color: ${s.color}">${s.value}</div>
                        </div>
                        <div class="stat-icon" style="background: ${s.color}15; color: ${s.color}">
                            <i data-lucide="${s.icon}"></i>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Operasional Section -->
            <div class="dashboard-section-header">
                <i data-lucide="activity" style="width: 20px; color: #8b5cf6;"></i>
                <h3>RINGKASAN OPERASIONAL</h3>
                <div class="line"></div>
            </div>
            <div class="section-grid">
                ${operationalStats.map(s => `
                    <div class="card stat-card" style="border-left: 4px solid ${s.color}">
                        <div class="stat-content">
                            <div class="card-title">${s.title}</div>
                            <div class="card-value" style="color: ${s.color}">${s.value}</div>
                            ${s.extra || ''}
                        </div>
                        <div class="stat-icon" style="background: ${s.color}15; color: ${s.color}">
                            <i data-lucide="${s.icon}"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        // SISA DO calculation (Using full data for real current stock)
        const groupedByProduct = {};
        (STATE.products || []).forEach(p => {
            const name = p.name.toUpperCase().trim();
            if (!groupedByProduct[name]) {
                groupedByProduct[name] = {
                    name: p.name,
                    MAGETAN: { qty: 0, val: 0, exists: false },
                    SRAGEN: { qty: 0, val: 0, exists: false },
                    color: getProductColor(p.name)
                };
            }
            const branch = (p.branch || p.kabupaten || '').trim().toUpperCase();
            const sisa = calculateStock(p.name);
            const nilai = sisa * (p.buyPrice || p.price || 0);

            if (branch === 'MAGETAN') {
                groupedByProduct[name].MAGETAN.qty = sisa;
                groupedByProduct[name].MAGETAN.val = nilai;
                groupedByProduct[name].MAGETAN.exists = true;
            } else if (branch === 'SRAGEN') {
                groupedByProduct[name].SRAGEN.qty = sisa;
                groupedByProduct[name].SRAGEN.val = nilai;
                groupedByProduct[name].SRAGEN.exists = true;
            }
        });

        const allSisaProducts = Object.values(groupedByProduct);

        if (allSisaProducts.length > 0) {
            dashboardHtml += `
                <div class="dashboard-section-header">
                    <i data-lucide="package" style="width: 20px; color: var(--primary);"></i>
                    <h3>SISA STOK DO SAAT INI</h3>
                    <div class="line"></div>
                </div>
                <div class="section-grid">
                    ${allSisaProducts.map(p => `
                        <div class="card stat-card compact" style="border-left: 4px solid ${p.color}; grid-column: span 1; min-width: 280px; padding: 12px;">
                            <div style="font-weight: 800; font-size: 0.85rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid rgba(0,0,0,0.05); padding-bottom: 5px;">
                                ${p.name}
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(${branches.length}, 1fr); gap: 10px;">
                                ${branches.map(b => {
                                    const bData = p[b] || { qty: 0, val: 0, exists: false };
                                    return `
                                        <div style="opacity: ${bData.exists ? '1' : '0.2'}; padding: 4px;">
                                            <div style="font-size: 0.55rem; font-weight: 700; color: var(--primary);">${b}</div>
                                            <div style="font-size: 0.9rem; font-weight: 800; margin: 2px 0;">${bData.qty.toFixed(1)} <span style="font-size: 0.6rem; font-weight: 400;">T</span></div>
                                            <div style="font-size: 0.65rem; color: var(--text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${formatCurrency(bData.val)}</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        statsGrid.innerHTML = dashboardHtml;

        activityTitle.textContent = 'Aktivitas Penyaluran Periode Ini';
        activityHead.innerHTML = `
            <tr>
                <th>ID PYL</th>
                <th>Tanggal</th>
                <th>Kios Penerima</th>
                <th>Produk</th>
                <th>Sopir / Kendaraan</th>
                <th>Status</th>
            </tr>
        `;
        activityBody.innerHTML = penyaluranData.slice(0, 10).map(p => `
            <tr>
                <td><code>${p.id}</code></td>
                <td>${formatDate(p.date)}</td>
                <td><strong>${p.kios}</strong></td>
                <td>${p.product}</td>
                <td>${p.driver} (${p.plat})</td>
                <td><span class="status-text ${p.status === 'DITERIMA' ? 'lunas' : 'process'}">${p.status}</span></td>
            </tr>
        `).join('') || `<tr><td colspan="6" align="center" style="padding:40px; color:var(--text-dim);">Tidak ada aktivitas di periode ini</td></tr>`;
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function getProductColor(name) {
    name = (name || '').toUpperCase();
    if (name.includes('UREA')) return '#10b981';
    if (name.includes('NPK') || name.includes('PHONSKA')) return '#3b82f6';
    if (name.includes('ZA')) return '#8b5cf6';
    if (name.includes('ORGANIK') || name.includes('PETRO')) return '#b45309';
    return '#64748b';
}
