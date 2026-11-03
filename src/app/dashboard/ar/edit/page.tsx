"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  PlusIcon,
  Trash2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  MusicIcon,
  VideoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import Loading, { ActionSpinner } from "@/app/loading";
import DashboardError from "@/app/dashboard/dashboard-error";
import useTranslation from "@/hooks/use-translation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { AR, ARWrite, Model } from "@/app/(works)/ar/data";
import { ARAuthoringUpload, type ARUploadChange } from "@/components/ar-authoring-upload";
import { useUnsavedChanges, useUnsavedNavigation } from "@/components/unsaved-changes-provider";
import { applyItemMedia, projectFormErrors, projectFormValue, type ARItemMediaField } from "@/lib/ar/authoring";

function ArEditPageContent() {
  const { leaveAfterSave } = useUnsavedNavigation();
  const { t, currentLanguage } = useTranslation("dashboard");
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const isEditing = !!id;

  const { authUser, isAuthUserLoading } = useAuthUser();

  // Authentication & Authorization checks
  useEffect(() => {
    if (!isAuthUserLoading && !authUser) {
      window.location.replace(
        `/signin?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
      );
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

  // Form & Upload state
  const [activeUploads, setActiveUploads] = useState<number>(0);
  const isUploading = activeUploads > 0;
  const operation = React.useRef<"upload" | "save" | null>(null);

  const [collectionFormData, setCollectionFormData] = useState<ARWrite>({
    title: "",
    description: "",
    version: "1.0",
    targetsPath: "",
    items: [],
  });
  const [collectionBaseline, setCollectionBaseline] = useState<ARWrite>(collectionFormData);
  const initializedCollectionId = React.useRef<string | null>(null);
  const latestForm = React.useRef(collectionFormData);
  const latestBaseline = React.useRef(collectionBaseline);
  latestForm.current = collectionFormData;
  latestBaseline.current = collectionBaseline;

  const [collectionFieldErrors, setCollectionFieldErrors] = useState<Partial<Record<"title" | "version" | "targetsPath", boolean>>>({});
  const formRef = React.useRef<HTMLFormElement>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [isMetaCollapsed, setIsMetaCollapsed] = useState<boolean>(false);
  const [invalidFieldToFocus, setInvalidFieldToFocus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data fetching
  const { data: collectionData, isLoading: isCollectionLoading, error: collectionError, refetch: refetchCollection } = useQuery({
    queryKey: ["admin-ar-collection", id],
    queryFn: async () => {
      const token = await Auth.user?.getIdToken();
      const res = await fetch(`/api/admin/ar/collections/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<AR>;
    },
    enabled: isAuthorized && !!authUser && isEditing,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: models, error: modelsError, refetch: refetchModels } = useQuery({
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

  // Sync Form when Editing Collection loads
  useEffect(() => {
    if (collectionData && isEditing) {
      if (initializedCollectionId.current === id && JSON.stringify(latestForm.current) !== JSON.stringify(latestBaseline.current)) return;
      const value = projectFormValue(collectionData);
      initializedCollectionId.current = id;
      setCollectionFormData(value);
      setCollectionBaseline(value);
    }
  }, [collectionData, isEditing, id]);

  useEffect(() => {
    if (!invalidFieldToFocus || isMetaCollapsed) return;
    document.getElementById(invalidFieldToFocus)?.focus();
    setInvalidFieldToFocus(null);
  }, [invalidFieldToFocus, isMetaCollapsed]);

  // Model deduplication logic with useMemo
  const addedModelIds = useMemo(
    () => new Set(collectionFormData.items.map((item) => item.modelId)),
    [collectionFormData.items]
  );
  const addedModelPaths = useMemo(
    () => new Set(collectionFormData.items.map((item) => item.modelPath)),
    [collectionFormData.items]
  );
  const availableModels: Model[] = useMemo(
    () =>
      models?.filter(
        (model: Model) => !addedModelIds.has(model.id) && !addedModelPaths.has(model.modelPath)
      ) || [],
    [models, addedModelIds, addedModelPaths]
  );

  // Filtered items computation
  const isFiltered = searchQuery.trim().length > 0;
  const filteredItems = useMemo(
    () =>
      collectionFormData.items
        .map((item, originalIndex) => ({ item, originalIndex }))
        .filter(({ item }) => {
          if (!isFiltered) return true;
          const q = searchQuery.toLowerCase().trim();
          return (
            item.title.toLowerCase().includes(q) ||
            Boolean(item.titleZh && item.titleZh.toLowerCase().includes(q))
          );
        }),
    [collectionFormData.items, isFiltered, searchQuery]
  );

  // Mutations
  const createCollectionMutation = useMutation({
    mutationFn: async (data: ARWrite) => {
      const token = await Auth.user?.getIdToken();
      const res = await fetch("/api/admin/ar/collections", {
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
      setCollectionBaseline(collectionFormData);
      queryClient.invalidateQueries({ queryKey: ["admin-ar-collections"] });
      toast.success(t("ar.collectionCreated"));
      leaveAfterSave("/dashboard/ar");
    },
    onError: (err: any) => {
      operation.current = null;
      console.error("AR project creation failed", err);
      toast.error(t("ar.collectionCreateFailed"));
    },
  });

  const updateCollectionMutation = useMutation({
    mutationFn: async (data: ARWrite) => {
      const token = await Auth.user?.getIdToken();
      const res = await fetch(`/api/admin/ar/collections/${id}`, {
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
      setCollectionBaseline(collectionFormData);
      queryClient.invalidateQueries({ queryKey: ["admin-ar-collections"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["admin-ar-collection", id] });
      }
      toast.success(t("ar.collectionUpdated"));
      leaveAfterSave("/dashboard/ar");
    },
    onError: (err: any) => {
      operation.current = null;
      console.error("AR project update failed", err);
      toast.error(t("ar.collectionUpdateFailed"));
    },
  });

  // Upload counter helper
  const isBusy = isUploading || createCollectionMutation.isPending || updateCollectionMutation.isPending;
  useUnsavedChanges({ dirty: JSON.stringify(collectionFormData) !== JSON.stringify(collectionBaseline), busy: isBusy });
  const handleUploadStart = () => {
    if (operation.current || isBusy) return false;
    operation.current = "upload";
    setActiveUploads(1);
    return true;
  };
  const handleUploadEnd = () => {
    operation.current = null;
    setActiveUploads(0);
  };

  // Collection Items actions
  const handleAddItem = useCallback(() => {
    if (operation.current || !selectedModelId) return;
    const model = models?.find((m) => m.id === selectedModelId);
    if (!model) return;

    let isDuplicate = false;
    setCollectionFormData((prev) => {
      if (
        prev.items.some(
          (item) => item.modelId === model.id || item.modelPath === model.modelPath
        )
      ) {
        isDuplicate = true;
        return prev;
      }

      return {
        ...prev,
        items: [
          ...prev.items,
          {
            modelId: model.id,
            title: model.title,
            titleZh: model.titleZh || "",
            modelPath: model.modelPath,
            videoPath: "",
            audioPath: "",
            audioPathZh: "",
          },
        ],
      };
    });

    if (isDuplicate) {
      toast.error(t("ar.duplicateModel"));
      return;
    }

    setSelectedModelId("");
    toast.success(t("ar.itemAdded", { name: currentLanguage === "zh-TW" ? model.titleZh || model.title : model.title }));
  }, [models, selectedModelId, currentLanguage, t]);

  const handleRemoveItem = useCallback((index: number) => {
    if (operation.current) return;
    setCollectionFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  }, []);

  const handleMoveItem = useCallback((index: number, direction: "up" | "down") => {
    if (operation.current) return;
    setCollectionFormData((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.items.length) return prev;

      const newItems = [...prev.items];
      const temp = newItems[index];
      newItems[index] = newItems[targetIndex];
      newItems[targetIndex] = temp;

      return {
        ...prev,
        items: newItems,
      };
    });
  }, []);

  const handleUpdateItemField = useCallback(
    (
      modelId: string,
      field: ARItemMediaField,
      change: ARUploadChange
    ) => {
      setCollectionFormData((previous) => applyItemMedia(previous, modelId, field, change.path));
      if (change.kind === "upload" && change.persisted) setCollectionBaseline((previous) => applyItemMedia(previous, modelId, field, change.path));
    },
    []
  );

  // Form submit handler
  const handleSaveCollection = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (createCollectionMutation.isPending || updateCollectionMutation.isPending) return;
      if (operation.current || isUploading) {
        toast.error(t("ar.uploadsPending"));
        return;
      }
      const errors = projectFormErrors(collectionFormData);
      errors.version = !isEditing && errors.version;
      setCollectionFieldErrors(errors);
      if (Object.values(errors).some(Boolean)) {
        setIsMetaCollapsed(false);
        setInvalidFieldToFocus(errors.title ? "col-title" : errors.version ? "col-version" : "col-targets-upload");
        return;
      }

      operation.current = "save";
      if (isEditing) {
        updateCollectionMutation.mutate(collectionFormData);
      } else {
        createCollectionMutation.mutate(collectionFormData);
      }
    },
    [
      collectionFormData,
      createCollectionMutation,
      isEditing,
      isUploading,
      updateCollectionMutation,
      t,
    ]
  );

  // Keyboard shortcut: Cmd+S / Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveCollection();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveCollection]);

  if (roleError) {
    return <DashboardError onRetry={() => void refetchRole()} />;
  }

  if (isLoading || !authUser || !isAuthorized || (isEditing && isCollectionLoading)) {
    return <Loading />;
  }

  if (collectionError) {
    return <DashboardError onRetry={() => void refetchCollection()} />;
  }

  return (
    <div className="flex flex-col w-full px-4 py-8 mx-auto font-sans min-h-svh max-w-7xl gap-6 overflow-x-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {isEditing ? t("ar.editCollectionTitle") : t("ar.newCollectionTitle")}
            </h1>
            {isEditing && (
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground border">
                v{collectionFormData.version}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 font-medium">
              {t("ar.characterCount", { count: collectionFormData.items.length })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-fit">
          <Button asChild variant="outline" className="w-fit shrink-0 flex items-center gap-2 rounded-full h-11"><Link href="/dashboard/ar">
              <ArrowLeftIcon className="w-4 h-4" />
              {t("ar.backList")}
            </Link></Button>
          <Button
            type="button"
            onClick={() => handleSaveCollection()}
            disabled={
              isUploading ||
              createCollectionMutation.isPending ||
              updateCollectionMutation.isPending
            }
            className="w-fit shrink-0 rounded-full h-11 px-5 font-semibold"
          >
            {createCollectionMutation.isPending || updateCollectionMutation.isPending ? (
              <ActionSpinner />
            ) : null}
            {t("ar.saveCollection")}
          </Button>
        </div>
      </div>

      {/* Persistence Notice Alert */}
      <div className="rounded-lg border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-foreground">
        {t("ar.persistenceNotice")}
      </div>

      <form ref={formRef} noValidate onSubmit={handleSaveCollection} aria-busy={isUploading || createCollectionMutation.isPending || updateCollectionMutation.isPending} className="space-y-6">
        <fieldset disabled={isBusy} className="min-w-0 space-y-6">
        {/* COLLAPSIBLE BASIC CONFIG CARD */}
        <Card className="shadow-sm border overflow-hidden">
          <div
            className="p-4 flex items-center justify-between select-none"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                ⚙
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold">{t("ar.configuration")}</h2>
                  {collectionFormData.title && (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {collectionFormData.title}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {t("ar.targetFileLabel")}{" "}
                  {collectionFormData.targetsPath ? (
                    <span className="text-primary font-mono">{collectionFormData.targetsPath}</span>
                  ) : (
                    <span className="text-error">{t("ar.notUploaded")}</span>
                  )}
                  <span className="mx-2 text-muted-foreground/40">•</span>
                  <span>{isMetaCollapsed ? t("ar.expandDetail") : t("ar.collapseDetail")}</span>
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={!isMetaCollapsed}
              aria-controls="ar-project-settings"
              disabled={isBusy}
              onClick={() => { if (!operation.current) setIsMetaCollapsed((previous) => !previous); }}
              className="w-fit shrink-0 flex items-center gap-1 text-xs text-muted-foreground"
            >
              <span>{isMetaCollapsed ? t("ar.expand") : t("ar.collapse")}</span>
              {isMetaCollapsed ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronUpIcon className="w-4 h-4" />
              )}
            </Button>
          </div>

          {!isMetaCollapsed && (
            <CardContent id="ar-project-settings" className="border-t p-5 pt-5 grid gap-6 md:grid-cols-12 bg-muted/5">
              <div className="md:col-span-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="col-title">{t("ar.projectNameRequired")}</Label>
                  <Input
                    id="col-title"
                    aria-invalid={Boolean(collectionFieldErrors.title)}
                    aria-describedby={collectionFieldErrors.title ? "col-title-error" : undefined}
                    onInvalid={(event) => {
                      event.preventDefault();
                      setCollectionFieldErrors((previous) => ({ ...previous, title: true }));
                    }}
                    onBlur={() => setCollectionFieldErrors((previous) => ({ ...previous, title: projectFormErrors(collectionFormData).title }))}
                    placeholder={t("ar.projectNamePlaceholder")}
                    value={collectionFormData.title}
                    onChange={(event) => {
                      const title = event.target.value;
                      setCollectionFormData((previous) => ({ ...previous, title }));
                      if (collectionFieldErrors.title) setCollectionFieldErrors((previous) => ({ ...previous, title: !title.trim() }));
                    }}
                    required
                  />
                  {collectionFieldErrors.title && <p id="col-title-error" role="alert" className="text-sm text-error">{t("ar.projectBeforeUpload")}</p>}
                </div>

                {!isEditing && (
                  <div className="space-y-2">
                    <Label htmlFor="col-version">{t("ar.projectVersion")}</Label>
                    <Input
                      id="col-version"
                      aria-invalid={Boolean(collectionFieldErrors.version)}
                      aria-describedby={collectionFieldErrors.version ? "col-version-error" : undefined}
                      onInvalid={(event) => {
                        event.preventDefault();
                        setCollectionFieldErrors((previous) => ({ ...previous, version: true }));
                      }}
                      onBlur={() => setCollectionFieldErrors((previous) => ({ ...previous, version: projectFormErrors(collectionFormData).version }))}
                      placeholder={t("ar.versionPlaceholder")}
                      value={collectionFormData.version}
                      onChange={(event) => {
                        const version = event.target.value;
                        setCollectionFormData((previous) => ({ ...previous, version }));
                        if (collectionFieldErrors.version) setCollectionFieldErrors((previous) => ({ ...previous, version: !version }));
                      }}
                      required
                    />
                    {collectionFieldErrors.version && <p id="col-version-error" role="alert" className="text-sm text-error">{t("ar.versionRequired")}</p>}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="col-description">{t("ar.projectDescription")}</Label>
                  <Textarea
                    id="col-description"
                    placeholder={t("ar.descriptionPlaceholder")}
                    value={collectionFormData.description}
                    onChange={(e) =>
                      setCollectionFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
              </div>

              <div className="md:col-span-7 flex flex-col justify-between p-4 border rounded-lg bg-background">
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="col-targets-upload" className="font-semibold block mb-1">
                      {t("ar.targetFile")}
                    </Label>
                    {collectionFormData.targetsPath && (
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        {t("ar.ready")}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t("ar.targetDescription")}
                  </p>
                </div>
                <ARAuthoringUpload
                  id="col-targets-upload"
                  error={collectionFieldErrors.targetsPath ? t("ar.targetsRequired") : undefined}
                  accept=".mind"
                  type="target"
                  label={t("ar.uploadTargets")}
                  value={collectionFormData.targetsPath}
                  uploadKey={`project:${id ?? "new"}:targetsPath`}
                  onChange={(change) => {
                    setCollectionFormData((previous) => ({ ...previous, targetsPath: change.path }));
                    if (change.kind === "upload" && change.persisted) setCollectionBaseline((previous) => ({ ...previous, targetsPath: change.path }));
                    if (collectionFieldErrors.targetsPath) setCollectionFieldErrors((previous) => ({ ...previous, targetsPath: !change.path }));
                  }}
                  onUploadStart={handleUploadStart}
                  onUploadEnd={handleUploadEnd}
                  disabled={isBusy}
                  folder={collectionFormData.title}
                  uploadPersistence={
                    id
                      ? {
                          collectionId: id,
                          field: "targetsPath",
                        }
                      : undefined
                  }
                  onBeforeUpload={() => {
                    if (!collectionFormData.title.trim()) {
                      setCollectionFieldErrors((previous) => ({ ...previous, title: true }));
                      document.getElementById("col-title")?.focus();
                      return false;
                    }
                    return true;
                  }}
                />
              </div>
            </CardContent>
          )}
        </Card>

        {/* EXPANSIVE FULL-WIDTH CHARACTERS WORKSPACE */}
        <Card className="shadow-md border">
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">
                  {t("ar.characterItems", { count: collectionFormData.items.length })}
                </CardTitle>
              </div>
              <CardDescription className="mt-1">
                {t("ar.orderDescription")}
              </CardDescription>
            </div>

            {/* Quick Add and Search Toolbar in the header */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto min-w-0">
              {/* Search box */}
              <div className="relative flex-1 sm:w-48 min-w-[140px]">
                <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-4 text-muted-foreground" />
                <Input
                  type="text"
                  aria-label={t("ar.searchCharacters")}
                  placeholder={t("ar.searchCharacters")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-sm pl-8 h-11"
                />
              </div>

              {modelsError && <DashboardError onRetry={() => void refetchModels()} />}
              {/* Add Model Selector */}
              <div className="flex items-center gap-2 min-w-0">
                <Select value={selectedModelId} onValueChange={setSelectedModelId} disabled={isBusy}>
                  <SelectTrigger className="w-[180px] sm:w-[220px] h-11 text-sm" aria-label={t("ar.selectCharacter")}>
                    <SelectValue placeholder={t("ar.selectCharacter")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.length > 0 ? (
                      availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {currentLanguage === "zh-TW" ? model.titleZh || model.title : model.title} ({model.title})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {models && models.length > 0
                          ? t("ar.allModelsAdded")
                          : t("ar.noModelsAvailable")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={handleAddItem}
                  disabled={
                    !selectedModelId ||
                    selectedModelId === "none" ||
                    isBusy ||
                    createCollectionMutation.isPending ||
                    updateCollectionMutation.isPending
                  }
                  size="sm"
                  className="w-fit shrink-0 rounded-full h-11 px-3.5 flex items-center gap-1 font-semibold"
                >
                  <PlusIcon className="w-4 h-4" />
                  {t("ar.addItem")}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* List of Character Cards */}
            {collectionFormData.items.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground/60 text-sm border border-dashed rounded-lg bg-muted/5 italic">
                {t("ar.emptyItems")}
              </div>
            ) : (
              filteredItems.map(({ item, originalIndex }) => (
                <div
                  key={item.modelId || originalIndex}
                  className="p-4 border rounded-xl bg-card shadow-sm space-y-4 hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center justify-between border-b pb-3 min-w-0 gap-2">
                    {/* Left: Index badge & Name */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex items-center justify-center px-2.5 py-1 rounded-lg bg-muted border font-mono text-xs shrink-0">
                        <span className="text-muted-foreground mr-1">{t("ar.index")}</span>
                        <span className="font-bold text-primary">#{originalIndex}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-bold text-sm truncate">
                          {currentLanguage === "zh-TW" ? item.titleZh || item.title : item.title}
                        </span>
                        <span className="text-muted-foreground text-xs font-mono shrink-0">
                          ({item.title})
                        </span>
                        <span className="text-[11px] text-muted-foreground/80 font-mono hidden sm:inline-block bg-muted/50 px-2 py-0.5 rounded truncate">
                          📦 {item.modelPath.substring(item.modelPath.lastIndexOf("/") + 1)}
                        </span>
                      </div>
                    </div>

                    {/* Right: Reorder & Delete Actions */}
                    <div className="flex items-center gap-1 shrink-0 w-fit">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isBusy || originalIndex === 0 || isFiltered}
                        onClick={() => handleMoveItem(originalIndex, "up")}
                        title={isFiltered ? t("ar.clearSearchToReorder") : t("ar.moveUp")}
                        aria-label={t("ar.moveUp")}
                        className="shrink-0 h-11 w-11"
                      >
                        <ArrowUpIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={
                          isBusy || originalIndex === collectionFormData.items.length - 1 || isFiltered
                        }
                        onClick={() => handleMoveItem(originalIndex, "down")}
                        title={isFiltered ? t("ar.clearSearchToReorder") : t("ar.moveDown")}
                        aria-label={t("ar.moveDown")}
                        className="shrink-0 h-11 w-11"
                      >
                        <ArrowDownIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={isBusy}
                        onClick={() => handleRemoveItem(originalIndex)}
                        title={t("ar.remove")}
                        aria-label={t("ar.remove")}
                        className="shrink-0 h-11 w-11 text-error hover:text-error hover:bg-destructive/10 ml-1"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {isEditing && !collectionBaseline.items.some((savedItem) => savedItem.modelId === item.modelId) && <p className="text-sm text-muted-foreground">{t("ar.saveBeforeMedia")}</p>}

                  {/* Spacious 3-column media uploader grid */}
                  <div className="grid gap-4 sm:grid-cols-3 min-w-0">
                    {/* English Audio */}
                    <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20 min-w-0 overflow-hidden">
                      <Label className="text-xs font-semibold flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MusicIcon className="w-3.5 h-3.5 text-primary" />
                          {t("ar.audioEnglish")}
                        </span>
                        {item.audioPath && (
                          <span className="text-[10px] text-primary font-medium">{t("ar.uploaded")}</span>
                        )}
                      </Label>
                      <ARAuthoringUpload
                        accept=".mp3,audio/*"
                        type="audio"
                        label={t("ar.audio")}
                        value={item.audioPath || ""}
                        uploadKey={`project:${id ?? "new"}:${item.modelId}:audioPath`}
                        onChange={(change) => handleUpdateItemField(item.modelId, "audioPath", change)}
                        onUploadStart={handleUploadStart}
                        onUploadEnd={handleUploadEnd}
                        disabled={isBusy || (isEditing && !collectionBaseline.items.some((savedItem) => savedItem.modelId === item.modelId))}
                        folder={item.title}
                        uploadPersistence={
                          id
                            ? {
                                collectionId: id,
                                modelId: item.modelId,
                                field: "audioPath",
                              }
                            : undefined
                        }
                      />
                    </div>

                    {/* Chinese Audio */}
                    <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20 min-w-0 overflow-hidden">
                      <Label className="text-xs font-semibold flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MusicIcon className="w-3.5 h-3.5 text-primary" />
                          {t("ar.audioChinese")}
                        </span>
                        {item.audioPathZh && (
                          <span className="text-[10px] text-primary font-medium">{t("ar.uploaded")}</span>
                        )}
                      </Label>
                      <ARAuthoringUpload
                        accept=".mp3,audio/*"
                        type="audio"
                        label={t("ar.audio")}
                        value={item.audioPathZh || ""}
                        uploadKey={`project:${id ?? "new"}:${item.modelId}:audioPathZh`}
                        onChange={(change) =>
                          handleUpdateItemField(item.modelId, "audioPathZh", change)
                        }
                        onUploadStart={handleUploadStart}
                        onUploadEnd={handleUploadEnd}
                        disabled={isBusy || (isEditing && !collectionBaseline.items.some((savedItem) => savedItem.modelId === item.modelId))}
                        folder={item.title}
                        uploadPersistence={
                          id
                            ? {
                                collectionId: id,
                                modelId: item.modelId,
                                field: "audioPathZh",
                              }
                            : undefined
                        }
                      />
                    </div>

                    {/* Intro Video */}
                    <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20 min-w-0 overflow-hidden">
                      <Label className="text-xs font-semibold flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <VideoIcon className="w-3.5 h-3.5 text-primary" />
                          {t("ar.videoIntroduction")}
                        </span>
                        {item.videoPath && (
                          <span className="text-[10px] text-primary font-medium">{t("ar.uploaded")}</span>
                        )}
                      </Label>
                      <ARAuthoringUpload
                        accept=".mp4,.mov,video/*"
                        type="video"
                        label={t("ar.video")}
                        value={item.videoPath || ""}
                        uploadKey={`project:${id ?? "new"}:${item.modelId}:videoPath`}
                        onChange={(change) => handleUpdateItemField(item.modelId, "videoPath", change)}
                        onUploadStart={handleUploadStart}
                        onUploadEnd={handleUploadEnd}
                        disabled={isBusy || (isEditing && !collectionBaseline.items.some((savedItem) => savedItem.modelId === item.modelId))}
                        folder={item.title}
                        uploadPersistence={
                          id
                            ? {
                                collectionId: id,
                                modelId: item.modelId,
                                field: "videoPath",
                              }
                            : undefined
                        }
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Floating Sticky Bottom Bar for convenient saving */}
        <div className="sticky bottom-24 z-30 max-w-xl w-[calc(100%-2rem)] mx-auto p-2.5 rounded-full border bg-background/90 backdrop-blur-md shadow-2xl flex items-center justify-between px-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>{t("ar.totalCharacters", { count: collectionFormData.items.length })}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-fit">
            <Button asChild
                type="button"
                variant="ghost"
                size="sm"
                disabled={
                  isUploading ||
                  createCollectionMutation.isPending ||
                  updateCollectionMutation.isPending
                }
                className="w-fit shrink-0 h-11 rounded-full text-xs text-muted-foreground hover:text-foreground"
              ><Link href="/dashboard/ar">
                {t("ar.close")}
              </Link></Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                isUploading ||
                createCollectionMutation.isPending ||
                updateCollectionMutation.isPending
              }
              className="w-fit shrink-0 h-11 rounded-full px-5 text-xs font-semibold"
            >
              {createCollectionMutation.isPending || updateCollectionMutation.isPending ? (
                <ActionSpinner />
              ) : null}
              {t("ar.saveCollection")}
            </Button>
          </div>
        </div>
        </fieldset>
      </form>
    </div>
  );
}

export default function ArEditPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ArEditPageContent />
    </Suspense>
  );
}
