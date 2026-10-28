"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFocusedPage =
    pathname === "/login" ||
    pathname === "/check-in" ||
    pathname === "/change-password";

  return (
    <TooltipProvider>
      {isFocusedPage ? null : <Sidebar />}

      <div
        className={cn(
          "flex min-h-screen flex-col print:min-h-0 print:pl-0",
          !isFocusedPage && "min-[1025px]:pl-64",
        )}
      >
        <main
          className={cn(
            "flex-1 print:pb-0",
            !isFocusedPage && "pb-20 min-[1025px]:pb-4",
          )}
        >
          {children}
        </main>

        {isFocusedPage ? null : <MobileNav />}
      </div>
    </TooltipProvider>
  );
}
