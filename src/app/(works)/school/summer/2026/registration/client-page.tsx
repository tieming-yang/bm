"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { useForm } from "@tanstack/react-form-nextjs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarIcon, CheckCircle2Icon, PlusIcon, Trash2Icon, UserPlusIcon } from "lucide-react";
import { toast } from "sonner";

import Loading from "@/app/loading";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import useAuthUser from "@/hooks/use-auth-user";
import useTranslation from "@/hooks/use-translation";
import Auth from "@/models/auth";
import Profile from "@/models/profiles";
import {
  DEFAULT_COUNTRY,
  EVENT_LOCATION_ADDRESS,
  EVENT_SCHEDULE_DISPLAY,
  GRADE_OPTIONS,
  REGISTRATION_DRAFT_STORAGE_KEY,
  SUMMER_CAMP_FORM_DEFINITION,
  SummerCampRegistrationDraft,
  SummerCampRegistrationDraftSchema,
  SummerCampRegistrationFormInput,
  SummerCampRegistrationFormSchema,
  US_STATE_OPTIONS,
  createDefaultRegistrationFormValues,
  createEmptyRegistrationChild,
  getChildDisplayName,
} from "@/app/(works)/school/summer/2026/domain";
import { QueryKey } from "@/utils/query-keys";

const CHILD_BIRTHDAY_MIN_DATE = new Date(2010, 0, 1);

function getFieldErrorMessage(errorMap: Record<string, unknown>) {
  const candidates = [errorMap.onBlur, errorMap.onSubmit, errorMap.onChange];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const firstError = candidate.at(0);
      if (firstError && typeof firstError === "object" && "message" in firstError) {
        return typeof firstError.message === "string" ? firstError.message : null;
      }
    }

    if (candidate && typeof candidate === "object" && "message" in candidate) {
      return typeof candidate.message === "string" ? candidate.message : null;
    }

    if (typeof candidate === "string") {
      return candidate;
    }
  }

  return null;
}

function readRegistrationDraft() {
  if (typeof window === "undefined") return null;

  const rawDraft = window.sessionStorage.getItem(REGISTRATION_DRAFT_STORAGE_KEY);
  if (!rawDraft) return null;

  try {
    const parsed = SummerCampRegistrationDraftSchema.safeParse(JSON.parse(rawDraft));
    return parsed.success ? parsed.data : null;
  } catch (error) {
    console.error("Failed to parse registration draft", error);
    return null;
  }
}

function writeRegistrationDraft(value: SummerCampRegistrationFormInput) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(REGISTRATION_DRAFT_STORAGE_KEY, JSON.stringify(value));
}

function clearRegistrationDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(REGISTRATION_DRAFT_STORAGE_KEY);
}

function mergeRegistrationDraft(
  defaults: SummerCampRegistrationFormInput,
  draft: SummerCampRegistrationDraft | null,
  parentEmail?: string | null,
  isEbVolunteer?: boolean | null
): SummerCampRegistrationFormInput {
  const merged: SummerCampRegistrationFormInput = {
    ...defaults,
    children:
      Array.isArray(draft?.children) && draft.children.length > 0
        ? draft.children.map((child) => ({
            ...createEmptyRegistrationChild(),
            ...child,
          }))
        : defaults.children,
    parent: {
      ...defaults.parent,
      ...(draft?.parent ?? {}),
    },
    address: {
      ...defaults.address,
      ...(draft?.address ?? {}),
      country: DEFAULT_COUNTRY,
    },
    emergencyContact: {
      ...defaults.emergencyContact,
      ...(draft?.emergencyContact ?? {}),
    },
    consents: {
      ...defaults.consents,
      ...(draft?.consents ?? {}),
    },
    signatureFullName: draft?.signatureFullName ?? defaults.signatureFullName,
    syncFamilyProfile: draft?.syncFamilyProfile ?? defaults.syncFamilyProfile,
  };

  if (!merged.parent.email && parentEmail) {
    merged.parent.email = parentEmail;
  }

  if (merged.parent.isEbVolunteer === null) {
    merged.parent.isEbVolunteer = isEbVolunteer ?? null;
  }

  return merged;
}

function buildSignUpHref(email: string) {
  const params = new URLSearchParams({
    redirectTo: "/school/summer/2026/registration",
  });

  if (email.trim()) {
    params.set("prefillEmail", email.trim());
  }

  return `/signup?${params.toString()}`;
}

function isRegistrationChildEmpty(child: SummerCampRegistrationFormInput["children"][number]) {
  return (
    !child.savedChildId &&
    !child.firstName.trim() &&
    !child.lastName.trim() &&
    !child.birthday.trim() &&
    !(child.allergies ?? "").trim()
  );
}

function DatePickerDialogField({
  value,
  onChange,
  label,
  closeLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? parseISO(value) : undefined;
  const today = new Date();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="justify-between">
          <span>{value ? format(parseISO(value), "PPP") : label}</span>
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-fit">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={CHILD_BIRTHDAY_MIN_DATE}
          endMonth={today}
          defaultMonth={selectedDate ?? today}
          selected={selectedDate}
          disabled={{
            before: CHILD_BIRTHDAY_MIN_DATE,
            after: today,
          }}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {closeLabel}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BooleanChoiceField({
  label,
  value,
  onChange,
  yesLabel,
  noLabel,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  yesLabel: string;
  noLabel: string;
}) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <RadioGroup
        value={value === null ? "" : value ? "yes" : "no"}
        onValueChange={(nextValue) => {
          if (nextValue === "yes") {
            onChange(true);
            return;
          }

          if (nextValue === "no") {
            onChange(false);
            return;
          }

          onChange(null);
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <Label className="flex items-center gap-3 rounded-3xl border border-input px-4 py-3">
          <RadioGroupItem value="yes" />
          <span>{yesLabel}</span>
        </Label>
        <Label className="flex items-center gap-3 rounded-3xl border border-input px-4 py-3">
          <RadioGroupItem value="no" />
          <span>{noLabel}</span>
        </Label>
      </RadioGroup>
    </div>
  );
}

export default function RegistrationClientPage() {
  const router = useRouter();
  const { authUser, isAuthUserLoading } = useAuthUser();
  const { t } = useTranslation("school");
  const { t: tCommon } = useTranslation("common");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const hasHydratedInitialValues = useRef(false);
  const event = SUMMER_CAMP_FORM_DEFINITION.event;

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: QueryKey.profile(authUser?.uid ?? "school-registration"),
    queryFn: () => Profile.get(authUser!.uid),
    enabled: !!authUser?.uid,
  });

  const submitMutation = useMutation({
    mutationKey: ["school", event.slug, "registration"],
    mutationFn: async (value: SummerCampRegistrationFormInput) => {
      const token = await Auth.user?.getIdToken();
      const response = await fetch(`/api/school/events/${event.slug}/registrations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(value),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to submit registration");
      }
    },
    onSuccess: () => {
      clearRegistrationDraft();
      setIsSubmitted(true);
      toast.success(t("school.registration.toast.success"));
    },
    onError: (error) => {
      console.error(error);
      toast.error(t("school.registration.toast.error"));
    },
  });

  const form = useForm({
    defaultValues: createDefaultRegistrationFormValues(),
    validators: {
      onBlur: SummerCampRegistrationFormSchema,
      onSubmit: SummerCampRegistrationFormSchema,
    },
    onSubmit: async ({ value }) => {
      if (!authUser) {
        writeRegistrationDraft(value);
        router.push(buildSignUpHref(value.parent.email));
        return;
      }

      submitMutation.mutate(value);
    },
  });

  useEffect(() => {
    if (hasHydratedInitialValues.current || isAuthUserLoading) return;
    if (authUser && isProfileLoading) return;

    const defaults = createDefaultRegistrationFormValues({
      parentEmail: authUser?.email ?? "",
      isEbVolunteer: profile?.isEbVolunteer ?? null,
    });
    const draft = readRegistrationDraft();
    form.reset(mergeRegistrationDraft(defaults, draft, authUser?.email, profile?.isEbVolunteer));
    hasHydratedInitialValues.current = true;
  }, [authUser, form, isAuthUserLoading, isProfileLoading, profile?.isEbVolunteer]);

  if (isAuthUserLoading || (authUser && isProfileLoading && !hasHydratedInitialValues.current)) {
    return <Loading />;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 font-serif">
      <Card className="overflow-hidden">
        <CardHeader className="gap-4">
          <div className="inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-primary">
            {t("school.registration.badge")}
          </div>
          <div className="space-y-3">
            <CardTitle className="text-3xl">{event.title}</CardTitle>
            <CardDescription className="max-w-3xl text-base">
              {t("school.registration.description")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-border px-5 py-5">
            <p className="text-sm text-muted-foreground">
              {t("school.registration.eventTitleLabel")}
            </p>
            <p className="mt-2 text-lg font-semibold">{event.title}</p>
          </div>
          <div className="rounded-3xl border border-border px-5 py-5">
            <p className="text-sm text-muted-foreground">
              {t("school.registration.scheduleLabel")}
            </p>
            <p className="mt-2 text-lg font-semibold">{EVENT_SCHEDULE_DISPLAY}</p>
          </div>
          <div className="rounded-3xl border border-border px-5 py-5">
            <p className="text-sm text-muted-foreground">
              {t("school.registration.locationLabel")}
            </p>
            <p className="mt-2 text-lg font-semibold">{EVENT_LOCATION_ADDRESS}</p>
          </div>
        </CardContent>
      </Card>

      {!authUser ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("school.registration.guestTitle")}</CardTitle>
            <CardDescription>{t("school.registration.guestDescription")}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {isSubmitted ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2Icon className="h-6 w-6 text-primary" />
              <CardTitle>{t("school.registration.successTitle")}</CardTitle>
            </div>
            <CardDescription>{t("school.registration.successDescription")}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/school">{t("school.registration.backToSchool")}</Link>
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          {profile?.savedChildren?.length ? (
            <form.Subscribe
              selector={(state) => state.values.children}
              children={(children) => {
                const selectedSavedChildIds = new Set(
                  children.map((child) => child.savedChildId).filter(Boolean)
                );

                return (
                  <Card>
                    <CardHeader>
                      <CardTitle>{t("school.registration.savedChildrenTitle")}</CardTitle>
                      <CardDescription>
                        {t("school.registration.savedChildrenDescription")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      {(profile.savedChildren ?? []).map((child) => {
                        const alreadyAdded = selectedSavedChildIds.has(child.id);

                        return (
                          <div
                            key={child.id}
                            className="rounded-3xl border border-border px-5 py-5"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <p className="text-lg font-semibold">
                                  {getChildDisplayName(child)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {child.grade} · {child.birthday}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant={alreadyAdded ? "secondary" : "default"}
                                disabled={alreadyAdded}
                                onClick={() => {
                                  const importedChild = {
                                    savedChildId: child.id,
                                    firstName: child.firstName,
                                    lastName: child.lastName,
                                    grade: child.grade,
                                    birthday: child.birthday,
                                    allergies: child.allergies,
                                  };

                                  if (
                                    children.length === 1 &&
                                    isRegistrationChildEmpty(children[0])
                                  ) {
                                    form.setFieldValue("children", [importedChild]);
                                    return;
                                  }

                                  form.pushFieldValue("children", importedChild);
                                }}
                              >
                                <UserPlusIcon className="mr-2 h-4 w-4" />
                                {alreadyAdded
                                  ? t("school.registration.savedChildAdded")
                                  : t("school.registration.importSavedChild")}
                              </Button>
                            </div>
                            {child.allergies ? (
                              <p className="mt-4 text-sm text-muted-foreground">
                                {child.allergies}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              }}
            />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("school.registration.formTitle")}</CardTitle>
              <CardDescription>{t("school.registration.formDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-8">
                <form.Subscribe
                  selector={(state) => state.values.children}
                  children={(children) => (
                    <section className="flex flex-col gap-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-semibold">
                            {t("school.registration.childrenTitle")}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {t("school.registration.childrenDescription")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          className="w-auto px-4"
                          onClick={() => {
                            form.pushFieldValue("children", createEmptyRegistrationChild());
                          }}
                        >
                          <PlusIcon className="mr-2 h-4 w-4" />
                          {t("school.registration.addChild")}
                        </Button>
                      </div>

                      <div className="flex flex-col gap-5">
                        {children.map((child, index) => (
                          <div
                            key={`${child.savedChildId ?? "child"}-${index}`}
                            className="rounded-3xl border border-border px-5 py-5"
                          >
                            <div className="mb-4 flex items-center justify-between gap-4">
                              <h3 className="text-lg font-semibold">
                                {t("school.registration.childCardTitle", { index: index + 1 })}
                              </h3>
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-auto px-3 text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (children.length === 1) {
                                    form.setFieldValue("children", [
                                      createEmptyRegistrationChild(),
                                    ]);
                                    return;
                                  }

                                  void form.removeFieldValue("children", index);
                                }}
                              >
                                <Trash2Icon className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                              <form.Field
                                name={`children[${index}].firstName`}
                                children={(field) => {
                                  const errorMessage = getFieldErrorMessage(
                                    field.state.meta.errorMap
                                  );
                                  return (
                                    <div className="space-y-2">
                                      <Label htmlFor={`child-first-name-${index}`}>
                                        {t("school.registration.fields.firstName")}
                                      </Label>
                                      <Input
                                        id={`child-first-name-${index}`}
                                        value={field.state.value}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                        onBlur={field.handleBlur}
                                      />
                                      {errorMessage ? (
                                        <p className="text-sm text-red-500">{errorMessage}</p>
                                      ) : null}
                                    </div>
                                  );
                                }}
                              />

                              <form.Field
                                name={`children[${index}].lastName`}
                                children={(field) => {
                                  const errorMessage = getFieldErrorMessage(
                                    field.state.meta.errorMap
                                  );
                                  return (
                                    <div className="space-y-2">
                                      <Label htmlFor={`child-last-name-${index}`}>
                                        {t("school.registration.fields.lastName")}
                                      </Label>
                                      <Input
                                        id={`child-last-name-${index}`}
                                        value={field.state.value}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                        onBlur={field.handleBlur}
                                      />
                                      {errorMessage ? (
                                        <p className="text-sm text-red-500">{errorMessage}</p>
                                      ) : null}
                                    </div>
                                  );
                                }}
                              />

                              <form.Field
                                name={`children[${index}].grade`}
                                children={(field) => {
                                  const errorMessage = getFieldErrorMessage(
                                    field.state.meta.errorMap
                                  );
                                  return (
                                    <div className="space-y-2">
                                      <Label>{t("school.registration.fields.grade")}</Label>
                                      <Select
                                        value={field.state.value}
                                        onValueChange={(value) => {
                                          field.handleChange(value);
                                          field.handleBlur();
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue
                                            placeholder={t(
                                              "school.registration.placeholders.grade"
                                            )}
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {GRADE_OPTIONS.map((option) => (
                                            <SelectItem key={option.value} value={option.value}>
                                              {option.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {errorMessage ? (
                                        <p className="text-sm text-red-500">{errorMessage}</p>
                                      ) : null}
                                    </div>
                                  );
                                }}
                              />

                              <form.Field
                                name={`children[${index}].birthday`}
                                children={(field) => {
                                  const errorMessage = getFieldErrorMessage(
                                    field.state.meta.errorMap
                                  );
                                  return (
                                    <div className="space-y-2">
                                      <Label>{t("school.registration.fields.birthday")}</Label>
                                      <DatePickerDialogField
                                        value={field.state.value}
                                        onChange={(value) => {
                                          field.handleChange(value);
                                          field.handleBlur();
                                        }}
                                        label={t("school.registration.placeholders.birthday")}
                                        closeLabel={t("school.registration.closeCalendar")}
                                      />
                                      {errorMessage ? (
                                        <p className="text-sm text-red-500">{errorMessage}</p>
                                      ) : null}
                                    </div>
                                  );
                                }}
                              />
                            </div>

                            <div className="mt-5">
                              <form.Field
                                name={`children[${index}].allergies`}
                                children={(field) => {
                                  const errorMessage = getFieldErrorMessage(
                                    field.state.meta.errorMap
                                  );
                                  return (
                                    <div className="space-y-2">
                                      <Label htmlFor={`child-allergies-${index}`}>
                                        {t("school.registration.fields.allergies")}
                                      </Label>
                                      <Textarea
                                        id={`child-allergies-${index}`}
                                        value={field.state.value}
                                        onChange={(event) => field.handleChange(event.target.value)}
                                        onBlur={field.handleBlur}
                                      />
                                      {errorMessage ? (
                                        <p className="text-sm text-red-500">{errorMessage}</p>
                                      ) : null}
                                    </div>
                                  );
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                />

                <Separator />

                <section className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {t("school.registration.parentTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("school.registration.parentDescription")}
                    </p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <form.Field
                      name="parent.firstName"
                      children={(field) => {
                        const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                        return (
                          <div className="space-y-2">
                            <Label htmlFor="parent-first-name">
                              {t("school.registration.fields.firstName")}
                            </Label>
                            <Input
                              id="parent-first-name"
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                              onBlur={field.handleBlur}
                            />
                            {errorMessage ? (
                              <p className="text-sm text-red-500">{errorMessage}</p>
                            ) : null}
                          </div>
                        );
                      }}
                    />

                    <form.Field
                      name="parent.lastName"
                      children={(field) => {
                        const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                        return (
                          <div className="space-y-2">
                            <Label htmlFor="parent-last-name">
                              {t("school.registration.fields.lastName")}
                            </Label>
                            <Input
                              id="parent-last-name"
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                              onBlur={field.handleBlur}
                            />
                            {errorMessage ? (
                              <p className="text-sm text-red-500">{errorMessage}</p>
                            ) : null}
                          </div>
                        );
                      }}
                    />
                  </div>
                </section>

                <Separator />

                <section className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {t("school.registration.addressTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("school.registration.addressDescription")}
                    </p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <form.Field
                      name="address.line1"
                      children={(field) => {
                        const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                        return (
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address-line-1">
                              {t("school.registration.fields.addressLine1")}
                            </Label>
                            <Input
                              id="address-line-1"
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                              onBlur={field.handleBlur}
                            />
                            {errorMessage ? (
                              <p className="text-sm text-red-500">{errorMessage}</p>
                            ) : null}
                          </div>
                        );
                      }}
                    />

                    <form.Field
                      name="address.line2"
                      children={(field) => (
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="address-line-2">
                            {t("school.registration.fields.addressLine2")}
                          </Label>
                          <Input
                            id="address-line-2"
                            value={field.state.value}
                            onChange={(event) => field.handleChange(event.target.value)}
                            onBlur={field.handleBlur}
                          />
                        </div>
                      )}
                    />

                    <form.Field
                      name="address.city"
                      children={(field) => {
                        const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                        return (
                          <div className="space-y-2">
                            <Label htmlFor="city">{t("school.registration.fields.city")}</Label>
                            <Input
                              id="city"
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                              onBlur={field.handleBlur}
                            />
                            {errorMessage ? (
                              <p className="text-sm text-red-500">{errorMessage}</p>
                            ) : null}
                          </div>
                        );
                      }}
                    />

                    <form.Field
                      name="address.state"
                      children={(field) => {
                        const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                        return (
                          <div className="space-y-2">
                            <Label>{t("school.registration.fields.state")}</Label>
                            <Select
                              value={field.state.value}
                              onValueChange={(value) => {
                                field.handleChange(value);
                                field.handleBlur();
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue
                                  placeholder={t("school.registration.placeholders.state")}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {US_STATE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errorMessage ? (
                              <p className="text-sm text-red-500">{errorMessage}</p>
                            ) : null}
                          </div>
                        );
                      }}
                    />

                    <form.Field
                      name="address.country"
                      children={(field) => (
                        <div className="space-y-2">
                          <Label htmlFor="country">{t("school.registration.fields.country")}</Label>
                          <Input id="country" value={field.state.value} disabled readOnly />
                        </div>
                      )}
                    />

                    <form.Field
                      name="address.zipCode"
                      children={(field) => {
                        const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                        return (
                          <div className="space-y-2">
                            <Label htmlFor="zip-code">
                              {t("school.registration.fields.zipCode")}
                            </Label>
                            <Input
                              id="zip-code"
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                              onBlur={field.handleBlur}
                            />
                            {errorMessage ? (
                              <p className="text-sm text-red-500">{errorMessage}</p>
                            ) : null}
                          </div>
                        );
                      }}
                    />
                  </div>
                </section>

                <Separator />

                <section className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {t("school.registration.parentContactTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("school.registration.parentContactDescription")}
                    </p>
                  </div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <form.Field
                      name="parent.email"
                      children={(field) => {
                        const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                        return (
                          <div className="space-y-2">
                            <Label htmlFor="parent-email">
                              {t("school.registration.fields.email")}
                            </Label>
                            <Input
                              id="parent-email"
                              type="email"
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                              onBlur={field.handleBlur}
                            />
                            {errorMessage ? (
                              <p className="text-sm text-red-500">{errorMessage}</p>
                            ) : null}
                          </div>
                        );
                      }}
                    />

                    <form.Field
                      name="parent.cellPhone"
                      children={(field) => {
                        const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                        return (
                          <div className="space-y-2">
                            <Label htmlFor="parent-cell-phone">
                              {t("school.registration.fields.cellPhone")}
                            </Label>
                            <Input
                              id="parent-cell-phone"
                              type="tel"
                              value={field.state.value}
                              onChange={(event) => field.handleChange(event.target.value)}
                              onBlur={field.handleBlur}
                            />
                            {errorMessage ? (
                              <p className="text-sm text-red-500">{errorMessage}</p>
                            ) : null}
                          </div>
                        );
                      }}
                    />
                  </div>

                  <form.Field
                    name="parent.isEbVolunteer"
                    children={(field) => (
                      <BooleanChoiceField
                        label={t("school.registration.fields.isEbVolunteer")}
                        value={field.state.value}
                        onChange={(value) => {
                          field.handleChange(value);
                          field.handleBlur();
                        }}
                        yesLabel={tCommon("yes")}
                        noLabel={tCommon("no")}
                      />
                    )}
                  />
                </section>

                <Separator />

                <form.Subscribe
                  selector={(state) => state.values.parent}
                  children={(parent) => (
                    <section className="flex flex-col gap-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="text-2xl font-semibold">
                            {t("school.registration.emergencyTitle")}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {t("school.registration.emergencyDescription")}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-auto"
                          onClick={() => {
                            form.setFieldValue("emergencyContact.firstName", parent.firstName);
                            form.setFieldValue("emergencyContact.lastName", parent.lastName);
                            form.setFieldValue("emergencyContact.phoneNumber", parent.cellPhone);
                          }}
                        >
                          {t("school.registration.copyParentToEmergency")}
                        </Button>
                      </div>
                      <div className="grid gap-5 md:grid-cols-2">
                        <form.Field
                          name="emergencyContact.firstName"
                          children={(field) => {
                            const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                            return (
                              <div className="space-y-2">
                                <Label htmlFor="emergency-first-name">
                                  {t("school.registration.fields.firstName")}
                                </Label>
                                <Input
                                  id="emergency-first-name"
                                  value={field.state.value}
                                  onChange={(event) => field.handleChange(event.target.value)}
                                  onBlur={field.handleBlur}
                                />
                                {errorMessage ? (
                                  <p className="text-sm text-red-500">{errorMessage}</p>
                                ) : null}
                              </div>
                            );
                          }}
                        />

                        <form.Field
                          name="emergencyContact.lastName"
                          children={(field) => {
                            const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                            return (
                              <div className="space-y-2">
                                <Label htmlFor="emergency-last-name">
                                  {t("school.registration.fields.lastName")}
                                </Label>
                                <Input
                                  id="emergency-last-name"
                                  value={field.state.value}
                                  onChange={(event) => field.handleChange(event.target.value)}
                                  onBlur={field.handleBlur}
                                />
                                {errorMessage ? (
                                  <p className="text-sm text-red-500">{errorMessage}</p>
                                ) : null}
                              </div>
                            );
                          }}
                        />

                        <form.Field
                          name="emergencyContact.phoneNumber"
                          children={(field) => {
                            const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                            return (
                              <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="emergency-phone-number">
                                  {t("school.registration.fields.emergencyPhone")}
                                </Label>
                                <Input
                                  id="emergency-phone-number"
                                  type="tel"
                                  value={field.state.value}
                                  onChange={(event) => field.handleChange(event.target.value)}
                                  onBlur={field.handleBlur}
                                />
                                {errorMessage ? (
                                  <p className="text-sm text-red-500">{errorMessage}</p>
                                ) : null}
                              </div>
                            );
                          }}
                        />
                      </div>
                    </section>
                  )}
                />

                <Separator />

                <section className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {t("school.registration.consentTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("school.registration.consentDescription")}
                    </p>
                  </div>

                  <form.Field
                    name="consents.liabilityMedicalRelease"
                    children={(field) => {
                      const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                      return (
                        <div className="space-y-3">
                          <BooleanChoiceField
                            label={t("school.registration.fields.liabilityMedicalRelease")}
                            value={field.state.value}
                            onChange={(value) => {
                              field.handleChange(value);
                              field.handleBlur();
                            }}
                            yesLabel={tCommon("yes")}
                            noLabel={tCommon("no")}
                          />
                          {errorMessage ? (
                            <p className="text-sm text-red-500">{errorMessage}</p>
                          ) : null}
                        </div>
                      );
                    }}
                  />

                  <form.Field
                    name="consents.imageRelease"
                    children={(field) => {
                      const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                      return (
                        <div className="space-y-3">
                          <BooleanChoiceField
                            label={t("school.registration.fields.imageRelease")}
                            value={field.state.value}
                            onChange={(value) => {
                              field.handleChange(value);
                              field.handleBlur();
                            }}
                            yesLabel={tCommon("yes")}
                            noLabel={tCommon("no")}
                          />
                          {errorMessage ? (
                            <p className="text-sm text-red-500">{errorMessage}</p>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                </section>

                <Separator />

                <section className="flex flex-col gap-5">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {t("school.registration.signatureTitle")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t("school.registration.signatureDescription")}
                    </p>
                  </div>
                  <form.Field
                    name="signatureFullName"
                    children={(field) => {
                      const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                      return (
                        <div className="space-y-2">
                          <Label htmlFor="signature-full-name">
                            {t("school.registration.fields.signatureFullName")}
                          </Label>
                          <Input
                            id="signature-full-name"
                            value={field.state.value}
                            onChange={(event) => field.handleChange(event.target.value)}
                            onBlur={field.handleBlur}
                          />
                          {errorMessage ? (
                            <p className="text-sm text-red-500">{errorMessage}</p>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                </section>

                <Separator />

                <section className="flex flex-col gap-4">
                  <form.Field
                    name="syncFamilyProfile"
                    children={(field) => (
                      <div className="flex items-start gap-3 rounded-3xl border border-border px-5 py-4">
                        <Checkbox
                          id="sync-family-profile"
                          checked={field.state.value}
                          onCheckedChange={(checked) => {
                            field.handleChange(checked === true);
                            field.handleBlur();
                          }}
                        />
                        <div className="space-y-1">
                          <Label htmlFor="sync-family-profile">
                            {t("school.registration.syncFamilyProfileLabel")}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {t("school.registration.syncFamilyProfileDescription")}
                          </p>
                        </div>
                      </div>
                    )}
                  />
                </section>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {authUser
                  ? t("school.registration.submitDescriptionAuthed")
                  : t("school.registration.submitDescriptionGuest")}
              </p>
              <form.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting] as const}
                children={([canSubmit, isSubmitting]) => (
                  <Button
                    type="button"
                    disabled={!canSubmit || isSubmitting || submitMutation.isPending}
                    onClick={() => {
                      void form.handleSubmit();
                    }}
                  >
                    {submitMutation.isPending ? <Loading /> : t("school.registration.submit")}
                  </Button>
                )}
              />
            </CardFooter>
          </Card>
        </>
      )}
    </div>
  );
}
