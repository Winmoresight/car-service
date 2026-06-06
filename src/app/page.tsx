"use client";

/**
 * ServiceCar Insight - Dashboard หน้าหลัก
 * แสดง KPI, กราฟยอดขาย, สินค้าขายดี และรายการขาดทุน
 */

import { useState } from "react";
import useSWR from "swr";
import {
  Banknote,
  Calendar as CalendarIcon,
  CreditCard,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { KPICard } from "@/components/dashboard/kpi-card";
import { LossAlertTable } from "@/components/dashboard/loss-alert-table";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { TopProductsTable } from "@/components/dashboard/top-products-table";
import type {
  ApiResponse,
  DailySales,
  DashboardKPI,
  LossProduct,
  TopProduct,
} from "@/types/api";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  // State สำหรับวันที่ที่เลือก (default = วันนี้)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );

  // สร้าง URL สำหรับ API พร้อม query parameter
  const dashboardUrl = selectedDate
    ? `/api/dashboard?date=${format(selectedDate, "yyyy-MM-dd")}`
    : "/api/dashboard";

  // Fetch dashboard KPI
  const { data: kpiData, error: kpiError } = useSWR<ApiResponse<DashboardKPI>>(
    dashboardUrl,
    fetcher,
    { refreshInterval: 30000 },
  );

  // Fetch daily sales (30 days)
  const { data: salesData, error: salesError } = useSWR<
    ApiResponse<DailySales[]>
  >("/api/sales/daily?days=30", fetcher, { refreshInterval: 60000 });

  // Fetch top products
  const { data: topProductsData, error: topProductsError } = useSWR<
    ApiResponse<TopProduct[]>
  >("/api/products/top?limit=10&sortBy=sales", fetcher, {
    refreshInterval: 60000,
  });

  // Fetch loss products
  const { data: lossProductsData, error: lossProductsError } = useSWR<
    ApiResponse<LossProduct[]>
  >("/api/products/loss?limit=5", fetcher, { refreshInterval: 60000 });

  const kpi = kpiData?.success && kpiData.data ? kpiData.data : undefined;
  const dailySales = salesData?.success && salesData.data ? salesData.data : [];
  const topProducts =
    topProductsData?.success && topProductsData.data
      ? topProductsData.data
      : [];
  const lossProducts =
    lossProductsData?.success && lossProductsData.data
      ? lossProductsData.data
      : [];

  const isLoading =
    !kpiData || !salesData || !topProductsData || !lossProductsData;
  const hasError =
    kpiError || salesError || topProductsError || lossProductsError;

  if (hasError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-main-red mb-2">
            เกิดข้อผิดพลาด
          </h1>
          <p className="text-muted-foreground">
            ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            กรุณาตรวจสอบการตั้งค่าใน .env.local
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header with Date Picker */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-card-foreground">
              ภาพรวม
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-main-green uppercase tracking-wider">
                Live
              </span>
            </div>
          </div>
          <p className="text-muted-foreground mt-1 font-medium">
            สรุปข้อมูลยอดขายและกำไรประจำวัน
          </p>
        </div>
        <div>
          <DatePicker
            date={selectedDate}
            onDateChange={setSelectedDate}
            placeholder="เลือกวันที่"
            className="bg-white hover:bg-white"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title={
            selectedDate &&
            format(selectedDate, "yyyy-MM-dd") !==
              format(new Date(), "yyyy-MM-dd")
              ? "ยอดขายวันที่เลือก"
              : "ยอดขายวันนี้"
          }
          value={kpi?.todaySales || 0}
          format="currency"
          icon={Banknote}
          subtitle={`${kpi?.todayBills || 0} บิล`}
          variant="blue"
        />
        <KPICard
          title={
            selectedDate &&
            format(selectedDate, "yyyy-MM-dd") !==
              format(new Date(), "yyyy-MM-dd")
              ? "กำไรวันที่เลือก"
              : "กำไรวันนี้"
          }
          value={kpi?.todayProfit || 0}
          format="currency"
          icon={TrendingUp}
          variant="emerald"
        />
        <KPICard
          title="ยอดขายเดือนนี้"
          value={kpi?.monthSales || 0}
          format="currency"
          icon={ShoppingCart}
          subtitle={`${kpi?.monthBills || 0} บิล`}
          variant="purple"
        />
        <KPICard
          title="อัตรากำไรขั้นต้น"
          value={kpi?.profitMargin || 0}
          format="percent"
          icon={CalendarIcon}
          variant="orange"
        />
      </div>

      {/* Payment Method Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <KPICard
          title={
            selectedDate &&
            format(selectedDate, "yyyy-MM-dd") !==
              format(new Date(), "yyyy-MM-dd")
              ? "เงินสดวันที่เลือก"
              : "เงินสดวันนี้"
          }
          value={kpi?.todayCash || 0}
          format="currency"
          icon={Wallet}
          variant="default"
        />
        <KPICard
          title={
            selectedDate &&
            format(selectedDate, "yyyy-MM-dd") !==
              format(new Date(), "yyyy-MM-dd")
              ? "เงินโอนวันที่เลือก"
              : "เงินโอนวันนี้"
          }
          value={kpi?.todayTransfer || 0}
          format="currency"
          icon={CreditCard}
          variant="default"
        />
      </div>

      {/* Sales Chart */}
      <SalesChart data={dailySales} />

      {/* Top Products and Loss Alert */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TopProductsTable products={topProducts} />
        <LossAlertTable products={lossProducts} />
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>
          ข้อมูลอัพเดทอัตโนมัติทุก 30 วินาที · Last updated:{" "}
          {new Date().toLocaleTimeString("th-TH")}
        </p>
      </div>
    </div>
  );
}
