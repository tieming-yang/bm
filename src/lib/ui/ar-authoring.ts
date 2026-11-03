/** AR authoring uses document boundaries so browser traversal can warn before discarding edits. */
export function isARAuthoringPath(pathname: string) {
  return pathname === "/dashboard/ar" || pathname.startsWith("/dashboard/ar/");
}

export type UnsavedState = { dirty: boolean; busy: boolean };

/** Pending writes take precedence over a request to discard local edits. */
export function decideUnsavedLeave(states: Iterable<UnsavedState>): "busy" | "confirm" | "leave" {
  let dirty = false;
  for (const state of states) {
    if (state.busy) return "busy";
    dirty ||= state.dirty;
  }
  return dirty ? "confirm" : "leave";
}

/** Hash navigation keeps the form mounted; all other AR crossings leave the document. */
export function usesARDocumentBoundary(current: URL, destination: URL) {
  if (!/^https?:$/.test(destination.protocol)) return false;
  if (current.origin === destination.origin && current.pathname === destination.pathname && current.search === destination.search) return false;
  return isARAuthoringPath(current.pathname) || (current.origin === destination.origin && isARAuthoringPath(destination.pathname));
}

/** An approval applies to one native unload event and never survives a restored document. */
export function createUnloadApproval() {
  let approved = false;
  return {
    approve() { approved = true; },
    reset() { approved = false; },
    consume() {
      const result = approved;
      approved = false;
      return result;
    },
  };
}
