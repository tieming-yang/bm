const validationMessages: Record<string, string> = {
  "This field is required.": "validation.required",
  "Enter a valid email address.": "validation.email",
  "Enter a valid phone number.": "validation.phone",
  "Enter a valid ZIP code.": "validation.zip",
  "Use the YYYY-MM-DD format.": "validation.dateFormat",
  "Select a valid date.": "validation.date",
  "Please choose an option.": "validation.choice",
  "Add at least one child.": "validation.children",
};

/** Select the first field error and return its UI translation key without changing validation. */
export function getValidationMessageKey(errorMap: Record<string, unknown>): string | null {
  for (const candidate of [errorMap.onBlur, errorMap.onSubmit, errorMap.onChange]) {
    const error = Array.isArray(candidate) ? candidate[0] : candidate;
    if (!error) continue;
    const message = typeof error === "string" ? error
      : typeof error === "object" && "message" in error && typeof error.message === "string"
        ? error.message : null;
    if (message && Object.hasOwn(validationMessages, message)) return validationMessages[message];
    if (typeof error === "object" && "code" in error) {
      if (error.code === "invalid_enum_value" || error.code === "invalid_literal") return "validation.choice";
      if (error.code === "invalid_type" && "received" in error && error.received === "undefined") return "validation.required";
    }
    return "validation.invalid";
  }
  return null;
}
