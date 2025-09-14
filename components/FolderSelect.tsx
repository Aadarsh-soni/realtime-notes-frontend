"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/libs/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Folder {
  id: number;
  name: string;
}

export function FolderSelect({
  noteId,
  currentFolderId,
}: {
  noteId: number;
  currentFolderId: number | null;
}) {
  const { token } = useAuthStore();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selected, setSelected] = useState<string>(
    currentFolderId ? String(currentFolderId) : "none"
  );

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${process.env.NEXT_PUBLIC_API_URL}/folders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setFolders(res.data));
  }, [token]);

  async function handleChange(folderId: string) {
    setSelected(folderId);
    if (!token) return;

    await axios.put(
      `${process.env.NEXT_PUBLIC_API_URL}/notes/${noteId}`,
      {
        folderId: folderId === "none" ? null : Number(folderId),
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }

  return (
    <Select value={selected} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select folder" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No Folder</SelectItem>
        {folders.map((f) => (
          <SelectItem key={f.id} value={String(f.id)}>
             {f.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}