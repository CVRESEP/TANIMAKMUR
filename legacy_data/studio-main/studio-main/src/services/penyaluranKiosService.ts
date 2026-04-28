
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, QueryDocumentSnapshot, writeBatch, query, where, runTransaction } from 'firebase/firestore';

const PENYALURAN_KIOS_COLLECTION = 'penyaluranKios';

const penyaluranKiosConverter = {
    toFirestore: (data: any) => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot): any => {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
        };
    }
};

export const getPenyaluranKios = async (): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, PENYALURAN_KIOS_COLLECTION));
    return snapshot.docs.map(doc => penyaluranKiosConverter.fromFirestore(doc));
};

export const addPenyaluranKios = async (item: Omit<any, 'id' | 'nomorPenyaluran'>) => {
    const penyaluranKiosRef = collection(db, PENYALURAN_KIOS_COLLECTION);
    
    // Use a transaction to ensure atomicity
    const newDocId = await runTransaction(db, async (transaction) => {
        // 1. Find the count of existing penyaluran for this noDo
        const q = query(penyaluranKiosRef, where('noDo', '==', item.noDo));
        const snapshot = await getDocs(q); // getDocs is allowed in transactions
        const count = snapshot.size;

        // 2. Create the new nomorPenyaluran
        const nomorPenyaluran = `${item.noDo}-${count + 1}`;
        
        // 3. Create the new document within the transaction
        const newDocRef = doc(penyaluranKiosRef);
        transaction.set(newDocRef, { ...item, nomorPenyaluran });
        
        return newDocRef.id;
    });

    return newDocId;
};

export const addPenyaluranKiosBatch = async (items: Omit<any, 'id'>[]) => {
    // Batching with nomorPenyaluran logic is complex. 
    // It's safer to add them one by one to ensure correct numbering.
    // Or we could fetch all counts first, but that's prone to race conditions without transactions.
    // Looping through individual adds is the safest approach here.
    for (const item of items) {
        await addPenyaluranKios(item);
    }
};

export const updatePenyaluranKios = async (id: string, item: Partial<any>) => {
    const docRef = doc(db, PENYALURAN_KIOS_COLLECTION, id);
    await updateDoc(docRef, item);
};

export const deletePenyaluranKios = async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
        const docRef = doc(db, PENYALURAN_KIOS_COLLECTION, id);
        batch.delete(docRef);
    });
    await batch.commit();
};

    