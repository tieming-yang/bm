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

type DonatorInput = {
  uid: string;
  name: string | null;
  email: string | null;
  photoURL?: string | null;
  preferredLanguage: string; // "en" | "zh-TW" | …
  favoriteArtworks?: string[];
};

type TDonator = DonatorInput & {
  totalDonated: number; // stored in cents
  newsletterOptIn: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type Donation = {
  id: string;
  amount: number;
  currency: string;
  createdAt: Timestamp;
  project: string;
  artworkId?: string;
  paymentMethod: string;
  transactionId: string;
  status: "pending" | "succeeded" | "failed";
  message?: string;
  receiptURL?: string;
};

const Profiles = {
  getCol(uid: string) {
    return collection(Profile.getRef(uid), "donations");
  },
};

const Profile = {
  getRef(uid: string): DocumentReference {
    return doc(firebase.db, "donators", uid);
  },

  async getSnap(uid: string): Promise<DocumentSnapshot> {
    const donatorRef = Profile.getRef(uid);
    return await getDoc(donatorRef);
  },

  async create(values: DonatorInput) {
    if (await Profile.isExits(values.uid)) throw new Error("Profile existed")

    const donatorRef = Profile.getRef(values.uid);

    await setDoc(
      donatorRef,
      {
        ...values,
        totalDonated: 0,
        newsletterOptIn: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },

  async get(uid: string) {
    const snap = await Profile.getSnap(uid);
    if (!snap.exists()) throw new Error("M9KX - Donator not found");
    return snap.data() as TDonator;
  },

  async isExits(uid: string) {
    const snap = await Profile.getSnap(uid);
    return snap.exists();
  },

  async addDonation(uid: string, donation: Omit<Donation, "id" | "createdAt">) {
    const col = Profiles.getCol(uid);
    const docRef = doc(col);
    await setDoc(docRef, {
      ...donation,
      createdAt: serverTimestamp(),
    });
  },

  async listDonations(uid: string): Promise<Donation[]> {
    const col = Profiles.getCol(uid);
    const snaps = await getDocs(query(col, where("status", "==", "succeeded")));
    return snaps.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })) as Donation[];
  },
};

export default Profile;
