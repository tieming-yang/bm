"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useTranslation from "@/hooks/use-translation";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createUnloadApproval, decideUnsavedLeave, usesARDocumentBoundary, type UnsavedState } from "@/lib/ui/ar-authoring";

type UnsavedNavigation = {
  register: (key: symbol, state: UnsavedState) => () => void;
  requestDiscard: (action: () => void) => void;
  navigate: (href: string, replace?: boolean) => void;
  leaveAfterSave: (href: string) => void;
  back: () => void;
};

const UnsavedNavigationContext = createContext<UnsavedNavigation | null>(null);

export function UnsavedChangesProvider({ children }: React.PropsWithChildren) {
  const { t } = useTranslation("dashboard");
  const guards = useRef(new Map<symbol, UnsavedState>());
  const approval = useRef(createUnloadApproval());
  const pendingAction = useRef<(() => void) | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [revision, setRevision] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const register = useCallback((key: symbol, state: UnsavedState) => {
    guards.current.set(key, state);
    setRevision((value) => value + 1);
    return () => {
      guards.current.delete(key);
      setRevision((value) => value + 1);
    };
  }, []);

  const requestDiscard = useCallback((action: () => void) => {
    approval.current.reset();
    const decision = decideUnsavedLeave(guards.current.values());
    if (decision === "busy") {
      toast.info(t("ar.operationPending"));
    } else if (decision === "confirm") {
      pendingAction.current = action;
      setConfirmOpen(true);
    } else {
      action();
    }
  }, [t]);

  const commitNavigation = useCallback((action: () => void) => {
    approval.current.approve();
    if (resetTimer.current) clearTimeout(resetTimer.current);
    // A blocked or no-op browser navigation must not approve a later reload.
    resetTimer.current = setTimeout(() => approval.current.reset(), 1000);
    try {
      action();
    } catch (error) {
      approval.current.reset();
      throw error;
    }
  }, []);

  const navigate = useCallback((href: string, replace = false) => {
    requestDiscard(() => commitNavigation(() => {
      if (replace) window.location.replace(href);
      else window.location.assign(href);
    }));
  }, [requestDiscard, commitNavigation]);

  const leaveAfterSave = useCallback((href: string) => {
    commitNavigation(() => window.location.assign(href));
  }, [commitNavigation]);

  const back = useCallback(() => {
    requestDiscard(() => commitNavigation(() => {
      if (window.history.length > 1) window.history.back();
      else window.location.assign("/dashboard");
    }));
  }, [requestDiscard, commitNavigation]);

  useEffect(() => {
    const reset = () => approval.current.reset();
    window.addEventListener("pageshow", reset);
    window.addEventListener("popstate", reset);
    window.addEventListener("hashchange", reset);
    return () => {
      window.removeEventListener("pageshow", reset);
      window.removeEventListener("popstate", reset);
      window.removeEventListener("hashchange", reset);
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  useEffect(() => {
    if (decideUnsavedLeave(guards.current.values()) === "leave") return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (approval.current.consume() || decideUnsavedLeave(guards.current.values()) === "leave") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [revision]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (!usesARDocumentBoundary(new URL(window.location.href), destination)) return;
      event.preventDefault();
      event.stopPropagation();
      navigate(destination.href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [navigate]);

  const value = useMemo(() => ({ register, requestDiscard, navigate, leaveAfterSave, back }), [register, requestDiscard, navigate, leaveAfterSave, back]);

  return <UnsavedNavigationContext.Provider value={value}>
    {children}
    <ConfirmDialog open={confirmOpen} onOpenChange={(open) => {
      setConfirmOpen(open);
      if (!open) pendingAction.current = null;
    }} title={t("ar.discardTitle")} description={t("ar.discardDescription")} confirmLabel={t("ar.discard")} cancelLabel={t("ar.keepEditing")} destructive onConfirm={() => {
      const action = pendingAction.current;
      pendingAction.current = null;
      setConfirmOpen(false);
      if (action && decideUnsavedLeave(guards.current.values()) !== "busy") action();
    }} />
  </UnsavedNavigationContext.Provider>;
}

export function useUnsavedNavigation() {
  const navigation = useContext(UnsavedNavigationContext);
  if (!navigation) throw new Error("Unsaved navigation requires UnsavedChangesProvider");
  return navigation;
}

export function useUnsavedChanges(state: UnsavedState) {
  const { register } = useUnsavedNavigation();
  const key = useRef(Symbol("unsaved-form"));
  useEffect(() => register(key.current, state), [register, state.dirty, state.busy]);
}
