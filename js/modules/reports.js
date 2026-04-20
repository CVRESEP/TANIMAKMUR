// Reports Module
function renderReports() {
    const container = document.getElementById('content-area');
    if (!container) return;
    lucide.createIcons();
}

function downloadReport(format) {
    showToast(`Laporan format ${format.toUpperCase()} sedang disiapkan...`);
    setTimeout(() => {
        openSuccessModal('LAPORAN SIAP', `Laporan operasional dalam format <strong>${format.toUpperCase()}</strong> telah berhasil diunduh.`);
    }, 1500);
}
