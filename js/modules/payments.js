// Payments Tracking Module
function renderPayments() {
    const tbody = document.getElementById('payments-table-body');
    if (!tbody) return;

    // Filter pesanan yang sudah memiliki pembayaran (baik cicil maupun lunas)
    // Dan bukan pesanan yang baru diajukan (MENUNGGU PERSETUJUAN)
    const allOrders = getFilteredData('orders');
    const filteredOrders = allOrders.filter(o => 
        (o.status !== 'MENUNGGU PERSETUJUAN' && o.status !== 'DITOLAK') &&
        (parseFloat(o.paidAmount) > 0 || o.status === 'LUNAS' || o.status === 'APPROVED')
    );

    const data = paginateData(filteredOrders, 'payments');

    tbody.innerHTML = data.map(o => {
        const total = parseFloat(o.total) || 0;
        const paid = parseFloat(o.paidAmount) || (o.status === 'LUNAS' ? total : 0);
        const remaining = round2(total - paid);
        
        const isLunas = remaining <= 0 || o.status === 'LUNAS';
        const badgeHTML = isLunas 
            ? '<span class="badge lunas">LUNAS</span>' 
            : '<span class="badge waiting">CICILAN</span>';
            
        const pylId = o.pylId || (STATE.penyaluran.find(p => p.orderId === o.id)?.id);
            
        return `
        <tr>
            <td><strong>${o.id}</strong></td>
            <td>${formatDate(o.date)}</td>
            <td>${pylId ? `<span class="badge" style="background:var(--primary-light); color:var(--primary); font-family:monospace; font-size:0.75rem; font-weight:700;">${pylId}</span>` : '<span style="color:var(--text-dim);">-</span>'}</td>
            <td>${o.kiosk}</td>
            <td>${o.product}</td>
            <td><strong>${formatCurrency(total)}</strong></td>
            <td style="color:#10b981; font-weight:700;">${formatCurrency(paid)}</td>
            <td style="color:${remaining > 0 ? '#ef4444' : '#64748b'}; font-weight:700;">${remaining > 0 ? formatCurrency(remaining) : '-'}</td>
            <td>${badgeHTML}</td>
            <td>
                ${!isLunas ? `
                    <button class="action-btn small success" onclick="openPaymentDialog('${o.id}')" title="Input Pembayaran" style="background:#10b981; color:white; border:none;">
                        <i data-lucide="dollar-sign"></i> BAYAR
                    </button>
                ` : '<span style="color:var(--success); font-size:0.75rem; font-weight:700;">SELESAI</span>'}
            </td>
        </tr>
    `}).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 40px; color: var(--text-dim);">Belum ada data pembayaran terdata</td></tr>`;
    
    // Summary - Hitung total uang yang benar-benar sudah diterima
    const totalCollected = filteredOrders.reduce((sum, o) => {
        const paid = parseFloat(o.paidAmount) || (o.status === 'LUNAS' ? parseFloat(o.total) : 0);
        return sum + paid;
    }, 0);

    const totalReceivable = filteredOrders.reduce((sum, o) => {
        const total = parseFloat(o.total) || 0;
        const paid = parseFloat(o.paidAmount) || (o.status === 'LUNAS' ? total : 0);
        return sum + (total - paid);
    }, 0);
        
    const summaryContainer = document.querySelector('.payments-summary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="stats-grid" style="grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="card" style="padding: 15px; border-left: 4px solid #10b981;">
                    <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">TOTAL DANA DITERIMA (CASH-IN)</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${formatCurrency(totalCollected)}</div>
                </div>
                <div class="card" style="padding: 15px; border-left: 4px solid #ef4444;">
                    <div style="font-size: 0.75rem; color: var(--text-dim); font-weight: 700;">TOTAL PIUTANG (SISA TAGIHAN)</div>
                    <div style="font-size: 1.5rem; font-weight: 800; color: #ef4444;">${formatCurrency(totalReceivable)}</div>
                </div>
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
        wrapper.insertAdjacentHTML('afterend', renderTableFooter('payments', filteredOrders.length, data.length));
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function openAddPaymentModal() {
    // Cari semua pesanan yang belum lunas dan sudah disetujui (siap bayar)
    const pendingOrders = STATE.orders.filter(o => 
        o.status !== 'MENUNGGU PERSETUJUAN' && 
        o.status !== 'DITOLAK' && 
        o.status !== 'LUNAS'
    ).sort((a, b) => new Date(b.date) - new Date(a.date));

    if (pendingOrders.length === 0) {
        return alert('Tidak ada tagihan (Piutang) yang perlu dibayar saat ini.');
    }

    const content = `
        <div class="form-group">
            <label>Pilih Pesanan / Tagihan Kios</label>
            <select id="select-payment-order" onchange="window.selectedOrderId = this.value; document.getElementById('btn-next-payment').disabled = !this.value;" style="height: 50px; font-weight: 600;">
                <option value="" disabled selected>Pilih pesanan yang memiliki tagihan...</option>
                ${pendingOrders.map(o => {
                    const total = parseFloat(o.total) || 0;
                    const paid = parseFloat(o.paidAmount) || 0;
                    const sisa = round2(total - paid);
                    return `<option value="${o.id}">${o.kiosk} - ${o.product} (${formatDate(o.date)}) | Sisa: ${formatCurrency(sisa)}</option>`;
                }).join('')}
            </select>
        </div>
        <div style="margin-top: 20px;">
            <button id="btn-next-payment" class="action-btn primary" style="width: 100%; justify-content: center; height: 50px; font-weight: 700;" disabled onclick="closeModal(); openPaymentDialog(window.selectedOrderId)">
                LANJUTKAN KE PEMBAYARAN
            </button>
        </div>
    `;
    openModal('Tambah Pembayaran Baru', content);
    initSearchableSelect('#select-payment-order');
}
