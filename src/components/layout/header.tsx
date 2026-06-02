"use client";

/**
 * Header Component
 * Header bar สำหรับ Mobile + Desktop
 */

import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="md:hidden sticky top-0 z-40 bg-white border-b">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center">
          <h1 className="text-lg font-bold text-gray-900">
            ServiceCar Insight
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
