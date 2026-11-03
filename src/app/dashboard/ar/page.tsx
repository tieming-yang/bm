"use client";

import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  PlusIcon,
  Trash2Icon,
  EditIcon,
  ArrowUpIcon,
  ArrowDownIcon,
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
import { ARAuthoringUpload } from "@/components/ar-authoring-upload";
import { useUnsavedChanges, useUnsavedNavigation } from "@/components/unsaved-changes-provider";
import { modelFormErrors, modelFormValue } from "@/lib/ar/authoring";

export default function ArDashboardPage() {
  const { requestDiscard } = useUnsavedNavigation();
  const queryClient = useQueryClient();
  const { t, currentLanguage } = useTranslation("dashboard");
  const { authUser, isAuthUserLoading } = useAuthUser();

  // Authentication & Authorization checks
  useEffect(() => {
    if (!isAuthUserLoading && !authUser) {
      window.location.replace("/signin?redirectTo=%2Fdashboard%2Far");
    }
  }, [authUser, isAuthUserLoading]);

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
      window.location.replace("/not-found");
    }
  }, [authUser, isLoading, isAuthorized, roleError]);

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
  const operation = React.useRef<"upload" | "save" | null>(null);

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
  const [modelBaseline, setModelBaseline] = useState<ModelWrite>(modelFormData);

  const [modelFieldErrors, setModelFieldErrors] = useState<Partial<Record<"title" | "titleZh" | "modelPath", boolean>>>({});

  // Sync Form when Editing Model Changes
  useEffect(() => {
    setModelFieldErrors({});
    const value = editingModel ? modelFormValue(editingModel) : { contentType: "character" as const, title: "", titleZh: "", modelPath: "" };
    setModelFormData(value);
    setModelBaseline(value);
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
      operation.current = null;
      setModelBaseline(modelFormData);
      refetchModels();
      setIsModelDialogOpen(false);
      toast.success(t("ar.modelCreated"));
    },
    onError: (err: any) => {
      operation.current = null;
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
      operation.current = null;
      setModelBaseline(modelFormData);
      refetchModels();
      setIsModelDialogOpen(false);
      toast.success(t("ar.modelUpdated"));
    },
    onError: (err: any) => {
      operation.current = null;
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
    if (operation.current || isUploading || createModelMutation.isPending || updateModelMutation.isPending) return;
    const errors = modelFormErrors(modelFormData);
    setModelFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) {
      document.getElementById(errors.title ? "mod-title" : errors.titleZh ? "mod-title-zh" : "mod-file-upload")?.focus();
      return;
    }

    operation.current = "save";
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
  const isModelBusy = isUploading || createModelMutation.isPending || updateModelMutation.isPending;
  useUnsavedChanges({ dirty: isModelDialogOpen && JSON.stringify(modelFormData) !== JSON.stringify(modelBaseline), busy: isModelBusy || isDeleting });
  const closeModelDialog = () => {
    if (!operation.current && !isModelBusy) requestDiscard(() => setIsModelDialogOpen(false));
  };

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

  const handleUploadStart = () => {
    if (operation.current || isModelBusy) return false;
    operation.current = "upload";
    setActiveUploads(1);
    return true;
  };
  const handleUploadEnd = () => {
    operation.current = null;
    setActiveUploads(0);
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
        if (open) setIsModelDialogOpen(true);
        else closeModelDialog();
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
            <p className="text-sm text-muted-foreground">{t(editingModel ? "ar.existingModelNotice" : "ar.newModelNotice")}</p>
            <fieldset disabled={isModelBusy} className="space-y-4">
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
                onBlur={() => setModelFieldErrors((previous) => ({ ...previous, title: modelFormErrors(modelFormData).title }))}
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
                onBlur={() => setModelFieldErrors((previous) => ({ ...previous, titleZh: modelFormErrors(modelFormData).titleZh }))}
                placeholder={t("ar.chineseNamePlaceholder")}
                value={modelFormData.titleZh}
                onChange={(event) => {
                  const titleZh = event.target.value;
                  setModelFormData((previous) => ({ ...previous, titleZh }));
                  if (modelFieldErrors.titleZh) setModelFieldErrors((previous) => ({ ...previous, titleZh: !titleZh }));
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
              <ARAuthoringUpload
                id="mod-file-upload"
                error={modelFieldErrors.modelPath ? t("ar.modelRequired") : undefined}
                accept=".glb"
                type="model"
                label={t("ar.uploadModel")}
                value={modelFormData.modelPath}
                uploadKey={`model:${editingModel?.id ?? "new"}:modelPath`}
                onChange={(change) => {
                  setModelFormData((prev) => ({ ...prev, modelPath: change.path }));
                  if (modelFieldErrors.modelPath) setModelFieldErrors((previous) => ({ ...previous, modelPath: !change.path }));
                  if (editingModel && change.kind === "upload" && change.persisted) {
                    setModelBaseline((previous) => ({ ...previous, modelPath: change.path }));
                    queryClient.setQueryData<Model[]>(["admin-ar-models"], (previous) => previous?.map((model) => model.id === editingModel.id ? { ...model, modelPath: change.path } : model));
                    refetchModels();
                  }
                }}
                onUploadStart={handleUploadStart}
                onUploadEnd={handleUploadEnd}
                disabled={isModelBusy}
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
                onClick={closeModelDialog}
                disabled={
                  isUploading || createModelMutation.isPending || updateModelMutation.isPending
                }
                className="w-fit shrink-0 rounded-full"
              >
                {t("ar.close")}
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
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
