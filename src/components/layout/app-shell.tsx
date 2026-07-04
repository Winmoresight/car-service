"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <TooltipProvider>
      {isLoginPage ? null : <Sidebar />}

      <div
        className={cn(
          "flex min-h-screen flex-col",
          !isLoginPage && "min-[1025px]:pl-64",
        )}
      >
        <main
          className={cn("flex-1", !isLoginPage && "pb-20 min-[1025px]:pb-4")}
        >
          {children}
        </main>

        {isLoginPage ? null : <MobileNav />}
      </div>
    </TooltipProvider>
  );
}
