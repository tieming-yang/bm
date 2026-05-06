"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { useForm } from "@tanstack/react-form-nextjs";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import Loading from "@/app/loading";
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
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = value ? parseISO(value) : undefined;

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
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) return;
            onChange(format(date, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Close
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

export default function FamilySettingsCard({
  profile,
  userId,
}: {
  profile: ProfileModel;
  userId: string;
}) {
  const { t } = useTranslation("settings");
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
      saveMutation.mutate(value);
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
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {t("family.addChild")}
                </Button>
              </div>

              {savedChildren.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-input px-5 py-6 text-sm text-muted-foreground">
                  {t("family.empty")}
                </div>
              ) : (
                <div className="space-y-5">
                  {savedChildren.map((child, index) => (
                    <div key={child.id} className="rounded-3xl border border-border px-5 py-5">
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <h4 className="text-lg font-semibold">
                          {t("family.childCardTitle", { index: index + 1 })}
                        </h4>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-auto px-3 text-destructive hover:text-destructive"
                          onClick={() => {
                            void form.removeFieldValue("savedChildren", index);
                          }}
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        <form.Field
                          name={`savedChildren[${index}].firstName`}
                          children={(field) => {
                            const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                            return (
                              <div className="space-y-2">
                                <Label htmlFor={`saved-child-first-name-${index}`}>
                                  {t("family.firstName")}
                                </Label>
                                <Input
                                  id={`saved-child-first-name-${index}`}
                                  value={field.state.value}
                                  onChange={(event) => field.handleChange(event.target.value)}
                                  onBlur={field.handleBlur}
                                />
                                {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
                              </div>
                            );
                          }}
                        />

                        <form.Field
                          name={`savedChildren[${index}].lastName`}
                          children={(field) => {
                            const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                            return (
                              <div className="space-y-2">
                                <Label htmlFor={`saved-child-last-name-${index}`}>
                                  {t("family.lastName")}
                                </Label>
                                <Input
                                  id={`saved-child-last-name-${index}`}
                                  value={field.state.value}
                                  onChange={(event) => field.handleChange(event.target.value)}
                                  onBlur={field.handleBlur}
                                />
                                {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
                              </div>
                            );
                          }}
                        />

                        <form.Field
                          name={`savedChildren[${index}].grade`}
                          children={(field) => {
                            const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                            return (
                              <div className="space-y-2">
                                <Label>{t("family.grade")}</Label>
                                <Select
                                  value={field.state.value}
                                  onValueChange={(value) => {
                                    field.handleChange(value);
                                    field.handleBlur();
                                  }}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={t("family.gradePlaceholder")} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {GRADE_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
                              </div>
                            );
                          }}
                        />

                        <form.Field
                          name={`savedChildren[${index}].birthday`}
                          children={(field) => {
                            const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                            return (
                              <div className="space-y-2">
                                <Label>{t("family.birthday")}</Label>
                                <DatePickerDialogField
                                  value={field.state.value}
                                  onChange={(value) => {
                                    field.handleChange(value);
                                    field.handleBlur();
                                  }}
                                  label={t("family.birthdayPlaceholder")}
                                />
                                {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
                              </div>
                            );
                          }}
                        />
                      </div>

                      <div className="mt-5">
                        <form.Field
                          name={`savedChildren[${index}].allergies`}
                          children={(field) => {
                            const errorMessage = getFieldErrorMessage(field.state.meta.errorMap);
                            return (
                              <div className="space-y-2">
                                <Label htmlFor={`saved-child-allergies-${index}`}>
                                  {t("family.allergies")}
                                </Label>
                                <Textarea
                                  id={`saved-child-allergies-${index}`}
                                  value={field.state.value}
                                  onChange={(event) => field.handleChange(event.target.value)}
                                  onBlur={field.handleBlur}
                                />
                                {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}
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
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <Button
              type="button"
              disabled={!canSubmit || saveMutation.isPending}
              onClick={() => {
                void form.handleSubmit();
              }}
            >
              {isSubmitting || saveMutation.isPending ? (
                <Loading isInlined />
              ) : (
                t("family.save")
              )}
            </Button>
          )}
        />
      </CardFooter>
    </Card>
  );
}
