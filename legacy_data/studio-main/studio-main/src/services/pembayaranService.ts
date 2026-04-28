
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, QueryDocumentSnapshot, writeBatch } from 'firebase/firestore';

const PEMBAYARAN_COLLECTION = 'pembayaran';

const pembayaranConverter = {
    toFirestore: (data: any) => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot): any => {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
        };
    }
};

export const getPembayaran = async (): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, PEMBAYARAN_COLLECTION));
    return snapshot.docs.map(doc => pembayaranConverter.fromFirestore(doc));
};

export const addPembayaran = async (item: Omit<any, 'id'>) => {
    const docRef = await addDoc(collection(db, PEMBAYARAN_COLLECTION), item);
    return docRef.id;
};

export const updatePembayaran = async (id: string, item: Partial<any>) => {
    const docRef = doc(db, PEMBAYARAN_COLLECTION, id);
    await updateDoc(docRef, item);
};

export const deletePembayaran = async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const docRef = doc(db, PEMBAYARAN_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
};
