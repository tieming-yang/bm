"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { UploadIcon } from "lucide-react";
import { ActionSpinner } from "@/app/loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useTranslation from "@/hooks/use-translation";
import Auth from "@/models/auth";
import type { CollectionUploadPersistence, ModelUploadPersistence } from "@/app/api/admin/ar/upload/schema";

const UploadResponseSchema = z.object({ path: z.string().min(1), persisted: z.boolean() });

export type ARUploadChange = { kind: "upload"; path: string; persisted: boolean; attempt: string } | { kind: "clear"; path: "" };

export function ARAuthoringUpload({ accept, type, label, value, onChange, onUploadStart, onUploadEnd, disabled, folder, onBeforeUpload, uploadPersistence, uploadKey, id, error }: {
  id?: string;
  error?: string;
  accept: string;
  type: "model" | "audio" | "video" | "target";
  label: string;
  value: string;
  onChange: (change: ARUploadChange) => void;
  onUploadStart: () => boolean;
  onUploadEnd: () => void;
  disabled?: boolean;
  folder: string;
  onBeforeUpload?: () => boolean;
  uploadPersistence?: CollectionUploadPersistence | ModelUploadPersistence;
  uploadKey: string;
}) {
  const { t } = useTranslation("dashboard");
  const [uploading, setUploading] = useState(false);
  const [failure, setFailure] = useState<"size" | "request" | null>(null);
  const limit = type === "model" || type === "video" ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
  const failureMessage = failure === "size" ? t("upload.tooLarge", { limit: limit / (1024 * 1024) }) : failure === "request" ? t("upload.failed") : undefined;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attempt = useRef(0);
  const currentKey = useRef(uploadKey);
  const mounted = useRef(true);
  const loadingToast = useRef<string | number | undefined>(undefined);
  currentKey.current = uploadKey;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      attempt.current += 1;
      if (loadingToast.current !== undefined) toast.dismiss(loadingToast.current);
    };
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || disabled || uploading) return;
    if (onBeforeUpload && !onBeforeUpload()) { event.target.value = ""; return; }
    if (!folder.trim()) {
      toast.error(type === "target" ? t("upload.projectRequired") : t("upload.nameRequired"));
      event.target.value = "";
      return;
    }
    if (file.size > limit) {
      setFailure("size");
      toast.error(t("upload.tooLarge", { limit: limit / (1024 * 1024) }));
      event.target.value = "";
      return;
    }
    if (!onUploadStart()) { event.target.value = ""; return; }
    const requestAttempt = ++attempt.current;
    const requestKey = uploadKey;
    const isCurrent = () => mounted.current && attempt.current === requestAttempt && currentKey.current === requestKey;
    setUploading(true);
    setFailure(null);
    const toastId = toast.loading(t("upload.uploading", { name: file.name }));
    loadingToast.current = toastId;
    try {
      const token = await Auth.user?.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("folder", folder);
      if (uploadPersistence) {
        formData.append("field", uploadPersistence.field);
        if ("collectionId" in uploadPersistence) formData.append("collectionId", uploadPersistence.collectionId);
        if ("modelId" in uploadPersistence) formData.append("modelId", uploadPersistence.modelId);
      }
      const response = await fetch("/api/admin/ar/upload", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (!response.ok) throw new Error(`AR upload failed with HTTP ${response.status}`);
      const data = UploadResponseSchema.parse(await response.json());
      if (Boolean(uploadPersistence) !== data.persisted) throw new Error("AR upload persistence response does not match request target");
      if (isCurrent()) {
        onChange({ kind: "upload", ...data, attempt: `${requestKey}:${requestAttempt}` });
        toast.success(t("upload.success", { name: file.name }), { id: toastId });
      }
    } catch (error) {
      console.error("AR file upload failed", error);
      if (isCurrent()) {
        setFailure("request");
        toast.error(t("upload.failed"), { id: toastId });
      }
    } finally {
      if (!isCurrent()) toast.dismiss(toastId);
      loadingToast.current = undefined;
      if (mounted.current && attempt.current === requestAttempt) setUploading(false);
      onUploadEnd();
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return <div className="flex flex-col gap-1.5">
    <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
      <Input type="file" accept={accept} onChange={handleFileChange} disabled={disabled || uploading} ref={fileInputRef} className="hidden" aria-label={label} />
      <Button id={id} type="button" variant="outline" size="sm" aria-invalid={Boolean(error || failureMessage)} aria-describedby={error && id ? `${id}-error` : failureMessage ? `${uploadKey}-error` : undefined} disabled={disabled || uploading} aria-busy={uploading} onClick={() => {
        if (!onBeforeUpload || onBeforeUpload()) fileInputRef.current?.click();
      }} className="w-fit shrink-0 flex items-center gap-2 h-11">
        {uploading ? <ActionSpinner /> : <UploadIcon className="w-4 h-4" />}{label}
      </Button>
      {value ? <span className="text-xs text-muted-foreground truncate max-w-full min-w-0 flex-1" title={value}>{t("upload.file", { name: value.substring(value.lastIndexOf("/") + 1) })}</span> : <span className="text-xs text-muted-foreground/60 italic">{t("upload.empty")}</span>}
      {value && <Button type="button" variant="ghost" size="sm" disabled={disabled || uploading} onClick={() => {
        attempt.current += 1;
        setFailure(null);
        onChange({ kind: "clear", path: "" });
      }} className="w-fit shrink-0 h-11 px-2 text-error hover:text-error hover:bg-destructive/5">{t("upload.clear")}</Button>}
    </div>
    {error && <p id={id ? `${id}-error` : undefined} role="alert" className="text-sm text-error">{error}</p>}
    {failureMessage && <p id={`${uploadKey}-error`} role="alert" className="text-sm text-error">{failureMessage}</p>}
  </div>;
}
