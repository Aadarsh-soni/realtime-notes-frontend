"use client";

import "./globals.css";
import { ReactNode, useEffect } from "react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { LogoutButton } from "@/components/LogoutButton";
import { useAuthStore } from "@/libs/store";
import { useThemeStore } from "@/libs/store";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: ReactNode }) {
  const { dark } = useThemeStore();
  const { token, initializeAuth } = useAuthStore();
  const pathname = usePathname();
  
  // Initialize auth on app start
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);
  
  // Show header only on authenticated pages (not on auth page)
  const showHeader = token && pathname !== "/";
  
  return (
    <html lang="en" className={dark ? "dark" : ""}>
      <body className="min-h-screen bg-background text-foreground">
        {showHeader && (
          <header className="flex justify-between items-center p-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
            <h1 className="font-bold text-xl">Realtime Notes</h1>
            <div className="flex items-center gap-4">
              <DarkModeToggle />
              <LogoutButton />
            </div>
          </header>
        )}
        <main className={showHeader ? "p-4" : ""}>{children}</main>
      </body>
    </html>
  );
}