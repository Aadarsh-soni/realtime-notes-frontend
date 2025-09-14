"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuthStore } from "@/libs/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Version {
  id: number;
  content: string;
  createdAt: string;
  author: { id: number; name?: string; email?: string };
}

export function VersionHistory({ noteId }: { noteId: number }) {
  const { token } = useAuthStore();
  const [versions, setVersions] = useState<Version[]>([]);
  const [open, setOpen] = useState(false);

  async function loadVersions() {
    if (!token) return;
    const res = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/notes/${noteId}/versions`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setVersions(res.data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          onClick={loadVersions}
          className="mb-2"
        >
          📜 Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Version History</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {versions.map((v) => (
            <div key={v.id} className="border rounded p-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  By {v.author.name || v.author.email || `User ${v.author.id}`}
                </span>
                <span>
                  {new Date(v.createdAt).toLocaleString()}
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-sm mt-2 bg-muted p-2 rounded">
                {v.content}
              </pre>
            </div>
          ))}
          {versions.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No versions found
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}