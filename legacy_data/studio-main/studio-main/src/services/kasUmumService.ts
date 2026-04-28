
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, QueryDocumentSnapshot, writeBatch, query, where } from 'firebase/firestore';

const KAS_UMUM_COLLECTION = 'kasUmum';

const kasUmumConverter = {
    toFirestore: (data: any) => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot): any => {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
        };
    }
};

export const getKasUmum = async (): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, KAS_UMUM_COLLECTION));
    return snapshot.docs.map(doc => kasUmumConverter.fromFirestore(doc));
};

export const addKasUmum = async (item: Omit<any, 'id'>) => {
    const docRef = await addDoc(collection(db, KAS_UMUM_COLLECTION), item);
    return docRef.id;
};

export const updateKasUmum = async (id: string, item: Partial<any>) => {
    const docRef = doc(db, KAS_UMUM_COLLECTION, id);
    await updateDoc(docRef, item);
};

export const deleteKasUmum = async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const docRef = doc(db, KAS_UMUM_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
};
