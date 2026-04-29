// Product Management Module
function renderProducts() {
    const tbody = document.getElementById('product-table-body');
    if (!tbody) return;
    
    const allData = getFilteredData('products');
    const data = paginateData(allData, 'products');
    
    renderSelectionActions('products');
    const isSelectMode = STATE.uiSelectionMode['products'];
    
    // Update Header
    const table = tbody.closest('table');
    const thead = table.querySelector('thead tr');
    if (thead) {
        const hasCheck = thead.querySelector('.col-check');
        const hasSupplier = thead.innerHTML.includes('SUPPLIER');
        
        if (isSelectMode && !hasCheck) {
            thead.insertAdjacentHTML('afterbegin', `
                <th class="col-check" style="width: 40px;">
                    <input type="checkbox" onclick="toggleSelectAll(this)">
                </th>
            `);
        } else if (!isSelectMode && hasCheck) {
            hasCheck.remove();
        }

        if (!hasSupplier) {
            thead.querySelector('th:nth-child(2)').insertAdjacentHTML('afterend', '<th>SUPPLIER</th>');
        }
    }

    tbody.innerHTML = data.map(p => `
        <tr>
            ${isSelectMode ? `<td><input type="checkbox" class="row-checkbox" value="${p.code}"></td>` : ''}
            <td><code>${p.code}</code></td>
            <td><strong>${p.name}</strong></td>
            <td><span class="badge" style="background:#f1f5f9; color:var(--text-dim); border:1px solid var(--border);">${p.supplier || '-'}</span></td>
            <td><span style="color:var(--text-dim); font-size:0.8rem; display:block;">Beli:</span> ${formatCurrency(p.buyPrice || p.price)}</td>
            <td><span style="color:var(--primary); font-size:0.8rem; display:block;">Jual:</span> ${formatCurrency(p.sellPrice || p.price)}</td>
            <td>${calculateStock(p.name, p.branch).toFixed(1)} Ton</td>
            <td style="font-weight: 700; color: ${calculateRemainingRedemption(p.name, p.branch) > 0 ? '#f59e0b' : '#10b981'};">
                ${calculateRemainingRedemption(p.name, p.branch).toFixed(1)} Ton
            </td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="action-btn small t-icon" title="Edit" onclick="openEditProductModal('${p.code}')">
                        <i data-lucide="edit"></i>
                    </button>
                    <button class="action-btn small t-icon" title="Hapus" onclick="deleteProduct('${p.code}')" style="color: #ff4d4d;">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="100%" style="text-align:center; padding: 30px; color: var(--text-dim);">Belum ada data tersedia</td></tr>`;
    
    const wrapper = tbody.closest('.table-container');
    if (wrapper) {
        if (!wrapper.previousElementSibling || !wrapper.previousElementSibling.classList.contains('table-header-controls')) {
            wrapper.insertAdjacentHTML('beforebegin', renderRowLimitSelector('products'));
        }
        
        // Remove old footer if exists to avoid duplication
        if (wrapper.nextElementSibling && wrapper.nextElementSibling.classList.contains('table-footer-info')) {
            wrapper.nextElementSibling.remove();
        }
        wrapper.insertAdjacentHTML('afterend', renderTableFooter('products', allData.length, data.length));
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function deleteProduct(code) {
    const product = STATE.products.find(p => p.code === code);
    if (!product) return;

    const inPenebusan = STATE.penebusan.some(p => p.product === product.name || p.productCode === code);
    const inPengeluaran = STATE.pengeluaran.some(p => p.product === product.name);
    const inPenyaluran = STATE.penyaluran.some(p => p.product === product.name);

    if (inPenebusan || inPengeluaran || inPenyaluran) {
        return alert(`GAGAL MENGHAPUS: Produk ${product.name} sudah digunakan dalam transaksi (Penebusan/Pengeluaran/Penyaluran). Anda tidak bisa menghapusnya.`);
    }

    if (confirm(`Hapus produk ${code}? Tindakan ini tidak dapat dibatalkan.`)) {
        deleteRecord('products', code);
        renderProducts();
        openSuccessModal('PRODUK DIHAPUS', `Produk <strong>${code}</strong> telah berhasil dihapus dari sistem.`);
    }
}

function openAddProductModal() {
    const content = `
        <form onsubmit="saveProduct(event)">
            <div class="form-group">
                <label>Kode Produk</label>
                <input type="text" value="OTOMATIS" disabled style="background: #f1f5f9; color: var(--text-dim); font-weight: 600;">
            </div>
            <div class="form-group">
                <label>Nama Produk</label>
                <input type="text" name="name" placeholder="Contoh: Pupuk Urea" required>
            </div>
            <div class="form-group">
                <label>Pilih / Input Supplier</label>
                <input type="text" name="supplier" list="supplier-list" placeholder="Ketik nama supplier...">
                <datalist id="supplier-list">
                    ${(STATE.suppliers || []).map(s => `<option value="${s.name}">`).join('')}
                    <option value="PT. PUPUK INDONESIA">
                    <option value="PT. PETROKIMIA GRESIK">
                </datalist>
            </div>
            ${renderBranchSelector('branch')}
            <div class="form-group">
                <label>Satuan</label>
                <input type="text" name="unit" value="Ton" placeholder="Contoh: Ton atau Kg" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label>Harga Beli (Rp / Ton)</label>
                    <input type="text" name="buyPrice" placeholder="Rp 0" oninput="this.value = formatNumberInput(this.value)" required>
                </div>
                <div class="form-group">
                    <label>Harga Jual (Rp / Ton)</label>
                    <input type="text" name="sellPrice" placeholder="Rp 0" oninput="this.value = formatNumberInput(this.value)" required>
                </div>
            </div>
            <div class="form-help" style="font-size: 0.8rem; margin-top: -10px; margin-bottom: 15px; color: var(--text-dim);">
                *Harga Beli digunakan untuk Penebusan, Harga Jual untuk Pesanan Kios.
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center;">SIMPAN PRODUK</button>
        </form>
    `;
    openModal('Tambah Produk Baru', content);
}

async function saveProduct(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name').toUpperCase().replace(/\s+/g, '');
    const branch = fd.get('branch');
    const lastNum = STATE.products.filter(p => p.name.toUpperCase().replace(/\s+/g, '') === name).length + 1;
    const generatedCode = `${name}-${String(lastNum).padStart(3, '0')}-${branch}`;

    const supplierName = fd.get('supplier');
    if (supplierName && !(STATE.suppliers || []).some(s => s.name === supplierName)) {
        try {
            await fetch(`${API_BASE}/suppliers`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: supplierName }) 
            });
            if (!STATE.suppliers) STATE.suppliers = [];
            STATE.suppliers.push({ name: supplierName });
        } catch (e) {
            console.error('Gagal simpan supplier baru:', e);
        }
    }

    // Final uniqueness check
    let finalCode = generatedCode;
    let counter = lastNum;
    while (STATE.products.find(p => p.code === finalCode)) {
        counter++;
        finalCode = `${name}-${String(counter).padStart(3, '0')}-${branch}`;
    }

    const newProduct = {
        code: finalCode,
        name: fd.get('name'),
        branch: branch,
        buyPrice: parseNumberInput(fd.get('buyPrice')),
        sellPrice: parseNumberInput(fd.get('sellPrice')),
        supplier: supplierName || '-'
    };

    saveRecord('products', newProduct);
    
    closeModal();
    renderProducts();
    openSuccessModal('PRODUK DITAMBAHKAN', `Produk <strong>${newProduct.name}</strong> berhasil disimpan ke daftar.`);
}

function openEditProductModal(code) {
    const p = STATE.products.find(item => item.code === code);
    if (!p) return;

    const content = `
        <form onsubmit="updateProduct(event, '${code}')">
            <div class="form-group">
                <label>Kode Produk</label>
                <input type="text" name="code" value="${p.code}" readonly style="background: #f1f5f9; color: var(--text-dim);">
            </div>
            <div class="form-group">
                <label>Nama Produk</label>
                <input type="text" name="name" value="${p.name}" required>
            </div>
            <div class="form-group">
                <label>Pilih / Input Supplier</label>
                <input type="text" name="supplier" value="${p.supplier || ''}" list="supplier-list-edit" placeholder="Ketik nama supplier...">
                <datalist id="supplier-list-edit">
                    ${(STATE.suppliers || []).map(s => `<option value="${s.name}">`).join('')}
                    <option value="PT. PUPUK INDONESIA">
                    <option value="PT. PETROKIMIA GRESIK">
                </datalist>
            </div>
            ${renderBranchSelector('branch', p.branch)}
            <div class="form-group">
                <label>Satuan</label>
                <input type="text" name="unit" value="${p.unit || 'Kg'}" required>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label>Harga Beli (Rp / Ton)</label>
                    <input type="text" name="buyPrice" value="${formatNumberInput(p.buyPrice || p.price)}" oninput="this.value = formatNumberInput(this.value)" required>
                </div>
                <div class="form-group">
                    <label>Harga Jual (Rp / Ton)</label>
                    <input type="text" name="sellPrice" value="${formatNumberInput(p.sellPrice || p.price)}" oninput="this.value = formatNumberInput(this.value)" required>
                </div>
            </div>
            <div class="form-group">
                <label>Stok Saat Ini (Berdasarkan DO - Penyaluran)</label>
                <div style="padding: 10px; background: rgba(0,0,0,0.05); border-radius: 6px; font-weight: 600;">
                    ${calculateStock(p.name)} Ton
                </div>
            </div>
            <button type="submit" class="action-btn primary" style="width: 100%; justify-content: center;">UPDATE PRODUK</button>
        </form>
    `;
    openModal('Edit Produk', content);
}

async function updateProduct(e, oldCode) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const p = STATE.products.find(item => item.code === oldCode);
    
    if (p) {
        const supplierName = fd.get('supplier');
        if (supplierName && !(STATE.suppliers || []).some(s => s.name === supplierName)) {
            try {
                await fetch(`${API_BASE}/suppliers`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: supplierName }) 
                });
                if (!STATE.suppliers) STATE.suppliers = [];
                STATE.suppliers.push({ name: supplierName });
            } catch (e) {
                console.error('Gagal simpan supplier baru:', e);
            }
        }

        const oldName = p.name;
        const newName = fd.get('name').trim();
        const oldCode = p.code;
        const newCode = fd.get('code').toUpperCase().trim();

        p.code = newCode;
        p.name = newName;
        p.supplier = supplierName;
        p.branch = fd.get('branch');
        p.unit = fd.get('unit');
        p.buyPrice = parseNumberInput(fd.get('buyPrice'));
        p.sellPrice = parseNumberInput(fd.get('sellPrice'));
        p.price = parseNumberInput(fd.get('sellPrice'));
        
        // Cascade update product name and code
        if (oldName !== newName || oldCode !== newCode) {
            STATE.penebusan.forEach(item => {
                if (item.product === oldName) item.product = newName;
                if (item.productCode === oldCode) item.productCode = newCode;
            });
            STATE.pengeluaran.forEach(item => {
                if (item.product === oldName) item.product = newName;
            });
            STATE.penyaluran.forEach(item => {
                if (item.product === oldName) item.product = newName;
            });
            STATE.orders.forEach(item => {
                if (item.product === oldName) item.product = newName;
            });
        }

        saveState();
        closeModal();
        renderProducts();
        openSuccessModal('PRODUK DIPERBARUI', `Data produk <strong>${p.name}</strong> berhasil diperbarui.`);
    }
}
