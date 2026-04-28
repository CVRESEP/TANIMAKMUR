
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, QueryDocumentSnapshot, writeBatch } from 'firebase/firestore';

const PENGELUARAN_DO_COLLECTION = 'pengeluaranDo';
const PENEBUSAN_COLLECTION = 'penebusan';
const PENYALURAN_KIOS_COLLECTION = 'penyaluranKios';

const pengeluaranDoConverter = {
    toFirestore: (data: any) => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot): any => {
        const data = snapshot.data();
        return {
            id: snapshot.id, // The ID is the noDo
            ...data,
        };
    }
};

export const getPengeluaranDo = async (): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, PENGELUARAN_DO_COLLECTION));
    return snapshot.docs.map(doc => pengeluaranDoConverter.fromFirestore(doc));
};

export const getProcessedPengeluaranDo = async (): Promise<any[]> => {
    const [penebusanSnapshot, penyaluranSnapshot, pengeluaranDoSnapshot] = await Promise.all([
        getDocs(collection(db, PENEBUSAN_COLLECTION)),
        getDocs(collection(db, PENYALURAN_KIOS_COLLECTION)),
        getDocs(collection(db, PENGELUARAN_DO_COLLECTION))
    ]);

    const penebusanData = penebusanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    const penyaluranData = penyaluranSnapshot.docs.map(doc => doc.data() as any);
    const pengeluaranDoSourceData = pengeluaranDoSnapshot.docs.map(doc => pengeluaranDoConverter.fromFirestore(doc));

    return penebusanData.map(penebusan => {
        const pengeluaran = pengeluaranDoSourceData.find(pd => pd.id === penebusan.noDo);
        const qtyPengeluaran = pengeluaran ? pengeluaran.qty : 0;
        const tanggalPengeluaran = pengeluaran ? pengeluaran.tanggal : penebusan.tanggal;
        
        const totalPenyaluran = penyaluranData
            .filter(py => py.noDo === penebusan.noDo)
            .reduce((sum, item) => sum + item.qty, 0);

        const sisaTebus = penebusan.qty - qtyPengeluaran;
        const sisaDo = qtyPengeluaran - totalPenyaluran;

        return {
            id: penebusan.id,
            noDo: penebusan.noDo,
            tanggal: tanggalPengeluaran,
            kabupaten: penebusan.kabupaten,
            namaProduk: penebusan.namaProduk,
            qty: qtyPengeluaran,
            totalTebus: penebusan.qty,
            sisaTebus,
            sisaDo
        };
    }).filter(item => pengeluaranDoSourceData.some(pd => pd.id === item.noDo))
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
}

export const addPengeluaranDo = async (item: { id: string, qty: number, tanggal: string }) => {
    const docRef = doc(db, PENGELUARAN_DO_COLLECTION, item.id);
    await setDoc(docRef, { qty: item.qty, tanggal: item.tanggal });
    return item.id;
};

export const addPengeluaranDoBatch = async (items: { id: string, qty: number, tanggal: string }[]) => {
    const batch = writeBatch(db);
    items.forEach(item => {
        const docRef = doc(db, PENGELUARAN_DO_COLLECTION, item.id);
        batch.set(docRef, { qty: item.qty, tanggal: item.tanggal });
    });
    await batch.commit();
};

export const updatePengeluaranDo = async (id: string, item: { qty: number, tanggal: string }) => {
    const docRef = doc(db, PENGELUARAN_DO_COLLECTION, id);
    await updateDoc(docRef, { qty: item.qty, tanggal: item.tanggal });
};

export const deletePengeluaranDo = async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const docRef = doc(db, PENGELUARAN_DO_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
};
