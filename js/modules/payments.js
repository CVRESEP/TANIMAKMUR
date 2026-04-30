// Payments Tracking Module
function renderPayments() {
    const tbody = document.getElementById('payments-table-body');
    if (!tbody) return;

    // Gunakan getFilteredData untuk mendukung fitur Search dan Date Filter
    // Filter hanya pesanan yang sudah didistribusikan (bukan menunggu persetujuan/ditolak)
    const filteredOrders = getFilteredData('orders').filter(o => 
        o.status !== 'MENUNGGU PERSETUJUAN' && o.status !== 'DITOLAK'
    );

    const data = paginateData(filteredOrders, 'payments');

    tbody.innerHTML = data.map(o => {
        const isLunas = o.status === 'APPROVED' || o.status === 'LUNAS';
        const badgeHTML = isLunas 
            ? '<span class="badge lunas">LUNAS</span>' 
            : '<span class="badge waiting">BELUM LUNAS</span>';
            
        const pylId = o.pylId || (STATE.penyaluran.find(p => p.orderId === o.id)?.id);
            
        return `
        <tr>
            <td><strong>${o.id}</strong></td>
            <td>${formatDate(o.date)}</td>
            <td>${pylId ? `<span class="badge" style="background:var(--primary-light); color:var(--primary); font-family:monospace; font-size:0.75rem; font-weight:700;">${pylId}</span>` : '<span style="color:var(--text-dim);">-</span>'}</td>
            <td>${o.kiosk}</td>
            <td>${o.product}</td>
            <td>${o.qty} Ton</td>
            <td><strong>${formatCurrency(o.total)}</strong></td>
            <td>${badgeHTML}</td>
        </tr>
    `}).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 40px; color: var(--text-dim);">Belum ada pembayaran lunas yang terdata</td></tr>`;
    
    // Summary
    const totalPayments = filteredOrders
        .filter(o => o.status === 'APPROVED' || o.status === 'LUNAS')
        .reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
        
    const summaryContainer = document.querySelector('.payments-summary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="card" style="padding: 20px; text-align: center;">
                <div style="font-size: 0.9rem; color: var(--text-dim); margin-bottom: 8px;">TOTAL PENDAPATAN DITERIMA (LUNAS)</div>
                <div style="font-size: 2rem; font-weight: 800; color: var(--primary);">${formatCurrency(totalPayments)}</div>
            </div>
        `;
    }
    
    const wrapper = tbody.closest('.table-container');
    if (wrapper) {
        if (!wrapper.previousElementSibling || !wrapper.previousElementSibling.classList.contains('table-header-controls')) {
            wrapper.insertAdjacentHTML('beforebegin', renderRowLimitSelector('payments'));
        }
        
        if (wrapper.nextElementSibling && wrapper.nextElementSibling.classList.contains('table-footer-info')) {
            wrapper.nextElementSibling.remove();
        }
        wrapper.insertAdjacentHTML('afterend', renderTableFooter('payments', settledOrders.length, data.length));
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}
