import type { Metadata } from "next";
import { type ReactNode } from "react";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { noto } from "@/components/fonts/fonts";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "ServiceCar Insight - ระบบสรุปข้อมูลยอดขาย",
  description: "Dashboard สำหรับสรุปข้อมูลยอดขาย สินค้า สต็อก และลูกค้า",
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="th" className={cn("h-full antialiased", noto.className)}>
      <body className="min-h-full flex flex-col font-noto bg-gray-50">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className="md:pl-64 flex flex-col min-h-screen">
          {/* Mobile Header */}
          <Header />

          {/* Page Content */}
          <main className="flex-1 pb-20 md:pb-4">{children}</main>

          {/* Mobile Bottom Navigation */}
          <MobileNav />
        </div>
      </body>
    </html>
  );
};

export default RootLayout;
