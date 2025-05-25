// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCPDdEy_eHCHiA7Do5FPLtyO8DdJBVklWs",
  authDomain: "beyond-backend.firebaseapp.com",
  projectId: "beyond-backend",
  storageBucket: "beyond-backend.firebasestorage.app",
  messagingSenderId: "331248468758",
  appId: "1:331248468758:web:df7d5f486229090e228637",
  measurementId: "G-R13X1H6G19",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
