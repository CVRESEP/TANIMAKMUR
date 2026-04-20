// Penyaluran Kios Module
function renderPenyaluran() {
    const tbody = document.getElementById('penyaluran-table-body');
    if (!tbody) return;
    
    const allData = getFilteredData('penyaluran');
    const data = paginateData(allData, 'penyaluran');
    
    const isSelectMode = STATE.uiSelectionMode['penyaluran'];
    
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

    tbody.innerHTML = data.map(p => {
        // Find linked order for payment status and total
        const order = STATE.orders.find(o => o.id === p.orderId);
        const paymentLabel = order && order.status === 'LUNAS' ? '<span class="badge lunas">LUNAS</span>' : '<span class="badge waiting">BELUM LUNAS</span>';
        const isUnpaid = !order || order.status !== 'LUNAS';
        const nominalColor = isUnpaid ? 'color: #ef4444; font-weight: 700;' : '';

        return `
            <tr>
                ${isSelectMode ? `<td><input type="checkbox" class="row-checkbox" value="${p.id}"></td>` : ''}
                <td><code>${p.id}</code></td>
                <td><strong>${p.kios}</strong></td>
                <td>${p.product}</td>
                <td>${p.qty} Ton</td>
                <td style="${nominalColor}">${order ? formatCurrency(order.total) : '-'}</td>
                <td>${p.driver || '-'}</td>
                <td>${p.plat || '-'}</td>
                <td><span class="badge ${p.status.toLowerCase().replace(/ /g, '-')}">${p.status}</span></td>
                <td>${paymentLabel}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        ${isUnpaid && order ? `
                             <button class="action-btn small success" onclick="confirmOrder('${order.id}', 'APPROVED')" title="Bayar Melalui Admin" style="background:#108040; color:white; border:none;">
                                <i data-lucide="banknote"></i> BAYAR
                            </button>
                        ` : ''}
                        ${p.status === 'MENUNGGU PROSES' ? `
                            <button class="action-btn small success" onclick="openProsesPenyaluranModal('${p.id}')" title="Proses Penjadwalan" style="background:var(--primary); color:white; border:none;">
                                <i data-lucide="settings"></i> PROSES
                            </button>
                        ` : ''}
                        ${p.status === 'MENUNGGU PENGIRIMAN' ? `
                            <button class="action-btn small primary" onclick="openDispatchModal('${p.id}')" title="Kirim Barang">
                                <i data-lucide="truck"></i> KIRIM
                            </button>
                        ` : ''}
                        ${['DALAM PENGIRIMAN', 'SELESAI', 'MENUNGGU PENGIRIMAN'].includes(p.status) ? `
                            <button class="action-btn small" onclick="printSuratJalan('${p.id}')" title="Cetak Surat Jalan" style="background:#f8fafc; border:1px solid #e2e8f0; color:#64748b;">
                                <i data-lucide="printer"></i>
                            </button>
                        ` : ''}
                        <button class="action-btn small t-icon" title="Edit Data" onclick="openEditPenyaluranModal('${p.id}')">
                            <i data-lucide="edit-3"></i>
                        </button>
                        <button class="action-btn small t-icon" title="Hapus Data" onclick="deletePenyaluran(this.dataset.id)" data-id="${p.id}" style="color: #ff4d4d;">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 30px; color: var(--text-dim);">Belum ada data tersedia</td></tr>`;
    
    // ... (limit selector and footer logic removed for brevity but preserved in final file)
    
    lucide.createIcons();
}

function openProsesPenyaluranModal(pylId) {
    const pyl = STATE.penyaluran.find(p => p.id === pylId);
    if (!pyl) return;

    // Get available DOs (Pengeluaran) that match the product and have enough remaining stock
    const availableDOs = STATE.pengeluaran.filter(entry => {
        if (entry.product !== pyl.product) return false;
        
        const totalShared = STATE.penyaluran
            .filter(item => item.pengeluaran_id === entry.id && item.id !== pylId)
            .reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
        
        const remaining = (parseFloat(entry.keluar) || 0) - totalShared;
        return remaining >= pyl.qty;
    });

    const content = `
        <form onsubmit="saveProsesPenyaluran(event, '${pylId}')">
            <div style="margin-bottom: 20px; padding: 15px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe;">
                <div style="font-size: 0.8rem; color: #1e40af; font-weight: 600;">KEBUTUHAN KIOS</div>
                <div style="font-size: 1.1rem; font-weight: 800; color: #1d4ed8;">${pyl.product} - ${pyl.qty} TON</div>
            </div>
            
            <div class="form-group">
                <label>Pilih Sopir</label>
                <select name="driver" required>
                    <option value="" disabled selected>Pilih Sopir...</option>
                    ${STATE.drivers.map(d => `<option value="${d.name}|${d.plat}">${d.name} (${d.plat})</option>`).join('')}
                </select>
            </div>

            <div class="form-group">
                <label>Pilih Penebusan / DO (Stok Tersedia)</label>
                <select name="pengeluaran_id" required>
                    <option value="" disabled selected>Pilih DO Asal...</option>
                    ${availableDOs.map(doEntry => {
                        const totalShared = STATE.penyaluran
                            .filter(item => item.pengeluaran_id === doEntry.id && item.id !== pylId)
                            .reduce((sum, item) => sum + (parseFloat(item.qty) || 0), 0);
                        const remaining = (parseFloat(doEntry.keluar) || 0) - totalShared;
                        return `<option value="${doEntry.id}">${doEntry.do} - [${doEntry.product}] Sisa: ${remaining.toFixed(1)} Ton</option>`;
                    }).join('')}
                </select>
            </div>
            
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center; height: 48px; font-weight: 700;">KONFIRMASI PENJADWALAN</button>
        </form>
    `;
    
    if (availableDOs.length === 0) {
        return openErrorModal('STOK TIDAK CUKUP', `Tidak ditemukan stok DO (Penebusan) yang mencukupi untuk produk <strong>${pyl.product}</strong> (${pyl.qty} Ton).<br><br>Silakan buat Penebusan & Pengeluaran DO terlebih dahulu.`);
    }

    openModal('Proses Penyaluran Kios', content);
}

function saveProsesPenyaluran(e, pylId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const driverData = fd.get('driver').split('|');
    const outId = fd.get('pengeluaran_id');
    const entry = STATE.pengeluaran.find(o => o.id === outId);

    const pyl = STATE.penyaluran.find(p => p.id === pylId);
    if (pyl && entry) {
        pyl.driver = driverData[0];
        pyl.plat = driverData[1];
        pyl.pengeluaran_id = outId;
        pyl.do = entry.do;
        pyl.status = 'MENUNGGU PENGIRIMAN';
        
        // Trigger automated Kas Angkutan record creation
        if (typeof autoCreateKasAngkutan === 'function') {
            autoCreateKasAngkutan(pylId);
        }

        saveState();
        closeModal();
        renderPenyaluran();
        openSuccessModal('PENJADWALAN BERHASIL', `Pesanan telah dijadwalkan dengan Sopir <strong>${pyl.driver}</strong> menggunakan stok DO <strong>${entry.do}</strong>.<br><br>Biaya angkutan otomatis telah dicatat di Kas Angkutan.`);
    }
}

function confirmDispatch(e, pylId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const driverData = fd.get('driver').split('|');
    
    const pyl = STATE.penyaluran.find(p => p.id === pylId);
    if (pyl) {
        pyl.driver = driverData[0];
        pyl.plat = driverData[1];
        pyl.status = 'DALAM PENGIRIMAN';
        saveState();
        closeModal();
        renderPenyaluran();
        openSuccessModal('PENGIRIMAN DIMULAI', `Barang sedang dikirim oleh <strong>${pyl.driver}</strong> (${pyl.plat}).`);
    }
}

function deletePenyaluran(id) {
    if (!id) return;
    const targetId = String(id).trim().toUpperCase();
    
    if (!confirm('HAPUS PAKSA DATA PYL: ' + targetId + '?\n\nPerhatian: Tindakan ini akan menghapus data dari sistem dan database secara permanen.')) return;

    // Find the record first to get orderId
    const targetPyl = STATE.penyaluran.find(p => String(p.id).trim().toUpperCase() === targetId);
    const initialCount = STATE.penyaluran.length;
    
    // Remove from memory
    STATE.penyaluran = STATE.penyaluran.filter(p => String(p.id).trim().toUpperCase() !== targetId);
    
    // Clean up associated orders
    STATE.orders = STATE.orders.filter(o => 
        (o.pylId && String(o.pylId).trim().toUpperCase() === targetId) || 
        (String(o.id).trim().toUpperCase() === targetId) ||
        (targetPyl && targetPyl.orderId && o.id === targetPyl.orderId)
    );

    // Clean up linked Kas Angkutan entries
    STATE.kas_angkutan = STATE.kas_angkutan.filter(k => 
        String(k.noPyl).trim().toUpperCase() !== targetId
    );

    saveState();
    renderPenyaluran();
    
    // Refresh finance view if visible
    if (typeof renderKasAngkutan === 'function') renderKasAngkutan();
    
    if (STATE.penyaluran.length < initialCount) {
        if (typeof showToast === 'function') showToast('Data ' + targetId + ' Berhasil Dihapus');
        openSuccessModal('PENGHAPUSAN BERHASIL', `Data penyaluran <strong>${targetId}</strong> telah dihapus dari sistem.`);
    } else {
        alert('GAGAL MENGHAPUS: \nID "' + targetId + '" tidak ditemukan.\n\nID yang ada: ' + STATE.penyaluran.map(p => p.id).join(', '));
    }
}

function openEditPenyaluranModal(pylId) {
    const p = STATE.penyaluran.find(item => item.id === pylId);
    if (!p) return;

    const content = `
        <form onsubmit="updatePenyaluran(event, '${pylId}')">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group" style="grid-column: span 2;">
                    <label>Nama Kios</label>
                    <input type="text" name="kios" value="${p.kios}" required>
                </div>
                <div class="form-group">
                    <label>Produk</label>
                    <input type="text" name="product" value="${p.product}" readonly style="background: #f1f5f9;">
                </div>
                <div class="form-group">
                    <label>Qty (Ton)</label>
                    <input type="number" step="0.01" name="qty" value="${p.qty}" required>
                </div>
                <div class="form-group">
                    <label>Nama Sopir</label>
                    <input type="text" name="driver" value="${p.driver || ''}">
                </div>
                <div class="form-group">
                    <label>Plat Nomor</label>
                    <input type="text" name="plat" value="${p.plat || ''}">
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label>Status Pengiriman</label>
                    <select name="status">
                        <option value="MENUNGGU PROSES" ${p.status === 'MENUNGGU PROSES' ? 'selected' : ''}>MENUNGGU PROSES</option>
                        <option value="MENUNGGU PENGIRIMAN" ${p.status === 'MENUNGGU PENGIRIMAN' ? 'selected' : ''}>MENUNGGU PENGIRIMAN</option>
                        <option value="DALAM PENGIRIMAN" ${p.status === 'DALAM PENGIRIMAN' ? 'selected' : ''}>DALAM PENGIRIMAN</option>
                        <option value="SELESAI" ${p.status === 'SELESAI' ? 'selected' : ''}>SELESAI</option>
                    </select>
                </div>
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center; height: 50px; margin-top: 20px; font-weight: 700;">
                SIMPAN PERUBAHAN
            </button>
        </form>
    `;
    openModal('Edit Data Penyaluran', content);
}

function updatePenyaluran(e, pylId) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const idx = STATE.penyaluran.findIndex(p => p.id === pylId);
    if (idx === -1) return;

    STATE.penyaluran[idx] = {
        ...STATE.penyaluran[idx],
        kios: fd.get('kios'),
        qty: parseFloat(fd.get('qty')),
        driver: fd.get('driver'),
        plat: fd.get('plat'),
        status: fd.get('status')
    };

    // Also update order total if qty changed
    const order = STATE.orders.find(o => o.id === STATE.penyaluran[idx].orderId);
    if (order) {
        order.qty = STATE.penyaluran[idx].qty;
        order.total = order.qty * (order.pricePerTon || 0);
    }

    saveState();
    closeModal();
    renderPenyaluran();
    openSuccessModal('BERHASIL', 'Data penyaluran telah diperbarui.');
}

function printSuratJalan(id) {
    const p = STATE.penyaluran.find(item => item.id === id);
    if (!p) return;

    const printWindow = window.open('', '_blank');
    const branch = p.branch || 'PUSAT';
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Surat Jalan - ${p.id}</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
                .header { border-bottom: 2px solid #334155; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: start; }
                .logo-area h1 { margin: 0; color: #0f172a; font-size: 24px; letter-spacing: -0.5px; }
                .logo-area p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
                .title-area { text-align: center; margin-bottom: 40px; }
                .title-area h2 { margin: 0; text-decoration: underline; font-size: 20px; text-transform: uppercase; }
                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
                .info-item { margin-bottom: 12px; display: flex; }
                .info-label { width: 140px; font-weight: 600; color: #64748b; }
                .info-value { flex: 1; font-weight: 700; }
                .table { width: 100%; border-collapse: collapse; margin-bottom: 60px; }
                .table th, .table td { border: 1px solid #cbd5e1; padding: 12px 15px; text-align: left; }
                .table th { background: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 12px; }
                .footer-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin-top: 50px; }
                .sign-box { height: 100px; }
                @media print {
                    @page { margin: 0; }
                    body { padding: 40px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="logo-area">
                    <h1>TANI MAKMUR</h1>
                    <p>Distributor Pupuk & Alat Pertanian - Cabang ${branch}</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 700; font-size: 18px;">#${p.id}</div>
                    <div style="color: #64748b; font-size: 14px;">TGL: ${formatDate(p.date)}</div>
                </div>
            </div>

            <div class="title-area">
                <h2>Surat Jalan Pengiriman</h2>
            </div>

            <div class="info-grid">
                <div>
                    <div class="info-item">
                        <div class="info-label">Kios Tujuan</div>
                        <div class="info-value">: ${p.kios}</div>
                    </div>
                </div>
                <div>
                    <div class="info-item">
                        <div class="info-label">Sopir</div>
                        <div class="info-value">: ${p.driver}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">No. Polisi</div>
                        <div class="info-value">: ${p.plat}</div>
                    </div>
                </div>
            </div>

            <table class="table">
                <thead>
                    <tr>
                        <th style="width: 50px;">NO</th>
                        <th>NAMA BARANG / PRODUK</th>
                        <th style="width: 150px; text-align: right;">QUANTITY</th>
                        <th style="width: 100px;">SATUAN</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td><strong>${p.product}</strong></td>
                        <td style="text-align: right;"><strong>${p.qty}</strong></td>
                        <td>Ton</td>
                    </tr>
                </tbody>
            </table>

            <div style="margin-bottom: 60px;">
                <p style="font-size: 14px; font-style: italic; color: #64748b;">* Barang telah diperiksa dan diterima dalam keadaan baik dan cukup.</p>
            </div>

            <div class="footer-grid">
                <div>
                    <div style="margin-bottom: 10px;">Penerima / Kios,</div>
                    <div class="sign-box"></div>
                    <div style="font-weight: 700;">( ____________________ )</div>
                </div>
                <div>
                    <div style="margin-bottom: 10px;">Sopir / Driver,</div>
                    <div class="sign-box"></div>
                    <div style="font-weight: 700;">( ${p.driver} )</div>
                </div>
                <div>
                    <div style="margin-bottom: 10px;">Gudang / Admin,</div>
                    <div class="sign-box"></div>
                    <div style="font-weight: 700;">( ____________________ )</div>
                </div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    // window.close(); // Uncomment to close after print
                }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
