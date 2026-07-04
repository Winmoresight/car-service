import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { noto } from "@/components/fonts/fonts";
import { AppShell } from "@/components/layout/app-shell";
import { cn } from "@/lib/utils";

const siteUrl = "https://car.winmoresight.com";
const ogImageUrl = `${siteUrl}/opengraph-image.png`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "วิจิตรศิลปปักธงชัย",
  description: "ระบบสำหรับสรุปข้อมูลยอดขาย สินค้า ลูกค้า และรายงานต่างๆ",
  openGraph: {
    title: "วิจิตรศิลปปักธงชัย",
    description: "ระบบสำหรับสรุปข้อมูลยอดขาย สินค้า ลูกค้า และรายงานต่างๆ",
    url: siteUrl,
    type: "website",
    siteName: "วิจิตรศิลปปักธงชัย",
    locale: "th_TH",
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: "ระบบสำหรับสรุปข้อมูลยอดขาย สินค้า ลูกค้า และรายงานต่างๆ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [ogImageUrl],
  },
};

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="th" className={cn("h-full antialiased", noto.className)}>
      <body className="min-h-full flex flex-col font-noto">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
};

export default RootLayout;
