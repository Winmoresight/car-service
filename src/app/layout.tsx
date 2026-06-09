import type { Metadata } from "next";
import { type ReactNode } from "react";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { noto } from "@/components/fonts/fonts";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Header } from "@/components/layout/header";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "วิจิตรศิลปปักธงชัย",
  description: "ระบบสำหรับสรุปข้อมูลยอดขาย สินค้า ลูกค้า และรายงานต่างๆ",
  openGraph: {
    title: "วิจิตรศิลปปักธงชัย",
    description: "ระบบสำหรับสรุปข้อมูลยอดขาย สินค้า ลูกค้า และรายงานต่างๆ",
    url: "https://car.winmoresight.com",
    type: "website",
    siteName: "วิจิตรศิลปปักธงชัย",
    locale: "th_TH",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "ระบบสำหรับสรุปข้อมูลยอดขาย สินค้า ลูกค้า และรายงานต่างๆ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image.png"],
  },
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="th" className={cn("h-full antialiased", noto.className)}>
      <body className="min-h-full flex flex-col font-noto">
        <TooltipProvider>
          {/* Desktop Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <div className="md:pl-64 flex flex-col min-h-screen">
            {/* Mobile Header */}
            {/*<Header />*/}

            {/* Page Content */}
            <main className="flex-1 pb-20 md:pb-4">{children}</main>

            {/* Mobile Bottom Navigation */}
            <MobileNav />
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
};

export default RootLayout;
