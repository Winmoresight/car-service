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
    <aside className="fixed inset-y-0 hidden w-64 flex-col border-r border-border bg-white min-[1025px]:flex">
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
            <p className="mb-3 px-3 text-sm font-medium text-muted-foreground">
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
                      "group flex items-center rounded-[8px] px-4 py-2.5 text-base font-medium transition-colors",
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
              <p className="mb-3 px-3 text-sm font-medium text-muted-foreground">
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
                        "group flex items-center rounded-[8px] px-4 py-2.5 text-base font-medium transition-colors",
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
    </aside>
  );
}
