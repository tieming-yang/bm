//? Ref https://firebase.google.com/codelabs/firebase-nextjs#5

import {
  GoogleAuthProvider,
  onAuthStateChanged as _onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";

import Donator from "@/models/donator";
import firebase from "./firebase";

const Auth = {
  get user() {
    return firebase.auth.currentUser;
  },

  onAuthStateChanged(cb: () => void) {
    return _onAuthStateChanged(firebase.auth, cb);
  },

  async signInWithGoogle(fields: {
    preferredLanguage: string;
  }) {
    const provider = new GoogleAuthProvider();

    try {
      const { user } = await signInWithPopup(firebase.auth, provider);
      const { uid, displayName, email, photoURL } = user;
      const { preferredLanguage } = fields;

      await Donator.create({
        uid,
        name: displayName,
        email,
        preferredLanguage,
        photoURL: photoURL || null,
      });
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  },

  async signOut() {
    try {
      await firebase.auth.signOut();
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Error signing out with Google", error);
    }
  },
};

export default Auth;
