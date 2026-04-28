
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, QueryDocumentSnapshot, writeBatch } from 'firebase/firestore';

const KIOSKS_COLLECTION = 'kiosks';
const PENYALURAN_KIOS_COLLECTION = 'penyaluranKios';
const PEMBAYARAN_COLLECTION = 'pembayaran';

const kioskConverter = {
    toFirestore: (data: any) => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot): any => {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
        };
    }
};

export const getKiosks = async (): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, KIOSKS_COLLECTION));
    return snapshot.docs.map(doc => kioskConverter.fromFirestore(doc));
};

export const getKiosksWithTagihan = async (): Promise<any[]> => {
    const [kiosksSnapshot, penyaluranSnapshot, pembayaranSnapshot] = await Promise.all([
        getDocs(collection(db, KIOSKS_COLLECTION)),
        getDocs(collection(db, PENYALURAN_KIOS_COLLECTION)),
        getDocs(collection(db, PEMBAYARAN_COLLECTION))
    ]);

    const kiosks = kiosksSnapshot.docs.map(doc => kioskConverter.fromFirestore(doc));
    const penyaluranData = penyaluranSnapshot.docs.map(doc => doc.data());
    const pembayaranData = pembayaranSnapshot.docs.map(doc => doc.data());
    
    return kiosks.map(kios => {
        const allPenyaluranForKios = penyaluranData.filter(p => p.namaKios === kios.name);
        
        const totalTagihan = allPenyaluranForKios.reduce((sum, p) => {
            const totalBayarTempo = pembayaranData
                .filter(b => b.noDo === p.noDo && b.namaKios === p.namaKios)
                .reduce((sum, b) => sum + b.totalBayar, 0);
            const kurangBayar = p.total - (p.diBayar + totalBayarTempo);
            return sum + (kurangBayar > 0 ? kurangBayar : 0);
        }, 0);
        
        const keterangan = totalTagihan > 0 ? "BELUM LUNAS" : "LUNAS";

        return {
            ...kios,
            tagihan: totalTagihan,
            keterangan
        };
    });
};

export const addKiosk = async (kiosk: Omit<any, 'id'>) => {
    const docRef = await addDoc(collection(db, KIOSKS_COLLECTION), kiosk);
    return docRef.id;
};

export const addKiosksBatch = async (kiosks: Omit<any, 'id'>[]) => {
    const batch = writeBatch(db);
    kiosks.forEach(kiosk => {
        const docRef = doc(collection(db, KIOSKS_COLLECTION));
        batch.set(docRef, kiosk);
    });
    await batch.commit();
};

export const updateKiosk = async (id: string, kiosk: Partial<any>) => {
    const docRef = doc(db, KIOSKS_COLLECTION, id);
    await updateDoc(docRef, kiosk);
};

export const deleteKiosk = async (id: string) => {
    const docRef = doc(db, KIOSKS_COLLECTION, id);
    await deleteDoc(docRef);
};
