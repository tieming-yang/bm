"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  PlusIcon,
  Trash2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  UploadIcon,
  MusicIcon,
  VideoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SearchIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import Loading from "@/app/loading";
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
import type { CollectionUploadPersistence } from "@/app/api/admin/ar/upload/schema";

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
}: {
  accept: string;
  type: "model" | "audio" | "video" | "target";
  label: string;
  value: string;
  onChange: (path: string) => void;
  onUploadStateChange?: (uploading: boolean) => void;
  disabled?: boolean;
  folder: string;
  onBeforeUpload?: () => boolean;
  uploadPersistence?: CollectionUploadPersistence;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!folder || !folder.trim()) {
      toast.error(type === "target" ? "請先輸入專案名稱！" : "請先輸入英文名稱！");
      return;
    }

    const limit = type === "model" || type === "video" ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > limit) {
      toast.error(`檔案過大！該檔案類型限制為 ${limit / (1024 * 1024)}MB`);
      return;
    }

    setUploading(true);
    onUploadStateChange?.(true);
    const toastId = toast.loading(`正在上傳 ${file.name}...`);
    try {
      const token = await Auth.user?.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);
      formData.append("folder", folder);
      if (uploadPersistence) {
        formData.append("collectionId", uploadPersistence.collectionId);
        formData.append("field", uploadPersistence.field);
        if ("modelId" in uploadPersistence) {
          formData.append("modelId", uploadPersistence.modelId);
        }
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
      toast.success(`${file.name} 上傳成功！`, { id: toastId });
      onChange(data.path);
    } catch (err: any) {
      toast.error(`上傳失敗: ${err.message || String(err)}`, { id: toastId });
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
          id={`uploader-${type}-${label}-${Math.random().toString(36).substring(2, 6)}`}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={handleButtonClick}
          className="w-fit shrink-0 flex items-center gap-2 h-9"
        >
          {uploading ? (
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <UploadIcon className="w-4 h-4" />
          )}
          {label}
        </Button>
        {value ? (
          <span className="text-xs text-muted-foreground truncate max-w-full min-w-0 flex-1" title={value}>
            已上傳: {value.substring(value.lastIndexOf("/") + 1)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60 italic">無上傳檔案</span>
        )}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            className="w-fit shrink-0 h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/5"
          >
            清除
          </Button>
        )}
      </div>
    </div>
  );
}

function ArEditPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const isEditing = !!id;

  const { authUser, isAuthUserLoading } = useAuthUser();

  // Authentication & Authorization checks
  useEffect(() => {
    if (!isAuthUserLoading && !authUser) {
      router.replace(
        `/signin?redirectTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
      );
    }
  }, [authUser, isAuthUserLoading, router]);

  const { data: profileData, isLoading: isRoleLoading } = useQuery({
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
    if (!isLoading && authUser && !isAuthorized) {
      router.replace("/not-found");
    }
  }, [authUser, isLoading, isAuthorized, router]);

  // Form & Upload state
  const [activeUploads, setActiveUploads] = useState<number>(0);
  const isUploading = activeUploads > 0;

  const [collectionFormData, setCollectionFormData] = useState<ARWrite>({
    title: "",
    description: "",
    version: "1.0",
    targetsPath: "",
    items: [],
  });

  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [isMetaCollapsed, setIsMetaCollapsed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Data fetching
  const { data: collectionData, isLoading: isCollectionLoading } = useQuery({
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

  const { data: models } = useQuery({
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
      setCollectionFormData({
        title: collectionData.title,
        description: collectionData.description,
        version: collectionData.version,
        targetsPath: collectionData.targetsPath,
        items: collectionData.items.map((it) => ({
          modelId: it.modelId,
          title: it.title,
          titleZh: it.titleZh || "",
          modelPath: it.modelPath,
          videoPath: it.videoPath || "",
          audioPath: it.audioPath || "",
          audioPathZh: it.audioPathZh || "",
        })),
      });
    }
  }, [collectionData, isEditing]);

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
      queryClient.invalidateQueries({ queryKey: ["admin-ar-collections"] });
      toast.success("專案已成功建立！");
      router.push("/dashboard/ar");
    },
    onError: (err: any) => {
      toast.error(`建立專案失敗: ${err.message || String(err)}`);
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
      queryClient.invalidateQueries({ queryKey: ["admin-ar-collections"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["admin-ar-collection", id] });
      }
      toast.success("專案已成功更新！");
      router.push("/dashboard/ar");
    },
    onError: (err: any) => {
      toast.error(`更新專案失敗: ${err.message || String(err)}`);
    },
  });

  // Upload counter helper
  const handleUploadStateChange = useCallback((uploading: boolean) => {
    setActiveUploads((prev) => (uploading ? prev + 1 : Math.max(0, prev - 1)));
  }, []);

  // Collection Items actions
  const handleAddItem = useCallback(() => {
    if (!selectedModelId) return;
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
      toast.error("此模型已存在於專案中！");
      return;
    }

    setSelectedModelId("");
    toast.success(`已加入「${model.titleZh || model.title}」`);
  }, [models, selectedModelId]);

  const handleRemoveItem = useCallback((index: number) => {
    setCollectionFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  }, []);

  const handleMoveItem = useCallback((index: number, direction: "up" | "down") => {
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
      index: number,
      field: keyof (typeof collectionFormData.items)[0],
      value: string
    ) => {
      setCollectionFormData((prev) => {
        const newItems = [...prev.items];
        newItems[index] = { ...newItems[index], [field]: value };
        return { ...prev, items: newItems };
      });
    },
    []
  );

  // Form submit handler
  const handleSaveCollection = useCallback(
    (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (isUploading) {
        toast.error("尚有檔案正在上傳中，請稍候...");
        return;
      }
      if (!collectionFormData.targetsPath) {
        toast.error("請上傳識別圖描述檔（.mind）！");
        return;
      }

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

  if (isLoading || (isEditing && isCollectionLoading)) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col w-full px-4 py-8 mx-auto font-mono min-h-svh max-w-7xl gap-6 overflow-x-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <nav className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
            <span>首頁</span>
            <span>/</span>
            <span>dashboard</span>
            <span>/</span>
            <span>聖經AR</span>
            <span>/</span>
            <span className="text-foreground font-medium">
              {isEditing ? "編輯專案" : "建立新專案"}
            </span>
          </nav>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? "編輯 AR 專案" : "建立新 AR 專案"}
            </h1>
            {isEditing && (
              <span className="px-2 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground border">
                v{collectionFormData.version}
              </span>
            )}
            <span className="px-2.5 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20 font-medium">
              {collectionFormData.items.length} 個角色項目
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 w-fit">
          <Link href="/dashboard/ar" className="w-fit">
            <Button variant="outline" className="w-fit shrink-0 flex items-center gap-2 rounded-full h-9">
              <ArrowLeftIcon className="w-4 h-4" />
              返回列表
            </Button>
          </Link>
          <Button
            type="button"
            onClick={() => handleSaveCollection()}
            disabled={
              isUploading ||
              createCollectionMutation.isPending ||
              updateCollectionMutation.isPending
            }
            className="w-fit shrink-0 rounded-full h-9 px-5 font-semibold"
          >
            {createCollectionMutation.isPending || updateCollectionMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
            ) : null}
            儲存專案
          </Button>
        </div>
      </div>

      {/* Persistence Notice Alert */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        已建立的專案中，重新上傳識別檔、音檔或影片會立即寫入資料庫；若資料庫寫入失敗，系統會移除剛上傳的檔案。新專案仍需按下儲存後才會建立資料。
      </div>

      <form onSubmit={handleSaveCollection} className="space-y-6">
        {/* COLLAPSIBLE BASIC CONFIG CARD */}
        <Card className="shadow-sm border overflow-hidden">
          <div
            className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-muted/30 transition-colors"
            onClick={() => setIsMetaCollapsed((prev) => !prev)}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                ⚙
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold">專案基本配置與追蹤檔</h2>
                  {collectionFormData.title && (
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {collectionFormData.title}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  識別描述檔 (.mind):{" "}
                  {collectionFormData.targetsPath ? (
                    <span className="text-primary font-mono">{collectionFormData.targetsPath}</span>
                  ) : (
                    <span className="text-destructive">尚未上傳</span>
                  )}
                  <span className="mx-2 text-muted-foreground/40">•</span>
                  <span>{isMetaCollapsed ? "點擊展開詳細設定" : "點擊收合"}</span>
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit shrink-0 flex items-center gap-1 text-xs text-muted-foreground"
            >
              <span>{isMetaCollapsed ? "展開設定" : "收合設定"}</span>
              {isMetaCollapsed ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronUpIcon className="w-4 h-4" />
              )}
            </Button>
          </div>

          {!isMetaCollapsed && (
            <CardContent className="border-t p-5 pt-5 grid gap-6 md:grid-cols-12 bg-muted/5">
              <div className="md:col-span-5 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="col-title">專案名稱 *</Label>
                  <Input
                    id="col-title"
                    placeholder="例如: collection-00 (限小寫英數、底線、連字號)"
                    value={collectionFormData.title}
                    onChange={(e) =>
                      setCollectionFormData((prev) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>

                {!isEditing && (
                  <div className="space-y-2">
                    <Label htmlFor="col-version">專案版本 *</Label>
                    <Input
                      id="col-version"
                      placeholder="例如: 1.0"
                      value={collectionFormData.version}
                      onChange={(e) =>
                        setCollectionFormData((prev) => ({ ...prev, version: e.target.value }))
                      }
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="col-description">專案描述</Label>
                  <Textarea
                    id="col-description"
                    placeholder="關於此專案的簡短介紹..."
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
                    <Label className="font-semibold block mb-1">
                      識別圖描述檔 (.mind) *
                    </Label>
                    {collectionFormData.targetsPath && (
                      <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                        已就緒
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    上傳 MindAR 圖像特徵描述檔。角色順序應與編譯 Mind 檔時的圖片順序完全一致。
                  </p>
                </div>
                <FileUploader
                  accept=".mind"
                  type="target"
                  label="上傳 .mind 檔案"
                  value={collectionFormData.targetsPath}
                  onChange={(path) =>
                    setCollectionFormData((prev) => ({ ...prev, targetsPath: path }))
                  }
                  onUploadStateChange={handleUploadStateChange}
                  disabled={
                    createCollectionMutation.isPending || updateCollectionMutation.isPending
                  }
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
                      toast.error("請先輸入專案名稱以建立儲存路徑");
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
                  專案角色項目 ({collectionFormData.items.length})
                </CardTitle>
              </div>
              <CardDescription className="mt-1">
                排序必須精確對應識別圖 .mind 檔編譯時的 Target Index (索引)。
              </CardDescription>
            </div>

            {/* Quick Add and Search Toolbar in the header */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto min-w-0">
              {/* Search box */}
              <div className="relative flex-1 sm:w-48 min-w-[140px]">
                <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="搜尋角色名稱..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs pl-8 h-9"
                />
              </div>

              {/* Add Model Selector */}
              <div className="flex items-center gap-2 min-w-0">
                <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                  <SelectTrigger className="w-[180px] sm:w-[220px] h-9 text-xs">
                    <SelectValue placeholder="從模型庫中選擇角色..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableModels.length > 0 ? (
                      availableModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.titleZh || model.title} ({model.title})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        {models && models.length > 0
                          ? "所有模型已新增至專案"
                          : "模型庫中無可用模型"}
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
                    createCollectionMutation.isPending ||
                    updateCollectionMutation.isPending
                  }
                  size="sm"
                  className="w-fit shrink-0 rounded-full h-9 px-3.5 flex items-center gap-1 font-semibold"
                >
                  <PlusIcon className="w-4 h-4" />
                  加入項目
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            {/* List of Character Cards */}
            {collectionFormData.items.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground/60 text-sm border border-dashed rounded-lg bg-muted/5 italic">
                尚未加入任何角色項目。請在上方選擇角色並點擊「加入項目」。
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
                        <span className="text-muted-foreground mr-1">IDX</span>
                        <span className="font-bold text-primary">#{originalIndex}</span>
                      </div>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-bold text-sm truncate">
                          {item.titleZh || item.title}
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
                        disabled={originalIndex === 0 || isFiltered}
                        onClick={() => handleMoveItem(originalIndex, "up")}
                        title={isFiltered ? "清除搜尋條件以調整順序" : "上移"}
                        className="w-fit shrink-0 h-8 w-8"
                      >
                        <ArrowUpIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={
                          originalIndex === collectionFormData.items.length - 1 || isFiltered
                        }
                        onClick={() => handleMoveItem(originalIndex, "down")}
                        title={isFiltered ? "清除搜尋條件以調整順序" : "下移"}
                        className="w-fit shrink-0 h-8 w-8"
                      >
                        <ArrowDownIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(originalIndex)}
                        title="移除"
                        className="w-fit shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 ml-1"
                      >
                        <Trash2Icon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Spacious 3-column media uploader grid */}
                  <div className="grid gap-4 sm:grid-cols-3 min-w-0">
                    {/* English Audio */}
                    <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20 min-w-0 overflow-hidden">
                      <Label className="text-xs font-semibold flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <MusicIcon className="w-3.5 h-3.5 text-primary" />
                          語音介紹 (英文)
                        </span>
                        {item.audioPath && (
                          <span className="text-[10px] text-primary font-medium">已上傳</span>
                        )}
                      </Label>
                      <FileUploader
                        accept=".mp3,audio/*"
                        type="audio"
                        label="音檔"
                        value={item.audioPath || ""}
                        onChange={(path) => handleUpdateItemField(originalIndex, "audioPath", path)}
                        onUploadStateChange={handleUploadStateChange}
                        disabled={
                          createCollectionMutation.isPending ||
                          updateCollectionMutation.isPending
                        }
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
                          語音介紹 (中文)
                        </span>
                        {item.audioPathZh && (
                          <span className="text-[10px] text-primary font-medium">已上傳</span>
                        )}
                      </Label>
                      <FileUploader
                        accept=".mp3,audio/*"
                        type="audio"
                        label="音檔"
                        value={item.audioPathZh || ""}
                        onChange={(path) =>
                          handleUpdateItemField(originalIndex, "audioPathZh", path)
                        }
                        onUploadStateChange={handleUploadStateChange}
                        disabled={
                          createCollectionMutation.isPending ||
                          updateCollectionMutation.isPending
                        }
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
                          介紹影片
                        </span>
                        {item.videoPath && (
                          <span className="text-[10px] text-primary font-medium">已上傳</span>
                        )}
                      </Label>
                      <FileUploader
                        accept=".mp4,.mov,video/*"
                        type="video"
                        label="影片"
                        value={item.videoPath || ""}
                        onChange={(path) => handleUpdateItemField(originalIndex, "videoPath", path)}
                        onUploadStateChange={handleUploadStateChange}
                        disabled={
                          createCollectionMutation.isPending ||
                          updateCollectionMutation.isPending
                        }
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
        <div className="sticky bottom-6 z-30 max-w-xl w-[calc(100%-2rem)] mx-auto p-2.5 rounded-full border bg-background/90 backdrop-blur-md shadow-2xl flex items-center justify-between px-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>共 {collectionFormData.items.length} 個角色項目</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-fit">
            <Link href="/dashboard/ar" className="w-fit">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={
                  isUploading ||
                  createCollectionMutation.isPending ||
                  updateCollectionMutation.isPending
                }
                className="w-fit shrink-0 h-8 rounded-full text-xs text-muted-foreground hover:text-foreground"
              >
                取消
              </Button>
            </Link>
            <Button
              type="submit"
              size="sm"
              disabled={
                isUploading ||
                createCollectionMutation.isPending ||
                updateCollectionMutation.isPending
              }
              className="w-fit shrink-0 h-8 rounded-full px-5 text-xs font-semibold"
            >
              {createCollectionMutation.isPending || updateCollectionMutation.isPending ? (
                <span className="w-3.5 h-3.5 border-2 border-background border-t-transparent rounded-full animate-spin mr-1.5" />
              ) : null}
              儲存專案
            </Button>
          </div>
        </div>
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
