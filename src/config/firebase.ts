import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAa2Y52RArOnL4DdmXjflTSIDanm2jSzn4",
    authDomain: "chatroom-29fc3.firebaseapp.com",
    databaseURL: "https://chatroom-29fc3-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "chatroom-29fc3",
    storageBucket: "chatroom-29fc3.firebasestorage.app",
    messagingSenderId: "789760414297",
    appId: "1:789760414297:web:83b63d39c89bda3597d748",
    measurementId: "G-FD7KCYNQ8R"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export default app; 