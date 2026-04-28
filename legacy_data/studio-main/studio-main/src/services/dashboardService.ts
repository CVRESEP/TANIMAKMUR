
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { format, subMonths, startOfMonth } from 'date-fns';
import { id } from 'date-fns/locale';

interface DashboardStats {
  totalPenebusan: number;
  totalDistribusi: number;
  saldoTersisa: number;
  jumlahKios: number;
}

interface BarChartData {
    month: string;
    total: number;
}

interface LineChartData {
    date: string;
    redemptions: number;
    distributions: number;
}

export async function getDashboardData(): Promise<{ stats: DashboardStats, barChartData: BarChartData[], lineChartData: LineChartData[] }> {
    const [penebusanSnapshot, penyaluranSnapshot, kiosksSnapshot] = await Promise.all([
        getDocs(collection(db, 'penebusan')),
        getDocs(collection(db, 'penyaluranKios')),
        getDocs(collection(db, 'kiosks')),
    ]);

    const penebusanData = penebusanSnapshot.docs.map(doc => doc.data());
    const penyaluranData = penyaluranSnapshot.docs.map(doc => doc.data());
    const kiosksData = kiosksSnapshot.docs;

    // Stats Cards
    const totalPenebusan = penebusanData.reduce((sum, item) => sum + (item.totalPenebusan || 0), 0);
    const totalQtyPenebusan = penebusanData.reduce((sum, item) => sum + (item.qty || 0), 0);
    const totalDistribusi = penyaluranData.reduce((sum, item) => sum + (item.qty || 0), 0);
    const saldoTersisa = totalQtyPenebusan - totalDistribusi;
    const jumlahKios = kiosksData.length;

    const stats = {
      totalPenebusan,
      totalDistribusi,
      saldoTersisa,
      jumlahKios,
    };
    
    // Process data for charts
    const now = new Date();
    
    // Bar Chart Data (Last 6 months distribution)
    const barChartMap = new Map<string, number>();
    for (let i = 5; i >= 0; i--) {
        const month = format(subMonths(now, i), 'MMM', { locale: id });
        barChartMap.set(month, 0);
    }
    
    penyaluranData.forEach(item => {
        if (item.tanggal) {
            const itemDate = new Date(item.tanggal);
            if (itemDate >= startOfMonth(subMonths(now, 5))) {
                 const month = format(itemDate, 'MMM', { locale: id });
                 if (barChartMap.has(month)) {
                     barChartMap.set(month, (barChartMap.get(month) || 0) + item.qty);
                 }
            }
        }
    });
    const barChartData = Array.from(barChartMap, ([month, total]) => ({ month, total }));

    // Line Chart Data (Last 7 months redemptions vs distributions)
    const lineChartMap = new Map<string, { redemptions: number, distributions: number }>();
    for (let i = 6; i >= 0; i--) {
        const dateKey = format(subMonths(now, i), 'yyyy-MM');
        lineChartMap.set(dateKey, { redemptions: 0, distributions: 0 });
    }
    
    penebusanData.forEach(item => {
        if (item.tanggal) {
            const itemDate = new Date(item.tanggal);
             if (itemDate >= startOfMonth(subMonths(now, 6))) {
                const dateKey = format(itemDate, 'yyyy-MM');
                if (lineChartMap.has(dateKey)) {
                    const current = lineChartMap.get(dateKey)!;
                    current.redemptions += item.qty;
                    lineChartMap.set(dateKey, current);
                }
             }
        }
    });

    penyaluranData.forEach(item => {
        if (item.tanggal) {
            const itemDate = new Date(item.tanggal);
            if (itemDate >= startOfMonth(subMonths(now, 6))) {
                const dateKey = format(itemDate, 'yyyy-MM');
                if (lineChartMap.has(dateKey)) {
                    const current = lineChartMap.get(dateKey)!;
                    current.distributions += item.qty;
                    lineChartMap.set(dateKey, current);
                }
            }
        }
    });
    const lineChartData = Array.from(lineChartMap, ([date, values]) => ({ date: format(new Date(date), 'MMM', { locale: id }), ...values }));

    return { stats, barChartData, lineChartData };
}
