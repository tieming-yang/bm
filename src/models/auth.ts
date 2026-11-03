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
import * as v from "valibot";

export const AuthMethod = {
  Google: "google",
  Email: "email",
} as const;
export type AuthMethod = (typeof AuthMethod)[keyof typeof AuthMethod];

export const EmailSignUpSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
  password: v.pipe(v.string(), v.minLength(8)),
  displayName: v.pipe(v.string(), v.maxLength(30)),
});
export const EmailSignInSchema = v.omit(EmailSignUpSchema, ["displayName"]);

export type EmailSignUpInput = v.InferOutput<typeof EmailSignUpSchema>;
export type EmailSignInInput = Omit<EmailSignUpInput, "displayName">;
export type AuthResult = { user: User };

const Auth = {
  get user() {
    return firebase.auth.currentUser;
  },

  onAuthStateChanged(cb: (user: User | null) => void) {
    return _onAuthStateChanged(firebase.auth, cb);
  },

  async signInWithGoogle(): Promise<AuthResult> {
    const { user } = await signInWithPopup(firebase.auth, new GoogleAuthProvider());
    return { user };
  },

  async signOut() {
    try {
      await firebase.auth.signOut();
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Sign-out failed", error);
      throw error;
    }
  },

  async signUpWithEmail(input: EmailSignUpInput): Promise<AuthResult> {
    const value = v.parse(EmailSignUpSchema, input);
    const { user } = await createUserWithEmailAndPassword(firebase.auth, value.email, value.password);
    return { user };
  },

  async signInWithEmail(input: EmailSignInInput): Promise<AuthResult> {
    const value = v.parse(EmailSignInSchema, input);
    const { user } = await signInWithEmailAndPassword(firebase.auth, value.email, value.password);
    return { user };
  },
};

export default Auth;
