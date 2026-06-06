"use client";

/**
 * Header Component
 * Header bar สำหรับ Mobile + Desktop
 */

import { Bell, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-white border-b border-border shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-bold text-primary tracking-tight">
            Car Service
          </h1>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-600 rounded-full" />
          </Button>
        </div>
      </div>
    </header>
  );
}
