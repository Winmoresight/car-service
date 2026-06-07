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
  UserCog,
  Receipt,
  FileText,
  Ban,
  History,
  Trash2,
  Trophy,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import Image from "next/image";
import { outfit } from "@/components/fonts/fonts";

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
    name: "รายการจ่ายเงิน",
    href: "/payments",
    icon: Receipt,
  },
  {
    name: "พนักงาน",
    href: "/employees",
    icon: UserCog,
  },
  {
    name: "ลูกค้า",
    href: "/customers",
    icon: Users,
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
    name: "Insights",
    href: "/insights",
    icon: TrendingUp,
  },
];

const taxAndReports = [
  {
    name: "ใบกำกับภาษี",
    href: "/tax-invoices",
    icon: FileText,
  },
  {
    name: "ใบกำกับเงินสด (PSC)",
    href: "/cash-invoices",
    icon: Banknote,
  },
  {
    name: "บิลที่ยกเลิก",
    href: "/tax-invoices/cancelled",
    icon: Ban,
  },
  {
    name: "ประวัติแก้ไขบิล",
    href: "/bills/edit-history",
    icon: History,
  },
  {
    name: "บิลที่ถูกลบ",
    href: "/bills/deleted",
    icon: Trash2,
  },
  {
    name: "สินค้าขายดี",
    href: "/reports/top-products",
    icon: Trophy,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-border">
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
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
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

          {/* Tax & Reports */}
          <div>
            <p className="px-3 mb-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
              ภาษี & รายงาน
            </p>
            <div className="space-y-1">
              {taxAndReports.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
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
        </nav>

        {/* Footer / User Profile */}
        {/*<div className="px-4 mt-auto">*/}
        {/*  <Separator className="mb-6" />*/}
        {/*  <div className="flex items-center gap-3 px-2 mb-2">*/}
        {/*    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center border border-border overflow-hidden">*/}
        {/*      <UserCog className="h-6 w-6 text-muted-foreground" />*/}
        {/*    </div>*/}
        {/*    <div className="flex flex-col">*/}
        {/*      <span className="text-sm font-bold text-primary leading-tight">*/}
        {/*        Win moresight*/}
        {/*      </span>*/}
        {/*      <span className="text-xs text-muted-foreground font-medium">*/}
        {/*        Administrator*/}
        {/*      </span>*/}
        {/*    </div>*/}
        {/*  </div>*/}
        {/*  <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-primary-foreground bg-primary rounded-xl hover:opacity-90 transition-opacity shadow-sm">*/}
        {/*    ออกจากระบบ*/}
        {/*  </button>*/}
        {/*</div>*/}
      </div>
    </div>
  );
}
