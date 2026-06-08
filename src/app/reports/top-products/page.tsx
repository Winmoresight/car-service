"use client";

/**
 * Top Products Report Page - รายงานสินค้าขายดี
 * แสดงสินค้าขายดี Top 10 รายเดือน พร้อมสถิติ
 */

import {
  DollarSign,
  Download,
  ShoppingCart,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TopSellingProduct {
  rank: number;
  productName: string;
  barcode: string;
  salesCount: number;
  totalQuantity: number;
  totalSales: number;
  totalProfit: number;
  profitMargin: number;
}

interface MonthlySummary {
  period: string;
  totalProducts: number;
  totalSales: number;
  totalProfit: number;
  averageProfitMargin: number;
}

export default function TopProductsReportPage() {
  const currentDate = new Date();
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const [limit, setLimit] = useState(10);

  // สร้าง URL สำหรับ API
  const buildApiUrl = () => {
    const params = new URLSearchParams({
      month: month,
      year: year,
      limit: limit.toString(),
    });

    return `/api/products/top-selling?${params.toString()}`;
  };

  // Fetch top products
  const { data, error, isLoading } = useSWR<
    ApiResponse<{
      data: TopSellingProduct[];
      summary: MonthlySummary;
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
  });

  const products = data?.success && data?.data?.data ? data.data.data : [];
  const summary =
    data?.success && data?.data?.summary ? data.data.summary : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("th-TH").format(value || 0);
  };

  const getRankTone = (rank: number) => {
    if (rank === 1) {
      return {
        label: "อันดับ 1",
        className:
          "border-amber-100 bg-amber-50 text-main-orange dark:border-amber-500/20 dark:bg-amber-500/10",
        rowClassName:
          "hover:bg-amber-50/40 dark:hover:bg-amber-500/5 min-[760px]:bg-amber-50/20",
      };
    }

    if (rank === 2) {
      return {
        label: "อันดับ 2",
        className:
          "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300",
        rowClassName:
          "hover:bg-slate-50/60 dark:hover:bg-slate-500/5 min-[760px]:bg-slate-50/30",
      };
    }

    if (rank === 3) {
      return {
        label: "อันดับ 3",
        className:
          "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
        rowClassName:
          "hover:bg-orange-50/30 dark:hover:bg-orange-500/5 min-[760px]:bg-orange-50/20",
      };
    }

    return {
      label: `อันดับ ${rank}`,
      className:
        "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
      rowClassName: "hover:bg-blue-50/30 dark:hover:bg-blue-500/5",
    };
  };

  const getProfitMarginMeta = (margin: number) => {
    if (margin >= 20) {
      return {
        className:
          "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
        barClassName: "bg-main-green",
      };
    }

    if (margin >= 10) {
      return {
        className:
          "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
        barClassName: "bg-main-blue",
      };
    }

    if (margin >= 5) {
      return {
        className:
          "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
        barClassName: "bg-main-orange",
      };
    }

    return {
      className:
        "border-red-100 bg-red-50 text-main-red dark:border-red-500/20 dark:bg-red-500/10",
      barClassName: "bg-main-red",
    };
  };

  // สร้าง options สำหรับเดือน
  const months = [
    { value: "1", label: "มกราคม" },
    { value: "2", label: "กุมภาพันธ์" },
    { value: "3", label: "มีนาคม" },
    { value: "4", label: "เมษายน" },
    { value: "5", label: "พฤษภาคม" },
    { value: "6", label: "มิถุนายน" },
    { value: "7", label: "กรกฎาคม" },
    { value: "8", label: "สิงหาคม" },
    { value: "9", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" },
    { value: "12", label: "ธันวาคม" },
  ];

  // สร้าง options สำหรับปี
  const years = Array.from({ length: 5 }, (_, i) => {
    const y = currentDate.getFullYear() - i;
    return { value: y.toString(), label: (y + 543).toString() };
  });

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb
        label="รายงานสินค้าขายดี"
        href="/reports/top-products"
      />

      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 md:mt-6 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm">
          <div className="mb-6 flex flex-col min-[798px]:flex-row min-[798px]:items-center min-[798px]:justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Trophy strokeWidth={2.5} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold">
                  สินค้าขายดี Top 10
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  รายงานสินค้าขายดีรายเดือน
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid gap-4 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-4">
              <KPICard
                title="สินค้าทั้งหมด"
                value={summary.totalProducts}
                icon={ShoppingCart}
                variant="blue"
                subtitle={`ในเดือน${summary.period}`}
              />
              <KPICard
                title="ยอดขายรวม"
                value={summary.totalSales}
                format="currency"
                icon={DollarSign}
                variant="purple"
              />
              <KPICard
                title="กำไรรวม"
                value={summary.totalProfit}
                format="currency"
                icon={TrendingUp}
                variant="emerald"
              />
              <KPICard
                title="เฉลี่ย Margin"
                value={summary.averageProfitMargin}
                format="percent"
                icon={TrendingUp}
                variant="orange"
              />
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <span className="mb-2 block text-sm font-medium">เดือน</span>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <span className="mb-2 block text-sm font-medium">ปี</span>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.value} value={y.value}>
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <span className="mb-2 block text-sm font-medium">จำนวน</span>
                <Select
                  value={limit.toString()}
                  onValueChange={(v) => setLimit(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Top 5</SelectItem>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="20">Top 20</SelectItem>
                    <SelectItem value="50">Top 50</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" className="gap-2 w-full md:w-auto">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Products Table */}
        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10">
                <Trophy className="h-6 w-6 text-main-orange" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  สินค้าขายดี {summary?.period}
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  จัดอันดับตามยอดขายรวมของเดือนที่เลือก
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-amber-50 px-4 text-sm font-bold text-main-orange dark:bg-amber-500/10">
                Top {products.length || limit}
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground"
              >
                {summary?.period || "ช่วงเวลาที่เลือก"}
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 rounded-2xl border bg-white p-4 dark:bg-card">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                <Skeleton key={row} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : error || (data && !data.success) ? (
            <div className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-12 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <p className="text-lg font-bold text-main-red">
                เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {error?.message || "Unknown error"}
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Trophy className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบข้อมูลสินค้าขายดี
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ลองเปลี่ยนเดือน ปี หรือจำนวนอันดับใหม่อีกครั้ง
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
              <Table>
                <TableHeader className="bg-secondary/70">
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="w-[38%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                      สินค้า
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                      ขายได้
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[620px]:table-cell">
                      จำนวน
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      ยอดขาย
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                      กำไร
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      Margin
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const rankTone = getRankTone(product.rank);
                    const marginMeta = getProfitMarginMeta(
                      product.profitMargin,
                    );
                    const marginWidth = Math.max(
                      8,
                      Math.min(product.profitMargin * 2, 100),
                    );

                    return (
                      <TableRow
                        key={`${product.barcode}-${product.rank}`}
                        className={cn(
                          "group border-border/60 transition-colors duration-200",
                          rankTone.rowClassName,
                        )}
                      >
                        <TableCell className="px-4 py-4 font-medium">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold select-none min-[550px]:h-12 min-[550px]:w-12",
                                rankTone.className,
                              )}
                            >
                              {product.rank}
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span className="max-w-[150px] truncate text-base font-bold text-card-foreground transition-colors group-hover:text-main-orange min-[420px]:max-w-[220px] min-[550px]:max-w-[300px] min-[1100px]:max-w-[460px]">
                                {product.productName || "ไม่ระบุสินค้า"}
                              </span>
                              <span
                                className={cn(
                                  outfit.className,
                                  "text-xs font-semibold text-muted-foreground",
                                )}
                              >
                                {product.barcode || "-"}
                              </span>
                              <p className="text-xs font-semibold text-muted-foreground min-[620px]:hidden">
                                {formatNumber(product.totalQuantity)} ชิ้น ·{" "}
                                {formatNumber(product.salesCount)} ครั้ง
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right text-sm font-bold text-main-blue min-[760px]:table-cell",
                          )}
                        >
                          {formatNumber(product.salesCount)} ครั้ง
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right text-sm font-bold text-muted-foreground min-[620px]:table-cell",
                          )}
                        >
                          {formatNumber(product.totalQuantity)}
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                outfit.className,
                                "text-sm font-bold text-card-foreground min-[500px]:text-base",
                              )}
                            >
                              {formatCurrency(product.totalSales)}
                            </span>
                            <span className="text-xs font-semibold text-main-green min-[760px]:hidden">
                              กำไร {formatCurrency(product.totalProfit)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                          <span
                            className={cn(
                              outfit.className,
                              "font-bold",
                              product.totalProfit >= 0
                                ? "text-main-green"
                                : "text-main-red",
                            )}
                          >
                            {formatCurrency(product.totalProfit)}
                          </span>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                                marginMeta.className,
                              )}
                            >
                              {product.profitMargin.toFixed(1)}%
                            </Badge>
                            <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-secondary min-[900px]:block">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  marginMeta.barClassName,
                                )}
                                style={{ width: `${marginWidth}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
