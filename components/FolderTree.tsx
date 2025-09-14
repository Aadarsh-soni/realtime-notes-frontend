"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/libs/store";
import { foldersAPI } from "@/libs/api";
import { Button } from "@/components/ui/button";

interface Folder {
  id: number;
  name: string;
  children: Folder[];
}

export function FolderTree({
  onSelect,
  onFolderDeleted,
}: {
  onSelect: (folderId: number | null) => void;
  onFolderDeleted?: () => void;
}) {
  const { token } = useAuthStore();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [deletingFolderId, setDeletingFolderId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    
    async function loadFolders() {
      setLoading(true);
      setError("");
      
      try {
        const data = await foldersAPI.getFolders();
        setFolders(data);
      } catch (err: unknown) {
        console.error("Error loading folders:", err);
        
        if (err && typeof err === 'object' && 'response' in err && (err as { response?: { status?: number } }).response?.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          setError("Failed to load folders.");
        }
        
        // Set empty array instead of mock data
        setFolders([]);
      } finally {
        setLoading(false);
      }
    }
    
    loadFolders();
  }, [token]);

  const handleDeleteFolder = async (folderId: number, folderName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete the folder "${folderName}"? This will also delete all notes in this folder. This action cannot be undone.`)) {
      return;
    }

    setDeletingFolderId(folderId);
    try {
      await foldersAPI.deleteFolder(folderId);
      // Reload folders after deletion
      const data = await foldersAPI.getFolders();
      setFolders(data);
      onFolderDeleted?.();
    } catch (error) {
      console.error("Error deleting folder:", error);
      alert("Failed to delete folder. Please try again.");
    } finally {
      setDeletingFolderId(null);
    }
  };

  function renderFolder(folder: Folder) {
    const isDeleting = deletingFolderId === folder.id;
    
    return (
      <li key={folder.id} className="ml-4">
        <div className="flex items-center group">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect(folder.id)}
            className="flex-1 justify-start"
            disabled={isDeleting}
          >
            {folder.name}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 bg-white border-white text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            {isDeleting ? (
              <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
            ) : (
              "×"
            )}
          </Button>
        </div>
        {folder.children.length > 0 && (
          <ul>{folder.children.map((f) => renderFolder(f))}</ul>
        )}
      </li>
    );
  }

  return (
    <div>
      <h3 className="font-semibold mb-2">Folders</h3>
      
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded text-sm mb-2">
          {error}
        </div>
      )}
      
      <ul>
        <li>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelect(null)}
            className="w-full justify-start"
          >
            All Notes
          </Button>
        </li>
        
        {loading ? (
          <li className="text-sm text-muted-foreground py-2">
            Loading folders...
          </li>
        ) : (
          folders.map((f) => renderFolder(f))
        )}
      </ul>
    </div>
  );
}