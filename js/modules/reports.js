// Reports Module
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
        
        // Update range display
        if (rangeDisplay) {
            rangeDisplay.textContent = `${formatDate(STATE.reportRange.start)} - ${formatDate(STATE.reportRange.end)}`;
        }

        // Listen for changes
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
    let filename = `laporan_${type}_${start}_sd_${end}.xlsx`;

    const isWithinRange = (dateStr) => {
        if (!dateStr) return false;
        return dateStr >= start && dateStr <= end;
    };

    if (type === 'stocks') {
        // Special case: Current stock doesn't depend on historical range in this simple view
        // But we can show what the stock was for the products
        dataToExport = (STATE.products || []).map(p => ({
            'PRODUK': p.name,
            'CABANG': p.branch,
            'STOK DO': calculateStock(p.name).toFixed(1) + ' TON',
            'NILAI ESTIMASI': formatCurrency(calculateStock(p.name) * (p.buyPrice || p.price || 0))
        }));
        filename = `laporan_stok_saat_ini_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else {
        const rawData = STATE[type] || [];
        dataToExport = rawData.filter(item => isWithinRange(item.date));
    }

    if (dataToExport.length === 0) {
        openErrorModal('EKSPOR GAGAL', `Tidak ada data ${type.toUpperCase()} ditemukan pada periode ${formatDate(start)} - ${formatDate(end)}.`);
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
    XLSX.writeFile(workbook, filename);

    openSuccessModal('EKSPOR BERHASIL', `Laporan <strong>${type.toUpperCase()}</strong> periode ${formatDate(start)} - ${formatDate(end)} telah berhasil diunduh.`);
}
