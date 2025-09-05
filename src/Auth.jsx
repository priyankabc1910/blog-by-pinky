import React from "react";
import { auth, googleProvider } from "../firebaseConfig";
import { signInWithPopup, signOut } from "firebase/auth";

export default function Auth() {
  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      alert("✅ Signed in successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Error: " + err.message);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      alert("👋 Signed out!");
    } catch (err) {
      console.error(err);
      alert("❌ Error signing out: " + err.message);
    }
  };

  return (
    <div style={{ margin: "20px" }}>
      <button onClick={login}>Sign in with Google</button>
      <button onClick={logout} style={{ marginLeft: "10px" }}>
        Sign Out
      </button>
    </div>
  );
}