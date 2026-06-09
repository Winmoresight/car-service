"use client";

/**
 * Mobile Navigation Component
 * Bottom navigation สำหรับ Mobile
 */

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  mainNavigation,
  mobilePrimaryNavigation,
  taxAndReportNavigation,
} from "@/components/layout/navigation";
import { cn } from "@/lib/utils";

const drawerSections = [
  {
    title: "เมนูหลัก",
    items: mainNavigation,
  },
  {
    title: "ภาษี & รายงาน",
    items: taxAndReportNavigation,
  },
] as const;

const isActivePath = (pathname: string, href: string) => pathname === href;

export function MobileNav() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const leftNavigation = mobilePrimaryNavigation.slice(0, 2);
  const rightNavigation = mobilePrimaryNavigation.slice(2);
  const isPrimaryActive = mobilePrimaryNavigation.some((item) =>
    isActivePath(pathname, item.href),
  );
  const isMenuActive = isMenuOpen || !isPrimaryActive;

  const renderPrimaryItem = (
    item: (typeof mobilePrimaryNavigation)[number],
  ) => {
    const isActive = isActivePath(pathname, item.href);

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          "relative flex h-full min-w-0 flex-col items-center justify-center px-1 py-2",
          "text-[10px] font-bold tracking-wide transition-all duration-300",
          isActive ? "text-main-blue" : "text-muted-foreground",
        )}
        onClick={() => setIsMenuOpen(false)}
      >
        {isActive && (
          <div className="absolute top-0 h-1 w-8 rounded-b-full bg-main-blue" />
        )}
        <item.icon
          className={cn(
            "mb-1 h-5 w-5 transition-transform duration-300",
            isActive ? "scale-110 text-main-blue" : "text-muted-foreground",
          )}
          strokeWidth={2.5}
        />
        <span className="max-w-full truncate">{item.name}</span>
      </Link>
    );
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 md:hidden">
      {isMenuOpen ? (
        <button
          type="button"
          aria-label="ปิดเมนูทั้งหมด"
          className="pointer-events-auto fixed inset-0 z-40 bg-primary/5 backdrop-blur-[1px]"
          onClick={() => setIsMenuOpen(false)}
        />
      ) : null}

      {isMenuOpen ? (
        <div
          id="mobile-nav-drawer"
          className="pointer-events-auto absolute inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))] z-50 max-h-[68vh] translate-y-0 overflow-y-auto rounded-t-[28px] border border-x-0 border-b-0 bg-card p-4 opacity-100 shadow-[0_-18px_60px_rgba(15,23,42,0.14)] transition-all duration-300"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-card-foreground">
                เมนูทั้งหมด
              </h2>
              <p className="text-xs font-semibold text-muted-foreground">
                เลือกหน้าที่ต้องการใช้งานในระบบ
              </p>
            </div>
            <button
              type="button"
              aria-label="ปิดเมนู"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>

          <div className="space-y-5">
            {drawerSections.map((section) => (
              <section key={section.title}>
                <p className="mb-3 text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                  {section.title}
                </p>
                <div className="grid grid-cols-4 gap-2.5">
                  {section.items.map((item) => {
                    const isActive = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "group flex min-h-[86px] flex-col items-center justify-start gap-2 rounded-2xl border bg-background px-2 py-3 text-center transition-all duration-200",
                          isActive
                            ? "border-main-blue/40 bg-blue-50 text-main-blue shadow-sm dark:bg-blue-500/10"
                            : "text-muted-foreground hover:border-main-blue/30 hover:text-main-blue",
                        )}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl border bg-white transition-colors dark:bg-background/65",
                            isActive
                              ? "border-main-blue/30 text-main-blue"
                              : "text-muted-foreground group-hover:text-main-blue",
                          )}
                        >
                          <item.icon className="h-5 w-5" strokeWidth={2.5} />
                        </span>
                        <span className="line-clamp-2 text-[11px] leading-snug font-bold">
                          {item.name}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto relative z-50 border-t border-border bg-card pb-safe shadow-[0_-10px_30px_rgba(15,23,42,0.08)]">
        <nav className="grid h-[72px] grid-cols-5 items-stretch">
          {leftNavigation.map(renderPrimaryItem)}

          <div className="relative flex h-full items-center justify-center">
            <button
              type="button"
              aria-controls="mobile-nav-drawer"
              aria-expanded={isMenuOpen}
              aria-label="เปิดเมนูทั้งหมด"
              className={cn(
                "relative flex h-full w-full min-w-0 flex-col items-center justify-center px-1 py-2",
                "text-[10px] font-bold tracking-wide transition-all duration-300",
                isMenuActive ? "text-main-blue" : "text-muted-foreground",
              )}
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              {isMenuActive ? (
                <div className="absolute top-0 h-1 w-8 rounded-b-full bg-main-blue" />
              ) : null}
              <Menu
                className={cn(
                  "mb-1 h-5 w-5 transition-transform duration-300",
                  isMenuActive
                    ? "scale-110 text-main-blue"
                    : "text-muted-foreground",
                )}
                strokeWidth={2.5}
              />
              <span className="text-[10px] font-bold">เมนู</span>
            </button>
          </div>

          {rightNavigation.map(renderPrimaryItem)}
        </nav>
      </div>
    </div>
  );
}
