import { useState, useEffect } from 'react';
// FIX: Use Firebase v8 compat imports and syntax to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import { auth, db } from '../services/firebase';
import { UserProfile } from '../types';

export interface AuthHook {
    // FIX: Use firebase.User type from compat library
    user: firebase.User | null;
    userProfile: UserProfile | null;
    loadingAuth: boolean;
    login: (email: string, pass: string) => Promise<void>;
    register: (name: string, email: string, pass: string, familyId?: string) => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
}

export const useAuth = (): AuthHook => {
    const [user, setUser] = useState<firebase.User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);

    useEffect(() => {
        // FIX: Use v8 onAuthStateChanged syntax
        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                // FIX: Use v8 firestore syntax
                const userProfileRef = db.collection('users').doc(firebaseUser.uid);
                const userProfileSnap = await userProfileRef.get();
                if (userProfileSnap.exists) {
                    setUserProfile(userProfileSnap.data() as UserProfile);
                } else {
                    setUserProfile(null);
                }
                setUser(firebaseUser);
            } else {
                setUser(null);
                setUserProfile(null);
            }
            setLoadingAuth(false);
        });

        return () => unsubscribe();
    }, []);

    const login = async (email: string, pass: string) => {
        // FIX: Use v8 signInWithEmailAndPassword syntax
        await auth.signInWithEmailAndPassword(email, pass);
    };

    const register = async (name: string, email: string, pass: string, familyId?: string) => {
        // FIX: Use v8 createUserWithEmailAndPassword syntax
        const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
        const newUser = userCredential.user;
        if (!newUser) {
            throw new Error('User creation failed.');
        }


        // FIX: Use v8 firestore batch syntax
        const batch = db.batch();
        let finalFamilyId = familyId;

        if (!finalFamilyId) {
            // Create a new family
            const newFamilyDoc = {
                members: [{ uid: newUser.uid, name: name }]
            };
            // FIX: Use v8 firestore collection/doc syntax
            const familyRef = db.collection('families').doc();
            batch.set(familyRef, newFamilyDoc);
            finalFamilyId = familyRef.id;

            // Seed default categories for the new family
            const defaultCategories = [
                { name: 'Salário', icon: 'Landmark', color: 'text-green-400', type: 'receita' },
                { name: 'Alimentação', icon: 'Utensils', color: 'text-orange-400', type: 'despesa' },
                { name: 'Transporte', icon: 'Bus', color: 'text-blue-400', type: 'despesa' },
                { name: 'Moradia', icon: 'Home', color: 'text-yellow-400', type: 'despesa' },
                { name: 'Lazer', icon: 'Ticket', color: 'text-pink-400', type: 'despesa' },
            ];
            defaultCategories.forEach(cat => {
                // FIX: Use v8 firestore collection/doc syntax for subcollections
                const catDocRef = db.collection('families').doc(finalFamilyId!).collection('categories').doc();
                batch.set(catDocRef, cat);
            });

        } else {
            // Join an existing family
            // FIX: Use v8 firestore doc syntax and FieldValue for arrayUnion
            const familyRef = db.collection('families').doc(finalFamilyId);
            batch.update(familyRef, {
                members: firebase.firestore.FieldValue.arrayUnion({ uid: newUser.uid, name: name })
            });
        }

        const userProfileData: UserProfile = {
            uid: newUser.uid,
            name: name,
            email: newUser.email!,
            familyId: finalFamilyId!,
        };
        
        // FIX: Use v8 firestore doc syntax
        const userProfileRef = db.collection('users').doc(newUser.uid);
        batch.set(userProfileRef, userProfileData);

        await batch.commit();
        setUserProfile(userProfileData);
    };

    const logout = async () => {
        // FIX: Use v8 signOut syntax
        await auth.signOut();
    };

    const resetPassword = async (email: string) => {
        // FIX: Use v8 sendPasswordResetEmail syntax
        await auth.sendPasswordResetEmail(email);
    };

    return { user, userProfile, loadingAuth, login, register, logout, resetPassword };
};