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
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { outfit } from "@/components/fonts/fonts";
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
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";

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
    <>
      <div className="p-6 pb-16">
        <DashboardBreadcrumb href="/" isMain />

        <hr className="my-4 w-full" />

        <div className="space-y-6">
          <div className="dark:bg-background mt-6 flex h-auto w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-6 shadow-sm">
            <div className="flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-background dark:bg-secondary flex min-h-12 min-w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                  <LayoutDashboard strokeWidth={2.5} className="text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-primary text-2xl font-bold transition-all duration-1000">
                    ภาพรวม
                  </span>
                  <p className="text-foreground font-medium hidden min-[798px]:block">
                    สรุปข้อมูลยอดขายและกำไรประจำวัน
                  </p>
                </div>
              </div>

              <div className="transition-all duration-1000 mt-4 min-[798px]:mt-0">
                <DatePicker
                  date={selectedDate}
                  onDateChange={setSelectedDate}
                  placeholder="เลือกวันที่"
                />
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid min-[600px]:grid-cols-2 min-[1280px]:grid-cols-4 gap-4">
              <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4">
                <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                  <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-blue-50 dark:bg-background/50">
                    <Banknote
                      strokeWidth={2.5}
                      className="text-main-blue w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                    />
                  </div>
                  <div className="flex flex-col items-end min-[600px]:items-start gap-1">
                    <span className="text-primary text-lg font-semibold">
                      {selectedDate && format(selectedDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") ? "ยอดขายวันที่เลือก" : "ยอดขายวันนี้"}
                    </span>
                    <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                      <span className={`${outfit.className}`}>
                        {(kpi?.todaySales || 0).toLocaleString()}
                      </span>{" "}
                      บาท
                    </h3>
                    <span className="text-muted-foreground text-xs mt-1 font-medium">{kpi?.todayBills || 0} บิล</span>
                  </div>
                </div>
              </div>

              <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4">
                <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                  <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-emerald-50 dark:bg-background/50">
                    <TrendingUp
                      strokeWidth={2.5}
                      className="text-main-green w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                    />
                  </div>
                  <div className="flex flex-col items-end min-[600px]:items-start gap-1">
                    <span className="text-primary text-lg font-semibold">
                      {selectedDate && format(selectedDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") ? "กำไรวันที่เลือก" : "กำไรวันนี้"}
                    </span>
                    <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                      <span className={`${outfit.className}`}>
                        {(kpi?.todayProfit || 0).toLocaleString()}
                      </span>{" "}
                      บาท
                    </h3>
                  </div>
                </div>
              </div>

              <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4">
                <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                  <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-purple-50 dark:bg-background/50">
                    <ShoppingCart
                      strokeWidth={2.5}
                      className="text-purple-600 w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                    />
                  </div>
                  <div className="flex flex-col items-end min-[600px]:items-start gap-1">
                    <span className="text-primary text-lg font-semibold">
                      ยอดขายเดือนนี้
                    </span>
                    <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                      <span className={`${outfit.className}`}>
                        {(kpi?.monthSales || 0).toLocaleString()}
                      </span>{" "}
                      บาท
                    </h3>
                    <span className="text-muted-foreground text-xs mt-1 font-medium">{kpi?.monthBills || 0} บิล</span>
                  </div>
                </div>
              </div>

              <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4">
                <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                  <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-orange-50 dark:bg-background/50">
                    <CalendarIcon
                      strokeWidth={2.5}
                      className="text-main-orange w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                    />
                  </div>
                  <div className="flex flex-col items-end min-[600px]:items-start gap-1">
                    <span className="text-primary text-lg font-semibold">
                      อัตรากำไรขั้นต้น
                    </span>
                    <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                      <span className={`${outfit.className}`}>
                        {(kpi?.profitMargin || 0).toFixed(2)}
                      </span>{" "}
                      %
                    </h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Cards */}
            <div className="grid min-[600px]:grid-cols-2 gap-4 mt-4">
              <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4">
                <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                  <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-blue-50 dark:bg-background/50">
                    <Wallet
                      strokeWidth={2.5}
                      className="text-main-blue w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                    />
                  </div>
                  <div className="flex flex-col items-end min-[600px]:items-start gap-1">
                    <span className="text-primary text-lg font-semibold">
                      {selectedDate && format(selectedDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") ? "เงินสดวันที่เลือก" : "เงินสดวันนี้"}
                    </span>
                    <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                      <span className={`${outfit.className}`}>
                        {(kpi?.todayCash || 0).toLocaleString()}
                      </span>{" "}
                      บาท
                    </h3>
                  </div>
                </div>
              </div>

              <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4">
                <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                  <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-blue-50 dark:bg-background/50">
                    <CreditCard
                      strokeWidth={2.5}
                      className="text-main-blue w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                    />
                  </div>
                  <div className="flex flex-col items-end min-[600px]:items-start gap-1">
                    <span className="text-primary text-lg font-semibold">
                      {selectedDate && format(selectedDate, "yyyy-MM-dd") !== format(new Date(), "yyyy-MM-dd") ? "เงินโอนวันที่เลือก" : "เงินโอนวันนี้"}
                    </span>
                    <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                      <span className={`${outfit.className}`}>
                        {(kpi?.todayTransfer || 0).toLocaleString()}
                      </span>{" "}
                      บาท
                    </h3>
                  </div>
                </div>
              </div>
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
          <div className="text-center text-sm text-muted-foreground mt-8">
            <p>
              ข้อมูลอัพเดทอัตโนมัติทุก 30 วินาที · Last updated:{" "}
              {new Date().toLocaleTimeString("th-TH")}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
