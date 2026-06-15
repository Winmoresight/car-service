import {
  Ban,
  Banknote,
  FilePlus2,
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
    name: "เปิดบิล",
    href: "/bills/new",
    icon: FilePlus2,
  },
  {
    name: "ลูกหนี้",
    href: "/tax-invoices",
    icon: FileText,
  },
  {
    name: "รับ-จ่าย",
    href: "/payments",
    icon: Receipt,
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
    name: "สินค้า",
    href: "/products",
    icon: Package,
  },
  {
    name: "พนักงาน",
    href: "/employees",
    icon: UserCog,
  },
  {
    name: "วิเคราะห์",
    href: "/insights",
    icon: TrendingUp,
  },
] as const;

export const taxAndReportNavigation = [
  {
    name: "รับชำระลูกหนี้",
    href: "/tax-invoices/payments",
    icon: Receipt,
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
  {
    ...mainNavigation[2],
    name: "เปิดบิล",
  },
  {
    ...mainNavigation[3],
    name: "ลูกหนี้",
  },
  {
    ...mainNavigation[4],
    name: "รับ-จ่าย",
  },
] as const;
