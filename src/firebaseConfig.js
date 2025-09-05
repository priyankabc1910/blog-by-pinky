
// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your Firebase project configuration (from Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyAcYhYZQV4pkctMaY9H5-S_By_ic_eCXy4",
  authDomain: "blog-by-pinky.firebaseapp.com",
  projectId: "blog-by-pinky",
  storageBucket: "blog-by-pinky.firebasestorage.app",
  messagingSenderId: "697274357406",
  appId: "1:697274357406:web:4fdf4bd2c6f010fbc38d8f",
  measurementId: "G-QZT12T7RTD"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Authentication
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, googleProvider };