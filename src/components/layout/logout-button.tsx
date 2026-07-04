"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LogoutButton({ className }: { className?: string }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={cn("h-10 font-bold shadow-none", className)}
      disabled={isLoggingOut}
      onClick={handleLogout}
    >
      <LogOut className="h-4 w-4" />
      ออกจากระบบ
    </Button>
  );
}
