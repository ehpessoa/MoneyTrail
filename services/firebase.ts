// FIX: Use Firebase v8 compat imports to resolve module export errors.
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQwSkLs59wE6RW6kbIjOeR5nYEQcW0RDc",
  authDomain: "moneytrail-43b29.firebaseapp.com",
  projectId: "moneytrail-43b29",
  storageBucket: "moneytrail-43b29.firebasestorage.app",
  messagingSenderId: "732433262658",
  appId: "1:732433262658:web:93789a79a55462b19425db"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.firestore();
