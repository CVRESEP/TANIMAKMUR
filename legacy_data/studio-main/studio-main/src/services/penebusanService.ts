
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, QueryDocumentSnapshot, getDoc, writeBatch, setDoc } from 'firebase/firestore';

const PENEBUSAN_COLLECTION = 'penebusan';

const penebusanConverter = {
    toFirestore: (data: any) => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot): any => {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
        };
    }
};

export const getPenebusan = async (): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, PENEBUSAN_COLLECTION));
    return snapshot.docs.map(doc => penebusanConverter.fromFirestore(doc));
};

export const addPenebusan = async (penebusan: Omit<any, 'id'>) => {
    const docRef = doc(collection(db, PENEBUSAN_COLLECTION), penebusan.noDo);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        throw new Error(`NO DO "${penebusan.noDo}" SUDAH ADA.`);
    }
    // Use setDoc with the specific ID (noDo)
    await setDoc(docRef, { ...penebusan, id: penebusan.noDo });
    return penebusan.noDo;
};

export const addPenebusanBatch = async (penebusanItems: Omit<any, 'id'>[]) => {
    const batch = writeBatch(db);
    penebusanItems.forEach(item => {
        const docRef = doc(collection(db, PENEBUSAN_COLLECTION), item.noDo);
        batch.set(docRef, { ...item, id: item.noDo });
    });
    await batch.commit();
};

export const updatePenebusan = async (id: string, penebusan: Partial<any>) => {
    const docRef = doc(db, PENEBUSAN_COLLECTION, id);
    await updateDoc(docRef, penebusan);
};

export const deletePenebusan = async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const docRef = doc(db, PENEBUSAN_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
};
