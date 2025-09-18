"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { collabAPI } from "@/libs/api";
import { useAuthStore } from "@/libs/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ShareButtonProps {
  noteId: number;
  noteTitle?: string;
}

export function ShareButton({ noteId, noteTitle }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { token } = useAuthStore();
  const [users, setUsers] = useState<{ id: number; email: string; name?: string }[]>([]);
  const [toUserId, setToUserId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  
  // Create shareable URL
  const shareUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/notes/${noteId}?share=true`
    : `https://realtime-notes-frontend-khioi3yl9-aadarsh-sonis-projects.vercel.app/notes/${noteId}?share=true`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: noteTitle || `Note ${noteId}`,
          text: `Check out this collaborative note!`,
          url: shareUrl,
        });
      } catch (err) {
        console.error('Failed to share:', err);
      }
    } else {
      handleCopy();
    }
  };

  const openInvite = async () => {
    setIsOpen(true);
    setMessage(null);
    try {
      const res = await collabAPI.listOnlineUsers();
      setUsers(res.users);
    } catch (e) {
      setMessage("Failed to load users");
    }
  };

  const sendInvite = async () => {
    if (!token || !toUserId) return;
    setSending(true);
    setMessage(null);
    try {
      await collabAPI.shareNote(noteId, toUserId);
      setMessage("Invite sent");
    } catch (e) {
      setMessage("Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button onClick={openInvite} variant="outline" size="sm" className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Note</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Share this link to collaborate on this note. Anyone with the link can edit in real-time!
            </p>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1"
              />
              <Button onClick={handleCopy} variant="outline" size="sm">
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
          
          {token && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Invite a user</p>
              <select
                className="w-full border rounded p-2 text-sm bg-background"
                value={toUserId ?? ''}
                onChange={(e) => setToUserId(Number(e.target.value))}
              >
                <option value="" disabled>
                  Select user
                </option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email} (#{u.id})
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button onClick={sendInvite} disabled={!toUserId || sending}>
                  {sending ? 'Sending…' : 'Send Invite'}
                </Button>
                {message && (
                  <span className="text-xs text-muted-foreground self-center">{message}</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleShare} className="flex-1">
              Copy Link
            </Button>
            <Button 
              onClick={() => setIsOpen(false)} 
              variant="outline"
            >
              Close
            </Button>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Invite-based Collaboration
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Changes sync instantly between authorized users. Use the picker to invite.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
