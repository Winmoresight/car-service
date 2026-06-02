"use client";

/**
 * ServiceCar Insight - Dashboard หน้าหลัก
 * แสดง KPI, กราฟยอดขาย, สินค้าขายดี และรายการขาดทุน
 */

import useSWR from "swr";
import {
  Banknote,
  Calendar,
  CreditCard,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
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

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  // Fetch dashboard KPI
  const { data: kpiData, error: kpiError } = useSWR<ApiResponse<DashboardKPI>>(
    "/api/dashboard",
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
  const dailySales =
    salesData?.success && salesData.data ? salesData.data : [];
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
          <h1 className="text-2xl font-bold text-red-600 mb-2">เกิดข้อผิดพลาด</h1>
          <p className="text-muted-foreground">ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้</p>
          <p className="text-sm text-muted-foreground mt-2">
            กรุณาตรวจสอบการตั้งค่าใน .env.local
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ภาพรวม</h1>
        <p className="text-muted-foreground mt-1">
          สรุปข้อมูลยอดขายและกำไรประจำวัน
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="ยอดขายวันนี้"
          value={kpi?.todaySales || 0}
          format="currency"
          icon={Banknote}
          subtitle={`${kpi?.todayBills || 0} บิล`}
        />
        <KPICard
          title="กำไรวันนี้"
          value={kpi?.todayProfit || 0}
          format="currency"
          icon={TrendingUp}
        />
        <KPICard
          title="ยอดขายเดือนนี้"
          value={kpi?.monthSales || 0}
          format="currency"
          icon={ShoppingCart}
          subtitle={`${kpi?.monthBills || 0} บิล`}
        />
        <KPICard
          title="อัตรากำไรขั้นต้น"
          value={kpi?.profitMargin || 0}
          format="percent"
          icon={Calendar}
        />
      </div>

      {/* Payment Method Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <KPICard
          title="เงินสดวันนี้"
          value={kpi?.todayCash || 0}
          format="currency"
          icon={Wallet}
        />
        <KPICard
          title="เงินโอนวันนี้"
          value={kpi?.todayTransfer || 0}
          format="currency"
          icon={CreditCard}
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
