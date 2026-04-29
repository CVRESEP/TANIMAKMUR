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
            branchInput.style.display = 'none'; // Sembunyikan dropdown untuk pengguna cabang terbatas
        }
    }

    const tbody = document.getElementById('dr-table-body');
    const summaryBody = document.getElementById('dr-summary-body');
    if (!tbody || !summaryBody) return;

    const products = STATE.products.filter(p => 
        selectedBranch === 'ALL' || 
        (p.branch || '').toUpperCase() === selectedBranch.toUpperCase()
    );
    
    let totalSisaLalu = 0, totalPenyaluran = 0, totalPenebusanTunai = 0, totalStokAkhir = 0;
    let totalHargaStok = 0, totalJualKios = 0, totalPenebusanValue = 0;

    const rows = products.map((p, index) => {
        const prodName = p.name;
        const branch = p.branch;


        // 1. SISA LALU (Riwayat sebelum tanggal terpilih)
        const prevPurchased = round2((STATE.pengeluaran || [])
            .filter(item => 
                (item.product || '').toUpperCase() === (prodName || '').toUpperCase() && 
                (item.branch || item.kabupaten || '').toUpperCase() === (p.branch || '').toUpperCase() && 
                item.date < selectedDate
            )
            .reduce((sum, item) => round2(sum + (parseFloat(item.keluar) || 0)), 0));
        
        const prevDispatched = round2((STATE.penyaluran || [])
            .filter(item => 
                (item.product || '').toUpperCase() === (prodName || '').toUpperCase() && 
                (item.branch || item.kabupaten || '').toUpperCase() === (p.branch || '').toUpperCase() && 
                item.date < selectedDate && 
                item.status !== 'MENUNGGU PENGIRIMAN'
            )
            .reduce((sum, item) => round2(sum + (parseFloat(item.qty) || 0)), 0));
        
        const sisaLalu = round2(prevPurchased - prevDispatched);

        // 2. TRANSAKSI HARIAN
        const dispatched = round2((STATE.penyaluran || [])
            .filter(item => 
                (item.product || '').toUpperCase() === (prodName || '').toUpperCase() && 
                (item.branch || item.kabupaten || '').toUpperCase() === (p.branch || '').toUpperCase() && 
                item.date === selectedDate && 
                item.status !== 'MENUNGGU PENGIRIMAN'
            )
            .reduce((sum, item) => round2(sum + (parseFloat(item.qty) || 0)), 0));
        
        const purchased = round2((STATE.pengeluaran || [])
            .filter(item => 
                (item.product || '').toUpperCase() === (prodName || '').toUpperCase() && 
                (item.branch || item.kabupaten || '').toUpperCase() === (p.branch || '').toUpperCase() && 
                item.date === selectedDate
            )
            .reduce((sum, item) => round2(sum + (parseFloat(item.keluar) || 0)), 0));

        const stokAkhir = round2(sisaLalu + purchased - dispatched);
        
        const hargaTebus = p.buyPrice || p.price || 0;
        const hargaStok = round2(stokAkhir * hargaTebus);
        const hargaJual = p.price || 0;
        const jualKios = round2(dispatched * hargaJual);
        const penebusanValue = round2(purchased * hargaTebus);

        // Perbarui Total
        totalSisaLalu = round2(totalSisaLalu + sisaLalu);
        totalPenyaluran = round2(totalPenyaluran + dispatched);
        totalPenebusanTunai = round2(totalPenebusanTunai + purchased);
        totalStokAkhir = round2(totalStokAkhir + stokAkhir);
        totalHargaStok = round2(totalHargaStok + hargaStok);
        totalJualKios = round2(totalJualKios + jualKios);
        totalPenebusanValue = round2(totalPenebusanValue + penebusanValue);


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

    // Tambahkan Baris Total
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

    // --- PERHITUNGAN RINGKASAN KAKI ---
    const isBranchMatch = (itemBranch) => selectedBranch === 'ALL' || (itemBranch || '').toUpperCase() === selectedBranch.toUpperCase();

    const prevSales = STATE.orders
        .filter(o => isBranchMatch(o.branch) && o.date < selectedDate && o.status !== 'DIBATALKAN')
        .reduce((sum, o) => sum + (o.total || 0), 0);
    
    const allPayments = STATE.orders
        .filter(o => (o.paidAmount && o.paidAmount > 0) || o.status === 'LUNAS' || o.status === 'APPROVED')
        .map(o => ({
            branch: o.branch,
            date: o.paymentDate || o.date,
            amount: o.paidAmount !== undefined 
                ? parseFloat(o.paidAmount) 
                : ((o.status === 'LUNAS' || o.status === 'APPROVED') ? parseFloat(o.total) : 0)
        }));

    const prevPayments = allPayments
        .filter(p => isBranchMatch(p.branch) && p.date < selectedDate)
        .reduce((sum, p) => sum + p.amount, 0);
    
    const sisaTagihanLalu = prevSales - prevPayments;
    const pembayaranHariIni = allPayments
        .filter(p => isBranchMatch(p.branch) && p.date === selectedDate)
        .reduce((sum, p) => sum + p.amount, 0);

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
    if (typeof initDatePickers === 'function') initDatePickers();
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

// FUNGSI LAPORAN ASLI YANG DIPULIHKAN
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

function previewReport(type) {
    const start = STATE.reportRange?.start;
    const end = STATE.reportRange?.end;

    if (!start || !end) {
        showToast('Pilih rentang tanggal terlebih dahulu', 'error');
        return;
    }

    let dataToPreview = [];
    const isWithinRange = (dateStr) => dateStr && dateStr >= start && dateStr <= end;

    if (type === 'stocks') {
        dataToPreview = (STATE.products || []).map(p => ({
            'PRODUK': p.name,
            'CABANG': p.branch,
            'STOK': calculateStock(p.name).toFixed(1) + ' TON',
            'ESTIMASI NILAI': formatCurrency(calculateStock(p.name) * (p.buyPrice || p.price || 0))
        }));
    } else {
        dataToPreview = (STATE[type] || []).filter(item => isWithinRange(item.date));
    }

    if (dataToPreview.length === 0) {
        openErrorModal('PREVIEW KOSONG', `Tidak ada data ditemukan pada rentang ini.`);
        return;
    }

    // Buat HTML Tabel
    const headers = Object.keys(dataToPreview[0]);
    let tableHtml = `
        <div class="table-container" style="max-height: 60vh; overflow-y: auto;">
            <table class="preview-table">
                <thead>
                    <tr style="background: #f8fafc;">
                        ${headers.map(h => `<th style="text-align: left; padding: 12px;">${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${dataToPreview.map(row => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            ${headers.map(h => {
                                let val = row[h];
                                // Format dates if the header is TANGGAL or date
                                if (h.toUpperCase().includes('TANGGAL') || h.toLowerCase() === 'date') {
                                    val = formatDate(val);
                                } else if (typeof val === 'number') {
                                    val = val.toLocaleString('id-ID');
                                }
                                return `<td style="padding: 12px; font-size: 0.85rem;">${val}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <div style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px;">
            <button class="action-btn secondary" onclick="closeModal()">TUTUP</button>
            <button class="action-btn primary" onclick="exportReports('${type}')">UNDUH EXCEL</button>
        </div>
    `;

    const titles = {
        penebusan: 'Preview Laporan Penebusan',
        penyaluran: 'Preview Laporan Penyaluran',
        kas_umum: 'Preview Buku Kas Umum',
        kas_angkutan: 'Preview Kas Angkutan',
        stocks: 'Preview Laporan Stok'
    };

    openModal(titles[type] || 'Preview Laporan', tableHtml, '900px');
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

    // Format tanggal dan angka untuk Excel
    const formattedData = dataToExport.map(row => {
        const newRow = {};
        Object.keys(row).forEach(key => {
            let val = row[key];
            if (key.toLowerCase().includes('date') || key.toUpperCase().includes('TANGGAL')) {
                val = formatDate(val);
            }
            newRow[key] = val;
        });
        return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    XLSX.writeFile(workbook, `laporan_${type}_${start}_sd_${end}.xlsx`);
    openSuccessModal('EKSPOR BERHASIL', `Laporan telah diunduh.`);
}
