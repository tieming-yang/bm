"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  PlusIcon,
  Trash2Icon,
  ArrowUpIcon,
  ArrowDownIcon,
  UploadIcon,
  MusicIcon,
  VideoIcon,
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
      <div className="flex items-center gap-2">
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
          className="flex items-center gap-2 h-9"
        >
          {uploading ? (
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
            <UploadIcon className="w-4 h-4" />
          )}
          {label}
        </Button>
        {value ? (
          <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={value}>
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
            className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/5"
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

  // Model deduplication logic
  const addedModelIds = new Set(collectionFormData.items.map((item) => item.modelId));
  const addedModelPaths = new Set(collectionFormData.items.map((item) => item.modelPath));
  const availableModels =
    models?.filter(
      (model) => !addedModelIds.has(model.id) && !addedModelPaths.has(model.modelPath)
    ) || [];

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
      toast.success("專案已成功更新！");
      router.push("/dashboard/ar");
    },
    onError: (err: any) => {
      toast.error(`更新專案失敗: ${err.message || String(err)}`);
    },
  });

  // Upload counter helper
  const handleUploadStateChange = (uploading: boolean) => {
    setActiveUploads((prev) => (uploading ? prev + 1 : Math.max(0, prev - 1)));
  };

  // Collection Items actions
  const handleAddItem = () => {
    if (!selectedModelId) return;
    const model = models?.find((m) => m.id === selectedModelId);
    if (!model) return;

    const isDuplicate = collectionFormData.items.some(
      (item) => item.modelId === model.id || item.modelPath === model.modelPath
    );
    if (isDuplicate) {
      toast.error("此模型已存在於專案中！");
      return;
    }

    setCollectionFormData((prev) => ({
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
    }));
    setSelectedModelId("");
  };

  const handleRemoveItem = (index: number) => {
    setCollectionFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...collectionFormData.items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;

    setCollectionFormData((prev) => ({
      ...prev,
      items: newItems,
    }));
  };

  const handleUpdateItemField = (
    index: number,
    field: keyof (typeof collectionFormData.items)[0],
    value: string
  ) => {
    setCollectionFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  // Form submit handler
  const handleSaveCollection = (e: React.FormEvent) => {
    e.preventDefault();
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
  };

  if (isLoading || (isEditing && isCollectionLoading)) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col w-full px-4 py-10 mx-auto font-mono min-h-svh max-w-7xl gap-6">
      {/* Header breadcrumb */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-sans">
          {isEditing ? "編輯 AR 專案" : "建立新 AR 專案"}
        </h1>
        <Link href="/dashboard/ar">
          <Button variant="outline" className="flex items-center gap-2 rounded-full">
            <ArrowLeftIcon className="w-4 h-4" />
            返回列表
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSaveCollection} className="space-y-6">
        {/* Split Screen Columns: Left (Metadata) / Right (Characters List) */}
        <div className="grid gap-6 md:grid-cols-12 items-start">
          {/* LEFT COLUMN: Metadata Config (col-span-5) */}
          <div className="md:col-span-5 space-y-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">基本配置</CardTitle>
                <CardDescription>填寫專案的主要屬性與 MindAR 圖像追蹤描述檔。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    rows={4}
                  />
                </div>

                <div className="space-y-2 p-4 border rounded-lg bg-muted/10">
                  <Label className="font-semibold block mb-1">識別圖描述檔 (.mind) *</Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    上傳 MindAR 圖像特徵描述檔。角色順序應與編譯 Mind 檔時的圖片順序完全一致。
                  </p>
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
            </Card>

            {/* Actions Form Trigger */}
            <div className="flex gap-3 justify-end">
              <Link href="/dashboard/ar">
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    isUploading ||
                    createCollectionMutation.isPending ||
                    updateCollectionMutation.isPending
                  }
                  className="rounded-full"
                >
                  取消
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={
                  isUploading ||
                  createCollectionMutation.isPending ||
                  updateCollectionMutation.isPending
                }
                className="rounded-full"
              >
                {createCollectionMutation.isPending || updateCollectionMutation.isPending ? (
                  <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                儲存專案
              </Button>
            </div>
          </div>

          {/* RIGHT COLUMN: Character Items Manager (col-span-7) */}
          <div className="md:col-span-7 space-y-6">
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div>
                  <CardTitle className="text-lg">
                    專案角色項目 ({collectionFormData.items.length})
                  </CardTitle>
                  <CardDescription className="mt-1">
                    排序必須精確對應識別圖 .mind 檔編譯時的 Target Index (索引)。
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Reorderable Items List */}
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {collectionFormData.items.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground/60 text-sm border border-dashed rounded-lg bg-muted/5 italic">
                      尚未加入任何角色項目。請在下方選擇角色並點擊「加入項目」。
                    </div>
                  ) : (
                    collectionFormData.items.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg bg-card shadow-sm space-y-4"
                      >
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-primary/10 text-primary font-bold px-2 py-0.5 rounded text-xs">
                              順序 {index + 1} (目標索引: {index})
                            </span>
                            <span className="font-semibold text-sm">
                              {item.titleZh || item.title}
                              <span className="text-muted-foreground font-normal ml-1 text-xs">
                                ({item.title})
                              </span>
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={index === 0}
                              onClick={() => handleMoveItem(index, "up")}
                              title="上移"
                              className="h-8 w-8"
                            >
                              <ArrowUpIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={index === collectionFormData.items.length - 1}
                              onClick={() => handleMoveItem(index, "down")}
                              title="下移"
                              className="h-8 w-8"
                            >
                              <ArrowDownIcon className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveItem(index)}
                              title="移除"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/5"
                            >
                              <Trash2Icon className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Audio/Video Upload fields */}
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                              <MusicIcon className="w-3.5 h-3.5" />
                              語音介紹 (預設/英文)
                            </Label>
                            <FileUploader
                              accept=".mp3,audio/*"
                              type="audio"
                              label="音檔"
                              value={item.audioPath || ""}
                              onChange={(path) => handleUpdateItemField(index, "audioPath", path)}
                              onUploadStateChange={handleUploadStateChange}
                              disabled={
                                createCollectionMutation.isPending ||
                                updateCollectionMutation.isPending
                              }
                              folder={item.title}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                              <MusicIcon className="w-3.5 h-3.5" />
                              語音介紹 (中文)
                            </Label>
                            <FileUploader
                              accept=".mp3,audio/*"
                              type="audio"
                              label="音檔"
                              value={item.audioPathZh || ""}
                              onChange={(path) => handleUpdateItemField(index, "audioPathZh", path)}
                              onUploadStateChange={handleUploadStateChange}
                              disabled={
                                createCollectionMutation.isPending ||
                                updateCollectionMutation.isPending
                              }
                              folder={item.title}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                              <VideoIcon className="w-3.5 h-3.5" />
                              介紹影片
                            </Label>
                            <FileUploader
                              accept=".mp4,.mov,video/*"
                              type="video"
                              label="影片"
                              value={item.videoPath || ""}
                              onChange={(path) => handleUpdateItemField(index, "videoPath", path)}
                              onUploadStateChange={handleUploadStateChange}
                              disabled={
                                createCollectionMutation.isPending ||
                                updateCollectionMutation.isPending
                              }
                              folder={item.title}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Model Selector Addition block */}
                <div className="flex items-end gap-3 p-4 border rounded-lg bg-muted/10 mt-4">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="add-model-selector" className="text-xs font-semibold">
                      選擇要加入的角色 3D 模型
                    </Label>
                    <Select value={selectedModelId} onValueChange={setSelectedModelId}>
                      <SelectTrigger id="add-model-selector" className="bg-background">
                        <SelectValue placeholder="從模型庫中選擇..." />
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
                              : "模型庫中無可用模型，請先建立模型"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddItem}
                    disabled={
                      !selectedModelId ||
                      selectedModelId === "none" ||
                      createCollectionMutation.isPending ||
                      updateCollectionMutation.isPending
                    }
                    className="rounded-full flex items-center gap-1.5"
                  >
                    <PlusIcon className="w-4 h-4" />
                    加入項目
                  </Button>
                </div>
              </CardContent>
            </Card>
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
