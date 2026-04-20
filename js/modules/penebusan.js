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
            <td>${d.kabupaten}</td>
            <td>${d.product}</td>
            <td>${d.qty}</td>
            <td>${formatCurrency(d.total)}</td>
            <td>
                <button class="action-btn small t-icon" title="Hapus" onclick="deletePenebusan('${d.do}')" style="color: #ff4d4d;">
                    <i data-lucide="trash-2"></i>
                </button>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 30px; color: var(--text-dim);">Belum ada data tersedia</td></tr>`;
    
    const wrapper = tbody.closest('.table-container');
    if (wrapper) {
        if (!wrapper.previousElementSibling || !wrapper.previousElementSibling.classList.contains('table-header-controls')) {
            wrapper.insertAdjacentHTML('beforebegin', renderRowLimitSelector('penebusan'));
        }
        if (!wrapper.nextElementSibling || !wrapper.nextElementSibling.classList.contains('table-footer-info')) {
            wrapper.insertAdjacentHTML('afterend', renderTableFooter(allData.length, data.length));
        } else {
            wrapper.nextElementSibling.textContent = `Menampilkan ${data.length} dari ${allData.length} total data`;
        }
    }
}

function deletePenebusan(doRef) {
    if (confirm('Hapus data penebusan DO ' + doRef + '? Data pengeluaran terkait juga akan dihapus.')) {
        STATE.penebusan = STATE.penebusan.filter(p => p.do !== doRef);
        STATE.pengeluaran = STATE.pengeluaran.filter(p => p.do !== doRef);
        saveState();
        renderPenebusan();
        renderPengeluaran();
        renderDashboard();
        openSuccessModal('DATA DIHAPUS', `Penebusan DO <strong>${doRef}</strong> beserta data operasionalnya berhasil dihapus.`);
    }
}

function openAddPenebusanModal() {
    let products = STATE.products;
    const user = STATE.currentUser;
    
    // Filter by branch if user is not OWNER/ADMIN (ALL branch)
    if (user.branch !== 'ALL') {
        products = products.filter(p => p.branch === user.branch);
    }
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
                <label>Pilih Produk</label>
                <select name="product_code" id="penebusan-product" onchange="calculatePenebusanTotal()" required>
                    <option value="" disabled selected>Pilih Produk...</option>
                    ${products.map(p => `<option value="${p.code}">${p.name} [${p.branch}] (${formatCurrency(p.buyPrice || p.price)}/${p.unit})</option>`).join('')}
                </select>
            </div>
            ${renderBranchSelector('kabupaten', '', 'Pilih Wilayah (Kabupaten)')}
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

    STATE.penebusan.unshift(newPenebusan);
    saveState();
    closeModal();
    renderPenebusan();
    renderPengeluaran();
    renderDashboard();
    openSuccessModal('PENEBUSAN BERHASIL', `Data penebusan DO <strong>${newPenebusan.do}</strong> berhasil disimpan.`);
}
