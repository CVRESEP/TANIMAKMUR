
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, DocumentData, QueryDocumentSnapshot, writeBatch } from 'firebase/firestore';

const PRODUCTS_COLLECTION = 'products';
const PENEBUSAN_COLLECTION = 'penebusan';
const PENYALURAN_KIOS_COLLECTION = 'penyaluranKios';

const productConverter = {
    toFirestore: (data: any) => data,
    fromFirestore: (snapshot: QueryDocumentSnapshot): any => {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            ...data,
        };
    }
};

export const getProducts = async (): Promise<any[]> => {
    const snapshot = await getDocs(collection(db, PRODUCTS_COLLECTION));
    return snapshot.docs.map(doc => productConverter.fromFirestore(doc));
};

export const getProductsWithStock = async (): Promise<any[]> => {
    const [productsSnapshot, penebusanSnapshot, penyaluranSnapshot] = await Promise.all([
        getDocs(collection(db, PRODUCTS_COLLECTION)),
        getDocs(collection(db, PENEBUSAN_COLLECTION)),
        getDocs(collection(db, PENYALURAN_KIOS_COLLECTION))
    ]);

    const products = productsSnapshot.docs.map(doc => productConverter.fromFirestore(doc));
    const penebusanData = penebusanSnapshot.docs.map(doc => doc.data());
    const penyaluranData = penyaluranSnapshot.docs.map(doc => doc.data());
    
    const penebusanMap = new Map<string, number>();
    penebusanData.forEach(p => {
        penebusanMap.set(p.namaProduk, (penebusanMap.get(p.namaProduk) || 0) + p.qty);
    });

    const penyaluranMap = new Map<string, number>();
    penyaluranData.forEach(p => {
        penyaluranMap.set(p.namaProduk, (penyaluranMap.get(p.namaProduk) || 0) + p.qty);
    });

    return products.map(product => {
        const totalPenebusan = penebusanMap.get(product.productName) || 0;
        const totalPenyaluran = penyaluranMap.get(product.productName) || 0;
        const stok = totalPenebusan - totalPenyaluran;
        return { ...product, stok };
    });
}

export const addProduct = async (product: Omit<any, 'id'>) => {
    const docRef = await addDoc(collection(db, PRODUCTS_COLLECTION), product);
    return docRef.id;
};

export const addProductsBatch = async (products: Omit<any, 'id'>[]) => {
    const batch = writeBatch(db);
    products.forEach(product => {
        const docRef = doc(collection(db, PRODUCTS_COLLECTION));
        batch.set(docRef, product);
    });
    await batch.commit();
};

export const updateProduct = async (id: string, product: Partial<any>) => {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    await updateDoc(docRef, product);
};

export const deleteProduct = async (id: string) => {
    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    await deleteDoc(docRef);
};
