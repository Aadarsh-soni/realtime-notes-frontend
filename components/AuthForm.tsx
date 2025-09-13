"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import axios from "axios";
import { useAuthStore } from "@/libs/store";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/${mode}`;
    const res = await axios.post(url, { email, password });
    setAuth(res.data.token, res.data.user); 
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button type="submit" className="w-full">{mode === "login" ? "Login" : "Register"}</Button>
    </form>
  );
}