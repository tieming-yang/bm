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
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import Stripe from "stripe";
import { z } from "zod";

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

/** Only fields owned by the existing client initialization workflow. */
export const ProfileInitializationInputSchema = z.object({
  uid: z.string().min(1).max(128).refine((value) => !value.includes("/") && value !== "." && value !== ".."),
  displayName: z.string().nullable(),
  email: z.string().email().nullable(),
  photoURL: z.string().url().nullable().optional(),
}).strict();
export type ProfileInitializationInput = z.infer<typeof ProfileInitializationInputSchema>;
const ProfileUidSchema = ProfileInitializationInputSchema.shape.uid;
export type ProfileInitializationResult = { kind: "created" | "existing" } | { kind: "conflict"; reason: string };
export type ProfileReadResult = { kind: "missing" } | { kind: "conflict"; reason: string } | { kind: "found"; profile: Profile };

/** Validate only stable identity and timestamps owned by base profile initialization. */
export function validateProfileInitializationIdentity(uid: string, data: unknown): void {
  const parsed = z.object({ uid: ProfileUidSchema, createdAt: z.instanceof(Timestamp), updatedAt: z.instanceof(Timestamp) }).passthrough().safeParse(data);
  const reason = !parsed.success ? "Stored profile identity or timestamps are malformed" : parsed.data.uid !== uid ? "Stored profile identity differs from its document path" : parsed.data.updatedAt.toMillis() < parsed.data.createdAt.toMillis() ? "Stored profile update timestamp predates creation" : null;
  if (reason) throw Object.assign(new Error(reason), { code: "profile/setup-conflict" });
}

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
    return snap.docs.map((doc) => {
      const data = doc.data();
      if (data.id !== undefined && data.id !== doc.id) throw new Error("Stored subscription ID differs from its document path");
      return { ...data, id: doc.id } as Subscription;
    });
  },

  /** Initialize only a missing owner profile; retries never rewrite existing state. */
  async ensureInitialized(values: ProfileInitializationInput): Promise<ProfileInitializationResult> {
    const seed = ProfileInitializationInputSchema.parse(values);
    if (firebase.auth.currentUser?.uid !== seed.uid) throw new Error("Profile initialization requires the current authenticated owner");
    return runTransaction(firebase.db, async (transaction) => {
      const ref = Profile.getRef(seed.uid);
      const existing = await transaction.get(ref);
      if (firebase.auth.currentUser?.uid !== seed.uid) throw new Error("Profile initialization owner changed during the transaction");
      if (existing.exists()) {
        validateProfileInitializationIdentity(seed.uid, existing.data());
        return { kind: "existing" };
      }
      transaction.set(ref, {
        ...seed,
        photoURL: seed.photoURL ?? null,
        newsletterOptIn: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return { kind: "created" };
    });
  },

  /** Distinguish absence from infrastructure failure and existing-state conflicts. */
  async read(uid: string): Promise<ProfileReadResult> {
    ProfileUidSchema.parse(uid);
    const snap = await Profile.getSnap(uid);
    if (!snap.exists()) return { kind: "missing" };
    validateProfileInitializationIdentity(uid, snap.data());
    return { kind: "found", profile: await Profile.fromSnapshot(uid, snap) };
  },

  async get(uid: string): Promise<Profile> {
    const snap = await Profile.getSnap(uid);
    if (!snap.exists()) throw new Error("M9KX - Profile not found");
    return Profile.fromSnapshot(uid, snap);
  },

  async fromSnapshot(uid: string, snap: DocumentSnapshot): Promise<Profile> {
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
