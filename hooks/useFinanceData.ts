


import { useState, useEffect, useCallback, useMemo } from 'react';
// FIX: Use Firebase v8 compat imports and syntax to be consistent with other hooks.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { db } from '../services/firebase';
import { TransactionEntry, CategoryItem, GoalEntry, Family, BudgetEntry } from '../types';
import { addMonths, addYears, parseISO } from 'date-fns';

export interface FinanceDataHook {
    transactions: TransactionEntry[];
    categories: CategoryItem[];
    goals: GoalEntry[];
    budgets: BudgetEntry[];
    family: Family | null;
    loadingData: boolean;
    categoryMap: Map<string, CategoryItem>;
    addTransaction: (data: Omit<TransactionEntry, 'id'>) => Promise<string>;
    updateTransaction: (id: string, data: Partial<TransactionEntry>) => Promise<void>;
    deleteTransactions: (transaction: TransactionEntry, mode: 'one' | 'future' | 'all') => Promise<void>;
    addCategory: (data: Omit<CategoryItem, 'id'>) => Promise<void>;
    updateCategory: (id: string, data: Partial<Omit<CategoryItem, 'id'>>) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    addGoal: (data: Omit<GoalEntry, 'id' | 'currentAmount'>) => Promise<void>;
    updateGoal: (id: string, data: Partial<Omit<GoalEntry, 'id' | 'currentAmount'>>) => Promise<void>;
    deleteGoal: (id: string) => Promise<void>;
    addBudget: (data: Omit<BudgetEntry, 'id' | 'period'>) => Promise<void>;
    updateBudget: (id: string, data: Partial<BudgetEntry>) => Promise<void>;
    deleteBudget: (id: string) => Promise<void>;
}

// Helper to convert Firestore Timestamps to ISO strings
const processTimestamps = (data: any) => {
    const processedData = { ...data };
    for (const key in processedData) {
        // FIX: Use v8 Timestamp type
        if (processedData[key] instanceof firebase.firestore.Timestamp) {
            processedData[key] = processedData[key].toDate().toISOString();
        }
    }
    return processedData;
};

export const useFinanceData = (uid?: string, familyId?: string): FinanceDataHook => {
    const [transactions, setTransactions] = useState<TransactionEntry[]>([]);
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [goals, setGoals] = useState<GoalEntry[]>([]);
    const [budgets, setBudgets] = useState<BudgetEntry[]>([]);
    const [family, setFamily] = useState<Family | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!uid || !familyId) {
            setLoadingData(false);
            setTransactions([]);
            setCategories([]);
            setGoals([]);
            setBudgets([]);
            setFamily(null);
            return;
        }

        setLoadingData(true);
        
        // FIX: Use v8 firestore syntax
        const familyDocRef = db.collection('families').doc(familyId);

        let loaded: { [key: string]: boolean } = { family: false, transactions: false, categories: false, goals: false, budgets: false };
        const checkAllLoaded = () => {
            if (Object.values(loaded).every(Boolean)) {
                setLoadingData(false);
            }
        };

        const subs: (() => void)[] = [];

        // Subscribe to family document
        // FIX: Use v8 onSnapshot syntax
        subs.push(familyDocRef.onSnapshot((docSnap) => {
            if (docSnap.exists) {
                setFamily({ id: docSnap.id, ...docSnap.data() } as Family);
            }
            loaded.family = true;
            checkAllLoaded();
        }));

        // Subscribe to subcollections
        const subcollections: { name: 'transactions' | 'categories' | 'goals' | 'budgets', setter: Function }[] = [
            { name: 'transactions', setter: setTransactions },
            { name: 'categories', setter: setCategories },
            { name: 'goals', setter: setGoals },
            { name: 'budgets', setter: setBudgets },
        ];
        
        subcollections.forEach(({ name, setter }) => {
            // FIX: Use v8 firestore syntax for subcollections
            const collectionRef = familyDocRef.collection(name);
            const q = collectionRef;
            // FIX: Use v8 onSnapshot syntax
            subs.push(q.onSnapshot((snapshot) => {
                const data = snapshot.docs.map(d => ({ id: d.id, ...processTimestamps(d.data()) }));
                setter(data as any);
                loaded[name] = true;
                checkAllLoaded();
            }));
        });


        return () => subs.forEach(unsub => unsub());

    }, [uid, familyId]);
    
    const categoryMap = useMemo(() => {
        const map = new Map<string, CategoryItem>();
        categories.forEach(cat => map.set(cat.id, cat));
        return map;
    }, [categories]);

    const getCollectionRef = useCallback((collectionName: string) => {
        if (!familyId) throw new Error("Family ID is not available.");
        // FIX: Use v8 firestore syntax
        return db.collection('families').doc(familyId).collection(collectionName);
    }, [familyId]);

    const addTransaction = useCallback(async (data: Omit<TransactionEntry, 'id'>) => {
        if (data.isRecurring) {
            const batch = db.batch();
            const recurrenceId = getCollectionRef('transactions').doc().id;
            const startDate = parseISO(data.date);
            const endDate = data.recurrenceEndDate ? parseISO(data.recurrenceEndDate) : addYears(startDate, 5); // Limit to 5 years

            let currentDate = startDate;
            let firstDocId: string | null = null;

            while (currentDate <= endDate) {
                const docRef = getCollectionRef('transactions').doc();
                if (!firstDocId) {
                    firstDocId = docRef.id;
                }
                
                const newTransactionData: Partial<TransactionEntry> = {
                    ...data,
                    date: firebase.firestore.Timestamp.fromDate(currentDate).toDate().toISOString(),
                    isRecurring: true,
                    recurrenceFrequency: 'monthly',
                    originalRecurrenceId: recurrenceId,
                };
                
                const firestoreData = {
                    ...newTransactionData,
                    date: firebase.firestore.Timestamp.fromDate(currentDate)
                };
                
                delete firestoreData.recurrenceEndDate;
                
                batch.set(docRef, firestoreData);
                currentDate = addMonths(currentDate, 1);
            }

            if (!firstDocId) {
                throw new Error("Nenhuma transação recorrente foi gerada. Verifique as datas.");
            }

            await batch.commit();
            return firstDocId;
        } else {
            const dataWithTimestamp = { ...data, date: firebase.firestore.Timestamp.fromDate(parseISO(data.date)) };
            const docRef = await getCollectionRef('transactions').add(dataWithTimestamp);
            return docRef.id;
        }
    }, [getCollectionRef]);

    const updateTransaction = useCallback(async (id: string, data: Partial<TransactionEntry>) => {
        if (!familyId) return;
        // FIX: Use v8 firestore syntax for doc reference and update
        const docRef = db.collection('families').doc(familyId).collection('transactions').doc(id);
        const dataToUpdate = { ...data };
        if (data.date) {
            // FIX: Use v8 Timestamp type
            (dataToUpdate as any).date = firebase.firestore.Timestamp.fromDate(new Date(data.date));
        }
        await docRef.update(dataToUpdate);
    }, [familyId]);

    const deleteTransactions = useCallback(async (transaction: TransactionEntry, mode: 'one' | 'future' | 'all') => {
        if (!familyId) throw new Error("Family ID not available.");

        if (mode === 'one' || !transaction.isRecurring || !transaction.originalRecurrenceId) {
            const docRef = db.collection('families').doc(familyId).collection('transactions').doc(transaction.id);
            await docRef.delete();
            return;
        }

        const batch = db.batch();
        const transactionsRef = getCollectionRef('transactions');
        const q = await transactionsRef.where('originalRecurrenceId', '==', transaction.originalRecurrenceId).get();
        
        if (q.empty) { 
            const docRef = db.collection('families').doc(familyId).collection('transactions').doc(transaction.id);
            await docRef.delete();
            return;
        }

        const transactionDate = parseISO(transaction.date);

        q.docs.forEach(doc => {
            const docDate = (doc.data().date as firebase.firestore.Timestamp).toDate();

            if (mode === 'all') {
                batch.delete(doc.ref);
            } else if (mode === 'future') {
                if (docDate >= transactionDate) {
                    batch.delete(doc.ref);
                }
            }
        });

        await batch.commit();
    }, [familyId, getCollectionRef]);

    const addCategory = useCallback(async (data: Omit<CategoryItem, 'id'>) => {
        // FIX: Use v8 add method
        await getCollectionRef('categories').add(data);
    }, [getCollectionRef]);
    
    const updateCategory = useCallback(async (id: string, data: Partial<Omit<CategoryItem, 'id'>>) => {
        if (!familyId) return;
        const docRef = db.collection('families').doc(familyId).collection('categories').doc(id);
        await docRef.update(data);
    }, [familyId]);

    const deleteCategory = useCallback(async (id: string) => {
        if (!familyId) throw new Error("Family ID is not available.");
        
        const transactionsRef = getCollectionRef('transactions');
        // FIX: Use v8 firestore syntax for where clause
        const querySnapshot = await transactionsRef.where('categoryId', '==', id).limit(1).get();

        if (!querySnapshot.empty) {
            // This error message will be displayed to the user.
            throw new Error('Esta categoria não pode ser excluída, pois está em uso.');
        }

        // FIX: Use v8 firestore syntax for doc reference and delete
        await getCollectionRef('categories').doc(id).delete();
    }, [getCollectionRef, familyId]);

    const addGoal = useCallback(async (data: Omit<GoalEntry, 'id' | 'currentAmount'>) => {
        const newGoal = {
            ...data,
            currentAmount: 0,
            // FIX: Use v8 Timestamp type
            ...(data.deadline && { deadline: firebase.firestore.Timestamp.fromDate(new Date(data.deadline)) }),
        };
        // FIX: Use v8 add method
        await getCollectionRef('goals').add(newGoal);
    }, [getCollectionRef]);

    const updateGoal = useCallback(async (id: string, data: Partial<Omit<GoalEntry, 'id' | 'currentAmount'>>) => {
        if (!familyId) return;
        const docRef = db.collection('families').doc(familyId).collection('goals').doc(id);
        const dataToUpdate: { [key: string]: any } = { ...data };
        if (data.deadline) {
            dataToUpdate.deadline = firebase.firestore.Timestamp.fromDate(new Date(data.deadline));
        } else if (data.hasOwnProperty('deadline') && !data.deadline) {
            dataToUpdate.deadline = firebase.firestore.FieldValue.delete();
        }
        await docRef.update(dataToUpdate);
    }, [familyId]);

    const deleteGoal = useCallback(async (id: string) => {
        if (!familyId) return;
        const docRef = db.collection('families').doc(familyId).collection('goals').doc(id);
        await docRef.delete();
    }, [familyId]);

    const addBudget = useCallback(async (data: Omit<BudgetEntry, 'id' | 'period'>) => {
        const newBudget = {
            ...data,
            period: 'monthly' as const,
        };
        await getCollectionRef('budgets').add(newBudget);
    }, [getCollectionRef]);

    const updateBudget = useCallback(async (id: string, data: Partial<BudgetEntry>) => {
        if (!familyId) return;
        const docRef = db.collection('families').doc(familyId).collection('budgets').doc(id);
        await docRef.update(data);
    }, [familyId]);

    const deleteBudget = useCallback(async (id: string) => {
        if (!familyId) return;
        const docRef = db.collection('families').doc(familyId).collection('budgets').doc(id);
        await docRef.delete();
    }, [familyId]);


    return { 
        transactions, 
        categories, 
        goals, 
        budgets,
        family, 
        loadingData, 
        categoryMap,
        addTransaction,
        updateTransaction,
        deleteTransactions,
        addCategory,
        updateCategory,
        deleteCategory,
        addGoal,
        updateGoal,
        deleteGoal,
        addBudget,
        updateBudget,
        deleteBudget,
    };
};