"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  PlusIcon,
  Trash2Icon,
  EditIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  UploadIcon,
  BoxIcon,
  FileCodeIcon,
  MusicIcon,
  VideoIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import Loading, { ActionSpinner } from "@/app/loading";
import DashboardError from "@/app/dashboard/dashboard-error";
import useTranslation from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import useAuthUser from "@/hooks/use-auth-user";
import Auth from "@/models/auth";
import { Policy } from "@/lib/policy";
import { AR, ARWrite, Model, ModelWrite } from "@/app/(works)/ar/data";
import type { ModelUploadPersistence } from "@/app/api/admin/ar/upload/schema";

function FileUploader({
  accept,
  type,
  label,
  value,
  onChange,
  onUploadStateChange,
  disabled,
  folder,
  onBeforeUpload,
  uploadPersistence,
  id,
  error,
}: {
  id?: string;
  error?: string;
  accept: string;
  type: "model" | "audio" | "video" | "target";
  label: string;
  value: string;
  onChange: (path: string) => void;
  onUploadStateChange?: (uploading: boolean) => void;
  disabled?: boolean;
  folder: string;
  onBeforeUpload?: () => boolean;
  uploadPersistence?: ModelUploadPersistence;
}) {
  const { t } = useTranslation("dashboard");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!folder || !folder.trim()) {
      toast.error(type === "target" ? t("upload.projectRequired") : t("upload.nameRequired"));
      return;
    }

    // Standard limits: 100MB for GLB/videos, 20MB for audio/targets
    const limit = type === "model" || type === "video" ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > limit) {
      toast.error(t("upload.tooLarge", { limit: limit / (1024 * 1024) }));
      return;
    }

    setUploading(true);
    onUploadStateChange?.(true);
    const toastId = toast.loading(t("upload.uploading", { name: file.name }));
    try {
      const token = await Auth.user?.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("folder", folder);
      if (uploadPersistence) {
        formData.append("modelId", uploadPersistence.modelId);
        formData.append("field", uploadPersistence.field);
      }

      const res = await fetch("/api/admin/ar/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        let errMsg = errText;
        try {
          const parsed = JSON.parse(errText);
          errMsg = parsed.error || errText;
        } catch {}
        throw new Error(errMsg || `HTTP ${res.status}`);
      }

      const data = await res.json();
      toast.success(t("upload.success", { name: file.name }), { id: toastId });
      onChange(data.path);
    } catch (err: any) {
      console.error("AR file upload failed", err);
      toast.error(t("upload.failed"), { id: toastId });
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleButtonClick = () => {
    if (onBeforeUpload && !onBeforeUpload()) {
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
        <Input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled || uploading}
          ref={fileInputRef}
          className="hidden"
          aria-label={label}
        />
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          aria-invalid={Boolean(error)}
          aria-describedby={error && id ? `${id}-error` : undefined}
          disabled={disabled || uploading}
          aria-busy={uploading}
          onClick={handleButtonClick}
          className="w-fit shrink-0 flex items-center gap-2 h-11"
        >
          {uploading ? (
            <ActionSpinner />
          ) : (
            <UploadIcon className="w-4 h-4" />
          )}
          {label}
        </Button>
        {value ? (
          <span className="text-xs text-muted-foreground truncate max-w-full min-w-0 flex-1" title={value}>
            {t("upload.file", { name: value.substring(value.lastIndexOf("/") + 1) })}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60 italic">{t("upload.empty")}</span>
        )}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => onChange("")}
            className="w-fit shrink-0 h-11 px-2 text-error hover:text-error hover:bg-destructive/5"
          >
            {t("upload.clear")}
          </Button>
        )}
      </div>
      {error && <p id={id ? `${id}-error` : undefined} role="alert" className="text-sm text-error">{error}</p>}
    </div>
  );
}

export default function ArDashboardPage() {
  const router = useRouter();
  const { t, currentLanguage } = useTranslation("dashboard");
  const { authUser, isAuthUserLoading } = useAuthUser();

  // Authentication & Authorization checks
  useEffect(() => {
    if (!isAuthUserLoading && !authUser) {
      router.replace("/signin?redirectTo=%2Fdashboard%2Far");
    }
  }, [authUser, isAuthUserLoading, router]);

  const { data: profileData, isLoading: isRoleLoading, error: roleError, refetch: refetchRole } = useQuery({
    queryKey: ["profile-role", authUser?.uid],
    queryFn: async () => {
      const token = await Auth.user?.getIdToken();
      const response = await fetch(`/api/profiles/${authUser?.uid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      return response.json() as Promise<{ role: string }>;
    },
    enabled: !!authUser,
    retry: false,
  });

  const isLoading = isAuthUserLoading || (authUser && isRoleLoading);
  const role = profileData?.role;
  const isAuthorized = Policy.canViewAR(role);

  useEffect(() => {
    if (!isLoading && authUser && !roleError && !isAuthorized) {
      router.replace("/not-found");
    }
  }, [authUser, isLoading, isAuthorized, roleError, router]);

  // Data fetching
  const {
    data: collections,
    refetch: refetchCollections,
    isLoading: isCollectionsLoading,
    error: collectionsError,
  } = useQuery({
    queryKey: ["admin-ar-collections"],
    queryFn: async () => {
      const token = await Auth.user?.getIdToken();
      const res = await fetch("/api/admin/ar/collections", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<AR[]>;
    },
    enabled: isAuthorized && !!authUser,
  });

  const {
    data: models,
    refetch: refetchModels,
    isLoading: isModelsLoading,
    error: modelsError,
  } = useQuery({
    queryKey: ["admin-ar-models"],
    queryFn: async () => {
      const token = await Auth.user?.getIdToken();
      const res = await fetch("/api/admin/ar/models", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<Model[]>;
    },
    enabled: isAuthorized && !!authUser,
  });

  // Dialog and Forms State
  const [activeUploads, setActiveUploads] = useState<number>(0);
  const isUploading = activeUploads > 0;

  // Model states
  const [isModelDialogOpen, setIsModelDialogOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "collection" | "model"; id: string; name: string } | null>(null);
  const [modelFormData, setModelFormData] = useState<ModelWrite>({
    contentType: "character",
    title: "",
    titleZh: "",
    modelPath: "",
  });

  const [modelFieldErrors, setModelFieldErrors] = useState<Partial<Record<"title" | "titleZh" | "modelPath", boolean>>>({});

  // Sync Form when Editing Model Changes
  useEffect(() => {
    setModelFieldErrors({});
    if (editingModel) {
      setModelFormData({
        contentType: editingModel.contentType,
        title: editingModel.title,
        titleZh: editingModel.titleZh || "",
        modelPath: editingModel.modelPath,
      });
    } else {
      setModelFormData({
        contentType: "character",
        title: "",
        titleZh: "",
        modelPath: "",
      });
    }
  }, [editingModel, isModelDialogOpen]);

  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await Auth.user?.getIdToken();
      const res = await fetch(`/api/admin/ar/collections/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      refetchCollections();
      setDeleteTarget(null);
      toast.success(t("ar.collectionDeleted"));
    },
    onError: (err: any) => {
      console.error("AR project deletion failed", err);
      toast.error(t("ar.collectionDeleteFailed"));
    },
  });

  const createModelMutation = useMutation({
    mutationFn: async (data: ModelWrite) => {
      const token = await Auth.user?.getIdToken();
      const res = await fetch("/api/admin/ar/models", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      refetchModels();
      setIsModelDialogOpen(false);
      toast.success(t("ar.modelCreated"));
    },
    onError: (err: any) => {
      console.error("AR model creation failed", err);
      toast.error(t("ar.modelCreateFailed"));
    },
  });

  const updateModelMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ModelWrite }) => {
      const token = await Auth.user?.getIdToken();
      const res = await fetch(`/api/admin/ar/models/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      refetchModels();
      setIsModelDialogOpen(false);
      toast.success(t("ar.modelUpdated"));
    },
    onError: (err: any) => {
      console.error("AR model update failed", err);
      toast.error(t("ar.modelUpdateFailed"));
    },
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = await Auth.user?.getIdToken();
      const res = await fetch(`/api/admin/ar/models/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      refetchModels();
      setDeleteTarget(null);
      toast.success(t("ar.modelDeleted"));
    },
    onError: (err: any) => {
      console.error("AR model deletion failed", err);
      toast.error(t("ar.modelDeleteFailed"));
    },
  });

  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading || createModelMutation.isPending || updateModelMutation.isPending) return;

    const form = e.currentTarget as HTMLFormElement;
    const isFormValid = form.checkValidity();
    const titleInvalid = !modelFormData.title.trim();
    const modelPathInvalid = !modelFormData.modelPath;
    setModelFieldErrors((previous) => ({ ...previous, title: titleInvalid, modelPath: modelPathInvalid }));
    if (!isFormValid || titleInvalid || modelPathInvalid) {
      const invalidField = form.querySelector<HTMLElement>(":invalid");
      if (invalidField) invalidField.focus();
      else document.getElementById(titleInvalid ? "mod-title" : "mod-file-upload")?.focus();
      return;
    }

    if (editingModel) {
      updateModelMutation.mutate({
        id: editingModel.id,
        data: modelFormData,
      });
    } else {
      createModelMutation.mutate(modelFormData);
    }
  };

  const handleDeleteCollection = (id: string, name: string) => {
    setDeleteTarget({ kind: "collection", id, name });
  };

  const handleDeleteModel = (id: string, name: string) => {
    setDeleteTarget({ kind: "model", id, name });
  };

  const isDeleting = deleteCollectionMutation.isPending || deleteModelMutation.isPending;

  const formatTimestamp = (ts: any) => {
    if (!ts) return "—";
    try {
      let date: Date;
      if (ts.seconds !== undefined) {
        date = new Date(ts.seconds * 1000);
      } else if (typeof ts.toDate === "function") {
        date = ts.toDate();
      } else {
        date = new Date(ts);
      }
      return date.toLocaleString(currentLanguage === "zh-TW" ? "zh-TW" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const handleUploadStateChange = (isUp: boolean) => {
    setActiveUploads((prev) => (isUp ? prev + 1 : Math.max(0, prev - 1)));
  };

  if (roleError) {
    return <DashboardError onRetry={() => void refetchRole()} />;
  }

  if (isLoading || !authUser || !isAuthorized) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col w-full px-4 py-10 mx-auto font-sans min-h-svh max-w-7xl gap-8 overflow-x-hidden">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" className="w-fit shrink-0 flex items-center gap-2 rounded-full"><Link href="/dashboard">
            <ArrowLeftIcon className="w-4 h-4" />
            {t("backDashboard")}
          </Link></Button>
      </div>

      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{t("ar.title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("ar.description")}
        </p>
      </div>

      <Tabs defaultValue="collections" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="collections" className="px-6">
            {t("ar.projects")}
          </TabsTrigger>
          <TabsTrigger value="models" className="px-6">
            {t("ar.models")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collections">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-4">
              <div>
                <CardTitle>{t("ar.collectionList")}</CardTitle>
                <CardDescription>{t("ar.collectionDescription")}</CardDescription>
              </div>
              <Button asChild className="w-fit shrink-0 flex items-center gap-2 rounded-full"><Link href="/dashboard/ar/edit">
                  <PlusIcon className="w-4 h-4" />
                  {t("ar.createCollection")}
                </Link></Button>
            </CardHeader>
            <CardContent>
              {isCollectionsLoading ? (
                <Loading />
              ) : collectionsError ? (
                <DashboardError onRetry={() => void refetchCollections()} />
              ) : !collections || collections.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
                  <FileCodeIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t("ar.emptyCollections")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ar.projectName")}</TableHead>
                      <TableHead>{t("ar.version")}</TableHead>
                      <TableHead>{t("ar.modelCount")}</TableHead>
                      <TableHead>{t("ar.targetsPath")}</TableHead>
                      <TableHead>{t("ar.updatedAt")}</TableHead>
                      <TableHead className="text-right">{t("ar.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((col) => (
                      <TableRow key={col.id}>
                        <TableCell className="font-medium">{col.title}</TableCell>
                        <TableCell>v{col.version}</TableCell>
                        <TableCell>{t("ar.itemCount", { count: col.items?.length ?? 0 })}</TableCell>
                        <TableCell
                          className="max-w-[200px] truncate text-xs"
                          title={col.targetsPath}
                        >
                          {col.targetsPath}
                        </TableCell>
                        <TableCell>{formatTimestamp(col.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 shrink-0 w-fit ml-auto">
                            <Button asChild
                                variant="outline"
                                size="sm"
                                className="w-fit shrink-0 flex items-center gap-1.5"
                              ><Link href={`/dashboard/ar/edit?id=${col.id}`}>
                                <EditIcon className="w-3.5 h-3.5" />
                                {t("edit")}
                              </Link></Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCollection(col.id, col.title)}
                              className="w-fit shrink-0 flex items-center gap-1.5 text-error hover:text-error hover:bg-destructive/5"
                            >
                              <Trash2Icon className="w-3.5 h-3.5" />
                              {t("delete")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-4">
              <div>
                <CardTitle>{t("ar.models")}</CardTitle>
                <CardDescription>{t("ar.modelDescription")}</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingModel(null);
                  setIsModelDialogOpen(true);
                }}
                className="w-fit shrink-0 flex items-center gap-2 rounded-full"
              >
                <PlusIcon className="w-4 h-4" />
                {t("ar.addModel")}
              </Button>
            </CardHeader>
            <CardContent>
              {isModelsLoading ? (
                <Loading />
              ) : modelsError ? (
                <DashboardError onRetry={() => void refetchModels()} />
              ) : !models || models.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
                  <BoxIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t("ar.emptyModels")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("ar.chineseName")}</TableHead>
                      <TableHead>{t("ar.englishName")}</TableHead>
                      <TableHead>{t("ar.type")}</TableHead>
                      <TableHead>{t("ar.modelPath")}</TableHead>
                      <TableHead>{t("ar.updatedAt")}</TableHead>
                      <TableHead className="text-right">{t("ar.actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((mod) => (
                      <TableRow key={mod.id}>
                        <TableCell className="font-medium">{mod.titleZh || "—"}</TableCell>
                        <TableCell>{mod.title}</TableCell>
                        <TableCell>
                          <span className="bg-muted px-2.5 py-0.5 rounded-full text-xs">
                            {mod.contentType === "character" ? t("ar.character") : mod.contentType}
                          </span>
                        </TableCell>
                        <TableCell
                          className="max-w-[250px] truncate text-xs"
                          title={mod.modelPath}
                        >
                          {mod.modelPath}
                        </TableCell>
                        <TableCell>{formatTimestamp(mod.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 shrink-0 w-fit ml-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingModel(mod);
                                setIsModelDialogOpen(true);
                              }}
                              className="w-fit shrink-0 flex items-center gap-1.5"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                              {t("edit")}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteModel(mod.id, mod.titleZh || mod.title)}
                              className="w-fit shrink-0 flex items-center gap-1.5 text-error hover:text-error hover:bg-destructive/5"
                            >
                              <Trash2Icon className="w-3.5 h-3.5" />
                              {t("delete")}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Model Form Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
        title={t(deleteTarget?.kind === "model" ? "ar.deleteModelTitle" : "ar.deleteCollectionTitle")}
        description={t(deleteTarget?.kind === "model" ? "ar.deleteModelDescription" : "ar.deleteCollectionDescription", { name: deleteTarget?.name ?? "" })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        pending={isDeleting}
        destructive
        onConfirm={() => {
          if (!deleteTarget || isDeleting) return;
          if (deleteTarget.kind === "collection") {
            deleteCollectionMutation.mutate(deleteTarget.id);
          } else {
            deleteModelMutation.mutate(deleteTarget.id);
          }
        }}
      />
      <Dialog open={isModelDialogOpen} onOpenChange={(open) => {
        if (!isUploading && !createModelMutation.isPending && !updateModelMutation.isPending) setIsModelDialogOpen(open);
      }}>
        <DialogContent className="max-w-6xl font-sans" closeDisabled={isUploading || createModelMutation.isPending || updateModelMutation.isPending} onEscapeKeyDown={(event) => {
          if (isUploading || createModelMutation.isPending || updateModelMutation.isPending) event.preventDefault();
        }} onPointerDownOutside={(event) => {
          if (isUploading || createModelMutation.isPending || updateModelMutation.isPending) event.preventDefault();
        }}>
          <DialogHeader>
            <DialogTitle>{editingModel ? t("ar.editModel") : t("ar.newModel")}</DialogTitle>
            <DialogDescription>
              {t("ar.modelFormDescription")}
            </DialogDescription>
          </DialogHeader>

          <form noValidate onSubmit={handleSaveModel} aria-busy={isUploading || createModelMutation.isPending || updateModelMutation.isPending} className="space-y-4 my-2">
            <div className="space-y-2">
              <Label htmlFor="mod-content-type">{t("ar.contentTypeRequired")}</Label>
              <Select value={modelFormData.contentType} disabled>
                <SelectTrigger id="mod-content-type" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="character">{t("ar.character")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mod-title">{t("ar.englishNameRequired")}</Label>
              <Input
                id="mod-title"
                aria-invalid={Boolean(modelFieldErrors.title)}
                aria-describedby={modelFieldErrors.title ? "mod-title-error" : undefined}
                onInvalid={(event) => {
                  event.preventDefault();
                  setModelFieldErrors((previous) => ({ ...previous, title: true }));
                }}
                onBlur={(event) => setModelFieldErrors((previous) => ({ ...previous, title: !event.target.value.trim() }))}
                placeholder={t("ar.namePlaceholder")}
                value={modelFormData.title}
                onChange={(event) => {
                  const title = event.target.value;
                  setModelFormData((previous) => ({ ...previous, title }));
                  if (modelFieldErrors.title) setModelFieldErrors((previous) => ({ ...previous, title: !title.trim() }));
                }}
                required
              />
              {modelFieldErrors.title && <p id="mod-title-error" role="alert" className="text-sm text-error">{t("ar.nameRequired")}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mod-title-zh">{t("ar.chineseNameRequired")}</Label>
              <Input
                id="mod-title-zh"
                aria-invalid={Boolean(modelFieldErrors.titleZh)}
                aria-describedby={modelFieldErrors.titleZh ? "mod-title-zh-error" : undefined}
                onInvalid={(event) => {
                  event.preventDefault();
                  setModelFieldErrors((previous) => ({ ...previous, titleZh: true }));
                }}
                onBlur={(event) => setModelFieldErrors((previous) => ({ ...previous, titleZh: !event.target.validity.valid }))}
                placeholder={t("ar.chineseNamePlaceholder")}
                value={modelFormData.titleZh}
                onChange={(event) => {
                  const titleZh = event.target.value;
                  setModelFormData((previous) => ({ ...previous, titleZh }));
                  if (modelFieldErrors.titleZh) setModelFieldErrors((previous) => ({ ...previous, titleZh: !event.target.validity.valid }));
                }}
                required
              />
              {modelFieldErrors.titleZh && <p id="mod-title-zh-error" role="alert" className="text-sm text-error">{t("ar.chineseNameMissing")}</p>}
            </div>

            <div className="space-y-2 p-4 border rounded-lg bg-muted/10">
              <Label htmlFor="mod-file-upload" className="font-semibold block mb-1">{t("ar.modelFile")}</Label>
              <p className="text-xs text-muted-foreground mb-3">
                {t("ar.modelFileDescription")}
              </p>
              <FileUploader
                id="mod-file-upload"
                error={modelFieldErrors.modelPath ? t("ar.modelRequired") : undefined}
                accept=".glb"
                type="model"
                label={t("ar.uploadModel")}
                value={modelFormData.modelPath}
                onChange={(path) => {
                  setModelFormData((prev) => ({ ...prev, modelPath: path }));
                  if (modelFieldErrors.modelPath) setModelFieldErrors((previous) => ({ ...previous, modelPath: !path }));
                  if (editingModel) {
                    refetchModels();
                  }
                }}
                onUploadStateChange={handleUploadStateChange}
                disabled={createModelMutation.isPending || updateModelMutation.isPending}
                folder={modelFormData.title}
                uploadPersistence={
                  editingModel
                    ? {
                        modelId: editingModel.id,
                        field: "modelPath",
                      }
                    : undefined
                }
                onBeforeUpload={() => {
                  if (!modelFormData.title.trim()) {
                    setModelFieldErrors((previous) => ({ ...previous, title: true }));
                    document.getElementById("mod-title")?.focus();
                    return false;
                  }
                  return true;
                }}
              />
            </div>

            <DialogFooter className="border-t pt-4 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModelDialogOpen(false)}
                disabled={
                  isUploading || createModelMutation.isPending || updateModelMutation.isPending
                }
                className="w-fit shrink-0 rounded-full"
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  isUploading || createModelMutation.isPending || updateModelMutation.isPending
                }
                className="w-fit shrink-0 rounded-full"
              >
                {createModelMutation.isPending || updateModelMutation.isPending ? (
                  <ActionSpinner />
                ) : null}
                {t("ar.saveModel")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
