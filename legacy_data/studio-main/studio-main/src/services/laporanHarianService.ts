
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, QueryDocumentSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';

// Define interfaces for report data structures
export interface ProductReportRow {
    produk: string;
    sisaLalu: number;
    penyaluran: number;
    penebusanTunai: number;
    stokAkhir: number;
    hargaTebus: number;
    hargaStok: number;
    hargaJual: number;
    jualKeKios: number;
    penebusan: number;
}

export interface FinancialSummary {
    sisaTagihanLalu: number;
    penjualan: number;
    totalTagihan: number;
    pembayaran: number;
    sisaTagihanHariIni: number;
    sisaPupuk: number;
    totalTagihanDanPupuk: number;
}

export interface ReportData {
    productRows: ProductReportRow[];
    productTotals: ProductReportRow;
    financialSummary: FinancialSummary;
}

// Generic function to fetch and convert a collection
async function getCollectionData(collectionName: string, kabupaten: string): Promise<any[]> {
    let q = query(collection(db, collectionName));
    if (kabupaten !== "SEMUA") {
        q = query(q, where('kabupaten', '==', kabupaten));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function generateDailyReportData(selectedDate: Date, kabupaten: string): Promise<ReportData> {

    const formattedDate = format(selectedDate, "yyyy-MM-dd");
    
    const [products, allPenebusan, allPenyaluran, allPembayaran] = await Promise.all([
        getCollectionData('products', kabupaten),
        getCollectionData('penebusan', kabupaten),
        getCollectionData('penyaluranKios', kabupaten),
        getCollectionData('pembayaran', kabupaten)
    ]);
    
    const startOfSelectedDay = new Date(selectedDate);
    startOfSelectedDay.setHours(0, 0, 0, 0);

    // Filter data based on date
    const penebusanHariIni = allPenebusan.filter(p => p.tanggal === formattedDate);
    const penyaluranHariIni = allPenyaluran.filter(p => p.tanggal === formattedDate);
    const pembayaranHariIni = allPembayaran.filter(p => p.tanggal === formattedDate);

    const penebusanSebelumHariIni = allPenebusan.filter(p => new Date(p.tanggal) < startOfSelectedDay);
    const penyaluranSebelumHariIni = allPenyaluran.filter(p => new Date(p.tanggal) < startOfSelectedDay);
    
    const productRows = products.map(product => {
        // Stok
        const totalPenebusanLalu = penebusanSebelumHariIni.filter(p => p.namaProduk === product.productName).reduce((sum, p) => sum + p.qty, 0);
        const totalPenyaluranLalu = penyaluranSebelumHariIni.filter(p => p.namaProduk === product.productName).reduce((sum, p) => sum + p.qty, 0);
        const sisaLalu = totalPenebusanLalu - totalPenyaluranLalu;
        
        const penyaluran = penyaluranHariIni.filter(p => p.namaProduk === product.productName).reduce((sum, p) => sum + p.qty, 0);
        const penebusanTunai = penebusanHariIni.filter(p => p.namaProduk === product.productName).reduce((sum, p) => sum + p.qty, 0);
        const stokAkhir = sisaLalu + penebusanTunai - penyaluran;
        
        // Financials
        const hargaTebus = product.hargaBeli || 0;
        const hargaStok = stokAkhir * hargaTebus;
        const hargaJual = product.hargaJual || 0;
        const jualKeKios = penyaluran * hargaJual;
        const penebusan = penebusanTunai * hargaTebus;

        return { produk: product.productName, sisaLalu, penyaluran, penebusanTunai, stokAkhir, hargaTebus, hargaStok, hargaJual, jualKeKios, penebusan };
    });

    const productTotals = productRows.reduce((totals, row) => ({
        produk: 'TOTAL',
        sisaLalu: totals.sisaLalu + row.sisaLalu,
        penyaluran: totals.penyaluran + row.penyaluran,
        penebusanTunai: totals.penebusanTunai + row.penebusanTunai,
        stokAkhir: totals.stokAkhir + row.stokAkhir,
        hargaTebus: 0,
        hargaStok: totals.hargaStok + row.hargaStok,
        hargaJual: 0,
        jualKeKios: totals.jualKeKios + row.jualKeKios,
        penebusan: totals.penebusan + row.penebusan,
    }), { produk: 'TOTAL', sisaLalu: 0, penyaluran: 0, penebusanTunai: 0, stokAkhir: 0, hargaTebus: 0, hargaStok: 0, hargaJual: 0, jualKeKios: 0, penebusan: 0 });

    const totalPenjualanLalu = allPenyaluran.filter(p => new Date(p.tanggal) < startOfSelectedDay).reduce((sum, p) => sum + p.total, 0);
    const totalPembayaranLalu = allPembayaran.filter(p => new Date(p.tanggal) < startOfSelectedDay).reduce((sum, p) => sum + p.totalBayar, 0)
                                + allPenyaluran.filter(p => new Date(p.tanggal) < startOfSelectedDay).reduce((sum, p) => sum + p.diBayar, 0);
    const sisaTagihanLalu = totalPenjualanLalu - totalPembayaranLalu;
    
    const penjualan = productTotals.jualKeKios;
    const totalTagihan = sisaTagihanLalu + penjualan;
    const pembayaran = pembayaranHariIni.reduce((sum, p) => sum + p.totalBayar, 0)
                        + penyaluranHariIni.reduce((sum, p) => sum + p.diBayar, 0);
    const sisaTagihanHariIni = totalTagihan - pembayaran;
    const sisaPupuk = productTotals.hargaStok;
    const totalTagihanDanPupuk = sisaTagihanHariIni + sisaPupuk;

    return {
        productRows,
        productTotals,
        financialSummary: { sisaTagihanLalu, penjualan, totalTagihan, pembayaran, sisaTagihanHariIni, sisaPupuk, totalTagihanDanPupuk }
    };
}

    