"use client";

/**
 * Mobile Navigation Component
 * Bottom navigation สำหรับ Mobile
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  UserCog,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "ภาพรวม",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "ยอดขาย",
    href: "/sales",
    icon: ShoppingCart,
  },
  {
    name: "พนักงาน",
    href: "/employees",
    icon: UserCog,
  },
  {
    name: "จ่ายเงิน",
    href: "/payments",
    icon: Receipt,
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-card border-t border-border z-50 pb-safe shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
      <nav className="flex justify-around items-center h-16">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-3 min-w-0 flex-1 h-full relative",
                "text-[10px] font-bold uppercase tracking-widest transition-all duration-300",
                isActive ? "text-main-blue" : "text-muted-foreground",
              )}
            >
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-main-blue rounded-b-full" />
              )}
              <item.icon
                className={cn(
                  "h-5 w-5 mb-1 transition-transform duration-300",
                  isActive ? "scale-110 text-main-blue" : "text-muted-foreground",
                )}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
