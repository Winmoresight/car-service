import {
  Ban,
  Banknote,
  FileText,
  History,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Trophy,
  UserCog,
  Users,
  Warehouse,
} from "lucide-react";

export const mainNavigation = [
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
] as const;

export const taxAndReportNavigation = [
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
] as const;

export const mobilePrimaryNavigation = [
  mainNavigation[0],
  mainNavigation[1],
  mainNavigation[3],
  {
    ...mainNavigation[2],
    name: "จ่ายเงิน",
  },
] as const;
