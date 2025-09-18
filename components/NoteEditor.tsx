"use client";

import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/libs/store";
import { Button } from "@/components/ui/button";
import { notesAPI } from "@/libs/api";
import { RealtimeCollaboration, Operation, PresenceUser as RealtimePresenceUser } from "@/libs/realtime";
import { ShareButton } from "@/components/ShareButton";

interface PresenceUser {
  id: number;
  name?: string;
  email?: string;
  status: "joined" | "left";
}

export function NoteEditor({ noteId }: { noteId: number }) {
  const { token, user } = useAuthStore();
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [connected, setConnected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [collaborationError, setCollaborationError] = useState("");
  const [isAnonymousMode, setIsAnonymousMode] = useState(false);
  const [anonymousUser, setAnonymousUser] = useState<{id: number, name: string} | null>(null);
  const [loading, setLoading] = useState(true);
  
  const collaborationRef = useRef<RealtimeCollaboration | null>(null);

  // Check for anonymous mode and load note content
  useEffect(() => {
    // Check if we're in share mode (anonymous)
    const urlParams = new URLSearchParams(window.location.search);
    const isShareMode = urlParams.get('share') === 'true';
    
    if (isShareMode && !token) {
      // Anonymous mode - create a temporary user
      const anonymousId = Math.floor(Math.random() * 1000000);
      const anonymousName = `Anonymous User ${anonymousId}`;
      setAnonymousUser({ id: anonymousId, name: anonymousName });
      setIsAnonymousMode(true);
      
      // Load note content without authentication
      const loadNoteAnonymous = async () => {
        try {
          // Try to load note without auth (this might fail, but we'll handle it)
          const response = await fetch(`https://realtime-notes-backend.vercel.app/notes/${noteId}`);
          if (response.ok) {
            const note = await response.json();
            setContent(note.content || "");
            setOriginalContent(note.content || "");
          } else {
            // If we can't load the note, start with empty content
            setContent("");
            setOriginalContent("");
          }
        } catch (error) {
          console.error("Error loading note anonymously:", error);
          setContent("");
          setOriginalContent("");
        } finally {
          setLoading(false);
        }
      };
      
      loadNoteAnonymous();
    } else if (token) {
      // Authenticated mode
      const loadNote = async () => {
        try {
          const note = await notesAPI.getNote(noteId);
          setContent(note.content || "");
          setOriginalContent(note.content || "");
        } catch (error) {
          console.error("Error loading note:", error);
        } finally {
          setLoading(false);
        }
      };
      
      loadNote();
    } else {
      // No token and not in share mode - set loading to false
      setLoading(false);
    }
  }, [noteId, token]);

  // Save note content
  const handleSave = async () => {
    if (saving) return;

    setSaving(true);
    setSaved(false);

    try {
      if (isAnonymousMode) {
        // For anonymous mode, we can't save to the backend
        // Just update the local state
        setOriginalContent(content);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        console.log("Note content updated locally (anonymous mode)");
      } else if (token) {
        await notesAPI.updateNote(noteId, { content });
        setOriginalContent(content);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setSaving(false);
    }
  };

  // Check if content has changed
  const hasChanges = content !== originalContent;

  // Initialize WebSocket-based real-time collaboration
  useEffect(() => { 
    const currentToken = token;
    if (!currentToken) return;

    const collaboration = new RealtimeCollaboration(
      noteId,
      currentToken,
      {
        onOperation: (operation: Operation) => {
          setContent((prev) => {
            const before = prev.slice(0, operation.position);
            const after = prev.slice(operation.position + operation.deleteLen);
            return before + operation.insert + after;
          });
        },
        onPresenceUpdate: (users: RealtimePresenceUser[]) => {
          setPresence(users.map((u: RealtimePresenceUser) => ({
            id: u.userId,
            name: u.userName,
            email: u.userEmail,
            status: 'joined' as const
          })));
        },
        onError: (error: Error) => {
          setCollaborationError(error.message);
          setConnected(false);
        }
      }
    );

    collaborationRef.current = collaboration;
    collaboration.connect();
    setConnected(true);

    return () => {
      collaboration.close();
      collaborationRef.current = null;
    };
  }, [noteId, token]);

  // Undo/Redo not supported in WS flow currently

  // Keyboard shortcuts (disable undo/redo for now)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        // reserved for future shortcuts
      } else {
        // Handle escape key for navigation
        if (event.key === 'Escape') {
          // You can add navigation logic here if needed
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connected]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newText = e.target.value;
    const oldText = content;
    
    // Calculate the operation
    const position = Math.min(e.target.selectionStart, oldText.length);
    const deleteLen = oldText.length - position;
    const insert = newText.slice(position);
    
    // Update local content immediately
    setContent(newText);
    
    // Send operation if connected
    if (connected && collaborationRef.current) {
      collaborationRef.current.sendOperation(
        position,
        deleteLen,
        insert
      );
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        <span className="ml-2 text-muted-foreground">Loading note...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Anonymous Mode Banner */}
      {isAnonymousMode && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 dark:text-blue-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">
                Anonymous Collaboration Mode
              </p>
              <p className="text-blue-700 dark:text-blue-300 mt-1 text-sm">
                You&apos;re editing as {anonymousUser?.name}. Changes sync in real-time with other users. 
                No account required - just share the link!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-sm text-muted-foreground">
              {connected ? 'Real-time connected' : 'Offline mode'}
            </span>
          </div>

          {/* Save Status */}
          {saved && (
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">Saved</span>
            </div>
          )}

          {hasChanges && !saved && (
            <div className="flex items-center gap-2 text-orange-600">
              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
              <span className="text-sm font-medium">Unsaved changes</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Share Button - Show for authenticated users */}
          {token && user && (
            <ShareButton noteId={noteId} noteTitle={`Note ${noteId}`} />
          )}
          
          {/* Save Button */}
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="min-w-[100px]"
          >
            {saving ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                Saving...
              </div>
            ) : (
              isAnonymousMode ? "Updated" : "Save Note"
            )}
          </Button>
        </div>
      </div>

      {/* Collaboration Status */}
      {!connected && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-yellow-600 dark:text-yellow-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                {collaborationError ? "Real-time collaboration error" : "Real-time collaboration unavailable"}
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1 text-sm">
                {collaborationError || "You can still edit notes, but changes won't sync in real-time with other users. Use the Save button to persist your changes."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {connected && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-green-600 dark:text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">Real-time collaboration active</p>
              <p className="text-green-700 dark:text-green-300 mt-1 text-sm">
                Changes will sync in real-time with other users. You can see who else is editing this note below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Presence Indicator */}
      {connected && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/20 rounded-lg">
          <span className="text-sm text-muted-foreground">Currently editing:</span>
          {presence.length === 0 ? (
            <span className="text-sm italic">Only you</span>
          ) : (
            presence.map((p: PresenceUser) => (
              <span
                key={p.id}
                className="px-2 py-1 rounded bg-primary/10 text-primary text-sm font-medium"
              >
                {p.name || p.email || `User ${p.id}`}
              </span>
            ))
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          disabled
          className="flex items-center gap-2"
          title="Undo not available"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Undo
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          disabled
          className="flex items-center gap-2"
          title="Redo not available"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
          Redo
        </Button>
      </div>

      {/* Debug Info - Temporary for troubleshooting */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2 text-yellow-800 dark:text-yellow-200">🔧 Debug Info</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-medium">Auth Token:</span>
            <span className="ml-2 font-mono">{token ? 'Present' : 'Missing'}</span>
          </div>
          <div>
            <span className="font-medium">User:</span>
            <span className="ml-2 font-mono">{user?.name || user?.email || 'None'}</span>
          </div>
          <div>
            <span className="font-medium">Anonymous Mode:</span>
            <span className="ml-2 font-mono">{isAnonymousMode ? 'Yes' : 'No'}</span>
          </div>
          <div>
            <span className="font-medium">Share Button:</span>
            <span className="ml-2 font-mono">{token && user ? 'Should Show' : 'Hidden'}</span>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="border rounded-lg overflow-hidden">
        <textarea
          value={content}
          onChange={handleChange}
          className="w-full h-[60vh] p-4 border-0 resize-none focus:outline-none focus:ring-0"
          placeholder={connected ? "Start typing..." : "Type your note content here and click Save when done..."}
        />
      </div>
    </div>
  );
}