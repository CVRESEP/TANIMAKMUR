// Payments Tracking Module
function renderPayments() {
    const tbody = document.getElementById('payments-table-body');
    if (!tbody) return;

    // Payments are settled orders from Kiosks
    // We filter based on branch if distributor/admin
    const userBranch = STATE.currentUser.branch;
    const settledOrders = STATE.orders.filter(o => 
        (o.status === 'APPROVED' || o.status === 'LUNAS') && 
        (userBranch === 'ALL' || o.branch === userBranch)
    );

    const data = paginateData(settledOrders, 'payments');

    tbody.innerHTML = data.map(o => `
        <tr>
            <td><strong>${o.id}</strong></td>
            <td>${formatDate(o.date)}</td>
            <td>${o.kiosk}</td>
            <td>${o.product}</td>
            <td>${o.qty} Ton</td>
            <td><strong>${formatCurrency(o.total)}</strong></td>
            <td><span class="badge lunas">LUNAS</span></td>
        </tr>
    `).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 40px; color: var(--text-dim);">Belum ada pembayaran lunas yang terdata</td></tr>`;
    
    // Summary
    const totalPayments = settledOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const summaryContainer = document.querySelector('.payments-summary');
    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="card" style="padding: 20px; text-align: center;">
                <div style="font-size: 0.9rem; color: var(--text-dim); margin-bottom: 8px;">TOTAL PENDAPATAN DITERIMA</div>
                <div style="font-size: 2rem; font-weight: 800; color: var(--primary);">${formatCurrency(totalPayments)}</div>
            </div>
        `;
    }
    
    lucide.createIcons();
}
