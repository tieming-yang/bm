import { Currency } from "@/utils/constants";
import firebase from "@/lib/firebase/firebase";
import type { ProfileSavedChild } from "@/app/(works)/school/summer/2026/domain";
import { Role, Policy } from "@/lib/policy";
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
  updateDoc,
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

export { Role };

type Profile = ProfileInput & {
  accountType: AccountType;
  newsletterOptIn: boolean;
  memberDetails: MemberDetails;
  memberType: MemberType;
  updatedAt: Timestamp;
  createdAt: Timestamp;
  role: Role;
  lastTransactionId?: string;
  lastSubscriptionId?: string;
  subscriptions?: Subscription[];
  organizationEmail?: string;
  organizationEmailUpdateCount?: number;
  isEbVolunteer?: boolean | null;
  savedChildren?: ProfileSavedChild[];
};

export interface MemberDetails {
  name: string | null;
  phone: string | null;
  address: Address;
  emergencyContact?: EmergencyContact;
}

export interface EmergencyContact {
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
}

export interface Address {
  state: string | null;
  city: string | null;
  line2: string | null;
  country: string | null;
  postalCode: string | null;
  line1: string | null;
}

export const MemberType = {
  Free: "free",
  Monthly: "monthly",
  Yearly: "yearly",
  LiftTime: "lifeTime",
} as const;
export type MemberType = (typeof MemberType)[keyof typeof MemberType];

export const AccountType = {
  Personal: "personal",
  Organization: "organization",
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

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
    return snap.docs.map((doc) => doc.data() as Subscription);
  },

  async create(values: ProfileInput) {
    if (await Profile.isExits(values.uid)) throw new Error("Profile existed");

    const profileRef = Profile.getRef(values.uid);

    const data = await setDoc(
      profileRef,
      {
        ...values,
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
      memberDetails: {
        name: snap.data()?.memberDetails?.name ?? null,
        phone: snap.data()?.memberDetails?.phone ?? null,
        address: {
          state: snap.data()?.memberDetails?.address?.state ?? null,
          city: snap.data()?.memberDetails?.address?.city ?? null,
          line2: snap.data()?.memberDetails?.address?.line2 ?? null,
          country: snap.data()?.memberDetails?.address?.country ?? null,
          postalCode: snap.data()?.memberDetails?.address?.postalCode ?? null,
          line1: snap.data()?.memberDetails?.address?.line1 ?? null,
        },
        emergencyContact: {
          firstName: snap.data()?.memberDetails?.emergencyContact?.firstName ?? null,
          lastName: snap.data()?.memberDetails?.emergencyContact?.lastName ?? null,
          phoneNumber: snap.data()?.memberDetails?.emergencyContact?.phoneNumber ?? null,
        },
      },
      isEbVolunteer: snap.data()?.isEbVolunteer ?? null,
      savedChildren: snap.data()?.savedChildren ?? [],
      subscriptions,
    } as Profile;
  },

  async isExits(uid: string) {
    const snap = await Profile.getSnap(uid);
    return snap.exists();
  },

  async updateOrgEmail(values: {
    uid: string;
    organizationEmail: string;
    currentOrganizationEmailUpdateCount: number;
  }) {
    const { uid, organizationEmail, currentOrganizationEmailUpdateCount } = values;
    if (!(await Profile.isExits(uid))) throw new Error("Profile existed");

    const profileRef = Profile.getRef(uid);

    const data = await updateDoc(profileRef, {
      organizationEmail,
      organizationEmailUpdateCount: currentOrganizationEmailUpdateCount + 1,
      updatedAt: serverTimestamp(),
    });

    return data;
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

  isPrivilegedRole(role: Role | undefined): boolean {
    return Policy.isPrivileged(role);
  },
};

export default Profile;
