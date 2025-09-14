"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/libs/store";
import { FolderTree } from "@/components/FolderTree";
import { CreateFolderForm } from "@/components/CreateFolderForm";
import { SearchBar } from "@/components/SearchBar";
import { NoteCard } from "@/components/NoteCard";
import { NewNoteDialog } from "@/components/NewNoteDialog";
import { notesAPI } from "@/libs/api";

interface Note {
  id: number;
  title: string;
  content: string;
  folderId: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function NotesPage() {
  const { token, user } = useAuthStore();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load all notes
  async function loadNotes() {
    if (!token) {
      console.log("No token available for loading notes");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      const data = await notesAPI.getNotes();
      console.log("Notes loaded successfully:", data);
      setNotes(data);
    } catch (err: unknown) {
      console.error("Error loading notes:", err);
      
      if (err && typeof err === 'object' && 'response' in err && (err as { response?: { status?: number } }).response?.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }
      
      setError("Failed to load notes. Please try again.");
      
      // Fallback to empty array instead of mock data
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Check if user is authenticated after hooks
  if (!token || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to view your notes.</p>
        </div>
      </div>
    );
  }

  // Search handler
  async function handleSearch(query: string) {
    if (!token) return;
    if (!query.trim()) {
      await loadNotes();
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const data = await notesAPI.searchNotes(query);
      setNotes(data);
    } catch (err: unknown) {
      console.error("Error searching notes:", err);
      
      if (err && typeof err === 'object' && 'response' in err && (err as { response?: { status?: number } }).response?.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }
      
      // Fallback to client-side search if server search fails
      console.log("Server search failed, falling back to client-side search");
      const allNotes = await notesAPI.getNotes();
      const filteredNotes = allNotes.filter((note: Note) => 
        note.title.toLowerCase().includes(query.toLowerCase()) ||
        note.content.toLowerCase().includes(query.toLowerCase())
      );
      setNotes(filteredNotes);
      setError(""); // Clear any previous errors
    } finally {
      setLoading(false);
    }
  }

  // Filter by folder
  const filteredNotes =
    selectedFolder === null
      ? notes
      : notes.filter((n) => n.folderId === selectedFolder);

  return (
    <div className="grid grid-cols-4 gap-4 relative">
      {/* Sidebar */}
      <aside className="col-span-1 border-r pr-2">
        <FolderTree onSelect={setSelectedFolder} onFolderDeleted={loadNotes} />
        <CreateFolderForm />
      </aside>

      {/* Notes Section */}
      <section className="col-span-3">
        <h2 className="text-xl font-bold mb-4">Notes</h2>
        <SearchBar onSearch={handleSearch} />

        {/* Error message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm mt-4">
            {error}
          </div>
        )}

        {/* Inline new note button */}
        <NewNoteDialog onCreated={loadNotes} selectedFolderId={selectedFolder} />

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="ml-2 text-muted-foreground">Loading notes...</span>
          </div>
        ) : filteredNotes.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-4">
            No notes found. Try creating one!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {filteredNotes.map((note) => (
              <NoteCard key={note.id} {...note} onDelete={loadNotes} />
            ))}
          </div>
        )}
      </section>

      {/* Floating button (always visible bottom-right) */}
      <NewNoteDialog onCreated={loadNotes} floating selectedFolderId={selectedFolder} />
    </div>
  );
}