// src/firebase.js
import { initializeApp } from "firebase/app";
// Importa los servicios que necesites (Auth, Firestore, etc.)
import { getAuth } from "firebase/auth"; 
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDw23wZZARphepRGvCb3rjTi_xDrQnAfBc",
  authDomain: "rkalling-b8a9a.firebaseapp.com",
  projectId: "rkalling-b8a9a",
  storageBucket: "rkalling-b8a9a.firebasestorage.app",
  messagingSenderId: "217373021545",
  appId: "1:217373021545:web:078271562a06d6834419f8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
