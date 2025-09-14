"use client";

import { useState } from "react";
import { useAuthStore } from "@/libs/store";
import { foldersAPI } from "@/libs/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateFolderForm() {
  const { token } = useAuthStore();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!token) {
      setError("Please log in to create folders");
      return;
    }

    if (!name.trim()) {
      setError("Please enter a folder name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await foldersAPI.createFolder(name.trim());
      setName("");
      // Trigger a page refresh to update the folder tree
      window.location.reload();
    } catch (err: unknown) {
      console.error("Error creating folder:", err);
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string }, status?: number } };
        if (axiosError.response?.data?.message) {
          setError(axiosError.response.data.message);
        } else if (axiosError.response?.status === 401) {
          setError("Session expired. Please log in again.");
        } else {
          setError("Failed to create folder. Please try again.");
        }
      } else {
        setError("Failed to create folder. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded text-sm mb-2">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New folder name"
          disabled={loading}
          required
        />
        <Button type="submit" disabled={loading}>
          {loading ? "..." : "Add"}
        </Button>
      </form>
    </div>
  );
}