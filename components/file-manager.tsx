"use client";
import { supabase } from "@/lib/supabase";
import { useState, useCallback, useEffect } from "react";
import {
  Folder,
  File,
  Image as ImageIcon,
  Trash2,
  Upload,
  FolderPlus,
  ChevronRight,
  HardDrive,
  MoreVertical,
  Grid3X3,
  List,
  Search,
  X,
  FileText,
  FileVideo,
  FileAudio,
  FileArchive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FileType = "folder" | "image" | "document" | "video" | "audio" | "archive" | "other";

interface FileItem {
  id: string;
  name: string;
  type: FileType;
  size?: number;
  modifiedAt: Date;
  parentId: string | null;
}

const initialFiles: FileItem[] = [];

type MenuType = "all" | "trash";

function formatFileSize(bytes?: number): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function getFileIcon(type: FileType) {
  switch (type) {
    case "folder": return Folder;
    case "image": return ImageIcon;
    case "video": return FileVideo;
    case "audio": return FileAudio;
    case "archive": return FileArchive;
    case "document": return FileText;
    default: return File;
  }
}

function getFileIconColor(type: FileType): string {
  switch (type) {
    case "folder": return "text-foreground";
    default: return "text-muted-foreground";
  }
}

function getFileType(filename: string): FileType {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "mkv", "webm"].includes(ext)) return "video";
  if (["mp3", "wav", "flac", "aac", "ogg"].includes(ext)) return "audio";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt"].includes(ext)) return "document";
  return "other";
}

export function FileManager() {
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
 // Supabase Storage에서 파일 목록 불러오기
 useEffect(() => {
  if (!userId) return
  const fetchFiles = async () => {
    const res = await fetch(`/api/files?userId=${userId}`)
    const data = await res.json()
    if (data.files) {
      const loaded: FileItem[] = data.files.map((f: any) => ({
        id: `${userId}/${f.name}`,
        name: f.name.replace(/^\d+_/, ''),
        type: getFileType(f.name),
        size: f.metadata?.size,
        modifiedAt: new Date(f.created_at),
        parentId: null,
      }))
      setFiles(loaded)
    }
  }
  fetchFiles()
}, [userId])
  const [trashedFiles, setTrashedFiles] = useState<FileItem[]>([]);
  const [currentMenu, setCurrentMenu] = useState<MenuType>("all");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
const [userId, setUserId] = useState<string | null>(null)
useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUserId(data.user?.id ?? null)
  })
}, [])
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "내 파일" },
  ]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const getDisplayFiles = useCallback(() => {
    let displayFiles: FileItem[] = [];
    if (currentMenu === "trash") {
      displayFiles = trashedFiles;
    } else {
      displayFiles = files.filter((f) => f.parentId === currentFolderId);
    }
    if (searchQuery) {
      displayFiles = displayFiles.filter((f) =>
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return displayFiles.sort((a, b) => {
      if (a.type === "folder" && b.type !== "folder") return -1;
      if (a.type !== "folder" && b.type === "folder") return 1;
      return a.name.localeCompare(b.name, "ko");
    });
  }, [files, trashedFiles, currentMenu, currentFolderId, searchQuery]);

  const handleClick = (file: FileItem, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(file.id)) newSet.delete(file.id);
        else newSet.add(file.id);
        return newSet;
      });
    } else {
      setSelectedIds(new Set([file.id]));
    }
  };

  // ✅ Supabase Storage에서 파일 다운로드
  const handleDoubleClick = async (file: FileItem) => {
    if (file.type === "folder") {
      setCurrentFolderId(file.id);
      setBreadcrumbs((prev) => [...prev, { id: file.id, name: file.name }]);
      setSelectedIds(new Set());
    } else {
      try {
        const res = await fetch(`/api/files/download?path=${encodeURIComponent(file.id)}`);
        const data = await res.json();
        if (data.url) {
          window.open(data.url, "_blank");
        } else {
          alert("다운로드 링크를 가져오지 못했어요.");
        }
      } catch {
        alert("다운로드 중 오류가 발생했어요.");
      }
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    const crumb = breadcrumbs[index];
    setCurrentFolderId(crumb.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    setSelectedIds(new Set());
  };

  const handleMenuChange = (menu: MenuType) => {
    setCurrentMenu(menu);
    setCurrentFolderId(null);
    setBreadcrumbs([{ id: null, name: menu === "trash" ? "휴지통" : "내 파일" }]);
    setSelectedIds(new Set());
  };

  const getRootFolders = useCallback(() => {
    return files.filter((f) => f.type === "folder" && f.parentId === null);
  }, [files]);

  const getSubFolders = useCallback((parentId: string) => {
    return files.filter((f) => f.type === "folder" && f.parentId === parentId);
  }, [files]);

  const toggleFolderExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) newSet.delete(folderId);
      else newSet.add(folderId);
      return newSet;
    });
  };

  const navigateToFolder = (folder: FileItem) => {
    setCurrentMenu("all");
    setCurrentFolderId(folder.id);
    const buildPath = (folderId: string | null): { id: string | null; name: string }[] => {
      if (!folderId) return [{ id: null, name: "내 파일" }];
      const folder = files.find((f) => f.id === folderId);
      if (!folder) return [{ id: null, name: "내 파일" }];
      return [...buildPath(folder.parentId), { id: folder.id, name: folder.name }];
    };
    setBreadcrumbs(buildPath(folder.id));
    setSelectedIds(new Set());
  };

  const renderFolderTree = (folders: FileItem[], depth: number = 0) => {
    return folders.map((folder) => {
      const subFolders = getSubFolders(folder.id);
      const hasSubFolders = subFolders.length > 0;
      const isExpanded = expandedFolders.has(folder.id);
      const isActive = currentFolderId === folder.id && currentMenu === "all";

      return (
        <li key={folder.id}>
          <div
            className={cn(
              "flex items-center gap-1 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {hasSubFolders ? (
              <button onClick={(e) => toggleFolderExpand(folder.id, e)} className="p-0.5 hover:bg-sidebar-accent rounded">
                <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
              </button>
            ) : (
              <span className="w-5" />
            )}
            <button onClick={() => navigateToFolder(folder)} className="flex items-center gap-2 flex-1 text-left">
              <Folder className="h-4 w-4" />
              <span className="truncate">{folder.name}</span>
            </button>
          </div>
          {hasSubFolders && isExpanded && <ul>{renderFolderTree(subFolders, depth + 1)}</ul>}
        </li>
      );
    });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: FileItem = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      type: "folder",
      modifiedAt: new Date(),
      parentId: currentFolderId,
    };
    setFiles((prev) => [...prev, newFolder]);
    setNewFolderName("");
    setIsNewFolderDialogOpen(false);
  };

  const handleDelete = (fileIds: string[]) => {
    const filesToTrash = files.filter((f) => fileIds.includes(f.id));
    setFiles((prev) => prev.filter((f) => !fileIds.includes(f.id)));
    setTrashedFiles((prev) => [...prev, ...filesToTrash]);
    setSelectedIds(new Set());
  };

  const handleRestore = (fileIds: string[]) => {
    const filesToRestore = trashedFiles.filter((f) => fileIds.includes(f.id));
    setTrashedFiles((prev) => prev.filter((f) => !fileIds.includes(f.id)));
    setFiles((prev) => [...prev, ...filesToRestore]);
    setSelectedIds(new Set());
  };

  const handlePermanentDelete = async (fileIds: string[]) => {
    // ✅ Supabase Storage에서 실제 파일 삭제
    for (const id of fileIds) {
      const file = trashedFiles.find((f) => f.id === id);
      if (file && file.type !== "folder") {
        await fetch("/api/files", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: id }),
        });
      }
    }
    setTrashedFiles((prev) => prev.filter((f) => !fileIds.includes(f.id)));
    setSelectedIds(new Set());
  };
const handleLogout = async () => {
  await supabase.auth.signOut()
  window.location.href = '/login'
}
  // ✅ Supabase Storage에 실제 파일 업로드
  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append('userId', userId ?? '')
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (data.path) {
          const newFile: FileItem = {
            id: data.path,
            name: file.name,
            type: getFileType(file.name),
            size: file.size,
            modifiedAt: new Date(),
            parentId: currentFolderId,
          };
          setFiles((prev) => [...prev, newFile]);
        } else {
          alert("업로드 실패: " + data.error);
        }
      } catch {
        alert("업로드 중 오류가 발생했어요.");
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const displayFiles = getDisplayFiles();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border bg-sidebar flex flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-sidebar-foreground flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            DnCloud
          </h1>
        </div>
        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => handleMenuChange("all")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  currentMenu === "all" && currentFolderId === null
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Folder className="h-5 w-5" />
                모든 파일
              </button>
              <ul className="mt-1">{renderFolderTree(getRootFolders())}</ul>
            </li>
            <li className="pt-2">
              <button
                onClick={() => handleMenuChange("trash")}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  currentMenu === "trash"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Trash2 className="h-5 w-5" />
                휴지통
              </button>
            </li>
          </ul>
        </nav>
      <div className="p-4 border-t border-border">
     <Button variant="outline" className="w-full" onClick={handleLogout}>
    로그아웃
  </Button>
</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button onClick={handleUpload} className="gap-2" disabled={isUploading}>
                  <Upload className="h-4 w-4" />
                  {isUploading ? "업로드 중..." : "업로드"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsNewFolderDialogOpen(true)}
                  className="gap-2"
                  disabled={currentMenu !== "all"}
                >
                  <FolderPlus className="h-4 w-4" />
                  새 폴더
                </Button>
              </div>
              <div className="flex items-center gap-3 px-3 py-1.5 bg-muted rounded-md">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-secondary rounded-full h-1.5">
                    <div className="bg-foreground h-1.5 rounded-full" style={{ width: "35%" }} />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">3.5 / 10 GB</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="파일 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <div className="flex items-center border border-border rounded-md">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn("p-2 transition-colors", viewMode === "grid" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("p-2 transition-colors", viewMode === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {currentMenu === "all" && (
            <div className="flex items-center gap-1 mt-4 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.id ?? "root"} className="flex items-center gap-1">
                  {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <button
                    onClick={() => navigateToBreadcrumb(index)}
                    className={cn(
                      "hover:underline",
                      index === breadcrumbs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"
                    )}
                  >
                    {crumb.name}
                  </button>
                </div>
              ))}
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mt-4 p-2 bg-muted rounded-md">
              <span className="text-sm text-muted-foreground">{selectedIds.size}개 선택됨</span>
              {currentMenu === "trash" ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleRestore(Array.from(selectedIds))}>복원</Button>
                  <Button variant="destructive" size="sm" onClick={() => handlePermanentDelete(Array.from(selectedIds))}>영구 삭제</Button>
                </>
              ) : (
                <Button variant="destructive" size="sm" onClick={() => handleDelete(Array.from(selectedIds))}>삭제</Button>
              )}
            </div>
          )}
        </header>

        {/* File Grid/List */}
        <div className="flex-1 overflow-auto p-4">
          {displayFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Folder className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg">
                {searchQuery ? "검색 결과가 없습니다" : currentMenu === "trash" ? "휴지통이 비어있습니다" : "폴더가 비어있습니다"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayFiles.map((file) => {
                const IconComponent = getFileIcon(file.type);
                const isSelected = selectedIds.has(file.id);
                return (
                  <div
                    key={file.id}
                    onClick={(e) => handleClick(file, e)}
                    onDoubleClick={() => handleDoubleClick(file)}
                    className={cn(
                      "group relative flex flex-col items-center p-4 rounded-lg border cursor-pointer transition-all",
                      isSelected ? "border-foreground bg-accent" : "border-transparent hover:border-border hover:bg-muted/50"
                    )}
                  >
                    <IconComponent className={cn("h-12 w-12 mb-2", getFileIconColor(file.type))} />
                    <span className="text-sm text-center truncate w-full" title={file.name}>{file.name}</span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {file.type === "folder" ? formatDate(file.modifiedAt) : formatFileSize(file.size)}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {currentMenu === "trash" ? (
                          <>
                            <DropdownMenuItem onClick={() => handleRestore([file.id])}>복원</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePermanentDelete([file.id])} className="text-destructive">영구 삭제</DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            {file.type !== "folder" && (
                              <DropdownMenuItem onClick={() => handleDoubleClick(file)}>다운로드</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete([file.id])} className="text-destructive">삭제</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">이름</th>
                    <th className="text-left p-3 text-sm font-medium w-32">수정일</th>
                    <th className="text-left p-3 text-sm font-medium w-24">크기</th>
                    <th className="w-12" />
                  </tr>
                </thead>
                <tbody>
                  {displayFiles.map((file) => {
                    const IconComponent = getFileIcon(file.type);
                    const isSelected = selectedIds.has(file.id);
                    return (
                      <tr
                        key={file.id}
                        onClick={(e) => handleClick(file, e)}
                        onDoubleClick={() => handleDoubleClick(file)}
                        className={cn("border-t border-border cursor-pointer transition-colors", isSelected ? "bg-accent" : "hover:bg-muted/50")}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <IconComponent className={cn("h-5 w-5", getFileIconColor(file.type))} />
                            <span className="text-sm">{file.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{formatDate(file.modifiedAt)}</td>
                        <td className="p-3 text-sm text-muted-foreground">{formatFileSize(file.size)}</td>
                        <td className="p-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-accent transition-colors" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="h-4 w-4 text-muted-foreground" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {currentMenu === "trash" ? (
                                <>
                                  <DropdownMenuItem onClick={() => handleRestore([file.id])}>복원</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePermanentDelete([file.id])} className="text-destructive">영구 삭제</DropdownMenuItem>
                                </>
                              ) : (
                                <>
                                  {file.type !== "folder" && (
                                    <DropdownMenuItem onClick={() => handleDoubleClick(file)}>다운로드</DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => handleDelete([file.id])} className="text-destructive">삭제</DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* New Folder Dialog */}
      <Dialog open={isNewFolderDialogOpen} onOpenChange={setIsNewFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 폴더 만들기</DialogTitle>
            <DialogDescription>새 폴더의 이름을 입력하세요.</DialogDescription>
          </DialogHeader>
          <Input
            type="text"
            placeholder="폴더 이름"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewFolderDialogOpen(false)}>취소</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>만들기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
