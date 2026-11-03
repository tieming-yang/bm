"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { enUS, zhTW } from "react-day-picker/locale";
import { useForm } from "@tanstack/react-form-nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import Loading, { ActionSpinner } from "@/app/loading";
import { getValidationMessageKey as getFieldErrorMessage } from "@/lib/forms/validation-message";
import Auth from "@/models/auth";
import type ProfileModel from "@/models/profiles";
import { QueryKey } from "@/utils/query-keys";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import useTranslation from "@/hooks/use-translation";
import {
  FamilyProfileFormInput,
  FamilyProfileFormSchema,
  GRADE_OPTIONS,
  ProfileSavedChild,
  createEmptySavedChild,
} from "@/app/(works)/school/summer/2026/domain";

function getClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `child-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}


function createSavedChildFormValue(): ProfileSavedChild {
  return {
    ...createEmptySavedChild(),
    id: getClientId(),
  };
}

function DatePickerDialogField({
  value,
  onChange,
  label,
  id,
  invalid,
  errorId,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  id?: string;
  invalid?: boolean;
  errorId?: string;
}) {
  const { t, i18n } = useTranslation("settings");
  const locale = i18n.resolvedLanguage === "zh-TW" ? zhTW : enUS;
  const [open, setOpen] = useState(false);
  const selectedDate = value ? parseISO(value) : undefined;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id={id} type="button" variant="outline" className="w-full justify-between" aria-invalid={invalid} aria-describedby={errorId}>
          <span>{value ? format(parseISO(value), "PPP", { locale }) : label}</span>
          <CalendarIcon className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent className="w-fit">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          defaultMonth={selectedDate}
          locale={locale}
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t("family.close")}
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
  invalid,
  errorId,
}: {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
  yesLabel: string;
  noLabel: string;
  invalid?: boolean;
  errorId?: string;
}) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <RadioGroup
        aria-label={label}
        aria-invalid={invalid}
        aria-describedby={errorId}
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
        <Label className="flex items-center px-4 py-3 border gap-3 rounded-3xl border-input">
          <RadioGroupItem value="yes" />
          <span>{yesLabel}</span>
        </Label>
        <Label className="flex items-center px-4 py-3 border gap-3 rounded-3xl border-input">
          <RadioGroupItem value="no" />
          <span>{noLabel}</span>
        </Label>
      </RadioGroup>
    </div>
  );
}

export default function FamilySettingsCard({
  profile,
  userId,
}: {
  profile: ProfileModel;
  userId: string;
}) {
  const { t } = useTranslation("settings");
  const { t: tUI } = useTranslation("ui");
  const query = useQueryClient();
  const initialValues: FamilyProfileFormInput = {
    isEbVolunteer: profile.isEbVolunteer ?? null,
    savedChildren: profile.savedChildren ?? [],
  };

  const saveMutation = useMutation({
    mutationKey: ["profile", "family", userId],
    mutationFn: async (value: FamilyProfileFormInput) => {
      const token = await Auth.user?.getIdToken();
      const response = await fetch(`/api/profiles/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          section: "family",
          ...value,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to update family settings");
      }
    },
    onSuccess: () => {
      toast.success(t("family.toast.success"));
      query.invalidateQueries({ queryKey: QueryKey.profile(userId) });
    },
    onError: (error) => {
      toast.error(t("family.toast.error"));
      console.error(error);
    },
  });

  const form = useForm({
    defaultValues: initialValues,
    validators: {
      onBlur: FamilyProfileFormSchema,
      onSubmit: FamilyProfileFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await saveMutation.mutateAsync(value);
      } catch {
        // Keep the form values; the mutation displays its localized failure.
      }
    },
  });

  useEffect(() => {
    form.reset({
      isEbVolunteer: profile.isEbVolunteer ?? null,
      savedChildren: profile.savedChildren ?? [],
    });
  }, [form, profile.isEbVolunteer, profile.savedChildren]);

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{t("family.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <form.Field
          name="isEbVolunteer"
          children={(field) => (
            <BooleanChoiceField
              invalid={!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0)}
              errorId={!field.state.meta.isValid && (field.state.meta.isBlurred || form.state.submissionAttempts > 0) ? `${field.name}-error` : undefined}
              label={t("family.volunteerLabel")}
              value={field.state.value}
              onChange={(value) => {
                field.handleChange(value);
                field.handleBlur();
              }}
              yesLabel={t("family.yes")}
              noLabel={t("family.no")}
            />
          )}
        />

        <form.Subscribe
          selector={(state) => state.values.savedChildren}
          children={(savedChildren) => (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold">{t("family.childrenTitle")}</h3>
                  <p className="text-sm text-muted-foreground">{t("family.childrenDescription")}</p>
                </div>
                <Button
                  type="button"
                  className="w-auto px-4"
                  onClick={() => {
                    form.pushFieldValue("savedChildren", createSavedChildFormValue());
                  }}
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  {t("family.addChild")}
                </Button>
              </div>

              {savedChildren.length === 0 ? (
                <div className="px-5 py-6 text-sm border border-dashed rounded-3xl border-input text-muted-foreground">
                  {t("family.empty")}
                </div>
              ) : (
                <div className="space-y-5">
                  {savedChildren.map((child, index) => (
                    <div key={child.id} className="px-5 py-5 border rounded-3xl border-border">
                      <div className="flex items-center justify-between mb-4 gap-4">
                        <h4 className="text-lg font-semibold">
                          {t("family.childCardTitle", { index: index + 1 })}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-auto px-3 text-error hover:text-error"
                          aria-label={t("family.removeChild", { index: index + 1 })}
                          onClick={() => {
                            void form.removeFieldValue("savedChildren", index);
                          }}
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <form.Field
                          name={`savedChildren[${index}].firstName`}
                          children={(field) => {
                            const errorMessage = field.state.meta.isBlurred || form.state.submissionAttempts > 0
                              ? getFieldErrorMessage(field.state.meta.errorMap) : null;
                            return (
                              <div className="space-y-2">
                                <Label htmlFor={`saved-child-first-name-${index}`}>
                                  {t("family.firstName")}
                                </Label>
                                <Input
                                  aria-invalid={!!errorMessage}
                                  aria-describedby={errorMessage ? `${field.name}-error` : undefined}
                                  id={`saved-child-first-name-${index}`}
                                  value={field.state.value}
                                  onChange={(event) => {
                                    const hadError = !field.state.meta.isValid;
                                    field.handleChange(event.target.value);
                                    if (hadError) void field.validate("blur");
                                  }}
                                  onBlur={field.handleBlur}
                                />
                                {errorMessage ? <p id={`${field.name}-error`} className="text-sm text-error" role="alert">{tUI(errorMessage)}</p> : null}
                              </div>
                            );
                          }}
                        />

                        <form.Field
                          name={`savedChildren[${index}].lastName`}
                          children={(field) => {
                            const errorMessage = field.state.meta.isBlurred || form.state.submissionAttempts > 0
                              ? getFieldErrorMessage(field.state.meta.errorMap) : null;
                            return (
                              <div className="space-y-2">
                                <Label htmlFor={`saved-child-last-name-${index}`}>
                                  {t("family.lastName")}
                                </Label>
                                <Input
                                  aria-invalid={!!errorMessage}
                                  aria-describedby={errorMessage ? `${field.name}-error` : undefined}
                                  id={`saved-child-last-name-${index}`}
                                  value={field.state.value}
                                  onChange={(event) => {
                                    const hadError = !field.state.meta.isValid;
                                    field.handleChange(event.target.value);
                                    if (hadError) void field.validate("blur");
                                  }}
                                  onBlur={field.handleBlur}
                                />
                                {errorMessage ? <p id={`${field.name}-error`} className="text-sm text-error" role="alert">{tUI(errorMessage)}</p> : null}
                              </div>
                            );
                          }}
                        />

                        <form.Field
                          name={`savedChildren[${index}].grade`}
                          children={(field) => {
                            const errorMessage = field.state.meta.isBlurred || form.state.submissionAttempts > 0
                              ? getFieldErrorMessage(field.state.meta.errorMap) : null;
                            return (
                              <div className="space-y-2">
                                <Label htmlFor={field.name}>{t("family.grade")}</Label>
                                <Select
                                  value={field.state.value}
                                  onValueChange={(value) => {
                                    field.handleChange(value);
                                    field.handleBlur();
                                  }}
                                >
                                  <SelectTrigger id={field.name} aria-invalid={!!errorMessage} aria-describedby={errorMessage ? `${field.name}-error` : undefined}>
                                    <SelectValue placeholder={t("family.gradePlaceholder")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {GRADE_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {t("family.grades." + option.value)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {errorMessage ? <p id={`${field.name}-error`} className="text-sm text-error" role="alert">{tUI(errorMessage)}</p> : null}
                              </div>
                            );
                          }}
                        />

                        <form.Field
                          name={`savedChildren[${index}].birthday`}
                          children={(field) => {
                            const errorMessage = field.state.meta.isBlurred || form.state.submissionAttempts > 0
                              ? getFieldErrorMessage(field.state.meta.errorMap) : null;
                            return (
                              <div className="space-y-2">
                                <Label htmlFor={field.name}>{t("family.birthday")}</Label>
                                <DatePickerDialogField
                                  id={field.name}
                                  invalid={!!errorMessage}
                                  errorId={errorMessage ? `${field.name}-error` : undefined}
                                  value={field.state.value}
                                  onChange={(value) => {
                                    field.handleChange(value);
                                    field.handleBlur();
                                  }}
                                  label={t("family.birthdayPlaceholder")}
                                />
                                {errorMessage ? <p id={`${field.name}-error`} className="text-sm text-error" role="alert">{tUI(errorMessage)}</p> : null}
                              </div>
                            );
                          }}
                        />
                      </div>

                      <div className="mt-5">
                        <form.Field
                          name={`savedChildren[${index}].allergies`}
                          children={(field) => {
                            const errorMessage = field.state.meta.isBlurred || form.state.submissionAttempts > 0
                              ? getFieldErrorMessage(field.state.meta.errorMap) : null;
                            return (
                              <div className="space-y-2">
                                <Label htmlFor={`saved-child-allergies-${index}`}>
                                  {t("family.allergies")}
                                </Label>
                                <Textarea
                                  aria-invalid={!!errorMessage}
                                  aria-describedby={errorMessage ? `${field.name}-error` : undefined}
                                  id={`saved-child-allergies-${index}`}
                                  value={field.state.value}
                                  onChange={(event) => {
                                    const hadError = !field.state.meta.isValid;
                                    field.handleChange(event.target.value);
                                    if (hadError) void field.validate("blur");
                                  }}
                                  onBlur={field.handleBlur}
                                />
                                {errorMessage ? <p id={`${field.name}-error`} className="text-sm text-error" role="alert">{tUI(errorMessage)}</p> : null}
                              </div>
                            );
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        />
      </CardContent>
      <CardFooter className="justify-end">
        <form.Subscribe
          selector={(state) => state.isSubmitting}
          children={(isSubmitting) => (
            <Button
              type="button"
              className="w-full sm:w-auto gap-2"
              disabled={isSubmitting || saveMutation.isPending}
              aria-busy={isSubmitting || saveMutation.isPending}
              onClick={() => {
                void form.handleSubmit();
              }}
            >
              {(isSubmitting || saveMutation.isPending) && <ActionSpinner />}
              {t("family.save")}
            </Button>
          )}
        />
      </CardFooter>
    </Card>
  );
}
