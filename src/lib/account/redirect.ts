/** Keep account returns local, avoid auth loops, and retire the finished public camp route. */
export function getAuthReturnPath(value: string | null, fallback: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return fallback;
  const url = new URL(value, "https://account.invalid");
  if (url.origin !== "https://account.invalid" || /^\/(signin|signup)(\/|$)/.test(url.pathname)) return fallback;
  if (url.pathname === "/school/summer/2026/registration" || url.pathname.startsWith("/school/summer/2026/registration/")) return "/school";
  return `${url.pathname}${url.search}${url.hash}`;
}
