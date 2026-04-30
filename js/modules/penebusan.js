// Penebusan DO Module
function renderPenebusan() {
    const tbody = document.getElementById('penebusan-table-body');
    if (!tbody) return;
    
    const allData = getFilteredData('penebusan');
    const data = paginateData(allData, 'penebusan');
    
    renderSelectionActions('penebusan');
    const isSelectMode = STATE.uiSelectionMode['penebusan'];
    
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

    tbody.innerHTML = data.map(d => `
        <tr>
            ${isSelectMode ? `<td><input type="checkbox" class="row-checkbox" value="${d.do}"></td>` : ''}
            <td><strong>${d.do}</strong></td>
            <td>${formatDate(d.date)}</td>
            <td>${d.kabupaten || '-'}</td>
            <td>${d.product}</td>
            <td>${d.qty}</td>
            <td>${formatCurrency(d.total)}</td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="action-btn small t-icon" title="Edit" onclick="openEditPenebusanModal('${d.do}')">
                        <i data-lucide="edit-3"></i>
                    </button>
                    <button class="action-btn small t-icon" title="Hapus" onclick="deletePenebusan('${d.do}')" style="color: #ff4d4d;">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 30px; color: var(--text-dim);">Belum ada data tersedia</td></tr>`;
    
    const wrapper = tbody.closest('.table-container');
    if (wrapper) {
        if (!wrapper.previousElementSibling || !wrapper.previousElementSibling.classList.contains('table-header-controls')) {
            wrapper.insertAdjacentHTML('beforebegin', renderRowLimitSelector('penebusan'));
        }
        
        // Remove old footer if exists
        if (wrapper.nextElementSibling && wrapper.nextElementSibling.classList.contains('table-footer-info')) {
            wrapper.nextElementSibling.remove();
        }
        wrapper.insertAdjacentHTML('afterend', renderTableFooter('penebusan', allData.length, data.length));
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function deletePenebusan(doRef) {
    const hasPengeluaran = STATE.pengeluaran.some(p => p.do === doRef);
    if (hasPengeluaran) {
        return alert(`GAGAL MENGHAPUS: DO ${doRef} sudah dimasukkan ke Pengeluaran (Gudang). Hapus data pengeluaran terlebih dahulu.`);
    }

    if (confirm('Hapus data penebusan DO ' + doRef + '? Tindakan ini tidak dapat dibatalkan.')) {
        deleteRecord('penebusan', doRef);
        renderPenebusan();
        renderDashboard();
        openSuccessModal('DATA DIHAPUS', `Penebusan DO <strong>${doRef}</strong> berhasil dihapus.`);
    }
}

function openAddPenebusanModal() {
    let products = STATE.products;
    const user = STATE.currentUser;
    
    const isRestricted = user.branch !== 'ALL';
    const content = `
        <form onsubmit="savePenebusan(event)" id="form-penebusan">
            <div class="form-group">
                <label>Nomor DO</label>
                <input type="text" name="do" placeholder="Contoh: DO-2026-XXX" required>
            </div>
            <div class="form-group">
                <label>Tanggal</label>
                <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label>Pilih Wilayah (Kabupaten)</label>
                <select name="kabupaten" id="penebusan-branch" onchange="updateModalProductList(this.value, 'penebusan-product')" 
                    ${isRestricted ? 'style="background: #f1f5f9; pointer-events: none;" tabindex="-1"' : ''} required>
                    <option value="" disabled ${!isRestricted ? 'selected' : ''}>Pilih Wilayah...</option>
                    <option value="MAGETAN" ${user.branch === 'MAGETAN' ? 'selected' : ''}>MAGETAN</option>
                    <option value="SRAGEN" ${user.branch === 'SRAGEN' ? 'selected' : ''}>SRAGEN</option>
                </select>
                ${isRestricted ? `<input type="hidden" name="kabupaten" value="${user.branch}">` : ''}
            </div>
            <div class="form-group">
                <label>Pilih Produk</label>
                <select name="product_code" id="penebusan-product" onchange="calculatePenebusanTotal()" required>
                    <option value="" disabled selected>Pilih Wilayah dahulu...</option>
                </select>
            </div>
            <div class="form-group">
                <label>Kuantitas (TON)</label>
                <input type="number" name="qty" id="penebusan-qty" step="0.1" oninput="calculatePenebusanTotal()" placeholder="0.0" required>
            </div>

            <div id="penebusan-total-display" style="margin: 20px 0; padding: 20px; background: #f0fdf4; border-radius: 12px; border: 2px solid #bbf7d0; display: none;">
                <div style="font-size: 0.7rem; color: #166534; text-transform: uppercase; margin-bottom: 8px; font-weight: 700; letter-spacing: 1px;">ESTIMASI TOTAL PEMBAYARAN</div>
                <div id="penebusan-total-value" style="font-size: 1.75rem; font-weight: 900; color: #15803d; font-family: 'Outfit', sans-serif;">Rp 0</div>
            </div>

            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center; margin-top: 10px; height: 50px; font-weight: 700;">SIMPAN PENEBUSAN</button>
        </form>
    `;
    openModal('Tambah Penebusan DO Baru', content);

    // Auto-populate products if branch is pre-selected
    if (isRestricted) {
        updateModalProductList(user.branch, 'penebusan-product');
    }
}

function updateModalProductList(branch, selectId, currentValue = '') {
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;

    const filtered = STATE.products.filter(p => (p.branch || '').toUpperCase() === branch.toUpperCase());
    
    selectEl.innerHTML = `<option value="" disabled ${!currentValue ? 'selected' : ''}>Pilih Produk...</option>` + 
        filtered.map(p => `<option value="${p.code}" ${p.name === currentValue || p.code === currentValue ? 'selected' : ''}>${p.name}</option>`).join('');
}

function calculatePenebusanTotal() {
    const productCode = document.getElementById('penebusan-product').value;
    const qtyInput = document.getElementById('penebusan-qty');
    const qty = parseFloat(qtyInput.value) || 0;
    const display = document.getElementById('penebusan-total-display');
    const valueEl = document.getElementById('penebusan-total-value');

    if (!productCode || qty <= 0) {
        if (display) display.style.display = 'none';
        return;
    }

    const product = STATE.products.find(p => p.code === productCode);
    if (product) {
        // Corrected: Total is Qty (Ton) * Price (per Ton)
        // Previous error: * 1000 made it 1000x larger (Billion instead of Million)
        const total = qty * (product.buyPrice || product.price); 
        if (valueEl) valueEl.textContent = formatCurrency(total);
        if (display) display.style.display = 'block';
    }
}

function savePenebusan(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const productCode = fd.get('product_code');
    const product = STATE.products.find(p => p.code === productCode);
    const qty = parseFloat(fd.get('qty'));

    const newPenebusan = {
        do: fd.get('do').toUpperCase(),
        date: fd.get('date'),
        product: product.name,
        productCode: product.code,
        branch: STATE.currentUser.branch, // Added branch from current user
        kabupaten: fd.get('kabupaten'),
        qty: qty,
        harga: product.buyPrice || product.price, // Added harga/price
        total: qty * (product.buyPrice || product.price) 
    };

    if (STATE.penebusan.find(p => p.do === newPenebusan.do)) {
        alert('Nomor DO sudah ada!');
        return;
    }

    saveRecord('penebusan', newPenebusan);
    closeModal();
    renderPenebusan();
    renderPengeluaran();
    renderDashboard();
    openSuccessModal('PENEBUSAN BERHASIL', `Data penebusan DO <strong>${newPenebusan.do}</strong> berhasil disimpan.`);
}

function openEditPenebusanModal(doRef) {
    const d = STATE.penebusan.find(p => p.do === doRef);
    if (!d) return;

    const products = STATE.products.filter(p => (p.branch || '').toUpperCase() === (d.kabupaten || '').toUpperCase());
    const content = `
        <form onsubmit="updatePenebusan(event, '${doRef}')">
            <div class="form-group">
                <label>Nomor DO</label>
                <input type="text" name="do" value="${d.do}" readonly style="background: #f1f5f9;">
            </div>
            <div class="form-group">
                <label>Tanggal</label>
                <input type="date" name="date" value="${d.date}" required>
            </div>
            <div class="form-group">
                <label>Wilayah</label>
                <select name="kabupaten" onchange="updateModalProductList(this.value, 'edit-penebusan-product')" required>
                    <option value="MAGETAN" ${d.kabupaten === 'MAGETAN' ? 'selected' : ''}>MAGETAN</option>
                    <option value="SRAGEN" ${d.kabupaten === 'SRAGEN' ? 'selected' : ''}>SRAGEN</option>
                </select>
            </div>
            <div class="form-group">
                <label>Produk</label>
                <select name="product_code" id="edit-penebusan-product" required>
                    ${products.map(p => `<option value="${p.code}" ${p.name === d.product ? 'selected' : ''}>${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Kuantitas (TON)</label>
                <input type="number" name="qty" step="0.1" value="${d.qty}" required>
            </div>
            <div class="form-group">
                <label>Total Biaya (Rp)</label>
                <input type="number" name="total" value="${d.total}" required>
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; margin-top: 15px;">SIMPAN PERUBAHAN</button>
        </form>
    `;
    openModal('Edit Penebusan DO', content);
}

function updatePenebusan(e, doRef) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const idx = STATE.penebusan.findIndex(p => p.do === doRef);
    if (idx === -1) return;

    const productCode = fd.get('product_code');
    const product = STATE.products.find(p => p.code === productCode);
    
    const updated = {
        ...STATE.penebusan[idx],
        date: fd.get('date'),
        kabupaten: fd.get('kabupaten'),
        product: product ? product.name : fd.get('product_code'),
        qty: parseFloat(fd.get('qty')),
        total: parseFloat(fd.get('total'))
    };

    STATE.penebusan[idx] = updated;

    // Update pengeluaran link if exists
    const outIdx = STATE.pengeluaran.findIndex(o => o.do === doRef);
    if (outIdx !== -1) {
        STATE.pengeluaran[outIdx].date = updated.date;
        STATE.pengeluaran[outIdx].product = updated.product;
        STATE.pengeluaran[outIdx].masuk = updated.qty;
        STATE.pengeluaran[outIdx].kabupaten = updated.kabupaten;
    }

    saveRecord('penebusan', updated);
    if (outIdx !== -1) {
        saveRecord('pengeluaran', STATE.pengeluaran[outIdx]);
    }
    closeModal();
    renderPenebusan();
    renderPengeluaran();
    showToast('Data Penebusan berhasil diupdate');
}
