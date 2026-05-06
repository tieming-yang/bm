//? Ref https://firebase.google.com/codelabs/firebase-nextjs#5

import {
  GoogleAuthProvider,
  User,
  onAuthStateChanged as _onAuthStateChanged,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
} from "firebase/auth";

import firebase from "../lib/firebase/firebase";
import Profile from "./profiles";
import { assertIsDefined } from "@/lib/utils";
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
export type AuthResult = {
  user: User;
  profileExisted: boolean;
};

const Auth = {
  get user() {
    return firebase.auth.currentUser;
  },

  onAuthStateChanged(cb: (user: User | null) => void) {
    return _onAuthStateChanged(firebase.auth, cb);
  },

  async signInWithGoogle(): Promise<AuthResult> {
    const provider = new GoogleAuthProvider();
    let user;
    try {
      const { user: authUser } = await signInWithPopup(firebase.auth, provider);
      user = authUser;
      const { uid, displayName, email, photoURL } = user;
      const profileExisted = await Profile.isExits(uid);

      //? Cloud function v2 don't have auth.onCreate yet, so we have to keep the sign up flow client
      //? https://github.com/firebase/firebase-functions/issues/1383

      if (!profileExisted) {
        await Profile.create({
          uid,
          displayName,
          email,
          photoURL: photoURL || null,
        });
      }

      return {
        user,
        profileExisted,
      };
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

  async signUpWithEmail(input: EmailSignUpInput): Promise<AuthResult> {
    const { email, password, displayName } = input;
    let userCredential: UserCredential | null = null;
    try {
      userCredential = await createUserWithEmailAndPassword(firebase.auth, email, password);
    } catch (error) {
      throw error;
    }

    const { uid } = userCredential.user;
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

    return {
      user: userCredential.user,
      profileExisted: false,
    };
  },

  async signInWithEmail(input: EmailSignInInput): Promise<AuthResult> {
    const { email, password } = input;
    const { user } = await signInWithEmailAndPassword(firebase.auth, email, password);
    const profileExisted = await Profile.isExits(user.uid);

    return {
      user,
      profileExisted,
    };
  },
};

export default Auth;
