"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/libs/store";

export function NoteEditor({ noteId }: { noteId: number }) {
  const { token } = useAuthStore();
  const [content, setContent] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws?token=${token}`);
    setSocket(ws);

    ws.onopen = () => ws.send(JSON.stringify({ type: "join", noteId }));

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "snapshot") setContent(data.content);
      if (data.type === "op") {
        // simple replace for now
        setContent((prev) => {
          const before = prev.slice(0, data.position);
          const after = prev.slice(data.position + data.deleteLen);
          return before + data.insert + after;
        });
      }
    };

    return () => {
      ws.send(JSON.stringify({ type: "leave" }));
      ws.close();
    };
  }, [noteId, token]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newText = e.target.value;
    const diffPos = content.length; // TODO: implement proper diff
    socket?.send(JSON.stringify({ type: "op", noteId, baseVersion: 0, position: diffPos, deleteLen: 0, insert: newText }));
    setContent(newText);
  }

  return (
    <textarea
      value={content}
      onChange={handleChange}
      className="w-full h-[70vh] p-2 border rounded-md"
    />
  );
}