import { isValid, parseISO } from "date-fns";
import { z } from "zod";

export const FORM_ID = "ekklesia-beyond-2026-summer-camp-registration" as const;
export const EVENT_SLUG = "summer-2026-ebsc" as const;
export const EVENT_TITLE = "2026 Ekklesia Beyond Summer Camp" as const;
export const EVENT_TYPE = "Summer Camp" as const;
export const ORGANIZATION_NAME = "Ekklesia Beyond" as const;
export const ORGANIZATION_WEBSITE = null;
export const EVENT_LOCATION_ADDRESS = "3535 Briarpark Dr #135, Houston, TX 77042" as const;
export const EVENT_SCHEDULE_DISPLAY =
  "From June 15, Monday through Friday for five days, from 9:30 a.m. to 11:30 a.m., three hours." as const;
export const DEFAULT_COUNTRY = "United States" as const;
export const REGISTRATION_DRAFT_STORAGE_KEY = `school-registration-draft:${EVENT_SLUG}`;

export const SUPPORTED_EVENT_SLUGS = [EVENT_SLUG] as const;

export const GRADE_OPTIONS = [
  { label: "6 mos. - 1 yr.", value: "6_months_to_1_year" },
  { label: "1 yr. 1 mo. - 2 yrs.", value: "1_year_1_month_to_2_years" },
  { label: "2 yrs. 1 mo. - 3 yrs.", value: "2_years_1_month_to_3_years" },
  { label: "Pre-K 4", value: "pre_k_4" },
  { label: "Kinder", value: "kinder" },
  { label: "1st", value: "1st" },
  { label: "2nd", value: "2nd" },
  { label: "3rd", value: "3rd" },
  { label: "4th", value: "4th" },
  { label: "5th", value: "5th" },
] as const;

export const US_STATE_OPTIONS = [
  { label: "Alabama", value: "AL" },
  { label: "Alaska", value: "AK" },
  { label: "Arizona", value: "AZ" },
  { label: "Arkansas", value: "AR" },
  { label: "California", value: "CA" },
  { label: "Colorado", value: "CO" },
  { label: "Connecticut", value: "CT" },
  { label: "Delaware", value: "DE" },
  { label: "District of Columbia", value: "DC" },
  { label: "Florida", value: "FL" },
  { label: "Georgia", value: "GA" },
  { label: "Hawaii", value: "HI" },
  { label: "Idaho", value: "ID" },
  { label: "Illinois", value: "IL" },
  { label: "Indiana", value: "IN" },
  { label: "Iowa", value: "IA" },
  { label: "Kansas", value: "KS" },
  { label: "Kentucky", value: "KY" },
  { label: "Louisiana", value: "LA" },
  { label: "Maine", value: "ME" },
  { label: "Maryland", value: "MD" },
  { label: "Massachusetts", value: "MA" },
  { label: "Michigan", value: "MI" },
  { label: "Minnesota", value: "MN" },
  { label: "Mississippi", value: "MS" },
  { label: "Missouri", value: "MO" },
  { label: "Montana", value: "MT" },
  { label: "Nebraska", value: "NE" },
  { label: "Nevada", value: "NV" },
  { label: "New Hampshire", value: "NH" },
  { label: "New Jersey", value: "NJ" },
  { label: "New Mexico", value: "NM" },
  { label: "New York", value: "NY" },
  { label: "North Carolina", value: "NC" },
  { label: "North Dakota", value: "ND" },
  { label: "Ohio", value: "OH" },
  { label: "Oklahoma", value: "OK" },
  { label: "Oregon", value: "OR" },
  { label: "Pennsylvania", value: "PA" },
  { label: "Rhode Island", value: "RI" },
  { label: "South Carolina", value: "SC" },
  { label: "South Dakota", value: "SD" },
  { label: "Tennessee", value: "TN" },
  { label: "Texas", value: "TX" },
  { label: "Utah", value: "UT" },
  { label: "Vermont", value: "VT" },
  { label: "Virginia", value: "VA" },
  { label: "Washington", value: "WA" },
  { label: "West Virginia", value: "WV" },
  { label: "Wisconsin", value: "WI" },
  { label: "Wyoming", value: "WY" },
] as const;

export const SUMMER_CAMP_FORM_DEFINITION = {
  id: FORM_ID,
  title: EVENT_TITLE,
  description: "Use this form to register a child for the 2026 Ekklesia Beyond Summer Camp.",
  organization: {
    name: ORGANIZATION_NAME,
    website: ORGANIZATION_WEBSITE,
  },
  event: {
    slug: EVENT_SLUG,
    title: EVENT_TITLE,
    type: EVENT_TYPE,
    scheduleDisplay: EVENT_SCHEDULE_DISPLAY,
    location: {
      name: ORGANIZATION_NAME,
      address: EVENT_LOCATION_ADDRESS,
    },
  },
} as const;

type TimestampLike = {
  toDate: () => Date;
};

const SupportedEventSlugSchema = z.enum(SUPPORTED_EVENT_SLUGS);
const GradeValueSchema = z.enum(
  GRADE_OPTIONS.map((option) => option.value) as [string, ...string[]]
);
const StateValueSchema = z.enum(
  US_STATE_OPTIONS.map((option) => option.value) as [string, ...string[]]
);

const TrimmedRequiredStringSchema = z.string().trim().min(1, "This field is required.");
const OptionalTrimmedStringSchema = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : ""));

const PhoneInputSchema = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .refine((value) => value.replace(/\D/g, "").length >= 10, "Enter a valid phone number.");

const EmailInputSchema = z.string().trim().email("Enter a valid email address.");
const ZipCodeInputSchema = z
  .string()
  .trim()
  .regex(/^\d{5}(?:-\d{4})?$/, "Enter a valid ZIP code.");
const DateInputSchema = z
  .string()
  .trim()
  .min(1, "This field is required.")
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), "Use the YYYY-MM-DD format.")
  .refine((value) => isValid(parseISO(value)), "Select a valid date.");

const RequiredBooleanSelectionSchema = z
  .boolean()
  .nullable()
  .refine((value) => value !== null, "Please choose an option.")
  .transform((value) => value as boolean);

const NullableBooleanSchema = z.boolean().nullable();

export const ProfileSavedChildSchema = z.object({
  id: TrimmedRequiredStringSchema,
  firstName: TrimmedRequiredStringSchema,
  lastName: TrimmedRequiredStringSchema,
  grade: GradeValueSchema,
  birthday: DateInputSchema,
  allergies: OptionalTrimmedStringSchema,
});

export const FamilyProfileUpdateSchema = z.object({
  section: z.literal("family"),
  isEbVolunteer: NullableBooleanSchema,
  savedChildren: z.array(ProfileSavedChildSchema),
});

export const FamilyProfileFormSchema = FamilyProfileUpdateSchema.omit({
  section: true,
});

export const RegistrationChildSchema = z.object({
  savedChildId: z.string().trim().min(1).optional(),
  firstName: TrimmedRequiredStringSchema,
  lastName: TrimmedRequiredStringSchema,
  grade: GradeValueSchema,
  birthday: DateInputSchema,
  allergies: OptionalTrimmedStringSchema,
});

export const RegistrationParentSchema = z.object({
  firstName: TrimmedRequiredStringSchema,
  lastName: TrimmedRequiredStringSchema,
  email: EmailInputSchema,
  cellPhone: PhoneInputSchema,
  isChurchMember: NullableBooleanSchema,
  isEbVolunteer: NullableBooleanSchema,
});

export const RegistrationAddressSchema = z.object({
  line1: TrimmedRequiredStringSchema,
  line2: OptionalTrimmedStringSchema,
  city: TrimmedRequiredStringSchema,
  state: StateValueSchema,
  country: z.literal(DEFAULT_COUNTRY),
  zipCode: ZipCodeInputSchema,
});

export const RegistrationEmergencyContactSchema = z.object({
  firstName: TrimmedRequiredStringSchema,
  lastName: TrimmedRequiredStringSchema,
  phoneNumber: PhoneInputSchema,
});

export const RegistrationConsentSchema = z.object({
  liabilityMedicalRelease: RequiredBooleanSelectionSchema,
  imageRelease: RequiredBooleanSelectionSchema,
});

export const SummerCampRegistrationFormSchema = z.object({
  children: z.array(RegistrationChildSchema).min(1, "Add at least one child."),
  parent: RegistrationParentSchema,
  address: RegistrationAddressSchema,
  emergencyContact: RegistrationEmergencyContactSchema,
  consents: RegistrationConsentSchema,
  signatureFullName: TrimmedRequiredStringSchema,
  syncFamilyProfile: z.boolean(),
  syncProfileDetails: z.boolean(),
});

export const SummerCampRegistrationDraftSchema = SummerCampRegistrationFormSchema.deepPartial();

export const SummerCampRegistrationDocumentSchema = SummerCampRegistrationFormSchema.omit({
  syncFamilyProfile: true,
  syncProfileDetails: true,
}).extend({
  formId: z.literal(FORM_ID),
  eventSlug: SupportedEventSlugSchema,
  submittedByUid: TrimmedRequiredStringSchema,
  submittedByEmail: EmailInputSchema,
  createdAt: z.custom<TimestampLike>(
    (value) => typeof value === "object" && value !== null && "toDate" in value,
    "Expected a Firestore timestamp."
  ),
  updatedAt: z.custom<TimestampLike>(
    (value) => typeof value === "object" && value !== null && "toDate" in value,
    "Expected a Firestore timestamp."
  ),
});

export const SummerCampDashboardStudentRowSchema = z.object({
  registrationId: TrimmedRequiredStringSchema,
  eventSlug: SupportedEventSlugSchema,
  childFullName: TrimmedRequiredStringSchema,
  grade: GradeValueSchema,
  birthday: DateInputSchema,
  allergies: z.string(),
  parentFullName: TrimmedRequiredStringSchema,
  parentEmail: EmailInputSchema,
  parentCellPhone: PhoneInputSchema,
  parentAddress: TrimmedRequiredStringSchema,
  emergencyContactName: TrimmedRequiredStringSchema,
  emergencyContactPhone: PhoneInputSchema,
  isEbVolunteer: NullableBooleanSchema,
  isChurchMember: NullableBooleanSchema,
  liabilityMedicalRelease: z.boolean(),
  imageRelease: z.boolean(),
  submittedAt: TrimmedRequiredStringSchema,
});

export type EventSlug = z.infer<typeof SupportedEventSlugSchema>;
export type GradeValue = z.infer<typeof GradeValueSchema>;
export type StateValue = z.infer<typeof StateValueSchema>;
export type ProfileSavedChild = z.infer<typeof ProfileSavedChildSchema>;
export type FamilyProfileUpdate = z.infer<typeof FamilyProfileUpdateSchema>;
export type FamilyProfileFormInput = z.input<typeof FamilyProfileFormSchema>;
export type SummerCampRegistrationFormInput = z.input<typeof SummerCampRegistrationFormSchema>;
export type SummerCampRegistrationPayload = z.output<typeof SummerCampRegistrationFormSchema>;
export type SummerCampRegistrationDocument = z.infer<typeof SummerCampRegistrationDocumentSchema>;
export type SummerCampDashboardStudentRow = z.infer<typeof SummerCampDashboardStudentRowSchema>;
export type SummerCampRegistrationDraft = z.input<typeof SummerCampRegistrationDraftSchema>;

export function isSupportedEventSlug(eventSlug: string): eventSlug is EventSlug {
  return SUPPORTED_EVENT_SLUGS.includes(eventSlug as EventSlug);
}

export function getSchoolEventBySlug(eventSlug: string) {
  if (!isSupportedEventSlug(eventSlug)) return null;

  return SUMMER_CAMP_FORM_DEFINITION;
}

export function createEmptySavedChild(): ProfileSavedChild {
  return {
    id: "",
    firstName: "",
    lastName: "",
    grade: GRADE_OPTIONS[0].value,
    birthday: "",
    allergies: "",
  };
}

export function createEmptyRegistrationChild(): SummerCampRegistrationFormInput["children"][number] {
  return {
    savedChildId: undefined,
    firstName: "",
    lastName: "",
    grade: GRADE_OPTIONS[0].value,
    birthday: "",
    allergies: "",
  };
}

export function createDefaultRegistrationFormValues(options?: {
  parentEmail?: string | null;
  isEbVolunteer?: boolean | null;
}): SummerCampRegistrationFormInput {
  return {
    children: [createEmptyRegistrationChild()],
    parent: {
      firstName: "",
      lastName: "",
      email: options?.parentEmail ?? "",
      cellPhone: "",
      isChurchMember: null,
      isEbVolunteer: options?.isEbVolunteer ?? null,
    },
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "TX",
      country: DEFAULT_COUNTRY,
      zipCode: "",
    },
    emergencyContact: {
      firstName: "",
      lastName: "",
      phoneNumber: "",
    },
    consents: {
      liabilityMedicalRelease: null,
      imageRelease: null,
    },
    signatureFullName: "",
    syncFamilyProfile: false,
    syncProfileDetails: false,
  };
}

export function getChildDisplayName(child: Pick<ProfileSavedChild, "firstName" | "lastName">) {
  return `${child.firstName} ${child.lastName}`.trim();
}

export function formatParentAddress(address: {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}) {
  const line2 = address.line2?.trim();
  const street = line2 ? `${address.line1}, ${line2}` : address.line1;
  return `${street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`;
}

export function mapRegistrationToDashboardRows(
  registrationId: string,
  registration: SummerCampRegistrationDocument
): SummerCampDashboardStudentRow[] {
  const parentFullName = `${registration.parent.firstName} ${registration.parent.lastName}`.trim();
  const emergencyContactName =
    `${registration.emergencyContact.firstName} ${registration.emergencyContact.lastName}`.trim();
  const parentAddress = formatParentAddress(registration.address);
  const submittedAt = registration.createdAt.toDate().toISOString();

  return registration.children.map((child) => ({
    registrationId,
    eventSlug: registration.eventSlug,
    childFullName: getChildDisplayName(child),
    grade: child.grade,
    birthday: child.birthday,
    allergies: child.allergies,
    parentFullName,
    parentEmail: registration.parent.email,
    parentCellPhone: registration.parent.cellPhone,
    parentAddress,
    emergencyContactName,
    emergencyContactPhone: registration.emergencyContact.phoneNumber,
    isEbVolunteer: registration.parent.isEbVolunteer,
    isChurchMember: registration.parent.isChurchMember,
    liabilityMedicalRelease: registration.consents.liabilityMedicalRelease,
    imageRelease: registration.consents.imageRelease,
    submittedAt,
  }));
}
