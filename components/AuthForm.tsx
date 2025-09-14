"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/libs/store";
import { authAPI } from "@/libs/api";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { setAuth, setLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoadingState] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoadingState(true);
    setError("");
    setLoading(true);
    
    try {
      // Validation
      if (!email || !password) {
        throw new Error("Please fill in all fields");
      }
      
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      if (mode === "register" && !name.trim()) {
        throw new Error("Please enter your name");
      }
      
      let response;
      
      if (mode === "login") {
        response = await authAPI.login(email, password);
      } else {
        response = await authAPI.register(email, password, name.trim());
      }
      
      // Set auth data
      setAuth(response.token, response.user);
      
    } catch (err: unknown) {
      console.error("Auth error:", err);
      
      // Handle different error types
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string }, status?: number } };
        console.log('Axios error details:', axiosError);
        
        if (axiosError.response?.data?.message) {
          setError(axiosError.response.data.message);
        } else if (axiosError.response?.status === 404) {
          setError("Server endpoint not found. Please check the backend configuration.");
        } else if (axiosError.response?.status === 500) {
          setError("Server error. Please try again later.");
        } else {
          setError(`Request failed with status ${axiosError.response?.status || 'unknown'}`);
        }
      } else if (err instanceof Error) {
        console.log('Error details:', err);
        if (err.message.includes('Network Error')) {
          setError("Unable to connect to server. Please check your internet connection.");
        } else {
          setError(err.message);
        }
      } else {
        console.log('Unknown error:', err);
        setError("An error occurred. Please try again.");
      }
    } finally {
      setLoadingState(false);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        {mode === "register" && (
          <Input 
            placeholder="Enter your name" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="h-12 text-base"
            required
            disabled={loading}
          />
        )}
        <Input 
          placeholder="Enter your email" 
          type="email"
          value={email} 
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 text-base"
          required
          disabled={loading}
        />
        <Input 
          placeholder="Enter your password" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)}
          className="h-12 text-base"
          required
          disabled={loading}
        />
      </div>
      <Button 
        type="submit" 
        disabled={loading}
        className="w-full h-12 text-base font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
            {mode === "login" ? "Signing In..." : "Creating Account..."}
          </div>
        ) : (
          mode === "login" ? "Sign In" : "Create Account"
        )}
      </Button>
    </form>
  );
}