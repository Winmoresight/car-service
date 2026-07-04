"use client";

/**
 * Sidebar Component
 * Navigation สำหรับ Desktop
 */

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { outfit } from "@/components/fonts/fonts";
import { LogoutButton } from "@/components/layout/logout-button";
import {
  mainNavigation,
  taxAndReportNavigation,
} from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden min-[1025px]:flex min-[1025px]:w-64 min-[1025px]:flex-col min-[1025px]:fixed min-[1025px]:inset-y-0 bg-white border-r border-border">
      <div className="flex flex-col flex-grow pt-6 pb-4 overflow-y-auto">
        {/* Logo/Title */}
        <div className="flex items-center flex-shrink-0 px-6 mb-8">
          <div className="flex items-center gap-4">
            {/*<div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">*/}
            {/*<Package className="h-5 w-5 text-primary-foreground" />*/}
            {/*</div>*/}

            <div className="h-14 w-14 relative">
              <Image src="/logo.svg" alt="logo" width={56} height={56} />
            </div>

            <h1
              className={`${outfit.className} text-xl font-bold text-primary`}
            >
              CAR SERVICE
            </h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-8">
          {/* Main Menu */}
          <div>
            <p className="px-3 mb-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              เมนูหลัก
            </p>
            <div className="space-y-1">
              {mainNavigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center px-4 py-2.5 text-base font-semibold rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-background text-primary"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-primary",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-primary",
                      )}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {taxAndReportNavigation.length > 0 ? (
            <div>
              <p className="px-3 mb-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                ภาษี & รายงาน
              </p>
              <div className="space-y-1">
                {taxAndReportNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center px-4 py-2.5 text-base font-semibold rounded-lg transition-all duration-200",
                        isActive
                          ? "bg-background text-primary"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-primary",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground group-hover:text-primary",
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </nav>

        <div className="mt-auto px-4 pt-6">
          <LogoutButton className="w-full" />
        </div>
      </div>
    </div>
  );
}
