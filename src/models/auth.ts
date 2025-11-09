//? Ref https://firebase.google.com/codelabs/firebase-nextjs#5

import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged as _onAuthStateChanged,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

import firebase from "../lib/firebase/firebase";
import Profile from "./profiles";

export const AuthMethod = {
  Google: "google",
  Email: "email",
} as const;
export type AuthMethod = (typeof AuthMethod)[keyof typeof AuthMethod];

export type EmailSignUpInput = { email: string; password: string; displayName: string };
export type EmailSignInInput = Omit<EmailSignUpInput, "displayName">;

const Auth = {
  get user() {
    return firebase.auth.currentUser;
  },

  onAuthStateChanged(cb: (user: User | null) => void) {
    return _onAuthStateChanged(firebase.auth, cb);
  },

  async signInWithGoogle(): Promise<User> {
    const provider = new GoogleAuthProvider();
    let user;
    try {
      const { user: authUser } = await signInWithPopup(firebase.auth, provider);
      user = authUser;
      const { uid, displayName, email, photoURL } = user;

      //? Cloud function v2 don't have auth.onCreate yet, so we have to keep the sign up flow client
      //? https://github.com/firebase/firebase-functions/issues/1383

      if (!(await Profile.isExits(uid))) {
        await Profile.create({
          uid,
          displayName,
          email,
          photoURL: photoURL || null,
        });
      }

      return user;
    } catch (error) {
      console.error(error);
      throw error;
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

  async signUpWithEmail(input: EmailSignUpInput): Promise<User> {
    const { email, password, displayName } = input;
    if (!email || !password || !displayName) throw new Error("sign up with email input error");

    const { user } = await createUserWithEmailAndPassword(firebase.auth, email, password);

    const { uid } = user;
    const isProfileExist = await Profile.isExits(uid);
    if (isProfileExist) {
      throw new Error("Profile Exist");
    }

    await Profile.create({
      uid,
      displayName,
      email,
      photoURL: null,
    });

    return user;
  },

  async signInWithEmail(input: EmailSignInInput): Promise<User> {
    const { email, password } = input;
    if (!email || !password) throw new Error("sign in with email input error");

    const { user } = await signInWithEmailAndPassword(firebase.auth, email, password);
    return user;
  },
};

export default Auth;
