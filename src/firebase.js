
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAM11Fb7JpYTv2ISMmIbhk8Kgn8InAX-os",
  authDomain: "creative-dashboard-83d3e.firebaseapp.com",
  projectId: "creative-dashboard-83d3e",
  storageBucket: "creative-dashboard-83d3e.firebasestorage.app",
  messagingSenderId: "190128761278",
  appId: "1:190128761278:web:19c234863c2480083231ef",
  measurementId: "G-WSBBQNLZL4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db = getFirestore(app);
