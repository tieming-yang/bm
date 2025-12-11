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
import Stripe from "stripe";

type ProfileInput = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL?: string | null;
  preferredLanguage?: string; // "en" | "zh-TW" | …
  favoriteArtworks?: string[];
};

type Profile = ProfileInput & {
  newsletterOptIn: boolean;
  memberDetails: MemberDetails;
  memberType: MemberType;
  updatedAt: Timestamp;
  createdAt: Timestamp;
  lastTransactionId?: string;
  lastSubscriptionId?: string;
  subscriptions?: Subscription[];
}

export interface MemberDetails {
  name: string;
  phone: null;
  address: Address;
}

export interface Address {
  state: string;
  city: string;
  line2: null;
  country: string;
  postalCode: string;
  line1: string;
}

export const MemberType = {
  Free: "free",
  Monthly: "monthly",
  Yearly: "yearly",
  LiftTime: "lifeTime",
} as const;
export type MemberType = (typeof MemberType)[keyof typeof MemberType];

type Subscription = {
  id: string;
  status: Stripe.Subscription.Status;
  startDate: number;
  endAt: number | null;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  canceledAt?: number;
  updatedAt?: Timestamp;
  createdAt?: Timestamp;
};

const Profile = {
  getRef(uid: string): DocumentReference {
    return doc(firebase.db, "profiles", uid);
  },

  async getSnap(uid: string): Promise<DocumentSnapshot> {
    const profileRef = Profile.getRef(uid);
    return await getDoc(profileRef);
  },

  async getSubscriptions(uid: string): Promise<Subscription[]> {
    const profileRef = Profile.getRef(uid);
    const subsRef = collection(profileRef, "subscriptions");
    const snap = await getDocs(subsRef);
    return snap.docs.map((doc) => (doc.data() as Subscription))
  },

  async create(values: ProfileInput) {
    if (await Profile.isExits(values.uid)) throw new Error("Profile existed");

    const profileRef = Profile.getRef(values.uid);
    console.log({ profileRef });
    const data = await setDoc(
      profileRef,
      {
        ...values,
        memberType: MemberType.Free,
        totalContributed: 0,
        newsletterOptIn: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return data;
  },

  async get(uid: string): Promise<Profile> {
    const snap = await Profile.getSnap(uid);
    if (!snap.exists()) throw new Error("M9KX - Profile not found");
    const subscriptions = await Profile.getSubscriptions(uid);

    return {
      ...snap.data(),
      subscriptions,
    } as Profile;
  },

  async isExits(uid: string) {
    const snap = await Profile.getSnap(uid);
    return snap.exists();
  },

  /**
   * 
   * @since get profile will be a Promise which can't use directly inside a component,
   * I think pass a profile will be the easiest way to do it.
   */
  isGloryShareMember(profile: Profile | undefined): boolean {
    if (!profile) return false;
    if (!profile.memberType) return false;

    return profile.memberType !== "free";
  },
};

export default Profile;
