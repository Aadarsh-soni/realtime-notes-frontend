"use client";

import { useAuthStore } from "@/libs/store";
import { AuthForm } from "@/components/AuthForm";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DarkModeToggle } from "@/components/DarkModeToggle";

export default function HomePage() {
  const { token } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  useEffect(() => {
    if (token) router.push("/notes");
  }, [token, router]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Custom header for auth page */}
      <header className="flex justify-between items-center p-4 border-b bg-background/80 backdrop-blur-sm">
        <h1 className="font-bold text-xl">Realtime Notes</h1>
        <DarkModeToggle />
      </header>
      
      {/* Main content */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="w-full max-w-md mx-auto p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-primary to-primary/80 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Welcome to Realtime Notes
            </h1>
            <p className="text-muted-foreground mt-2">Sign in to your account or create a new one</p>
          </div>
          
          <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 shadow-lg">
            {/* Tab Navigation */}
            <div className="flex mb-6 bg-muted/30 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("login")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === "login"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setActiveTab("signup")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                  activeTab === "signup"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign Up
              </button>
            </div>
            
            {/* Form Content */}
            <div className="min-h-[300px]">
              {activeTab === "login" ? (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-center">Welcome Back</h2>
                  <p className="text-muted-foreground text-center mb-6">Sign in to your account to continue</p>
                  <AuthForm mode="login" />
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-center">Create Account</h2>
                  <p className="text-muted-foreground text-center mb-6">Join us and start taking notes</p>
                  <AuthForm mode="register" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}