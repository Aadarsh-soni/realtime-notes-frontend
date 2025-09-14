"use client";

import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/libs/store";
import { Button } from "@/components/ui/button";
import { notesAPI } from "@/libs/api";
import { RealtimeCollaboration, Operation, PresenceUser as RealtimePresenceUser } from "@/libs/realtime";

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
  
  const collaborationRef = useRef<RealtimeCollaboration | null>(null);
  const lastOperationRef = useRef<number>(0);

  // Load note content
  useEffect(() => {
    if (!token) return;

    const loadNote = async () => {
      try {
        const note = await notesAPI.getNote(noteId);
        setContent(note.content || "");
        setOriginalContent(note.content || "");
      } catch (error) {
        console.error("Error loading note:", error);
      }
    };

    loadNote();
  }, [noteId, token]);

  // Save note content
  const handleSave = async () => {
    if (!token || saving) return;

    setSaving(true);
    setSaved(false);

    try {
      await notesAPI.updateNote(noteId, { content });
      setOriginalContent(content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000); // Hide saved message after 2 seconds
    } catch (error) {
      console.error("Error saving note:", error);
    } finally {
      setSaving(false);
    }
  };

  // Check if content has changed
  const hasChanges = content !== originalContent;

  // Initialize real-time collaboration
  useEffect(() => { 
    if (!token || !user) return;

    const initializeCollaboration = async () => {
      try {
        // Create collaboration instance
        const collaboration = new RealtimeCollaboration(
          noteId,
          user.id,
          user.name || user.email || `User ${user.id}`,
          token,
          {
            onOperation: (operation: Operation) => {
              console.log('Received operation:', operation);
              // Apply operation to content
              setContent((prev) => {
                const before = prev.slice(0, operation.position);
                const after = prev.slice(operation.position + operation.deleteLen);
                return before + operation.insert + after;
              });
              lastOperationRef.current = operation.version || lastOperationRef.current + 1;
            },
            onPresenceUpdate: (users: RealtimePresenceUser[]) => {
              console.log('Presence update:', users);
              setPresence(users.map((u: RealtimePresenceUser) => ({
                id: u.userId,
                name: u.userName,
                email: u.userEmail,
                status: 'joined' as const
              })));
            },
            onError: (error: Error) => {
              console.error('Collaboration error:', error);
              setCollaborationError(error.message);
              setConnected(false);
            }
          }
        );

        collaborationRef.current = collaboration;

        // Join collaboration
        const result = await collaboration.join();
        if (result.success) {
          setConnected(true);
          setCollaborationError("");
        } else {
          setConnected(false);
          setCollaborationError(result.message || "Failed to join collaboration");
        }
      } catch (error) {
        console.error("Failed to initialize collaboration:", error);
        setConnected(false);
        setCollaborationError("Failed to initialize real-time collaboration");
      }
    };

    initializeCollaboration();

    return () => {
      if (collaborationRef.current) {
        collaborationRef.current.leave();
        collaborationRef.current = null;
      }
    };
  }, [noteId, token, user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        // Handle undo/redo shortcuts
        if (event.ctrlKey || event.metaKey) {
          if (event.key === 'z' && !event.shiftKey) {
            event.preventDefault();
            sendUndo();
          } else if (event.key === 'y' || (event.key === 'z' && event.shiftKey)) {
            event.preventDefault();
            sendRedo();
          }
        }
      } else {
        // Handle escape key for navigation
        if (event.key === 'Escape') {
          // You can add navigation logic here if needed
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connected, collaborationRef.current]);

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
        lastOperationRef.current,
        position,
        deleteLen,
        insert
      ).then((result) => {
        if (result.success) {
          lastOperationRef.current += 1;
        } else {
          console.error('Failed to send operation:', result.message);
        }
      });
    }
  }

  async function sendUndo() {
    if (!token) {
      console.log("Undo not available - no authentication token");
      setCollaborationError("Please log in to use undo functionality");
      return;
    }

    if (!connected || !collaborationRef.current) {
      console.log("Undo not available - not connected to collaboration");
      setCollaborationError("Undo not available - connect to real-time collaboration first");
      return;
    }

    console.log("Attempting undo operation...");
    try {
      const result = await collaborationRef.current.undo();
      console.log("Undo result:", result);
      if (result.success && result.content !== undefined) {
        setContent(result.content);
        setOriginalContent(result.content);
        setCollaborationError(""); // Clear any previous errors
        console.log("Undo successful");
      } else {
        console.error("Undo failed:", result.message);
        setCollaborationError(result.message || "Undo failed");
      }
    } catch (error) {
      console.error("Undo error:", error);
      setCollaborationError("Failed to undo operation - please try again");
    }
  }

  async function sendRedo() {
    if (!token) {
      console.log("Redo not available - no authentication token");
      setCollaborationError("Please log in to use redo functionality");
      return;
    }

    if (!connected || !collaborationRef.current) {
      console.log("Redo not available - not connected to collaboration");
      setCollaborationError("Redo not available - connect to real-time collaboration first");
      return;
    }

    console.log("Attempting redo operation...");
    try {
      const result = await collaborationRef.current.redo();
      console.log("Redo result:", result);
      if (result.success && result.content !== undefined) {
        setContent(result.content);
        setOriginalContent(result.content);
        setCollaborationError(""); // Clear any previous errors
        console.log("Redo successful");
      } else {
        console.error("Redo failed:", result.message);
        setCollaborationError(result.message || "Redo failed");
      }
    } catch (error) {
      console.error("Redo error:", error);
      setCollaborationError("Failed to redo operation - please try again");
    }
  }

  return (
    <div className="space-y-6">
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
            "Save Note"
          )}
        </Button>
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
          onClick={sendUndo} 
          disabled={!connected} 
          className="flex items-center gap-2"
          title={connected ? "Undo last change (Ctrl+Z)" : "Undo not available - connect to real-time collaboration"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Undo
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={sendRedo} 
          disabled={!connected} 
          className="flex items-center gap-2"
          title={connected ? "Redo last undone change (Ctrl+Y)" : "Redo not available - connect to real-time collaboration"}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
          Redo
        </Button>
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