import API from "@/app/api/api";
import {
  FORM_ID,
  FamilyProfileUpdateSchema,
  ProfileSavedChild,
  SummerCampDashboardStudentRow,
  SummerCampRegistrationDocumentSchema,
  SummerCampRegistrationFormSchema,
  getSchoolEventBySlug,
  isSupportedEventSlug,
  mapRegistrationToDashboardRows,
} from "@/app/(works)/school/summer/2026/domain";
import firebaseAdmin from "@/lib/firebase/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

type EventRegistrationsRouteContext = {
  params: Promise<{ eventSlug: string }>;
};

function isPrivilegedRole(role: unknown) {
  return role === "admin" || role === "staff";
}

function upsertSavedChildren(
  currentSavedChildren: ProfileSavedChild[],
  submittedChildren: Array<
    Pick<ProfileSavedChild, "firstName" | "lastName" | "grade" | "birthday" | "allergies"> & {
      savedChildId?: string;
    }
  >
) {
  const nextSavedChildren = new Map(currentSavedChildren.map((child) => [child.id, child]));

  submittedChildren.forEach((child) => {
    const id = child.savedChildId ?? randomUUID();
    nextSavedChildren.set(id, {
      id,
      firstName: child.firstName,
      lastName: child.lastName,
      grade: child.grade,
      birthday: child.birthday,
      allergies: child.allergies,
    });
  });

  return Array.from(nextSavedChildren.values());
}

async function getAuthedUid(request: NextRequest) {
  const token = API.getBearerToken(request);
  const decodedToken = await firebaseAdmin.auth.verifyIdToken(token);

  return decodedToken.uid;
}

export async function POST(
  request: NextRequest,
  ctx: EventRegistrationsRouteContext
) {
  const { eventSlug } = await ctx.params;

  if (!isSupportedEventSlug(eventSlug) || !getSchoolEventBySlug(eventSlug)) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SummerCampRegistrationFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid body parameters",
        issues: parsed.error.flatten(),
      },
      { status: 422 }
    );
  }

  try {
    const uid = await getAuthedUid(request);
    const profileRef = firebaseAdmin.db.doc(`profiles/${uid}`);
    const registrationRef = firebaseAdmin.db.collection("school_registrations").doc();

    await firebaseAdmin.db.runTransaction(async (tx) => {
      const profileSnap = await tx.get(profileRef);
      if (!profileSnap.exists) {
        API.throwAPIError(404, "Profile not found");
      }

      const currentProfile = profileSnap.data() as {
        email?: string | null;
        savedChildren?: ProfileSavedChild[];
      };
      const { syncFamilyProfile, ...registrationData } = parsed.data;

      tx.set(registrationRef, {
        ...registrationData,
        formId: FORM_ID,
        eventSlug,
        submittedByUid: uid,
        submittedByEmail: currentProfile.email ?? parsed.data.parent.email,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (!syncFamilyProfile) return;

      const savedChildren = upsertSavedChildren(currentProfile.savedChildren ?? [], parsed.data.children);
      const familyPatch = FamilyProfileUpdateSchema.parse({
        section: "family",
        isEbVolunteer: parsed.data.parent.isEbVolunteer,
        savedChildren,
      });

      tx.set(
        profileRef,
        {
          isEbVolunteer: familyPatch.isEbVolunteer,
          savedChildren: familyPatch.savedChildren,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    });
  } catch (error) {
    const { status, message } = API.getErrorInfo(error);

    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ status: 200, eventSlug });
}

export async function GET(
  request: NextRequest,
  ctx: EventRegistrationsRouteContext
) {
  const { eventSlug } = await ctx.params;

  if (!isSupportedEventSlug(eventSlug) || !getSchoolEventBySlug(eventSlug)) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  try {
    const uid = await getAuthedUid(request);
    const callerProfileRef = firebaseAdmin.db.doc(`profiles/${uid}`);
    const callerProfileSnap = await callerProfileRef.get();

    if (!callerProfileSnap.exists) {
      API.throwAPIError(404, "Profile not found");
    }

    const callerRole = callerProfileSnap.data()?.role;
    if (!isPrivilegedRole(callerRole)) {
      API.throwAPIError(403, "Forbidden");
    }

    const registrationsSnap = await firebaseAdmin.db
      .collection("school_registrations")
      .where("eventSlug", "==", eventSlug)
      .get();

    const rows = registrationsSnap.docs
      .flatMap((doc) => {
        const parsed = SummerCampRegistrationDocumentSchema.safeParse(doc.data());
        if (!parsed.success) {
          return [] as SummerCampDashboardStudentRow[];
        }

        return mapRegistrationToDashboardRows(doc.id, parsed.data);
      })
      .sort((first, second) => second.submittedAt.localeCompare(first.submittedAt));

    return NextResponse.json({ rows });
  } catch (error) {
    const { status, message } = API.getErrorInfo(error);

    return NextResponse.json({ error: message }, { status });
  }
}
