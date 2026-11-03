export type BreadcrumbEntry = { href: string; segment: string; current: boolean; linkable: boolean };

/** Match complete route segments so sibling routes cannot highlight each other. */
export function isRouteActive(pathname: string, href: string) {
  if (!href.startsWith("/")) return false;
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

/** Keep full paths independent of labels and omit IDs and nonexistent intermediate pages. */
export function breadcrumbEntries(pathname: string): BreadcrumbEntry[] {
  const segments = pathname.split("/").filter(Boolean);
  const paths = segments.map((segment, index) => ({ segment, href: `/${segments.slice(0, index + 1).join("/")}` }));
  const omitted = new Set(["/school/summer", "/school/summer/2026"]);
  const visible = paths.filter((entry, index) => {
    if (omitted.has(entry.href)) return false;
    if (segments[0] === "profile" && index > 0) return false;
    if (segments[0] === "beyond-music" && index > 0) return index === segments.length - 1;
    return true;
  });
  return visible.map((entry, index) => ({ ...entry, current: index === visible.length - 1, linkable: entry.href !== "/profile" }));
}
