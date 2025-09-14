"use client";

import { useParams, useRouter } from "next/navigation";
import { NoteEditor } from "@/components/NoteEditor";
import { FolderSelect } from "@/components/FolderSelect";
import { VersionHistory } from "@/components/VersionHistory";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/libs/store";
import { notesAPI } from "@/libs/api";

export default function NoteEditorPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = Number(params.id);
  const { token } = useAuthStore();
  const [folderId, setFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadNote() {
      setLoading(true);
      setError("");
      
      try {
        // Check if we're in share mode (anonymous)
        const urlParams = new URLSearchParams(window.location.search);
        const isShareMode = urlParams.get('share') === 'true';
        
        if (isShareMode && !token) {
          // For anonymous mode, we don't need to load folder info
          // The NoteEditor component will handle loading the note content
          setFolderId(null);
        } else if (token) {
          // For authenticated users, load the note data
          const data = await notesAPI.getNote(noteId);
          setFolderId(data.folderId);
        } else {
          // No token and not in share mode - redirect to login
          setError("Please log in to access this note.");
        }
      } catch (err: unknown) {
        console.error("Error loading note:", err);
        
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { status?: number } };
          if (axiosError.response?.status === 401) {
            setError("Session expired. Please log in again.");
          } else if (axiosError.response?.status === 404) {
            setError("Note not found.");
          } else {
            setError("Failed to load note. Please try again.");
          }
        } else {
          setError("Failed to load note. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }
    
    loadNote();
  }, [noteId, token]);

  // Keyboard shortcut for back button
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.back();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span className="ml-2 text-muted-foreground">Loading note...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Error</h2>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <button 
          onClick={() => router.push("/notes")}
          className="hover:text-foreground transition-colors"
        >
          Notes
        </button>
        <span>/</span>
        <span className="text-foreground">Edit Note #{noteId}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.back()}
            className="flex items-center gap-2"
            title="Go back (Esc key)"
          >
            ← Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Note</h1>
            <p className="text-muted-foreground">Note ID: {noteId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {token && (
            <>
              <FolderSelect noteId={noteId} currentFolderId={folderId} />
              <VersionHistory noteId={noteId} />
            </>
          )}
        </div>
      </div>

      {/* Note Editor */}
      <NoteEditor noteId={noteId} />
    </div>
  );
}