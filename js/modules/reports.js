function renderDailyReport() {
    const container = document.getElementById('content-area');
    if (!container) return;

    const selectedDate = document.getElementById('dr-date')?.value || new Date().toISOString().split('T')[0];
    let selectedBranch = document.getElementById('dr-branch')?.value || 'ALL';

    const currentUser = STATE.currentUser;
    const isRestricted = !['OWNER', 'MANAJER'].includes((currentUser.role || '').toUpperCase());
    if (isRestricted && currentUser.branch !== 'ALL') {
        selectedBranch = currentUser.branch;
    }

    // Set inputs if they exist
    const dateInput = document.getElementById('dr-date');
    const branchInput = document.getElementById('dr-branch');
    if (dateInput) dateInput.value = selectedDate;
    if (branchInput) {
        branchInput.value = selectedBranch;
        if (isRestricted && currentUser.branch !== 'ALL') {
            branchInput.style.display = 'none'; // Hide dropdown for restricted branch users
        }
    }

    const tbody = document.getElementById('dr-table-body');
    const summaryBody = document.getElementById('dr-summary-body');
    if (!tbody || !summaryBody) return;

    const products = STATE.products.filter(p => selectedBranch === 'ALL' || p.branch === selectedBranch);
    
    let totalSisaLalu = 0, totalPenyaluran = 0, totalPenebusanTunai = 0, totalStokAkhir = 0;
    let totalHargaStok = 0, totalJualKios = 0, totalPenebusanValue = 0;

    const rows = products.map((p, index) => {
        const prodName = p.name;
        const branch = p.branch;

        // 1. SISA LALU (History before selectedDate)
        const prevPurchased = (STATE.penebusan || [])
            .filter(item => item.product === prodName && item.kabupaten === branch && item.date < selectedDate)
            .reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
        
        const prevDispatched = (STATE.penyaluran || [])
            .filter(item => item.product === prodName && (item.branch === branch || item.kabupaten === branch) && item.date < selectedDate && item.status !== 'MENUNGGU PENGIRIMAN')
            .reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
        
        const sisaLalu = prevPurchased - prevDispatched;

        // 2. DAILY TRANSACTIONS
        const dispatched = (STATE.penyaluran || [])
            .filter(item => item.product === prodName && (item.branch === branch || item.kabupaten === branch) && item.date === selectedDate && item.status !== 'MENUNGGU PENGIRIMAN')
            .reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
        
        const purchased = (STATE.penebusan || [])
            .filter(item => item.product === prodName && item.kabupaten === branch && item.date === selectedDate)
            .reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);

        const stokAkhir = sisaLalu + purchased - dispatched;
        
        const hargaTebus = p.buyPrice || p.price || 0;
        const hargaStok = stokAkhir * hargaTebus;
        const hargaJual = p.price || 0;
        const jualKios = dispatched * hargaJual;
        const penebusanValue = purchased * hargaTebus;

        // Update Totals
        totalSisaLalu += sisaLalu;
        totalPenyaluran += dispatched;
        totalPenebusanTunai += purchased;
        totalStokAkhir += stokAkhir;
        totalHargaStok += hargaStok;
        totalJualKios += jualKios;
        totalPenebusanValue += penebusanValue;

        return `
            <tr>
                <td style="padding: 12px 15px;"><strong>${index + 1}. ${prodName} ${branch}</strong></td>
                <td style="text-align: center;">${sisaLalu.toFixed(2)}</td>
                <td style="text-align: center;">${dispatched.toFixed(2)}</td>
                <td style="text-align: center;">${purchased.toFixed(2)}</td>
                <td style="text-align: center; font-weight: 700;">${stokAkhir.toFixed(2)}</td>
                <td style="text-align: right;">${formatCurrency(hargaTebus)}</td>
                <td style="text-align: right; font-weight: 700;">${formatCurrency(hargaStok)}</td>
                <td style="text-align: right;">${formatCurrency(hargaJual)}</td>
                <td style="text-align: right;">${formatCurrency(jualKios)}</td>
                <td style="text-align: right;">${formatCurrency(penebusanValue)}</td>
            </tr>
        `;
    });

    // Add Total Row
    rows.push(`
        <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1;">
            <td style="padding: 12px 15px;">TOTAL</td>
            <td style="text-align: center;">${totalSisaLalu.toFixed(2)}</td>
            <td style="text-align: center;">${totalPenyaluran.toFixed(2)}</td>
            <td style="text-align: center;">${totalPenebusanTunai.toFixed(2)}</td>
            <td style="text-align: center;">${totalStokAkhir.toFixed(2)}</td>
            <td></td>
            <td style="text-align: right;">${formatCurrency(totalHargaStok)}</td>
            <td></td>
            <td style="text-align: right;">${formatCurrency(totalJualKios)}</td>
            <td style="text-align: right;">${formatCurrency(totalPenebusanValue)}</td>
        </tr>
    `);

    tbody.innerHTML = rows.join('');

    // --- SUMMARY FOOTER CALCULATIONS ---
    const isBranchMatch = (itemBranch) => selectedBranch === 'ALL' || itemBranch === selectedBranch;

    const prevSales = STATE.orders
        .filter(o => isBranchMatch(o.branch) && o.date < selectedDate && o.status !== 'DIBATALKAN')
        .reduce((sum, o) => sum + (o.total || 0), 0);
    
    const prevPayments = (STATE.payments || [])
        .filter(p => isBranchMatch(p.branch) && p.date < selectedDate)
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const sisaTagihanLalu = prevSales - prevPayments;
    const pembayaranHariIni = (STATE.payments || [])
        .filter(p => isBranchMatch(p.branch) && p.date === selectedDate)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalTagihan = sisaTagihanLalu + totalJualKios;
    const sisaTagihanHariIni = totalTagihan - pembayaranHariIni;

    summaryBody.innerHTML = `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 15px; color: #64748b; font-weight: 600;">SISA TAGIHAN LALU</td>
            <td style="padding: 12px 15px; text-align: right; font-weight: 700;">${formatCurrency(sisaTagihanLalu)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 15px; color: #64748b; font-weight: 600;">PENJUALAN</td>
            <td style="padding: 12px 15px; text-align: right; font-weight: 700;">${formatCurrency(totalJualKios)}</td>
        </tr>
        <tr style="border-bottom: 2px solid #e2e8f0; background: #f8fafc;">
            <td style="padding: 12px 15px; color: #1e293b; font-weight: 800;">TOTAL</td>
            <td style="padding: 12px 15px; text-align: right; font-weight: 800;">${formatCurrency(totalTagihan)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 15px; color: #64748b; font-weight: 600;">PEMBAYARAN</td>
            <td style="padding: 12px 15px; text-align: right; font-weight: 700;">${formatCurrency(pembayaranHariIni)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 15px; color: #1e293b; font-weight: 700;">SISA TAGIHAN HARI INI</td>
            <td style="padding: 12px 15px; text-align: right; font-weight: 800; color: #ef4444;">${formatCurrency(sisaTagihanHariIni)}</td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 15px; color: #64748b; font-weight: 600;">SISA PUPUK</td>
            <td style="padding: 12px 15px; text-align: right; font-weight: 700; color: #2563eb;">${formatCurrency(totalHargaStok)}</td>
        </tr>
        <tr style="background: #eff6ff; border-top: 2px solid #3b82f6;">
            <td style="padding: 15px; color: #1e40af; font-weight: 900; font-size: 1rem;">TOTAL TAGIHAN DAN PUPUK</td>
            <td style="padding: 15px; text-align: right; font-weight: 900; color: #1e40af; font-size: 1rem;">${formatCurrency(sisaTagihanHariIni + totalHargaStok)}</td>
        </tr>
    `;

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function exportDailyReport(type) {
    const selectedDate = document.getElementById('dr-date')?.value;
    const selectedBranch = document.getElementById('dr-branch')?.value;
    
    if (type === 'excel') {
        const table = document.getElementById('daily-report-table');
        const workbook = XLSX.utils.table_to_book(table);
        XLSX.writeFile(workbook, `laporan_harian_${selectedBranch}_${selectedDate}.xlsx`);
        showToast('Laporan Excel berhasil diunduh');
    } else {
        window.print();
    }
}

// RESTORED ORIGINAL REPORT FUNCTIONS
function renderReports() {
    const container = document.getElementById('content-area');
    if (!container) return;

    if (!STATE.reportRange) {
        STATE.reportRange = getDefaultWeekRange();
    }

    const startInput = document.getElementById('rep-start-date');
    const endInput = document.getElementById('rep-end-date');
    const rangeDisplay = document.getElementById('rep-range-display');

    if (startInput && endInput) {
        startInput.value = STATE.reportRange.start;
        endInput.value = STATE.reportRange.end;
        if (rangeDisplay) {
            rangeDisplay.textContent = `${formatDate(STATE.reportRange.start)} - ${formatDate(STATE.reportRange.end)}`;
        }

        const updateRange = () => {
            STATE.reportRange.start = startInput.value;
            STATE.reportRange.end = endInput.value;
            if (rangeDisplay) {
                rangeDisplay.textContent = `${formatDate(STATE.reportRange.start)} - ${formatDate(STATE.reportRange.end)}`;
            }
        };

        startInput.onchange = updateRange;
        endInput.onchange = updateRange;
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function exportReports(type) {
    const start = STATE.reportRange?.start;
    const end = STATE.reportRange?.end;

    if (!start || !end) {
        showToast('Pilih rentang tanggal terlebih dahulu', 'error');
        return;
    }

    showToast(`Menyiapkan laporan ${type.toUpperCase()}...`);
    let dataToExport = [];
    const isWithinRange = (dateStr) => dateStr && dateStr >= start && dateStr <= end;

    if (type === 'stocks') {
        dataToExport = (STATE.products || []).map(p => ({
            'PRODUK': p.name,
            'CABANG': p.branch,
            'STOK DO': calculateStock(p.name).toFixed(1) + ' TON',
            'NILAI ESTIMASI': formatCurrency(calculateStock(p.name) * (p.buyPrice || p.price || 0))
        }));
    } else {
        dataToExport = (STATE[type] || []).filter(item => isWithinRange(item.date));
    }

    if (dataToExport.length === 0) {
        openErrorModal('EKSPOR GAGAL', `Tidak ada data ditemukan.`);
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    XLSX.writeFile(workbook, `laporan_${type}_${start}_sd_${end}.xlsx`);
    openSuccessModal('EKSPOR BERHASIL', `Laporan telah diunduh.`);
}
