
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, QueryDocumentSnapshot, writeBatch } from 'firebase/firestore';

const KAS_ANGKUTAN_COLLECTION = 'kasAngkutan';

const kasAngkutanConverter = {
    toFirestore: (data: any) => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot): any => {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
        };
    }
};

export const getKasAngkutan = async (): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, KAS_ANGKUTAN_COLLECTION));
    return snapshot.docs.map(doc => kasAngkutanConverter.fromFirestore(doc));
};

export const addKasAngkutan = async (item: Omit<any, 'id'>) => {
    const docRef = await addDoc(collection(db, KAS_ANGKUTAN_COLLECTION), item);
    return docRef.id;
};

export const updateKasAngkutan = async (id: string, item: Partial<any>) => {
    const docRef = doc(db, KAS_ANGKUTAN_COLLECTION, id);
    await updateDoc(docRef, item);
};

export const deleteKasAngkutan = async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const docRef = doc(db, KAS_ANGKUTAN_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
};
