"use client";

/**
 * ServiceCar Insight - Dashboard หน้าหลัก
 * แสดง KPI, กราฟยอดขาย, สินค้าขายดี และรายการขาดทุน
 */

import { format } from "date-fns";
import {
  Banknote,
  CreditCard,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Receipt,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value || 0);
}

interface MoneyBreakdownRow {
  label: string;
  amount: number;
  type?: "in" | "out" | "neutral";
}

interface MoneyBreakdownProps {
  title: string;
  subtitle: string;
  totalLabel: string;
  totalValue: number;
  icon: LucideIcon;
  rows: MoneyBreakdownRow[];
}

function MoneyBreakdown({
  title,
  subtitle,
  totalLabel,
  totalValue,
  icon: Icon,
  rows,
}: MoneyBreakdownProps) {
  return (
    <section className="rounded-[8px] border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-card-foreground">{title}</h2>
          <p className="text-sm font-semibold text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border bg-background text-primary">
          <Icon className="h-5 w-5" strokeWidth={2.5} />
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const amount =
            row.type === "out" ? -Math.abs(row.amount) : Math.abs(row.amount);
          const isOut = row.type === "out";

          return (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-[8px] border bg-background px-3 py-2"
            >
              <span className="min-w-0 text-sm font-semibold text-muted-foreground">
                {row.label}
              </span>
              <span
                className={
                  isOut
                    ? "shrink-0 text-sm font-bold text-main-red"
                    : "shrink-0 text-sm font-bold text-main-green"
                }
              >
                {amount < 0 ? "-" : "+"}
                {formatCurrency(Math.abs(amount))} บาท
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-1 rounded-[8px] border border-blue-100 bg-blue-50 px-3 py-3 dark:border-blue-500/20 dark:bg-blue-500/10">
        <span className="text-sm font-bold text-main-blue">{totalLabel}</span>
        <span className="text-2xl font-bold text-primary">
          {formatCurrency(totalValue)} บาท
        </span>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const router = useRouter();

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
        <div className="dark:bg-background mt-2 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm md:mt-6">
          <div className="mb-6 flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <LayoutDashboard strokeWidth={2.5} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold transition-all duration-1000">
                  สรุปเงินประจำวัน
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  ยอดขาย เงินสด เงินโอน ลูกหนี้ และใบวางบิลคู่ค้า
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

          {/* Daily Close KPIs */}
          <div className="grid gap-4 min-[600px]:grid-cols-2 min-[1280px]:grid-cols-4">
            <KPICard
              title={`ยอดขาย${dateLabel}`}
              value={kpi?.todaySales || 0}
              subtitle={`${formatNumber(kpi?.todayBills || 0)} บิล`}
              icon={Banknote}
              variant="emerald"
              format="currency"
            />
            <KPICard
              title="เงินสดในลิ้นชัก"
              value={kpi?.cashDrawerExpected || 0}
              subtitle="ยอดที่ควรตรงกับเงินสดหน้าร้าน"
              icon={Wallet}
              variant="emerald"
              format="currency"
            />
            <KPICard
              title="เงินโอนสุทธิ"
              value={kpi?.transferNet || 0}
              subtitle="ยอดขายโอน + รับหนี้ - จ่ายโอน"
              icon={CreditCard}
              variant="blue"
              format="currency"
            />
            <KPICard
              title="ลูกหนี้ค้างชำระ"
              value={kpi?.receivableTotal || 0}
              subtitle={`${formatNumber(kpi?.receivableCount || 0)} ใบ`}
              icon={FileText}
              variant="orange"
              format="currency"
            />
          </div>

          <div className="mt-4 grid gap-4 min-[600px]:grid-cols-2 min-[1280px]:grid-cols-4">
            <KPICard
              title="ลูกหนี้จ่ายวันนี้"
              value={kpi?.receivableCollected || 0}
              subtitle={`${formatNumber(kpi?.receivableCollectedCount || 0)} รายการ`}
              icon={Receipt}
              variant="emerald"
              format="currency"
              onClick={() => router.push("/tax-invoices/payments")}
            />
            <KPICard
              title="รายรับอื่น"
              value={kpi?.otherIncome || 0}
              subtitle={`${formatNumber(kpi?.otherPaymentCount || 0)} รายการรับ-จ่าย`}
              icon={Banknote}
              variant="emerald"
              format="currency"
            />
            <KPICard
              title="รายจ่ายอื่น"
              value={kpi?.otherExpense || 0}
              subtitle="รวมค่าใช้จ่ายที่ไม่ใช่ยอดขาย"
              icon={TrendingDown}
              variant="red"
              format="currency"
            />
            <KPICard
              title="ใบวางบิลคู่ค้า"
              value={kpi?.supplierBillTotal || 0}
              subtitle={`${formatNumber(kpi?.supplierBillCount || 0)} ใบ · สินค้าเข้า ${formatNumber(kpi?.stockInCount || 0)} รายการ`}
              icon={Package}
              variant="orange"
              format="currency"
            />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <MoneyBreakdown
            title="ตรวจเงินสด"
            subtitle="ใช้เทียบกับเงินในลิ้นชักตอนปิดวัน"
            totalLabel="เงินสดที่ควรมี"
            totalValue={kpi?.cashDrawerExpected || 0}
            icon={Wallet}
            rows={[
              {
                label: "ยอดขายเงินสด",
                amount: kpi?.todayCash || 0,
                type: "in",
              },
              {
                label: "ลูกหนี้จ่ายสด",
                amount: kpi?.receivableCollectedCash || 0,
                type: "in",
              },
              {
                label: "รายรับอื่นเงินสด",
                amount: kpi?.otherIncomeCash || 0,
                type: "in",
              },
              {
                label: "รายจ่ายเงินสด",
                amount: kpi?.otherExpenseCash || 0,
                type: "out",
              },
            ]}
          />

          <MoneyBreakdown
            title="ตรวจเงินโอน"
            subtitle="ยอดสุทธิจากรายการรับเข้าและจ่ายออกผ่านบัญชี"
            totalLabel="เงินโอนสุทธิ"
            totalValue={kpi?.transferNet || 0}
            icon={CreditCard}
            rows={[
              {
                label: "ยอดขายเงินโอน",
                amount: kpi?.todayTransfer || 0,
                type: "in",
              },
              {
                label: "ลูกหนี้จ่ายโอน",
                amount: kpi?.receivableCollectedTransfer || 0,
                type: "in",
              },
              {
                label: "รายรับอื่นเงินโอน",
                amount: kpi?.otherIncomeTransfer || 0,
                type: "in",
              },
              {
                label: "รายจ่ายเงินโอน",
                amount: kpi?.otherExpenseTransfer || 0,
                type: "out",
              },
            ]}
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
