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
    name: "สินค้า",
    href: "/products",
    icon: Package,
  },
  {
    name: "สต็อก",
    href: "/stock",
    icon: Warehouse,
  },
  {
    name: "ลูกค้า",
    href: "/customers",
    icon: Users,
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t z-50">
      <nav className="flex justify-around">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center py-2 px-3 min-w-0 flex-1",
                "text-xs font-medium transition-colors",
                isActive
                  ? "text-gray-900"
                  : "text-gray-500 hover:text-gray-900",
              )}
            >
              <item.icon
                className={cn(
                  "h-6 w-6 mb-1",
                  isActive ? "text-gray-900" : "text-gray-400",
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
