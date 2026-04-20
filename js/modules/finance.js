// Finance / Cash Management Module
function renderKasAngkutan() {
    _renderFinance('kas_angkutan', 'Buku Kas Angkutan');
    
    // Handle Approval Button Visibility
    const btn = document.getElementById('btn-approval-kas');
    if (btn) {
        const isManager = ['OWNER', 'MANAJER'].includes(STATE.currentUser.role.toUpperCase());
        btn.style.display = isManager ? 'flex' : 'none';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function renderKasUmum() {
    _renderFinance('kas_umum', 'Buku Kas Umum');
    
    // Handle Approval Button Visibility
    const btn = document.getElementById('btn-approval-kas-umum');
    if (btn) {
        const isManager = ['OWNER', 'MANAJER'].includes(STATE.currentUser.role.toUpperCase());
        btn.style.display = isManager ? 'flex' : 'none';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function _renderFinance(type, title) {
    const tbody = document.getElementById(`${type}-table-body`);
    const summaryContainer = document.getElementById(`${type}-summary-container`);
    if (!tbody) return;

    const allData = getFilteredData(type);
    const data = paginateData(allData, type);
    
    renderSelectionActions(type);
    const isSelectMode = STATE.uiSelectionMode[type];

    // Update Header with Checkbox
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

    // Calculate Summary
    const totalMasuk = allData.reduce((sum, item) => sum + (parseFloat(item.masuk) || 0), 0);
    const totalKeluar = allData.reduce((sum, item) => sum + (parseFloat(item.keluar) || 0), 0);
    const saldo = totalMasuk - totalKeluar;

    if (summaryContainer) {
        summaryContainer.innerHTML = `
            <div class="stats-grid">
                <div class="card" style="border-left: 4px solid var(--primary);">
                    <div class="card-title">TOTAL MASUK</div>
                    <div class="card-value">${formatCurrency(totalMasuk)}</div>
                </div>
                <div class="card" style="border-left: 4px solid var(--danger);">
                    <div class="card-title">TOTAL KELUAR</div>
                    <div class="card-value">${formatCurrency(totalKeluar)}</div>
                </div>
                <div class="card" style="border-left: 4px solid #3b82f6; background: #eff6ff;">
                    <div class="card-title">SALDO AKHIR</div>
                    <div class="card-value" style="color: #1d4ed8;">${formatCurrency(saldo)}</div>
                </div>
            </div>
        `;
    }

    if (type === 'kas_angkutan') {
        tbody.innerHTML = data.map(item => `
            <tr>
                ${isSelectMode ? `<td><input type="checkbox" class="row-checkbox" value="${item.id}"></td>` : ''}
                <td>${formatDate(item.date)}</td>
                <td>
                    <div style="font-weight: 700; color: var(--primary);">${item.noDo || 'UMUM'}</div>
                    <div style="font-size: 0.75rem; color: var(--text-dim);">${item.noPyl || '-'}</div>
                </td>
                <td>
                    <div style="font-size: 0.85rem;"><strong>${item.desc}</strong></div>
                    <div style="font-size: 0.7rem; color: #64748b;">Sopir: ${item.sopir || '-'}</div>
                </td>
                <td style="color: var(--primary); font-weight: 700;">${item.masuk > 0 ? formatCurrency(item.masuk) : '-'}</td>
                <td style="color: var(--danger); font-weight: 700;">${item.keluar > 0 ? formatCurrency(item.keluar) : '-'}</td>
                <td style="font-size: 0.75rem; color: var(--text-dim);">
                    ${item.kabupaten || '-'}
                </td>
                <td>
                    <div style="margin-bottom: 5px;">
                        ${item.status === 'DISETUJUI' ? `<span class="badge lunas">DISETUJUI</span>` : 
                          item.status === 'MENUNGGU PERSETUJUAN' ? `<span class="badge propping" style="background:#fef3c7; color:#92400e;">MENUNGGU</span>` :
                          `<span class="badge" style="background:#f1f5f9; color:#64748b; font-size:0.65rem;">DRAFT</span>`}
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button class="action-btn small t-icon" title="Lihat Detail" onclick="viewFinanceDetail('${item.id}')">
                            <i data-lucide="eye"></i>
                        </button>
                        ${item.status === 'DISETUJUI' && ['OWNER', 'MANAJER'].includes(STATE.currentUser.role.toUpperCase()) ? `
                        <button class="action-btn small t-icon" title="Batalkan Persetujuan" onclick="revertFinanceApproval('${item.id}')" style="color: #f59e0b;">
                            <i data-lucide="rotate-ccw"></i>
                        </button>` : ''}
                        ${item.status !== 'DISETUJUI' ? `
                        <button class="action-btn small t-icon" title="Hapus" onclick="deleteFinanceTransaction('${type}', '${item.id}')" style="color: #ff4d4d;">
                            <i data-lucide="trash-2"></i>
                        </button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 30px; color: var(--text-dim);">Belum ada transaksi terdata</td></tr>`;
    } else {
        tbody.innerHTML = data.map(item => `
            <tr>
                ${isSelectMode ? `<td><input type="checkbox" class="row-checkbox" value="${item.id}"></td>` : ''}
                <td>${formatDate(item.date)}</td>
                <td>
                    <div style="font-weight: 600;">${item.desc}</div>
                    <div style="font-size: 0.7rem; color: var(--text-dim);">${item.kabupaten || '-'}</div>
                </td>
                <td style="color: var(--primary); font-weight: 600;">${item.masuk > 0 ? formatCurrency(item.masuk) : '-'}</td>
                <td style="color: var(--danger); font-weight: 600;">${item.keluar > 0 ? formatCurrency(item.keluar) : '-'}</td>
                <td>
                    <div style="margin-bottom: 5px;">
                        ${item.status === 'DISETUJUI' ? `<span class="badge lunas">DISETUJUI</span>` : 
                          item.status === 'MENUNGGU PERSETUJUAN' ? `<span class="badge propping" style="background:#fef3c7; color:#92400e;">MENUNGGU</span>` :
                          `<span class="badge" style="background:#f1f5f9; color:#64748b; font-size:0.65rem;">DRAFT</span>`}
                    </div>
                    <div style="display: flex; gap: 5px;">
                        ${item.status === 'DISETUJUI' && ['OWNER', 'MANAJER'].includes(STATE.currentUser.role.toUpperCase()) ? `
                        <button class="action-btn small t-icon" title="Batalkan Persetujuan" onclick="revertFinanceApproval('${item.id}', '${type}')" style="color: #f59e0b;">
                            <i data-lucide="rotate-ccw"></i>
                        </button>` : ''}
                        ${item.status !== 'DISETUJUI' ? `
                        <button class="action-btn small t-icon" title="Hapus" onclick="deleteFinanceTransaction('${type}', '${item.id}')" style="color: #ff4d4d;">
                            <i data-lucide="trash-2"></i>
                        </button>` : ''}
                    </div>
                </td>
            </tr>
        `).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 30px; color: var(--text-dim);">Belum ada transaksi terdata</td></tr>`;
    }

    lucide.createIcons();
}

function submitFinanceForApproval(type = 'kas_angkutan') {
    const checked = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) return alert('Pilih data yang akan diajukan!');

    const label = type === 'kas_angkutan' ? 'Kas Angkutan' : 'Kas Umum';

    if (confirm(`Ajukan ${checked.length} transaksi ${label} terpilih untuk dimohonkan dana?`)) {
        let totalReq = 0;
        STATE[type].forEach(item => {
            if (checked.includes(String(item.id))) {
                item.status = 'MENUNGGU PERSETUJUAN';
                totalReq += (parseFloat(item.keluar) || 0);
            }
        });
        saveState();
        STATE.uiSelectionMode[type] = false;
        if (type === 'kas_angkutan') renderKasAngkutan(); else renderKasUmum();
        
        // WhatsApp Notification - TRIGGER AUTOMATICALLY
        const waMessage = `Halo Pak/Bu Manajer, saya *${STATE.currentUser.name}* (Staff Admin). 
Saya baru saja mengajukan permohonan dana untuk *${label.toUpperCase()}* sebanyak *${checked.length} data* dengan total permohonan sebesar *${formatCurrency(totalReq)}*. 

Mohon bantuannya untuk diproses di menu Persetujuan Dana. Terima kasih.
_Sent from Tani Makmur App_`;

        // Direct call via global utility (Dual WA & TG)
        sendAutoNotification(STATE.settings?.wa_number, waMessage, 'Permohonan Dana', STATE.settings?.tg_owner_chat_id);

        openSuccessModal('PENGAJUAN BERHASIL', `
            <div style="text-align: center;">
                <p><b>${checked.length} transaksi ${label}</b> telah diajukan.</p>
                <p style="margin-top: 10px; font-size: 0.85rem; color: var(--text-dim);">WhatsApp otomatis telah dibuka untuk memberi tahu Owner.</p>
            </div>
        `);
    }
}


function approveFinanceTransactions(type, overrideIds = null) {
    const checked = overrideIds || Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) return alert('Pilih data yang akan disetujui!');

    const label = type === 'kas_angkutan' ? 'Kas Angkutan' : 'Kas Umum';

    if (confirm(`Setujui (Approve) ${checked.length} transaksi ${label} terpilih?`)) {
        STATE[type].forEach(item => {
            if (checked.includes(String(item.id))) {
                item.status = 'DISETUJUI';
            }
        });
        saveState();
        STATE.uiSelectionMode[type] = false;
        if (type === 'kas_angkutan') renderKasAngkutan(); else renderKasUmum();
        closeModal();
        openSuccessModal('PERSETUJUAN SELESAI', `${checked.length} transaksi ${label} telah disetujui.`);
    }
}

function openFinanceApprovalModal(type = 'kas_angkutan') {
    const pending = STATE[type].filter(i => i.status === 'MENUNGGU PERSETUJUAN');
    const label = type === 'kas_angkutan' ? 'Kas Angkutan' : 'Kas Umum';
    
    if (pending.length === 0) {
        return openErrorModal('TIDAK ADA DATA', `Saat ini tidak ada transaksi ${label} yang menunggu persetujuan.`);
    }

    const content = `
        <div style="padding: 5px;">
            <div style="background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px; border-radius: 10px; margin-bottom: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: center;">
                <div>
                    <div style="font-size: 0.75rem; color: #0369a1; font-weight: 700; text-transform: uppercase; margin-bottom: 5px;">Total Permohonan Dana (${label})</div>
                    <div id="approval-total-display" style="font-size: 1.1rem; font-weight: 700; color: #64748b; text-decoration: line-through; opacity: 0.7;">${formatCurrency(0)}</div>
                    <div style="font-size: 0.75rem; color: #15803d; font-weight: 700; text-transform: uppercase; margin-top: 10px;">Dana Yang Dicairkan (ACC)</div>
                    <input type="text" id="approval-acc-input" oninput="this.value = formatNumberInput(this.value)" style="width: 100%; font-size: 1.5rem; font-weight: 800; color: #15803d; border: 2px solid #10b981; border-radius: 8px; padding: 8px 12px; outline: none; background: white; margin-top: 5px;">
                </div>
                <div style="text-align: right; color: #0369a1;">
                    <div style="font-size: 0.75rem; font-weight: 700;">JUMLAH PERMOHONAN</div>
                    <div id="approval-count-display" style="font-size: 1.2rem; font-weight: 800;">0 Data</div>
                    <div style="margin-top: 10px; font-size: 0.7rem; font-style: italic; color: #64748b;">*Dana akan dicatat masuk sebagai modal operasional di ${label}.</div>
                </div>
            </div>

            <p style="margin-bottom: 15px; color: var(--text-dim); font-size: 0.85rem; font-weight: 600;">RINCIAN PERMOHONAN DANA:</p>
            
            <div class="table-container" style="max-height: 300px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 1;">
                        <tr>
                            <th style="padding: 12px; text-align: left; width: 40px;"><input type="checkbox" id="check-all-approval" onclick="toggleApprovalCheckAll(this)"></th>
                            <th style="padding: 12px; text-align: left;">TANGGAL</th>
                            <th style="padding: 12px; text-align: left;">DESKRIPSI</th>
                            <th style="padding: 12px; text-align: right;">NOMINAL AWAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pending.map(item => `
                            <tr style="border-top: 1px solid #e2e8f0;">
                                <td style="padding: 12px;"><input type="checkbox" class="approval-checkbox" value="${item.id}" data-amount="${item.keluar}" onclick="updateApprovalTotal()"></td>
                                <td style="padding: 12px; font-size: 0.85rem;">${formatDate(item.date)}</td>
                                <td style="padding: 12px;">
                                    <div style="font-weight: 600; font-size: 0.9rem;">${item.desc}</div>
                                    <div style="font-size: 0.75rem; color: var(--text-dim);">${item.kabupaten || '-'}</div>
                                </td>
                                <td style="padding: 12px; text-align: right; font-weight: 700; color: var(--danger);">${formatCurrency(item.keluar)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div style="margin-top: 25px; display: flex; gap: 10px;">
                <button class="action-btn primary" onclick="processBulkApprovalFromModal('${type}')" style="flex: 1; justify-content: center; background: #10b981; border-color: #059669; height: 52px; font-weight: 700; font-size: 1rem;">
                    <i data-lucide="check-circle"></i> APPROVE & CAIRKAN DANA
                </button>
                <button class="action-btn secondary" onclick="closeModal()" style="height: 52px; padding: 0 25px;">BATAL</button>
            </div>
        </div>
    `;
    
    openModal(`Persetujuan Dana ${label}`, content, '850px');
    updateApprovalTotal(); // Initial update
}

function toggleApprovalCheckAll(master) {
    document.querySelectorAll('.approval-checkbox').forEach(cb => cb.checked = master.checked);
    updateApprovalTotal();
}

function updateApprovalTotal() {
    const checkboxes = Array.from(document.querySelectorAll('.approval-checkbox:checked'));
    const total = checkboxes.reduce((sum, cb) => sum + (parseFloat(cb.dataset.amount) || 0), 0);
    const count = checkboxes.length;
    
    const displayTotal = document.getElementById('approval-total-display');
    const displayCount = document.getElementById('approval-count-display');
    const accInput = document.getElementById('approval-acc-input');
    
    if (displayTotal) displayTotal.textContent = formatCurrency(total);
    if (displayCount) displayCount.textContent = `${count} Data`;
    if (accInput) {
        accInput.value = formatNumberInput(total.toString());
    }
}

function processBulkApprovalFromModal(type) {
    const checked = Array.from(document.querySelectorAll('.approval-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) return alert('Pilih minimal satu transaksi untuk disetujui.');
    
    const rawAccValue = document.getElementById('approval-acc-input').value;
    const finalTotalAcc = parseNumberInput(rawAccValue);
    const label = type === 'kas_angkutan' ? 'KAS ANGKUTAN' : 'KAS UMUM';
    
    if (confirm(`Anda akan mencairkan dana senilai ${formatCurrency(finalTotalAcc)} untuk ${checked.length} data terpilih?`)) {
        
        // 1. Mark existing items as approved
        STATE[type].forEach(item => {
            if (checked.includes(String(item.id))) {
                item.status = 'DISETUJUI';
            }
        });

        // 2. Create a NEW "MASUK" entry
        const newEntry = {
            id: 'TX-IN-' + Date.now(),
            date: new Date().toISOString().split('T')[0],
            desc: `PENCAIRAN DANA ${label} (OVERALL ACC) - ${checked.length} DATA`,
            masuk: finalTotalAcc,
            keluar: 0,
            branch: STATE.currentUser.branch === 'ALL' ? 'MAGETAN' : STATE.currentUser.branch,
            kabupaten: STATE.currentUser.branch === 'ALL' ? 'MAGETAN' : STATE.currentUser.branch,
            status: 'DISETUJUI'
        };
        
        if (type === 'kas_angkutan') {
            newEntry.noDo = 'ACC-DANA';
            newEntry.noPyl = 'ACC-' + Date.now().toString().slice(-6);
        }
        
        STATE[type].unshift(newEntry);
        
        saveState();
        STATE.uiSelectionMode[type] = false;
        if (type === 'kas_angkutan') renderKasAngkutan(); else renderKasUmum();
        closeModal();
        openSuccessModal('DANA DICAIRKAN', `Dana senilai ${formatCurrency(finalTotalAcc)} telah masuk ke ${label}.`);
    }
}

function revertFinanceApproval(id, type = 'kas_angkutan') {
    if (confirm('Batalkan persetujuan untuk transaksi ini? Status akan kembali menjadi Menunggu Persetujuan.')) {
        const item = STATE[type].find(i => i.id === id);
        if (item) {
            item.status = 'MENUNGGU PERSETUJUAN';
            saveState();
            if (type === 'kas_angkutan') renderKasAngkutan(); else renderKasUmum();
            showToast('Persetujuan dibatalkan');
        }
    }
}


function openAddFinanceModal(type) {
    if (type === 'kas_angkutan') return openAddKasAngkutanModal();
    
    let targetTitle = 'Catat Kas Umum';
    let targetTable = type;
    let userBranch = STATE.currentUser.branch === 'ALL' ? (STATE.activeBranchFilter === 'ALL' ? 'MAGETAN' : STATE.activeBranchFilter) : STATE.currentUser.branch;

    if (type === 'kas_angkutan_op') {
        targetTitle = 'Biaya Operasional';
        targetTable = 'kas_angkutan'; // Saves to Kas Angkutan table
    }

    const content = `
        <form onsubmit="saveFinanceTransaction(event, '${targetTable}')">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group" style="grid-column: span 2;">
                    <label>Kabupaten</label>
                    <select name="kabupaten" required style="background: #f1f5f9; pointer-events: none; touch-action: none;" tabindex="-1">
                        <option value="MAGETAN" ${userBranch === 'MAGETAN' ? 'selected' : ''}>MAGETAN</option>
                        <option value="SRAGEN" ${userBranch === 'SRAGEN' ? 'selected' : ''}>SRAGEN</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Tanggal Transaksi</label>
                    <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label>Jenis Transaksi</label>
                    <select name="direction">
                        <option value="KELUAR" selected>UANG KELUAR (-)</option>
                        <option value="MASUK">UANG MASUK (+)</option>
                    </select>
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label>Keterangan / Deskripsi</label>
                    <input type="text" name="desc" placeholder="${type === 'kas_angkutan_op' ? 'Contoh: Ganti Ban Depan' : 'Contoh: Operasional Kantor'}" required>
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label>Nominal (Rp)</label>
                    <input type="text" name="amount" placeholder="Rp 0" oninput="this.value = formatNumberInput(this.value)" required style="font-size: 1.1rem; font-weight: 700; color: var(--danger);">
                </div>
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center; height: 50px; font-weight: 700; margin-top: 15px;">SIMPAN TRANSAKSI</button>
        </form>
    `;
    openModal(targetTitle, content);
}

function openAddKasAngkutanModal() {
    const doList = [...new Set(STATE.penyaluran.filter(p => p.do).map(p => p.do))];
    const userBranch = STATE.currentUser.branch === 'ALL' ? (STATE.activeBranchFilter === 'ALL' ? 'MAGETAN' : STATE.activeBranchFilter) : STATE.currentUser.branch;

    const content = `
        <form onsubmit="saveFinanceTransaction(event, 'kas_angkutan')" id="form-kas-angkutan">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label>Kabupaten</label>
                    <select name="kabupaten" id="fin-kabupaten" onchange="handleFinanceKabChange()" required style="background: #f1f5f9; pointer-events: none; touch-action: none;" tabindex="-1">
                        <option value="MAGETAN" ${userBranch === 'MAGETAN' ? 'selected' : ''}>MAGETAN</option>
                        <option value="SRAGEN" ${userBranch === 'SRAGEN' ? 'selected' : ''}>SRAGEN</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Nomor DO</label>
                    <select name="noDo" id="fin-no-do" onchange="handleFinanceDoChange()" required>
                        <option value="NONE">TANPA DO (UMUM)</option>
                        ${doList.map(doNum => `<option value="${doNum}">${doNum}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Nomor Penyaluran</label>
                    <select name="noPyl" id="fin-no-pyl" onchange="handleFinancePylChange()">
                        <option value="">Pilih DO Dulu...</option>
                    </select>
                </div>

                <div class="form-group">
                    <label>Tanggal</label>
                    <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label>Jenis</label>
                    <select name="direction" onchange="handleFinanceDirectionChange(this)">
                        <option value="KELUAR" selected>PENGELUARAN (-)</option>
                        <option value="MASUK">PEMASUKAN (+)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Nominal Total</label>
                    <input type="text" name="amount" id="fin-amount" readonly style="background:#f1f5f9; font-weight:700; color:var(--primary)">
                </div>

                <div class="form-group" style="grid-column: span 3;">
                    <label>Uraian / Deskripsi</label>
                    <input type="text" name="desc" id="fin-desc" placeholder="Contoh: Operasional Sopir" required>
                </div>

                <div class="form-group">
                    <label>Nama Sopir</label>
                    <input type="text" name="sopir" id="fin-sopir" placeholder="Nama Sopir">
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label>Nama Kios</label>
                    <input type="text" name="kios" id="fin-kios" readonly style="background:#f1f5f9">
                </div>

                <div style="grid-column: span 3; border-top: 1px solid #e2e8f0; padding-top: 15px; margin-top: 5px;">
                    <h4 style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Rincian Pengeluaran (Breakdown)</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                        <div class="form-group">
                            <label>Admin</label>
                            <input type="text" name="admin" id="fin-admin" value="0" oninput="calculateFinanceTotal()" class="fin-calc">
                        </div>
                        <div class="form-group">
                            <label>Solar</label>
                            <input type="text" name="solar" id="fin-solar" value="0" oninput="calculateFinanceTotal()" class="fin-calc">
                        </div>
                        <div class="form-group">
                            <label>Upah Sopir</label>
                            <input type="text" name="upahSopir" id="fin-upahSopir" value="0" oninput="calculateFinanceTotal()" class="fin-calc">
                        </div>
                        <div class="form-group">
                            <label>Uang Makan</label>
                            <input type="text" name="uangMakan" value="0" oninput="calculateFinanceTotal()" class="fin-calc">
                        </div>
                        <div class="form-group">
                            <label>Palang</label>
                            <input type="text" name="palang" value="0" oninput="calculateFinanceTotal()" class="fin-calc">
                        </div>
                        <div class="form-group">
                            <label>Lembur</label>
                            <input type="text" name="lembur" value="0" oninput="calculateFinanceTotal()" class="fin-calc">
                        </div>
                        <div class="form-group">
                            <label>Helper</label>
                            <input type="text" name="helper" value="0" oninput="calculateFinanceTotal()" class="fin-calc">
                        </div>
                        <div class="form-group" style="grid-column: span 2;">
                            <label>Lain-lain / Tambahan</label>
                            <input type="text" name="lainLain" value="0" oninput="calculateFinanceTotal()" class="fin-calc">
                        </div>
                    </div>
                </div>
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center; height: 52px; font-weight: 700; margin-top: 25px; font-size: 1rem;">
                <i data-lucide="save"></i> SIMPAN KAS ANGKUTAN
            </button>
        </form>
    `;
    openModal('Tambah Kas Angkutan (Detail)', content, '1000px');
    
    // Add format and parse listeners to all calc fields
    const calcFields = document.querySelectorAll('.fin-calc');
    calcFields.forEach(f => {
        f.addEventListener('input', (e) => {
            const raw = parseNumberInput(e.target.value);
            e.target.dataset.val = raw;
            // format UI
            const start = e.target.selectionStart;
            e.target.value = formatNumberInput(e.target.value);
        });
    });
}

// Logic Helpers for the complex form
function handleFinanceKabChange() {
    const kab = document.getElementById('fin-kabupaten').value;
    const doRef = document.getElementById('fin-no-do');
    const pylRef = document.getElementById('fin-no-pyl');
    
    // Filter DOs based on Kab in penyaluran
    const filteredDOs = [...new Set(STATE.penyaluran.filter(p => p.branch === kab || p.kabupaten === kab).map(p => p.do))];
    
    doRef.innerHTML = `<option value="NONE">TANPA DO (UMUM)</option>` + 
        filteredDOs.map(d => `<option value="${d}">${d}</option>`).join('');
    
    pylRef.innerHTML = `<option value="">Pilih DO Terlebih Dahulu...</option>`;
}

function handleFinanceDoChange() {
    const doNum = document.getElementById('fin-no-do').value;
    const pylRef = document.getElementById('fin-no-pyl');
    
    if (doNum === 'NONE') {
        pylRef.innerHTML = `<option value="">Tidak Ada Penyaluran</option>`;
        pylRef.disabled = true;
        // Unlock fields
        document.getElementById('fin-admin').readOnly = false;
        document.getElementById('fin-solar').readOnly = false;
        document.getElementById('fin-upahSopir').readOnly = false;
        document.getElementById('fin-sopir').readOnly = false;
        document.getElementById('fin-desc').readOnly = false;
        return;
    }

    pylRef.disabled = false;
    const filteredPyl = STATE.penyaluran.filter(p => p.do === doNum);
    pylRef.innerHTML = `<option value="" disabled selected>Pilih Penyaluran...</option>` + 
        filteredPyl.map(p => `<option value="${p.id}">${p.id} - ${p.kios} (${p.qty} Ton)</option>`).join('');
}
function autoCreateKasAngkutan(pylId) {
    const pyl = STATE.penyaluran.find(p => p.id === pylId);
    if (!pyl) return;

    const qty = parseFloat(pyl.qty) || 0;
    const kab = pyl.kabupaten || pyl.branch || 'MAGETAN';
    const desc = `BIAYA ANGKUTAN (AUTO) - ${pyl.id} - ${pyl.product} - ${pyl.kios}`;
    
    let admin = 0, solar = 0;
    if (kab.toUpperCase() === 'MAGETAN') {
        admin = Math.round(qty * 2000);
        solar = Math.round(qty * (100000 / 24));
    } else {
        admin = Math.round(qty * 3125);
        solar = Math.round(qty * 12500);
    }
    const upahSopir = Math.round(qty * 3500);
    const amount = admin + solar + upahSopir;

    const newEntry = {
        id: 'TX-AT-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        desc: desc,
        masuk: 0,
        keluar: amount,
        branch: pyl.branch || kab,
        kabupaten: kab,
        noDo: pyl.do || 'UMUM',
        noPyl: pyl.id,
        sopir: pyl.driver || '-',
        kios: pyl.kios,
        admin: admin,
        solar: solar,
        upahSopir: upahSopir,
        uangMakan: 0,
        palang: 0,
        lembur: 0,
        helper: 0,
        lainLain: 0
    };

    // Prevent duplicate automated entries for the same distribution
    const exists = STATE.kas_angkutan.some(k => k.noPyl === pylId && k.desc.includes('(AUTO)'));
    if (!exists) {
        STATE.kas_angkutan.unshift(newEntry);
        // We don't saveState() here yet, let the caller save if needed, 
        // but for safety in this modular design, it's better to save if we mutate.
        saveState();
    } else {
        // Optional: update existing? For now, let's just avoid duplication.
    }
}

function handleFinancePylChange() {
    const pylId = document.getElementById('fin-no-pyl').value;
    const kab = document.getElementById('fin-kabupaten').value;
    const pyl = STATE.penyaluran.find(p => p.id === pylId);
    
    if (!pyl) return;

    const qty = parseFloat(pyl.qty) || 0;
    const desc = `BIAYA ANGKUTAN - ${pyl.id} - ${pyl.product} - ${pyl.kios} - ${qty}`;
    
    let admin = 0, solar = 0;
    if (kab === 'MAGETAN') {
        admin = Math.round(qty * 2000);
        solar = Math.round(qty * (100000 / 24));
    } else { // SRAGEN / Others
        admin = Math.round(qty * 3125);
        solar = Math.round(qty * 12500);
    }
    const upahSopir = Math.round(qty * 3500);

    document.getElementById('fin-desc').value = desc;
    document.getElementById('fin-sopir').value = pyl.driver || '';
    document.getElementById('fin-kios').value = pyl.kios || '';
    
    document.getElementById('fin-admin').value = formatNumberInput(admin.toString());
    document.getElementById('fin-solar').value = formatNumberInput(solar.toString());
    document.getElementById('fin-upahSopir').value = formatNumberInput(upahSopir.toString());
    
    // Lock auto-calculated fields
    document.getElementById('fin-admin').readOnly = true;
    document.getElementById('fin-solar').readOnly = true;
    document.getElementById('fin-upahSopir').readOnly = true;
    document.getElementById('fin-admin').style.background = '#f1f5f9';
    document.getElementById('fin-solar').style.background = '#f1f5f9';
    document.getElementById('fin-upahSopir').style.background = '#f1f5f9';
    
    calculateFinanceTotal();
}

function handleFinanceDirectionChange(select) {
    // If MASUK, maybe clear the breakdown?
    // Actually the React code supports both.
}

function calculateFinanceTotal() {
    const fields = document.querySelectorAll('.fin-calc');
    let total = 0;
    fields.forEach(f => {
        total += parseNumberInput(f.value);
    });
    
    const amountInput = document.getElementById('fin-amount');
    if (amountInput) {
        amountInput.value = formatNumberInput(total.toString());
    }
}

function saveFinanceTransaction(e, type) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const direction = fd.get('direction');
    const amount = parseNumberInput(fd.get('amount'));
    
    // Default branch selection logic
    let branchVal = STATE.currentUser.branch;
    if (branchVal === 'ALL') {
        branchVal = STATE.activeBranchFilter === 'ALL' ? 'MAGETAN' : STATE.activeBranchFilter;
    }

    const newEntry = {
        id: 'TX-' + Date.now(),
        date: fd.get('date'),
        desc: fd.get('desc'),
        masuk: direction === 'MASUK' ? amount : 0,
        keluar: direction === 'KELUAR' ? amount : 0,
        branch: branchVal,
        kabupaten: fd.get('kabupaten') || branchVal
    };

    if (type === 'kas_angkutan') {
        newEntry.noDo = fd.get('noDo') || 'UMUM';
        newEntry.noPyl = fd.get('noPyl') || '-';
        newEntry.sopir = fd.get('sopir') || '-';
        newEntry.kios = fd.get('kios') || '-';
        newEntry.admin = parseNumberInput(fd.get('admin')) || 0;
        newEntry.solar = parseNumberInput(fd.get('solar')) || 0;
        newEntry.upahSopir = parseNumberInput(fd.get('upahSopir')) || 0;
        newEntry.uangMakan = parseNumberInput(fd.get('uangMakan')) || 0;
        newEntry.palang = parseNumberInput(fd.get('palang')) || 0;
        newEntry.lembur = parseNumberInput(fd.get('lembur')) || 0;
        newEntry.helper = parseNumberInput(fd.get('helper')) || 0;
        newEntry.lainLain = parseNumberInput(fd.get('lainLain')) || 0;
    }

    STATE[type].unshift(newEntry);
    saveState();
    closeModal();
    
    if (type === 'kas_angkutan') renderKasAngkutan();
    else renderKasUmum();
    
    openSuccessModal('TRANSAKSI DISIMPAN', 'Data kas telah berhasil diperbarui.');
}

function viewFinanceDetail(id) {
    const item = STATE.kas_angkutan.find(i => i.id === id);
    if (!item) return;

    // Check if there's any breakdown data
    const hasBreakdown = (
        (item.admin || 0) + (item.solar || 0) + (item.upahSopir || 0) + 
        (item.uangMakan || 0) + (item.palang || 0) + (item.lembur || 0) + 
        (item.helper || 0) + (item.lainLain || 0)
    ) > 0;

    const content = `
        <div style="padding: 10px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 15px; margin-bottom: 20px;">
                <div>
                    <label style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Nomor DO / Penyaluran</label>
                    <div style="font-size: 1.1rem; font-weight: 700; color: var(--primary);">${item.noDo || 'OPERASIONAL UMUM'}</div>
                    <div style="font-size: 0.9rem; font-family: monospace; color: var(--text-dim);">${item.noPyl && item.noPyl !== '-' ? item.noPyl : 'NON-TRIP'}</div>
                </div>
                <div style="text-align: right;">
                    <label style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase;">Tanggal</label>
                    <div style="font-size: 1.1rem; font-weight: 700;">${formatDate(item.date)}</div>
                    <div style="font-size: 0.85rem; color: #64748b;">${item.kabupaten || '-'}</div>
                </div>
            </div>

            <div class="card" style="background: #f8fafc; margin-bottom: 20px;">
                <label style="font-size: 0.7rem; color: var(--text-dim); text-transform: uppercase;">Deskripsi Transaksi</label>
                <div style="font-size: 1rem; font-weight: 600; margin-top: 5px;">${item.desc}</div>
                <div style="font-size: 0.85rem; color: #475569; margin-top: 5px;">${item.sopir && item.sopir !== '-' ? `Sopir: ${item.sopir}` : 'Biaya Operasional Umum'} ${item.kios && item.kios !== '-' ? ` | Kios: ${item.kios}` : ''}</div>
            </div>

            ${hasBreakdown ? `
            <h4 style="font-size: 0.75rem; color: var(--text-dim); text-transform: uppercase; margin-bottom: 10px;">Rincian Biaya Per Trip</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <span>Admin</span> <strong>${formatCurrency(item.admin)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <span>Solar</span> <strong>${formatCurrency(item.solar)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <span>Upah Sopir</span> <strong>${formatCurrency(item.upahSopir)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <span>Uang Makan</span> <strong>${formatCurrency(item.uangMakan)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <span>Palang</span> <strong>${formatCurrency(item.palang)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <span>Lembur</span> <strong>${formatCurrency(item.lembur)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <span>Helper</span> <strong>${formatCurrency(item.helper)}</strong>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 8px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <span>Lain-lain</span> <strong>${formatCurrency(item.lainLain)}</strong>
                </div>
            </div>
            ` : ''}

            <div style="margin-top: 25px; padding: 15px; background: var(--primary); color: white; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 500;">TOTAL NOMINAL</span>
                <span style="font-size: 1.4rem; font-weight: 800;">${formatCurrency(item.keluar || item.masuk)}</span>
            </div>
            
            <button class="action-btn" onclick="closeModal()" style="width: 100%; justify-content: center; margin-top: 20px;">TUTUP DETAIL</button>
        </div>
    `;
    openModal('Detail Transaksi Kas Angkutan', content);
}

function deleteFinanceTransaction(type, id) {
    if (confirm('Hapus transaksi ini?')) {
        STATE[type] = STATE[type].filter(item => item.id !== id);
        saveState();
        if (type === 'kas_angkutan') renderKasAngkutan();
        else renderKasUmum();
        openSuccessModal('BERHASIL', 'Transaksi telah dihapus.');
    }
}
