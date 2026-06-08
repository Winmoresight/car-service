"use client";

/**
 * ServiceCar Insight - Dashboard หน้าหลัก
 * แสดง KPI, กราฟยอดขาย, สินค้าขายดี และรายการขาดทุน
 */

import { format } from "date-fns";
import {
  Banknote,
  Calendar as CalendarIcon,
  CreditCard,
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { KPICard } from "@/components/dashboard/kpi-card";
import { LossAlertTable } from "@/components/dashboard/loss-alert-table";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { TopProductsTable } from "@/components/dashboard/top-products-table";
import { DatePicker } from "@/components/ui/date-picker";
import type {
  ApiResponse,
  DailySales,
  DashboardKPI,
  LossProduct,
  TopProduct,
} from "@/types/api";

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
  const isSelectedDateToday =
    !selectedDate ||
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const dateLabel = isSelectedDateToday ? "วันนี้" : "วันที่เลือก";

  if (hasError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-3xl border border-red-100 bg-red-50/50 px-6 py-10 text-center dark:border-red-500/20 dark:bg-red-500/10">
          <h1 className="mb-2 text-2xl font-bold text-main-red">เกิดข้อผิดพลาด</h1>
          <p className="font-medium text-muted-foreground">
            ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
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
    <div className="p-6 pb-16">
      <DashboardBreadcrumb href="/" isMain />

      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 flex h-auto w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm md:mt-6">
          <div className="mb-6 flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <LayoutDashboard strokeWidth={2.5} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold transition-all duration-1000">
                  ภาพรวม
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  สรุปข้อมูลยอดขายและกำไรประจำวัน
                </p>
              </div>
            </div>

            <div className="transition-all duration-1000 min-[798px]:mt-0">
              <DatePicker
                date={selectedDate}
                onDateChange={setSelectedDate}
                placeholder="เลือกวันที่"
              />
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid gap-4 min-[600px]:grid-cols-2 min-[1280px]:grid-cols-4">
            <KPICard
              title={`ยอดขาย${dateLabel}`}
              value={kpi?.todaySales || 0}
              subtitle={`${(kpi?.todayBills || 0).toLocaleString()} บิล`}
              icon={Banknote}
              variant="blue"
              format="currency"
            />
            <KPICard
              title={`กำไร${dateLabel}`}
              value={kpi?.todayProfit || 0}
              icon={TrendingUp}
              variant="emerald"
              format="currency"
            />
            <KPICard
              title="ยอดขายเดือนนี้"
              value={kpi?.monthSales || 0}
              subtitle={`${(kpi?.monthBills || 0).toLocaleString()} บิล`}
              icon={ShoppingCart}
              variant="purple"
              format="currency"
            />
            <KPICard
              title="อัตรากำไรขั้นต้น"
              value={kpi?.profitMargin || 0}
              icon={CalendarIcon}
              variant="orange"
              format="percent"
            />
          </div>

          {/* Payment Method Cards */}
          <div className="mt-4 grid gap-4 min-[600px]:grid-cols-2">
            <KPICard
              title={`เงินสด${dateLabel}`}
              value={kpi?.todayCash || 0}
              icon={Wallet}
              variant="blue"
              format="currency"
            />
            <KPICard
              title={`เงินโอน${dateLabel}`}
              value={kpi?.todayTransfer || 0}
              icon={CreditCard}
              variant="purple"
              format="currency"
            />
          </div>
        </div>

        {/* Sales Chart */}
        <SalesChart data={dailySales} />

        {/* Top Products and Loss Alert */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TopProductsTable products={topProducts} />
          <LossAlertTable products={lossProducts} />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            ข้อมูลอัพเดทอัตโนมัติทุก 30 วินาที · Last updated:{" "}
            {new Date().toLocaleTimeString("th-TH")}
          </p>
        </div>
      </div>
    </div>
  );
}
