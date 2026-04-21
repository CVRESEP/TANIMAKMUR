// Pengeluaran DO Module
function renderPengeluaran() {
    const tbody = document.getElementById('pengeluaran-table-body');
    const summaryGrid = document.getElementById('do-summary-grid');
    if (!tbody) return;
    
    // Render Summary
    if (summaryGrid) {
        summaryGrid.innerHTML = STATE.products.map(p => {
            const rows = STATE.pengeluaran.filter(out => out.product === p.name);
            const totalKeluar = rows.reduce((sum, r) => sum + (parseFloat(r.keluar) || 0), 0);
            
            const totalSalur = STATE.penyaluran
                .filter(pyl => pyl.product === p.name && pyl.status !== 'MENUNGGU PENGIRIMAN')
                .reduce((sum, pyl) => sum + (parseFloat(pyl.qty) || 0), 0);
            
            const sisaTotal = totalKeluar - totalSalur;
            
            return `
                <div class="card" style="padding: 15px; border-left: 4px solid var(--primary);">
                    <div style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 5px;">SISA DO ${p.name}</div>
                    <div style="font-size: 1.15rem; font-weight: 700; color: var(--primary);">${Math.max(0, sisaTotal).toFixed(1)} TON</div>
                </div>
            `;
        }).join('');
    }

    const allData = getFilteredData('pengeluaran');
    const data = paginateData(allData, 'pengeluaran');
    renderSelectionActions('pengeluaran');
    const isSelectMode = STATE.uiSelectionMode['pengeluaran'];

    // Update Header
    const table = tbody.closest('table');
    const thead = table.querySelector('thead tr');
    if (thead) {
        const hasCheck = thead.querySelector('.col-check');
        if (isSelectMode && !hasCheck) {
            thead.insertAdjacentHTML('afterbegin', `
                <th class="col-check" style="width: 40px;">
                    <input type="checkbox" onclick="toggleSelectAll(this)">
                </th>
            `);
        } else if (!isSelectMode && hasCheck) {
            hasCheck.remove();
        }
    }

    tbody.innerHTML = data.map(d => {
        // Calculate sisa for THIS specific outgoing entry
        const totalPenyaluranThisEntry = STATE.penyaluran
            .filter(p => p.pengeluaran_id === d.id && p.status !== 'MENUNGGU PENGIRIMAN')
            .reduce((sum, p) => sum + p.qty, 0);
        
        const sisaStokDo = d.keluar - totalPenyaluranThisEntry;

        return `
            <tr>
                ${isSelectMode ? `<td><input type="checkbox" class="row-checkbox" value="${d.id}"></td>` : ''}
                <td>${formatDate(d.date)}</td>
                <td><strong>${d.do}</strong></td>
                <td>${d.product}</td>
                <td>${d.keluar} Ton</td>
                <td class="${sisaStokDo > 0 ? 'text-warning' : 'text-success'}" style="font-weight:700;">
                    ${sisaStokDo.toFixed(1)} Ton
                </td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        ${sisaStokDo > 0 ? `
                            <button class="action-btn small primary" onclick="openDirectPenyaluranModal('${d.id}')">
                                <i data-lucide="external-link"></i> SALURKAN
                            </button>
                        ` : '<span class="badge lunas">HABIS</span>'}
                        <button class="action-btn small t-icon" title="Edit" onclick="openEditPengeluaranModal('${d.id}')">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="action-btn small t-icon" title="Hapus" onclick="deletePengeluaran('${d.id}')" style="color: #ff4d4d;">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 30px; color: var(--text-dim);">Belum ada data tersedia</td></tr>`;
    
    lucide.createIcons();
}

function openAddPengeluaranModal() {
    const doAvailable = STATE.penebusan.filter(p => {
        const out = STATE.pengeluaran.find(o => o.do === p.do);
        return !out || out.keluar < p.qty;
    });

    const content = `
        <form onsubmit="savePengeluaran(event)">
            <div class="form-group">
                <label>Pilih Nomor DO</label>
                <select name="do_ref" required>
                    ${doAvailable.map(d => `<option value="${d.do}">${d.do} - ${d.product} (${d.qty} Ton)</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Tanggal Dikeluarkan dari Gudang Supplier</label>
                <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label>Qty yang Dikeluarkan (Ton)</label>
                <input type="number" name="qty" step="0.1" required>
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center;">TAMBAH KE PENGELUARAN</button>
        </form>
    `;
    openModal('Tambah Pengeluaran DO', content);
}

function savePengeluaran(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const doRef = fd.get('do_ref');
    const date = fd.get('date');
    const qty = parseFloat(fd.get('qty')) || 0;

    const penebusan = STATE.penebusan.find(p => p.do === doRef);
    if (!penebusan) return;

    // Calculate how much has already been logged as "Pengeluaran" for this DO
    const alreadyOut = STATE.pengeluaran
        .filter(o => o.do === doRef)
        .reduce((sum, o) => sum + o.keluar, 0);

    if (alreadyOut + qty > penebusan.qty) {
        alert(`Gagal! Qty melebihi sisa penebusan (${penebusan.qty - alreadyOut} Ton tersisa).`);
        return;
    }

    STATE.pengeluaran.unshift({
        id: 'OUT-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        do: doRef,
        product: penebusan.product,
        tebus: penebusan.qty,
        keluar: qty,
        kabupaten: penebusan.kabupaten,
        date: date
    });

    saveState();
    closeModal();
    renderPengeluaran();
    renderDashboard();
    openSuccessModal('DO DIKELUARKAN', `DO <strong>${doRef}</strong> berhasil dikeluarkan ke gudang.`);
}

function deletePengeluaran(outId) {
    if (confirm('Hapus data pengeluaran ini?')) {
        STATE.pengeluaran = STATE.pengeluaran.filter(p => p.id !== outId);
        saveState();
        renderPengeluaran();
        renderDashboard();
        openSuccessModal('DATA DIHAPUS', `Pengeluaran DO berhasil dihapus.`);
    }
}

function openEditPengeluaranModal(id) {
    const entry = STATE.pengeluaran.find(o => o.id === id);
    if (!entry) return;

    const penebusan = STATE.penebusan.find(p => p.do === entry.do);
    
    // Calculate max allowed for this specific entry
    const otherAlreadyOut = STATE.pengeluaran
        .filter(o => o.do === entry.do && o.id !== id)
        .reduce((sum, o) => sum + o.keluar, 0);
    
    const maxAllowed = penebusan ? (penebusan.qty - otherAlreadyOut) : entry.keluar;

    const content = `
        <form onsubmit="updatePengeluaran(event, '${id}')">
            <div class="form-group">
                <label>Nomor DO</label>
                <input type="text" value="${entry.do}" readonly style="background: #f1f5f9;">
            </div>
            <div class="form-group">
                <label>Tanggal Dikeluarkan</label>
                <input type="date" name="date" value="${entry.date}" required>
            </div>
            <div class="form-group">
                <label>Qty yang Dikeluarkan (Ton)</label>
                <input type="number" name="qty" value="${entry.keluar}" step="0.1" max="${maxAllowed}" required>
                <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 5px;">Maksimum tersisa: ${maxAllowed.toFixed(1)} Ton</div>
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center;">UPDATE PENGELUARAN</button>
        </form>
    `;
    openModal('Edit Pengeluaran DO', content);
}

function updatePengeluaran(e, id) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const qty = parseFloat(fd.get('qty'));
    const date = fd.get('date');

    const entry = STATE.pengeluaran.find(o => o.id === id);
    if (entry) {
        entry.keluar = qty;
        entry.date = date;
        saveState();
        closeModal();
        renderPengeluaran();
        openSuccessModal('BERHASIL', 'Data pengeluaran berhasil diperbarui.');
    }
}
function openDirectPenyaluranModal(id) {
    const entry = STATE.pengeluaran.find(o => o.id === id);
    if (!entry) return;

    // Calculate current sisa
    const totalPenyaluranThisEntry = STATE.penyaluran
        .filter(p => p.pengeluaran_id === entry.id && p.status !== 'MENUNGGU PENGIRIMAN')
        .reduce((sum, p) => sum + p.qty, 0);
    const sisa = entry.keluar - totalPenyaluranThisEntry;

    if (sisa <= 0) return openErrorModal('STOK HABIS', 'DO ini sudah habis disalurkan.');

    const kiosks = getFilteredData('users').filter(u => u.role === 'KIOS');
    const drivers = STATE.drivers;

    const content = `
        <form onsubmit="saveDirectPenyaluran(event, '${id}')">
            <div style="margin-bottom: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px; border: 1px solid #dcfce7;">
                <div style="font-size: 0.75rem; color: #166534; font-weight: 600; text-transform: uppercase;">SUMBER STOK (DO)</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #15803d;">${entry.do} - ${entry.product}</div>
                <div style="font-size: 0.85rem; color: #166534;">Tersisa: ${sisa.toFixed(1)} Ton</div>
            </div>

            <div class="form-group">
                <label>Pilih Kios Tujuan</label>
                <select name="target_kiosk" required>
                    <option value="" disabled selected>Pilih Kios...</option>
                    ${kiosks.map(k => `<option value="${k.name}|${k.branch}">${k.name} (${k.branch})</option>`).join('')}
                </select>
            </div>

            <div class="form-group">
                <label>Pilih Sopir Pengirim</label>
                <select name="driver" required>
                    <option value="" disabled selected>Pilih Sopir...</option>
                    ${getFilteredData('drivers').map(d => `<option value="${d.name}|${d.plat}">${d.name} (${d.plat})</option>`).join('')}
                </select>
            </div>

            <div class="form-group">
                <label>Jumlah Penyaluran (Ton)</label>
                <input type="number" name="qty" value="${sisa}" step="0.1" max="${sisa}" required>
            </div>

            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center; height: 48px; font-weight: 700;">
                <i data-lucide="send"></i> KONFIRMASI & SALURKAN SEKARANG
            </button>
        </form>
    `;
    openModal('Penyaluran Langsung ke Kios', content);
}

function saveDirectPenyaluran(e, outId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const entry = STATE.pengeluaran.find(o => o.id === outId);
    if (!entry) return;

    const kioskData = fd.get('target_kiosk').split('|');
    const driverData = fd.get('driver').split('|');
    const qty = parseFloat(fd.get('qty'));
    
    const kioskName = kioskData[0];
    const branch = kioskData[1];
    const product = STATE.products.find(p => p.name === entry.product);
    const price = product ? (product.sellPrice || product.price) : 0;

    // 1. Create a Background Order (Bypassing Approval)
    const orderId = 'ORD-DIRECT-' + Date.now();
    const newOrder = {
        id: orderId,
        date: new Date().toISOString().split('T')[0],
        product: entry.product,
        qty: qty,
        price: price,
        total: qty * price,
        branch: branch,
        kiosk: kioskName,
        status: 'MENUNGGU PEMBAYARAN' // Change from LUNAS to MENUNGGU PEMBAYARAN
    };

    // 2. Create Penyaluran Record
    const count = STATE.penyaluran.filter(p => p.do === entry.do).length;
    const pylId = `${entry.do}-${count + 1}`;
    const newPyl = {
        id: pylId,
        orderId: orderId,
        kios: kioskName,
        product: entry.product,
        qty: qty,
        branch: branch,
        date: new Date().toISOString().split('T')[0],
        status: 'DALAM PENGIRIMAN',
        driver: driverData[0],
        plat: driverData[1],
        pengeluaran_id: outId,
        do: entry.do
    };

    STATE.orders.unshift(newOrder);
    STATE.penyaluran.unshift(newPyl);

    // Trigger automated Kas Angkutan record creation
    if (typeof autoCreateKasAngkutan === 'function') {
        autoCreateKasAngkutan(pylId);
    }

    saveState();
    closeModal();
    renderPengeluaran();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderPenyaluran === 'function') renderPenyaluran();
    
    openSuccessModal('PENYALURAN BERHASIL', `Barang berhasil disalurkan ke <strong>${kioskName}</strong>.<br>Nomor Surat Jalan: <strong>${pylId}</strong><br><br>Biaya angkutan otomatis telah dicatat di Kas Angkutan.`);
}
