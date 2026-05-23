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

import Loading from "@/app/loading";
import { Button } from "@/components/ui/button";
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

    // Standard limits: 100MB for GLB/videos, 20MB for audio/targets
    const limit =
      type === "model" || type === "video" ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
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

export default function ArDashboardPage() {
  const router = useRouter();
  const { authUser, isAuthUserLoading } = useAuthUser();

  // Authentication & Authorization checks
  useEffect(() => {
    if (!isAuthUserLoading && !authUser) {
      router.replace("/signin?redirectTo=%2Fdashboard%2Far");
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

  // Data fetching
  const { data: collections, refetch: refetchCollections, isLoading: isCollectionsLoading } = useQuery({
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

  const { data: models, refetch: refetchModels, isLoading: isModelsLoading } = useQuery({
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
  const [modelFormData, setModelFormData] = useState<ModelWrite>({
    contentType: "character",
    title: "",
    titleZh: "",
    modelPath: "",
  });

  // Sync Form when Editing Model Changes
  useEffect(() => {
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
      toast.success("專案已成功刪除！");
    },
    onError: (err: any) => {
      toast.error(`刪除專案失敗: ${err.message || String(err)}`);
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
      toast.success("3D 模型已成功加入模型庫！");
    },
    onError: (err: any) => {
      toast.error(`新增模型失敗: ${err.message || String(err)}`);
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
      toast.success("3D 模型已成功更新！");
    },
    onError: (err: any) => {
      toast.error(`更新模型失敗: ${err.message || String(err)}`);
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
      toast.success("3D 模型已從模型庫中刪除！");
    },
    onError: (err: any) => {
      toast.error(`刪除模型失敗: ${err.message || String(err)}`);
    },
  });




  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;

    if (!modelFormData.title.trim()) {
      toast.error("請輸入英文名稱");
      return;
    }
    if (!modelFormData.modelPath) {
      toast.error("請上傳 .glb 3D 模型檔案");
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
    if (window.confirm(`確定要刪除專案「${name}」嗎？此動作將無法復原。`)) {
      deleteCollectionMutation.mutate(id);
    }
  };

  const handleDeleteModel = (id: string, name: string) => {
    if (
      window.confirm(
        `確定要刪除模型「${name}」嗎？此動作將會從 R2 檔案庫中清除對應的所有檔案。`
      )
    ) {
      deleteModelMutation.mutate(id);
    }
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
      return date.toLocaleString("zh-TW", {
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

  if (isLoading || !authUser || !isAuthorized) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col w-full px-4 py-10 mx-auto font-mono min-h-svh max-w-7xl gap-8">
      <div className="flex items-center justify-between">
        <Link href="/dashboard">
          <Button variant="outline" className="flex items-center gap-2 rounded-full">
            <ArrowLeftIcon className="w-4 h-4" />
            返回管理首頁
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">AR 體驗與模型管理</h1>
        <p className="text-muted-foreground mt-2">
          管理聖經學堂的 AR 體驗專案，包含上傳識別圖描述檔（.mind），配置 3D 模型、音檔及影片項目。
        </p>
      </div>

      <Tabs defaultValue="collections" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="collections" className="px-6">
            專案管理
          </TabsTrigger>
          <TabsTrigger value="models" className="px-6">
            3D 模型庫
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collections">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>AR 專案列表</CardTitle>
                <CardDescription>配置並管理各個獨立的 AR 場景展示專案。</CardDescription>
              </div>
              <Link href="/dashboard/ar/edit">
                <Button className="flex items-center gap-2 rounded-full">
                  <PlusIcon className="w-4 h-4" />
                  建立新專案
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isCollectionsLoading ? (
                <div className="flex justify-center p-12">
                  <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !collections || collections.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
                  <FileCodeIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">尚未建立任何 AR 專案。</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>專案名稱</TableHead>
                      <TableHead>版本</TableHead>
                      <TableHead>模型數量</TableHead>
                      <TableHead>識別圖路徑</TableHead>
                      <TableHead>更新時間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {collections.map((col) => (
                      <TableRow key={col.id}>
                        <TableCell className="font-medium">{col.title}</TableCell>
                        <TableCell>v{col.version}</TableCell>
                        <TableCell>{col.items?.length ?? 0} 個項目</TableCell>
                        <TableCell className="max-w-[200px] truncate font-sans text-xs" title={col.targetsPath}>
                          {col.targetsPath}
                        </TableCell>
                        <TableCell>{formatTimestamp(col.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Link href={`/dashboard/ar/edit?id=${col.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1.5"
                              >
                                <EditIcon className="w-3.5 h-3.5" />
                                編輯
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCollection(col.id, col.title)}
                              className="flex items-center gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/5"
                            >
                              <Trash2Icon className="w-3.5 h-3.5" />
                              刪除
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>3D 模型庫</CardTitle>
                <CardDescription>管理可用於 AR 專案的 3D 立體模型池。</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingModel(null);
                  setIsModelDialogOpen(true);
                }}
                className="flex items-center gap-2 rounded-full"
              >
                <PlusIcon className="w-4 h-4" />
                新增模型
              </Button>
            </CardHeader>
            <CardContent>
              {isModelsLoading ? (
                <div className="flex justify-center p-12">
                  <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !models || models.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
                  <BoxIcon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">尚未新增任何 3D 模型。</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>中文名稱</TableHead>
                      <TableHead>英文名稱</TableHead>
                      <TableHead>類型</TableHead>
                      <TableHead>模型檔案路徑</TableHead>
                      <TableHead>更新時間</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((mod) => (
                      <TableRow key={mod.id}>
                        <TableCell className="font-medium">{mod.titleZh || "—"}</TableCell>
                        <TableCell>{mod.title}</TableCell>
                        <TableCell>
                          <span className="bg-muted px-2.5 py-0.5 rounded-full text-xs font-sans">
                            {mod.contentType}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[250px] truncate font-sans text-xs" title={mod.modelPath}>
                          {mod.modelPath}
                        </TableCell>
                        <TableCell>{formatTimestamp(mod.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingModel(mod);
                                setIsModelDialogOpen(true);
                              }}
                              className="flex items-center gap-1.5"
                            >
                              <EditIcon className="w-3.5 h-3.5" />
                              編輯
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteModel(mod.id, mod.titleZh || mod.title)}
                              className="flex items-center gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/5"
                            >
                              <Trash2Icon className="w-3.5 h-3.5" />
                              刪除
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
      <Dialog open={isModelDialogOpen} onOpenChange={setIsModelDialogOpen}>
        <DialogContent className="max-w-6xl font-mono">
          <DialogHeader>
            <DialogTitle>{editingModel ? "編輯 3D 模型" : "新增 3D 模型"}</DialogTitle>
            <DialogDescription>
              上傳新模型檔（.glb）並填寫其中英文對照標題，使其在專案管理中可被引用。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveModel} className="space-y-4 my-2">
            <div className="space-y-2">
              <Label htmlFor="mod-content-type">內容類型 *</Label>
              <Select value={modelFormData.contentType} disabled>
                <SelectTrigger id="mod-content-type" className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="character">角色 (character)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mod-title">英文名稱 *</Label>
              <Input
                id="mod-title"
                placeholder="例如: adam (此欄位將作為檔案庫儲存目錄名)"
                value={modelFormData.title}
                onChange={(e) =>
                  setModelFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mod-title-zh">中文名稱 *</Label>
              <Input
                id="mod-title-zh"
                placeholder="例如: 亞當"
                value={modelFormData.titleZh}
                onChange={(e) =>
                  setModelFormData((prev) => ({ ...prev, titleZh: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2 p-4 border rounded-lg bg-muted/10">
              <Label className="font-semibold block mb-1">GLB 模型檔案 (.glb) *</Label>
              <p className="text-xs text-muted-foreground mb-3">上傳可用於行動裝置載入的 3D 立體模型檔案。</p>
              <FileUploader
                accept=".glb"
                type="model"
                label="選擇上傳 .glb 檔案"
                value={modelFormData.modelPath}
                onChange={(path) => setModelFormData((prev) => ({ ...prev, modelPath: path }))}
                onUploadStateChange={handleUploadStateChange}
                disabled={createModelMutation.isPending || updateModelMutation.isPending}
                folder={modelFormData.title}
                onBeforeUpload={() => {
                  if (!modelFormData.title.trim()) {
                    toast.error("請先輸入英文名稱以建立儲存路徑");
                    return false;
                  }
                  return true;
                }}
              />
            </div>

            <DialogFooter className="border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModelDialogOpen(false)}
                disabled={
                  isUploading || createModelMutation.isPending || updateModelMutation.isPending
                }
                className="rounded-full"
              >
                取消
              </Button>
              <Button
                type="submit"
                disabled={
                  isUploading || createModelMutation.isPending || updateModelMutation.isPending
                }
                className="rounded-full"
              >
                {createModelMutation.isPending || updateModelMutation.isPending ? (
                  <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                儲存模型
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
