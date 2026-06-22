import {
  Banknote,
  FilePlus2,
  FileText,
  History,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Receipt,
  ShoppingCart,
  Trophy,
  Truck,
  UserCog,
  Users,
  Warehouse,
} from "lucide-react";

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

export const mainNavigation = [
  {
    name: "หน้าหลัก",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    name: "ยอดขาย",
    href: "/sales",
    icon: ShoppingCart,
  },
  {
    name: "เปิดบิล",
    href: "/bills/new",
    icon: FilePlus2,
  },
  {
    name: "รับจ่าย",
    href: "/payments",
    icon: Receipt,
  },
  {
    name: "ลูกค้า",
    href: "/customers",
    icon: Users,
  },
  {
    name: "ลูกหนี้",
    href: "/tax-invoices",
    icon: FileText,
  },
  {
    name: "รับชำระลูกหนี้",
    href: "/tax-invoices/payments",
    icon: Receipt,
  },
  {
    name: "สินค้าขายดี",
    href: "/reports/top-products",
    icon: Trophy,
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
    name: "คู่ค้า",
    href: "/supplier-bills",
    icon: Truck,
  },
  {
    name: "พนักงาน",
    href: "/employees",
    icon: UserCog,
  },
  {
    name: "ใบกำกับเงินสด",
    href: "/cash-invoices",
    icon: Banknote,
  },
  {
    name: "ประวัติแก้ไขบิล",
    href: "/bills/edit-history",
    icon: History,
  },
] as const satisfies readonly NavigationItem[];

export const taxAndReportNavigation: readonly NavigationItem[] = [];

export const mobilePrimaryNavigation = [
  mainNavigation[0],
  {
    ...mainNavigation[2],
    name: "เปิดบิล",
  },
  {
    ...mainNavigation[3],
    name: "รับจ่าย",
  },
  {
    ...mainNavigation[7],
    name: "รับลูกหนี้",
  },
] as const;
