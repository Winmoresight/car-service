"use client";

/**
 * ServiceCar Insight - Dashboard หน้าหลัก
 * แสดง KPI, กราฟยอดขาย, สินค้าขายดี และรายการขาดทุน
 */

import useSWR from "swr";
import {
  Banknote,
  TrendingUp,
  ShoppingCart,
  Wallet,
  CreditCard,
  Calendar,
} from "lucide-react";
import { KPICard } from "@/components/dashboard/kpi-card";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { TopProductsTable } from "@/components/dashboard/top-products-table";
import { LossAlertTable } from "@/components/dashboard/loss-alert-table";
import type {
  ApiResponse,
  DashboardKPI,
  DailySales,
  TopProduct,
  LossProduct,
} from "@/types/api";

// Fetcher function for SWR
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DashboardPage() {
  // Fetch dashboard KPI
  const { data: kpiData, error: kpiError } = useSWR<ApiResponse<DashboardKPI>>(
    "/api/dashboard",
    fetcher,
    { refreshInterval: 30000 }, // Refresh every 30 seconds
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

  const kpi = kpiData?.data;
  const dailySales = salesData?.data || [];
  const topProducts = topProductsData?.data || [];
  const lossProducts = lossProductsData?.data || [];

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">ServiceCar Insight</h1>
        <p className="text-muted-foreground mt-1">ระบบสรุปข้อมูลยอดขายและสินค้า</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
      <div className="grid gap-4 md:grid-cols-2 mb-8">
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
      <div className="mb-8">
        <SalesChart data={dailySales} />
      </div>

      {/* Top Products and Loss Alert */}
      <div className="grid gap-8 lg:grid-cols-2 mb-8">
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
