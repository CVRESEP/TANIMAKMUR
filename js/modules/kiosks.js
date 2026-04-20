// Kiosks Directory Module
function renderKiosks() {
    const tbody = document.getElementById('kiosks-table-body');
    if (!tbody) return;

    // Explicitly filter kiosks by branch for CABANG role
    const currentUser = STATE.currentUser;
    const kiosks = STATE.users.filter(u => {
        if (u.role !== 'KIOS') return false;
        if (currentUser.branch === 'ALL') {
            const filter = STATE.activeBranchFilter || 'ALL';
            return filter === 'ALL' || u.branch === filter;
        }
        return u.branch === currentUser.branch;
    });
    
    const data = paginateData(kiosks, 'kiosks');
    renderSelectionActions('kiosks_dir');
    const isSelectMode = STATE.uiSelectionMode['kiosks_dir'];
    
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

    tbody.innerHTML = data.map(k => {
        const branchDisplay = k.branch || '-';
        const branchClass = branchDisplay.toLowerCase().replace(/[^a-z0-9]/g, '');

        return `
            <tr>
                ${isSelectMode ? `<td><input type="checkbox" class="row-checkbox" value="${k.username}"></td>` : ''}
                <td><strong>${k.name}</strong></td>
                <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${k.username}</code></td>
                <td><span class="badge ${branchClass}">${branchDisplay}</span></td>
                <td>${k.kecamatan || '-'}</td>
                <td>${k.desa || '-'}</td>
                <td>${k.pic || '-'}</td>
                <td>${k.phone || '-'}</td>
                <td><code style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${k.password || '123'}</code></td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="action-btn small t-icon" title="Lihat Detail Pesanan" onclick="viewKioskOrders('${k.name}')">
                            <i data-lucide="eye"></i>
                        </button>
                        <button class="action-btn small t-icon" title="Edit Data Kios" onclick="openEditKioskModal('${k.username}')">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="action-btn small t-icon" title="Hapus Kios" onclick="deleteKiosk('${k.username}')" style="color: #ff4d4d;">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 50px; color: var(--text-dim);">Belum ada data kios terdaftar atau tidak ada data untuk filter ini.</td></tr>`;

    const wrapper = tbody.closest('.table-container');
    if (wrapper) {
        if (!wrapper.previousElementSibling || !wrapper.previousElementSibling.classList.contains('table-header-controls')) {
            wrapper.insertAdjacentHTML('beforebegin', renderRowLimitSelector('kiosks'));
        }
        if (!wrapper.nextElementSibling || !wrapper.nextElementSibling.classList.contains('table-footer-info')) {
            wrapper.insertAdjacentHTML('afterend', renderTableFooter(kiosks.length, data.length));
        } else {
            wrapper.nextElementSibling.textContent = `Menampilkan ${data.length} dari ${kiosks.length} total data`;
        }
    }
    
    lucide.createIcons();
}

function openAddKioskModal() {
    const content = `
        <form onsubmit="saveKiosk(event)">
            <div class="form-group">
                <label>Nama Kios</label>
                <input type="text" name="name" placeholder="Contoh: Kios Berkah Tani" required>
            </div>
            ${renderBranchSelector('branch', '', 'Kabupaten', true)}
            <div class="form-group">
                <label>Kecamatan</label>
                <input type="text" name="kecamatan" placeholder="Masukkan nama kecamatan" required>
            </div>
            <div class="form-group">
                <label>Desa</label>
                <input type="text" name="desa" placeholder="Masukkan nama desa" required>
            </div>
            <div class="form-group">
                <label>Penanggung Jawab (Pemilik)</label>
                <input type="text" name="pic" placeholder="Nama lengkap penanggung jawab" required>
            </div>
            <div class="form-group">
                <label>Nomor Telepon</label>
                <input type="text" name="phone" placeholder="Contoh: 08123456789">
            </div>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 5px;">*Akun login akan dibuat otomatis menggunakan nama kios.</p>
                <p style="font-size: 0.8rem; color: var(--text-dim);">*Password default adalah: <strong>123</strong></p>
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center; height: 48px;">SIMPAN DATA KIOS</button>
        </form>
    `;
    openModal('Tambah Data Kios Baru', content);
}

function saveKiosk(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name');
    const username = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (STATE.users.find(u => u.username === username)) {
        return alert('Nama kios/Username sudah digunakan!');
    }

    const newKiosk = {
        username: username,
        password: '123',
        role: 'KIOS',
        name: name,
        branch: fd.get('branch'),
        kecamatan: fd.get('kecamatan'),
        desa: fd.get('desa'),
        pic: fd.get('pic'),
        phone: fd.get('phone')
    };

    STATE.users.push(newKiosk);
    saveState();
    closeModal();
    renderKiosks();
    openSuccessModal('KIOS DITAMBAHKAN', `Kios <strong>${name}</strong> telah berhasil didaftarkan ke sistem.`);
}

function openEditKioskModal(username) {
    const k = STATE.users.find(u => u.username === username);
    if (!k) return;

    const content = `
        <form onsubmit="updateKiosk(event, '${username}')">
            <div class="form-group">
                <label>Nama Kios</label>
                <input type="text" name="name" value="${k.name}" required>
            </div>
            ${renderBranchSelector('branch', k.branch, 'Kabupaten', true)}
            <div class="form-group">
                <label>Kecamatan</label>
                <input type="text" name="kecamatan" value="${k.kecamatan || ''}" required>
            </div>
            <div class="form-group">
                <label>Desa</label>
                <input type="text" name="desa" value="${k.desa || ''}" required>
            </div>
            <div class="form-group">
                <label>Penanggung Jawab (Pemilik)</label>
                <input type="text" name="pic" value="${k.pic || ''}" required>
            </div>
            <div class="form-group">
                <label>Nomor Telepon</label>
                <input type="text" name="phone" value="${k.phone || ''}">
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center; height: 48px;">UPDATE DATA KIOS</button>
        </form>
    `;
    openModal('Edit Data Kios', content);
}

function updateKiosk(e, username) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const k = STATE.users.find(u => u.username === username);
    if (k) {
        k.name = fd.get('name');
        k.branch = fd.get('branch');
        k.kecamatan = fd.get('kecamatan');
        k.desa = fd.get('desa');
        k.pic = fd.get('pic');
        k.phone = fd.get('phone');
        saveState();
        closeModal();
        renderKiosks();
        openSuccessModal('BERHASIL', `Data kios ${k.name} berhasil diperbarui.`);
    }
}

function deleteKiosk(username) {
    if (confirm('Hapus data kios ' + username + '? Seluruh akun login terkait juga akan dihapus.')) {
        STATE.users = STATE.users.filter(u => u.username !== username);
        saveState();
        renderKiosks();
        openSuccessModal('KIOS DIHAPUS', 'Data kios telah dihapus dari sistem.');
    }
}

function viewKioskOrders(kioskName) {
    const kioskOrders = STATE.orders.filter(o => o.kiosk === kioskName);
    const totalDebt = kioskOrders
        .filter(o => o.status !== 'LUNAS')
        .reduce((sum, o) => sum + (o.total || 0), 0);
    
    const title = `Riwayat Pesanan - ${kioskName} ${totalDebt > 0 ? `<span style="color:#ef4444; margin-left:15px; font-weight:700; font-size:1.1rem;">| Kurang Bayar: ${formatCurrency(totalDebt)}</span>` : ''}`;

    const content = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th style="width: 100px;">TANGGAL</th>
                        <th style="width: 150px;">NO PENYALURAN</th>
                        <th>PRODUK</th>
                        <th>QTY</th>
                        <th>TOTAL</th>
                        <th style="width: 120px;">STATUS</th>
                    </tr>
                </thead>
                <tbody>
                    ${kioskOrders.map(o => `
                        <tr>
                            <td>${formatDate(o.date)}</td>
                            <td>${o.pylId ? `<span class="badge" style="background:#e0f2fe; color:#0369a1; font-family:monospace;">${o.pylId}</span>` : '<span style="color:var(--text-dim); font-size:0.75rem;">MENUNGGU</span>'}</td>
                            <td>${o.product}</td>
                            <td>${o.qty} Ton</td>
                            <td>${formatCurrency(o.total)}</td>
                            <td><span class="badge ${o.status.toLowerCase().replace(/ /g, '-')}">${o.status}</span></td>
                        </tr>
                    `).join('') || '<tr><td colspan="100%" style="text-align:center; padding: 20px;">Belum ada riwayat pesanan</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
    openModal(title, content, '800px');
}
function printKioskDebts() {
    const kiosks = STATE.users.filter(u => {
        if (u.role !== 'KIOS') return false;
        if (STATE.currentUser.branch === 'ALL') {
            const filter = STATE.activeBranchFilter || 'ALL';
            return filter === 'ALL' || u.branch === filter;
        }
        return u.branch === STATE.currentUser.branch;
    });

    const reportData = kiosks.map(k => {
        const unpaidOrders = STATE.orders.filter(o => 
            o.kiosk && o.kiosk.trim().toUpperCase() === k.name.trim().toUpperCase() &&
            o.status !== 'LUNAS'
        );
        
        const totalDebt = unpaidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        
        return {
            ...k,
            totalDebt,
            unpaidOrders
        };
    }).filter(k => k.totalDebt > 0);

    if (reportData.length === 0) {
        return alert('Tidak ada data kios yang memiliki piutang / hutang pada filter wilayah saat ini.');
    }

    const printWindow = window.open('', '_blank');
    const branch = STATE.currentUser.branch === 'ALL' ? 'SEMUA CABANG' : STATE.currentUser.branch;

    printWindow.document.write(`
        <html>
        <head>
            <title>Laporan Piutang Kios - ${new Date().toLocaleDateString()}</title>
            <style>
                body { font-family: 'Inter', sans-serif; padding: 30px; color: #1e293b; line-height: 1.4; }
                .header { border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 25px; text-align: center; }
                .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
                .header p { margin: 5px 0 0; color: #64748b; font-size: 13px; }
                .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                .table th, .table td { border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-size: 11px; vertical-align: top; }
                .table th { background: #f8fafc; font-weight: 700; text-transform: uppercase; font-size: 10px; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
                .debt-heavy { color: #b91c1c; font-weight: 800; font-size: 12px; }
                .kiosk-name-cell { min-width: 250px; }
                .rincian-container { margin-top: 8px; border-top: 1px dashed #e2e8f0; padding-top: 6px; }
                .rincian-item { font-size: 10px; color: #475569; margin-bottom: 2px; line-height: 1.4; min-height: 15px; }
                .nominal-item { font-size: 10px; color: #64748b; margin-bottom: 2px; line-height: 1.4; min-height: 15px; text-align: right; font-style: italic; }
                
                .footer { margin-top: 50px; display: flex; justify-content: flex-end; font-size: 12px; }
                .sign-box-wrapper { width: 250px; text-align: center; }
                .sign-box { height: 70px; }
                
                @media print {
                    @page { size: portrait; margin: 1cm; }
                    body { padding: 0; }
                    .table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>REKAPITULASI PIUTANG KIOS (TANI MAKMUR)</h1>
                <p>Wilayah: ${branch} | Per Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>
            </div>

            <table class="table">
                <thead>
                    <tr>
                        <th style="width: 25px;">NO</th>
                        <th class="kiosk-name-cell">NAMA KIOS & RINCIAN BARANG</th>
                        <th style="width: 100px;">WILAYAH / KECAMATAN</th>
                        <th class="text-right" style="width: 150px;">TOTAL PIUTANG & RINCIAN</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.map((k, i) => `
                        <tr>
                            <td class="text-center">${i + 1}</td>
                            <td>
                                <strong>${k.name.toUpperCase()}</strong>
                                <div class="rincian-container">
                                    ${k.unpaidOrders.map(o => `
                                        <div class="rincian-item">
                                            • ${formatDate(o.date)}: ${o.product} (${o.qty} Ton)
                                        </div>
                                    `).join('')}
                                </div>
                            </td>
                            <td><span style="font-size: 10px; font-weight:600;">${k.branch}</span><br><span style="color:#64748b; font-size:9px;">${k.kecamatan || '-'}</span></td>
                            <td class="text-right">
                                <div class="debt-heavy">${formatCurrency(k.totalDebt)}</div>
                                <div class="rincian-container">
                                    ${k.unpaidOrders.map(o => `
                                        <div class="nominal-item">
                                            ${formatCurrency(o.total)}
                                        </div>
                                    `).join('')}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="3" class="text-right" style="padding: 15px; font-size:12px;">TOTAL KESELURUHAN PIUTANG</th>
                        <th class="text-right debt-heavy" style="font-size: 16px; background: #fff1f2; border: 2px solid #ef4444;">${formatCurrency(reportData.reduce((sum, k) => sum + k.totalDebt, 0))}</th>
                    </tr>
                </tfoot>
            </table>

            <div class="footer">
                <div class="sign-box-wrapper">
                    <p>Madiun, ${new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                    <p style="margin-top: -10px;">Dibuat Oleh,</p>
                    <div class="sign-box"></div>
                    <p><strong>( ${STATE.currentUser.name} )</strong></p>
                </div>
            </div>

            <script>
                window.onload = function() { window.print(); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}
