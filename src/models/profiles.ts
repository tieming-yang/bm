import { Currency } from "@/constants";
import firebase from "@/lib/firebase/firebase";
import {
  collection,
  doc,
  DocumentReference,
  DocumentSnapshot,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from "firebase/firestore";

type ProfileInput = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL?: string | null;
  preferredLanguage?: string; // "en" | "zh-TW" | …
  favoriteArtworks?: string[];
};

type Profile = ProfileInput & {
  joinedGloryShare: boolean;
  gloryShareId?: string;
  totalContributed: number;
  newsletterOptIn: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  gloryShare: {
    joinedAt: Timestamp;
    sessionId: string;
    paymentIntentId: string;
    amount: number;
    currency: Currency;
    email: string;
  };
};

const Profiles = {
  getCollection(uid: string) {
    return collection(Profile.getRef(uid), "profiles");
  },
};

const Profile = {
  getRef(uid: string): DocumentReference {
    return doc(firebase.db, "profiles", uid);
  },

  async getSnap(uid: string): Promise<DocumentSnapshot> {
    const profileRef = Profile.getRef(uid);
    return await getDoc(profileRef);
  },

  async create(values: ProfileInput) {
    if (await Profile.isExits(values.uid)) throw new Error("Profile existed");

    const profileRef = Profile.getRef(values.uid);
    console.log({ profileRef });
    const data = await setDoc(
      profileRef,
      {
        ...values,
        joinedGloryShare: false,
        totalContributed: 0,
        newsletterOptIn: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return data;
  },

  async get(uid: string) {
    const snap = await Profile.getSnap(uid);
    if (!snap.exists()) throw new Error("M9KX - Donator not found");
    return snap.data() as Profile;
  },

  async isExits(uid: string) {
    const snap = await Profile.getSnap(uid);
    return snap.exists();
  },

  async joinedGloryShare(uid: string): Promise<boolean> {
    const snap = await Profile.getSnap(uid);
    if (!snap.exists()) return false;
    const data = snap.data();

    return Boolean(data.joinedGloryShare);
  },
};

export default Profile;
