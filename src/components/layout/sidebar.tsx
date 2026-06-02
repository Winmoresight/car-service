"use client";

/**
 * Sidebar Component
 * Navigation สำหรับ Desktop
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

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
  {
    name: "Insights",
    href: "/insights",
    icon: TrendingUp,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r">
      <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
        {/* Logo/Title */}
        <div className="flex items-center flex-shrink-0 px-4">
          <h1 className="text-xl font-bold text-gray-900">Car Service</h1>
        </div>

        <Separator className="my-4" />

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
                )}
              >
                <item.icon
                  className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive
                      ? "text-white"
                      : "text-gray-400 group-hover:text-gray-500",
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 mt-4">
          <Separator className="mb-4" />
          <p className="text-xs text-gray-500">© 2026 ServiceCar Insight</p>
        </div>
      </div>
    </div>
  );
}
