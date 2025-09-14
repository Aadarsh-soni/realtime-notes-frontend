"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { notesAPI } from "@/libs/api";

interface NoteCardProps {
  id: number;
  title: string;
  content: string;
  onDelete?: () => void;
}

export function NoteCard({ id, title, content, onDelete }: NoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation to note page
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      await notesAPI.deleteNote(id);
      onDelete?.();
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative group">
      <Link href={`/notes/${id}`}>
        <Card className="hover:shadow-md transition cursor-pointer">
          <CardHeader>
            <CardTitle className="truncate">{title || "Untitled Note"}</CardTitle>
            <CardDescription className="line-clamp-2">
              {content || "No content yet..."}
            </CardDescription>
          </CardHeader>
        </Card>
      </Link>
      
      {/* Delete button - appears on hover */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-8 w-8 p-0 bg-white border-white text-red-600 hover:bg-red-50 hover:border-red-300"
      >
        {isDeleting ? (
          <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
        ) : (
          "×"
        )}
      </Button>
    </div>
  );
}   