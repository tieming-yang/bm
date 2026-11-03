"use client";

import { useRef } from "react";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";
import { ActionSpinner } from "@/app/loading";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  pending?: boolean;
  destructive?: boolean;
};

/** Shared confirmation UI; callers retain ownership of the action and its outcomes. */
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, cancelLabel, onConfirm, onCancel, pending = false, destructive = false }: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (pending) return;
      if (!nextOpen) onCancel?.();
      onOpenChange(nextOpen);
    }}>
      <DialogContent closeDisabled={pending} onOpenAutoFocus={(event) => {
        if (destructive) {
          event.preventDefault();
          cancelRef.current?.focus();
        }
      }} onEscapeKeyDown={(event) => { if (pending) event.preventDefault(); }} onPointerDownOutside={(event) => { if (pending) event.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button ref={cancelRef} type="button" variant="outline" disabled={pending}>{cancelLabel}</Button>
          </DialogClose>
          <Button type="button" variant={destructive ? "destructive" : "default"} disabled={pending} aria-busy={pending} onClick={() => { void onConfirm(); }}>
            {pending && <ActionSpinner />}{confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
