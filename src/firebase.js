
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAj-ycZ5tsyztx0Rzb37pt1as01wZ-sRAw",
  authDomain: "creative-workflow-1e237.firebaseapp.com",
  projectId: "creative-workflow-1e237",
  storageBucket: "creative-workflow-1e237.firebasestorage.app",
  messagingSenderId: "644923188567",
  appId: "1:644923188567:web:f8c8ba774a41ced2c94a12",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
