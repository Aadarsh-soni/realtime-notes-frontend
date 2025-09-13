"use client";

import { Switch } from "@/components/ui/switch";
import { useThemeStore } from "@/libs/store";

export function DarkModeToggle() {
  const { dark, toggle } = useThemeStore();
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Dark Mode</span>
      <Switch checked={dark} onCheckedChange={toggle} />
    </div>
  );
}