// Kiosk Orders & Approvals Module
function renderOrdersKiosk() {
    const tbody = document.getElementById('kiosk-orders-body');
    if (!tbody) return;

    // Kiosks should only see their own orders
    const myOrders = STATE.orders.filter(o => o.kiosk === STATE.currentUser.name);
    const data = paginateData(myOrders, 'orders_kiosk');

    tbody.innerHTML = data.map(o => {
        const statusClass =
            o.status === 'MENUNGGU PERSETUJUAN' ? 'waiting' :
                o.status === 'LUNAS' ? 'lunas' :
                    o.status === 'DITOLAK' ? 'rejected' :
                        o.status === 'MENUNGGU KONFIRMASI PEMBAYARAN' || o.status === 'MENUNGGU PEMBAYARAN' ? 'process' :
                            o.status.toLowerCase().replace(/ /g, '-');

        return `
            <tr>
                <td><code>${o.id}</code></td>
                <td>${formatDate(o.date)}</td>
                <td>${o.pylId ? `<span class="badge" style="background:var(--primary-light); color:var(--primary); font-family:monospace;">${o.pylId}</span>` : '<span style="color:var(--text-dim); font-size:0.8rem;">MENUNGGU</span>'}</td>
                <td><strong>${o.product}</strong></td>
                <td>${formatCurrency(o.price)}</td>
                <td>${o.qty} Ton</td>
                <td><strong>${formatCurrency(o.total)}</strong></td>
                <td>
                    <span class="status-text ${statusClass}">${o.status}</span>
                    ${o.rejectReason ? `<div style="font-size: 0.65rem; color: #ef4444; font-weight: 600; margin-top: 4px;">ALASAN: ${o.rejectReason}</div>` : ''}
                </td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        ${o.status === 'MENUNGGU PEMBAYARAN' ? `
                            <button class="action-btn small primary" onclick="openUploadProof('${o.id}')">
                                <i data-lucide="upload"></i> Bayar
                            </button>
                        ` : ''}
                        ${['DITOLAK', 'LUNAS'].includes(o.status) ? `
                            <button class="action-btn small" onclick="deleteOrder('${o.id}')" title="Hapus dari Riwayat" style="color: #ef4444; border-color: #fecdd3; background: #fff1f2;">
                                <i data-lucide="trash-2"></i>
                            </button>
                        ` : ''}
                        ${(!['MENUNGGU PEMBAYARAN', 'DITOLAK', 'LUNAS'].includes(o.status)) ? '-' : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 40px; color: var(--text-dim);">Belum ada riwayat pesanan</td></tr>`;

    lucide.createIcons();
}

function openAddOrderModal() {
    const currentUser = STATE.currentUser;
    const isAdminRole = ['ADMIN', 'OWNER', 'MANAGER', 'CABANG'].includes(currentUser.role);
    const initialBranch = isAdminRole ? '' : currentUser.branch;

    let kioskSelectionHtml = '';
    if (isAdminRole) {
        const availableKiosks = STATE.users.filter(u => {
            if (u.role !== 'KIOS') return false;
            if (currentUser.branch === 'ALL') {
                const filter = STATE.activeBranchFilter || 'ALL';
                return filter === 'ALL' || u.branch === filter;
            }
            return u.branch === currentUser.branch;
        });

        kioskSelectionHtml = `
            <div class="form-group">
                <label>Pilih Kios Pemesan</label>
                <select name="target_kiosk" required onchange="refreshOrderProducts(this)">
                    <option value="" disabled selected>Pilih Kios...</option>
                    ${availableKiosks.map(k => `<option value="${k.name}|${k.branch}">${k.name} (${k.branch})</option>`).join('')}
                </select>
            </div>
        `;
    }

    // Initial product filtering based on current user branch (if Kios)
    const filteredProducts = initialBranch ?
        STATE.products.filter(p => p.branch === initialBranch) :
        []; // Empty for admin until kiosk is selected

    const content = `
        <form onsubmit="saveOrder(event)">
            ${kioskSelectionHtml}
            <div class="form-group">
                <label>Pilih Produk</label>
                <select name="product_code" id="order-product-select" required ${isAdminRole && !initialBranch ? 'disabled' : ''}>
                    <option value="" disabled selected>${isAdminRole ? 'Pilih Kios Terlebih Dahulu...' : 'Pilih Produk...'}</option>
                    ${filteredProducts.map(p => `<option value="${p.code}">${p.name} (${formatCurrency(p.sellPrice || p.price)}/${p.unit})</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Jumlah Pesanan (Ton)</label>
                <input type="number" name="qty" step="0.1" placeholder="0.0" required>
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center; height: 48px; font-weight: 700;">BUAT PESANAN</button>
        </form>
    `;
    openModal('Buat Pesanan Baru', content);
}

// Global helper for the onchange event
window.refreshOrderProducts = function (select) {
    const val = select.value;
    const productSelect = document.getElementById('order-product-select');
    if (!val || !productSelect) return;

    const branch = val.split('|')[1];
    const filtered = STATE.products.filter(p => p.branch === branch);

    productSelect.disabled = false;
    productSelect.innerHTML = `
        <option value="" disabled selected>Pilih Produk...</option>
        ${filtered.map(p => `<option value="${p.code}">${p.name} (${formatCurrency(p.sellPrice || p.price)}/${p.unit})</option>`).join('')}
    `;
};

function saveOrder(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const productCode = fd.get('product_code');
    const product = STATE.products.find(p => p.code === productCode);
    const qty = parseFloat(fd.get('qty'));

    // Determine target kiosk and branch
    let kioskName = STATE.currentUser.name;
    let kioskBranch = STATE.currentUser.branch;

    const targetKioskData = fd.get('target_kiosk');
    if (targetKioskData) {
        const parts = targetKioskData.split('|');
        kioskName = parts[0];
        kioskBranch = parts[1];
    }

    const newOrder = {
        id: 'ORD-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        product: product.name,
        qty: qty,
        price: product.sellPrice || product.price,
        total: qty * (product.sellPrice || product.price),
        branch: kioskBranch,
        kiosk: kioskName,
        status: 'MENUNGGU PERSETUJUAN'
    };

    STATE.orders.unshift(newOrder);
    saveState();
    closeModal();
    renderOrdersKiosk();
    if (typeof renderDashboard === 'function') renderDashboard();

    // Notifikasi WhatsApp & Telegram ke Admin Cabang (Strict Branch/Kabupaten)
    const branchAdmin = STATE.users.find(u =>
        (u.branch === kioskBranch || u.branch === 'ALL') &&
        ['ADMIN', 'MANAJER', 'OWNER'].includes((u.role || '').toUpperCase()) &&
        (u.phone || u.tg_chat_id)
    );

    if (branchAdmin) {
        const waMsg = `*NOTIFIKASI PESANAN BARU*\n\n` +
            `Kios: *${kioskName}*\n` +
            `Cabang: *${kioskBranch}*\n` +
            `Produk: *${product.name}*\n` +
            `Jumlah: *${qty} Ton*\n` +
            `Status: MENUNGGU PERSETUJUAN\n\n` +
            `Mohon segera diproses di tanimakmur.pages.dev`;

        sendAutoNotification(branchAdmin.phone, waMsg, 'Notifikasi Pesanan', branchAdmin.tg_chat_id);
    }

    openSuccessModal('PESANAN TERKIRIM', `Pesanan <strong>${product.name}</strong> telah dikirim. Menunggu persetujuan distributor.`);
}

function openUploadProof(id) {
    const content = `
        <form onsubmit="saveProof(event, '${id}')">
            <div class="form-group">
                <label>Nominal Pembayaran</label>
                <input type="text" value="${formatCurrency(STATE.orders.find(o => o.id === id).total)}" disabled>
            </div>
            <div class="form-group">
                <label>Pilih File Bukti Transfer (Image/PDF)</label>
                <input type="file" required>
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center;">UNGGAH BUKTI SEKARANG</button>
        </form>
    `;
    openModal('Konfirmasi Pembayaran', content);
}

function saveProof(e, id) {
    e.preventDefault();
    const order = STATE.orders.find(o => o.id === id);
    if (order) {
        order.proof = 'uploaded_proof.jpg';
        order.status = 'MENUNGGU KONFIRMASI PEMBAYARAN';
        saveState();
        closeModal();
        renderOrdersKiosk();
        if (typeof renderDashboard === 'function') renderDashboard();
        openSuccessModal('BUKTI TERKIRIM', 'Terima kasih. Pembayaran Anda sedang diproses oleh distributor.');
    }
}

function renderApprovals() {
    const tbody = document.getElementById('approvals-table-body');
    if (!tbody) return;

    const data = getFilteredData('orders');
    const paginated = paginateData(data, 'approvals');

    tbody.innerHTML = paginated.map(o => {
        let actionBtn = '';
        if (o.status === 'MENUNGGU PERSETUJUAN') {
            actionBtn = `
                <button class="action-btn small primary" onclick="confirmOrder('${o.id}', 'MENUNGGU PEMBAYARAN')">
                    <i data-lucide="check"></i> SETUJUI PESANAN
                </button>
            `;
        } else if (o.status === 'MENUNGGU KONFIRMASI PEMBAYARAN' || o.status === 'MENUNGGU PEMBAYARAN') {
            actionBtn = `
                <button class="action-btn small success" onclick="confirmOrder('${o.id}', 'APPROVED')" style="background: #108040; color: white; border: none;">
                    <i data-lucide="dollar-sign"></i> ${o.status === 'MENUNGGU PEMBAYARAN' ? 'BAYAR SEKARANG' : 'KONFIRMASI BAYAR'}
                </button>
            `;
        }

        const statusClass =
            o.status === 'MENUNGGU PERSETUJUAN' ? 'waiting' :
                o.status === 'LUNAS' ? 'lunas' :
                    o.status === 'MENUNGGU KONFIRMASI PEMBAYARAN' || o.status === 'MENUNGGU PEMBAYARAN' ? 'process' :
                        o.status.toLowerCase().replace(/ /g, '-');

        return `
            <tr>
                <td><strong>${o.id}</strong></td>
                <td>${formatDate(o.date)}</td>
                <td>${o.kiosk}</td>
                <td>${o.product}</td>
                <td>${o.qty} Ton</td>
                <td>${formatCurrency(o.total)}</td>
                <td><span class="status-text ${statusClass}">${o.status}</span></td>
                <td>
                    <div class="action-dropdown" onclick="toggleDropdown(event)">
                        <button class="action-btn small t-icon secondary">
                            <i data-lucide="more-vertical"></i>
                        </button>
                        <div class="dropdown-content">
                            ${o.status.trim().toUpperCase() === 'MENUNGGU PERSETUJUAN' ? `
                                <button onclick="confirmOrder('${o.id}', 'MENUNGGU PEMBAYARAN')">
                                    <i data-lucide="check"></i> Setujui Pesanan
                                </button>
                                <button onclick="rejectOrder('${o.id}')" style="color: #f97316;">
                                    <i data-lucide="x-circle"></i> Tolak Pesanan
                                </button>
                            ` : ''}
                            ${['MENUNGGU PEMBAYARAN', 'MENUNGGU KONFIRMASI PEMBAYARAN'].includes(o.status.trim().toUpperCase()) ? `
                                <button onclick="confirmOrder('${o.id}', 'APPROVED')" style="color: var(--primary); font-weight: 600;">
                                    <i data-lucide="dollar-sign"></i> Bayar Melalui Admin
                                </button>
                            ` : ''}
                            <button onclick="deleteOrder('${o.id}')" style="color: #ef4444;">
                                <i data-lucide="trash-2"></i> Hapus Pesanan
                            </button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 30px; color: var(--text-dim);">Tidak ada antrian persetujuan</td></tr>`;

    lucide.createIcons();
}

function saveApprovalDirectDispatch(e, orderId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const outId = fd.get('pengeluaran_id');
    const driverData = fd.get('driver').split('|');
    const entry = STATE.pengeluaran.find(o => o.id === outId);
    const order = STATE.orders.find(o => o.id === orderId);

    if (order && entry) {
        order.status = 'MENUNGGU PEMBAYARAN';
        order.assignedDO = entry.do;
        order.pengeluaran_id = outId;

        // Custom ID Format: [NO DO]-[INCREMENT]
        const count = STATE.penyaluran.filter(p => p.do === entry.do).length;
        const pylId = `${entry.do}-${count + 1}`;
        order.pylId = pylId;

        // Create Penyaluran record with direct "DALAM PENGIRIMAN" status
        const newPyl = {
            id: pylId,
            orderId: order.id,
            kios: order.kiosk,
            product: order.product,
            qty: order.qty,
            branch: order.branch,
            date: new Date().toISOString().split('T')[0],
            status: 'DALAM PENGIRIMAN',
            driver: driverData[0],
            plat: driverData[1],
            pengeluaran_id: outId,
            do: entry.do
        };
        STATE.penyaluran.unshift(newPyl);

        // Trigger automated Kas Angkutan record creation
        if (typeof autoCreateKasAngkutan === 'function') {
            autoCreateKasAngkutan(newPyl.id);
        }

        saveState();
        closeModal();
        renderApprovals();
        if (typeof renderPenyaluran === 'function') renderPenyaluran();
        openSuccessModal('PESANAN DIPROSES', `Pesanan telah disetujui, stok DO <strong>${entry.do}</strong> dialokasikan, dan barang sedang dikirim oleh <strong>${driverData[0]}</strong>.<br><br>Biaya angkutan otomatis telah dicatat di Kas Angkutan.`);
    }
}

function confirmOrder(id, nextStatus) {
    const order = STATE.orders.find(o => o.id === id);
    if (!order) return;

    if (nextStatus === 'APPROVED') {
        order.status = 'LUNAS';
        saveState();
        renderApprovals();
        openSuccessModal('PEMBAYARAN DIKONFIRMASI', `Pesanan <strong>${id}</strong> telah dinyatakan LUNAS.`);
        return;
    }

    if (nextStatus === 'MENUNGGU PEMBAYARAN') {
        const availableDOs = STATE.pengeluaran.filter(entry => {
            if (entry.product !== order.product) return false;
            const totalShared = STATE.penyaluran
                .filter(item => item.pengeluaran_id === entry.id)
                .reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
            const remaining = (parseFloat(entry.keluar) || 0) - totalShared;
            return remaining >= order.qty;
        });

        if (availableDOs.length === 0) {
            return openErrorModal('STOK TIDAK CUKUP', `Stok DO (Penebusan) untuk produk <strong>${order.product}</strong> tidak mencukupi untuk memenuhi pesanan ini.`);
        }

        const content = `
            <form onsubmit="saveApprovalDirectDispatch(event, '${id}')">
                <div style="margin-bottom: 20px; padding: 15px; background: #fff7ed; border-radius: 8px; border: 1px solid #ffedd5;">
                    <div style="font-size: 0.8rem; color: #9a3412; font-weight: 600;">ALOKASI PENGIRIMAN</div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: #c2410c;">${order.product} - ${order.qty} TON</div>
                </div>
                
                <div class="form-group">
                    <label>Pilih Penebusan / DO Asal Stok</label>
                    <select name="pengeluaran_id" required>
                        <option value="" disabled selected>Pilih DO...</option>
                        ${availableDOs.map(doEntry => {
            const totalShared = STATE.penyaluran
                .filter(item => item.pengeluaran_id === doEntry.id)
                .reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
            const remaining = (parseFloat(doEntry.keluar) || 0) - totalShared;
            return `<option value="${doEntry.id}">${doEntry.do} - Sisa: ${remaining.toFixed(1)} Ton</option>`;
        }).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label>Pilih Sopir Pengirim</label>
                    <select name="driver" required>
                        <option value="" disabled selected>Pilih Sopir...</option>
                        ${getFilteredData('drivers').map(d => `<option value="${d.name}|${d.plat}">${d.name} (${d.plat})</option>`).join('')}
                    </select>
                </div>

                <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center; height: 48px;">SETUJUI & KIRIM BARANG</button>
            </form>
        `;
        openModal('Persetujuan & Pengiriman', content);
        return;
    }
}

function deleteOrder(id) {
    if (confirm('Hapus pesanan ' + id + '? Data pengiriman & biaya angkutan terkait juga akan dihapus.')) {
        // Collect linked distribution IDs
        const linkedPylIds = STATE.penyaluran.filter(p => p.orderId === id).map(p => p.id);

        STATE.orders = STATE.orders.filter(o => o.id !== id);
        STATE.penyaluran = STATE.penyaluran.filter(p => p.orderId !== id);

        // Clear linked Kas Angkutan
        STATE.kas_angkutan = STATE.kas_angkutan.filter(k => !linkedPylIds.includes(k.noPyl));

        saveState(true);

        // Refresh appropriate view based on role
        if (STATE.currentUser.role === 'KIOS') {
            renderOrdersKiosk();
        } else {
            renderApprovals();
            renderPenyaluran();
            if (typeof renderKasAngkutan === 'function') renderKasAngkutan();
        }

        if (typeof renderDashboard === 'function') renderDashboard();
        openSuccessModal('PESANAN DIHAPUS', `Pesanan <strong>${id}</strong> berhasil dihapus.`);
    }
}

function rejectOrder(id) {
    const order = STATE.orders.find(o => o.id === id);
    if (!order) return;

    const content = `
        <form onsubmit="saveRejectOrder(event, '${id}')">
            <div style="margin-bottom: 20px; padding: 15px; background: #fff1f2; border-radius: 8px; border: 1px solid #fecdd3;">
                <div style="font-size: 0.8rem; color: #9f1239; font-weight: 600;">KONFIRMASI PENOLAKAN</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #be123c;">${order.product} - ${order.qty} TON</div>
                <div style="font-size: 0.85rem; color: #4b5563; margin-top: 5px;">Pesanan dari: <strong>${order.kiosk}</strong></div>
            </div>
            
            <div class="form-group">
                <label>Alasan Penolakan</label>
                <textarea name="reason" placeholder="Ketik alasan kenapa pesanan ini ditolak..." required style="width: 100%; min-height: 100px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; font-family: inherit; font-size: 0.9rem;"></textarea>
            </div>

            <button type="submit" class="action-btn" style="width: 100%; justify-content: center; height: 48px; background: #ef4444; color: white;">KONFIRMASI TOLAK PESANAN</button>
        </form>
    `;
    openModal('Tolak Pesanan', content);
}

function saveRejectOrder(e, id) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const reason = fd.get('reason');
    const order = STATE.orders.find(o => o.id === id);

    if (order) {
        order.status = 'DITOLAK';
        order.rejectReason = reason;
        saveState();
        closeModal();
        renderApprovals();
        if (typeof renderDashboard === 'function') renderDashboard();
        openSuccessModal('PESANAN DITOLAK', `Pesanan <strong>${id}</strong> telah ditolak dengan alasan: ${reason}`);
    }
}
