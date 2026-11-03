/** Build stable lesson URL slugs without changing the original lesson title. */
export function toSlug(raw: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFKD") // split accents from letters
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ") // common readability tweak
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumerics -> hyphen
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
}
