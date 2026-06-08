"use client";

/**
 * Sales Page - หน้ายอดขาย
 * แสดงรายการบิลขายจากฐานข้อมูลจริง พร้อม filter และค้นหา
 */

import { format } from "date-fns";
import {
  Banknote,
  Download,
  FileText,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { outfit } from "@/components/fonts/fonts";
import { SaleDetailDialog } from "@/components/sales/sale-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
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

interface SaleItem {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  totalProfit: number;
  cash: number;
  transfer: number;
  itemCount: number;
}

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const limit = 20;

  // สร้าง URL สำหรับ API พร้อม query parameters
  const buildApiUrl = () => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: (page * limit).toString(),
    });

    if (searchTerm) {
      params.append("search", searchTerm);
    }

    if (dateRange?.from) {
      params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
    }

    if (dateRange?.to) {
      params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
    }

    return `/api/sales?${params.toString()}`;
  };

  // Fetch sales data
  const { data, error, isLoading } = useSWR<
    ApiResponse<{
      sales: SaleItem[];
      total: number;
      limit: number;
      offset: number;
      summary?: {
        totalSales: number;
        totalProfit: number;
      };
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
    onError: (err) => {
      console.error("SWR Error:", err);
    },
  });

  const sales = data?.success && data?.data?.sales ? data.data.sales : [];
  const total = data?.success && data?.data?.total ? data.data.total : 0;
  const summary =
    data?.success && data?.data?.summary ? data.data.summary : null;
  const totalPages = Math.ceil(total / limit);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatProfitMargin = (sale: SaleItem) => {
    if (sale.totalPrice <= 0) {
      return "0.0%";
    }

    return `${((sale.totalProfit / sale.totalPrice) * 100).toFixed(1)}%`;
  };

  const getPaymentMethods = (sale: SaleItem) => {
    const methods = [];

    if (sale.cash > 0) {
      methods.push({
        label: "สด",
        className:
          "bg-emerald-50 text-main-green border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
      });
    }

    if (sale.transfer > 0) {
      methods.push({
        label: "โอน",
        className:
          "bg-blue-50 text-main-blue border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20",
      });
    }

    return methods;
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0); // Reset to first page
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(0); // Reset to first page
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDateRange(undefined);
    setPage(0);
  };

  const hasActiveFilters = searchTerm || dateRange?.from || dateRange?.to;

  const handleViewSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSaleId(null);
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="ยอดขาย" href="/sales" />

      <hr className="my-4 hidden w-full min-[1025px]:block" />
      <div className="space-y-6">
        {/* Main White Box */}
        <div className="dark:bg-background mt-2 md:mt-6 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm">
          {/* Header Block inside the white box */}
          <div className="flex flex-col min-[798px]:flex-row min-[798px]:items-center min-[798px]:justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Banknote strokeWidth={2.5} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold">ยอดขาย</span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  รายการบิลขายทั้งหมด ({total.toLocaleString()} บิล)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4 min-[798px]:mt-0">
              <Button
                variant="outline"
                className="gap-2 text-[#28ab6e] border-[#28ab6e] hover:bg-[#28ab6e] hover:text-white"
              >
                <Download className="h-4 w-4" />
                ดาวน์โหลดเป็นไฟล์ Excel
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid min-[600px]:grid-cols-3 gap-4">
            <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4 min-h-[210px]">
              <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-blue-50 dark:bg-background/50 shrink-0">
                  <FileText
                    strokeWidth={2.5}
                    className="text-main-blue w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                  />
                </div>
                <div className="flex flex-col justify-between items-end min-[600px]:items-start gap-1 flex-1 min-h-[132px]">
                  <span className="text-primary text-lg font-semibold">
                    บิลทั้งหมด
                  </span>
                  <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                    <span className={`${outfit.className}`}>
                      {(total || 0).toLocaleString()}
                    </span>{" "}
                    บิล
                  </h3>
                  <span className="text-muted-foreground text-xs mt-1 font-medium">
                    ตั้งแต่ ก.พ. 2025
                  </span>
                </div>
              </div>
            </div>

            <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4 min-h-[210px]">
              <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-purple-50 dark:bg-background/50 shrink-0">
                  <Banknote
                    strokeWidth={2.5}
                    className="text-purple-600 w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                  />
                </div>
                <div className="flex flex-col justify-between items-end min-[600px]:items-start gap-1 flex-1 min-h-[132px]">
                  <span className="text-primary text-lg font-semibold">
                    ยอดขายรวม
                  </span>
                  <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                    <span className={`${outfit.className}`}>
                      {(summary?.totalSales || 0).toLocaleString()}
                    </span>{" "}
                    บาท
                  </h3>
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg text-main-green bg-emerald-50 mt-1">
                    {summary ? "ข้อมูลจริงจากฐานข้อมูล" : "กำลังโหลด..."}
                  </span>
                </div>
              </div>
            </div>

            <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4 min-h-[210px]">
              <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-emerald-50 dark:bg-background/50 shrink-0">
                  <TrendingUp
                    strokeWidth={2.5}
                    className="text-main-green w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                  />
                </div>
                <div className="flex flex-col justify-between items-end min-[600px]:items-start gap-1 flex-1 min-h-[132px]">
                  <span className="text-primary text-lg font-semibold">
                    กำไรรวม
                  </span>
                  <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                    <span className={`${outfit.className}`}>
                      {(summary?.totalProfit || 0).toLocaleString()}
                    </span>{" "}
                    บาท
                  </h3>
                  <span className="text-muted-foreground text-xs mt-1 font-medium">
                    กำไรตามยอดที่กรองไว้
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Actions below the cards */}
          <div className="mt-6 flex flex-col md:flex-row gap-4 pt-6 border-t border-border/50">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเลขที่บิล หรือชื่อลูกค้า..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                placeholder="เลือกช่วงวันที่"
              />
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  ล้างตัวกรอง
                </Button>
              )}
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
              <span>ตัวกรองที่เปิดใช้งาน:</span>
              {searchTerm && (
                <Badge variant="secondary">ค้นหา: {searchTerm}</Badge>
              )}
              {dateRange?.from && (
                <Badge variant="secondary">
                  {format(dateRange.from, "d MMM yyyy")}
                  {dateRange.to && ` - ${format(dateRange.to, "d MMM yyyy")}`}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Sales Table */}
        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                <FileText className="h-6 w-6 text-main-blue" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการบิลขาย
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  คลิกที่บิลเพื่อดูรายละเอียดสินค้าและการชำระเงิน
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-blue-50 px-4 text-sm font-bold text-main-blue dark:bg-blue-500/10">
                {sales.length} รายการในหน้านี้
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground"
              >
                ทั้งหมด {total.toLocaleString()} บิล
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
          ) : sales.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบข้อมูลบิลขาย
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ลองปรับคำค้นหาหรือช่วงวันที่ใหม่อีกครั้ง
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
                <Table>
                  <TableHeader className="bg-secondary/70">
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="w-[42%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                        บิล/ลูกค้า
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                        วันที่
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[620px]:table-cell">
                        รายการ
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        ยอดขาย
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[700px]:table-cell">
                        กำไร
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        การชำระ
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale, index) => {
                      const paymentMethods = getPaymentMethods(sale);

                      return (
                        <TableRow
                          key={sale.id}
                          className="group cursor-pointer border-border/60 transition-colors duration-200 hover:bg-blue-50/30 dark:hover:bg-blue-500/5"
                          onClick={() => handleViewSale(sale.id)}
                        >
                          <TableCell className="px-4 py-4 font-medium">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-sm font-bold text-main-blue select-none dark:border-blue-500/20 dark:bg-blue-500/10 min-[550px]:h-12 min-[550px]:w-12">
                                {page * limit + index + 1}
                              </div>
                              <div className="flex min-w-0 flex-col">
                                <span
                                  className={cn(
                                    outfit.className,
                                    "max-w-[120px] truncate text-sm font-bold text-card-foreground transition-colors group-hover:text-main-blue min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[550px]:text-base min-[1100px]:max-w-[420px]",
                                  )}
                                >
                                  {sale.id}
                                </span>
                                <p className="max-w-[120px] truncate text-sm font-semibold text-muted-foreground min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[1100px]:max-w-[420px]">
                                  {sale.customerName}
                                </p>
                                <p className="hidden text-xs font-medium text-muted-foreground min-[560px]:block min-[760px]:hidden">
                                  {formatDate(sale.date)}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-semibold text-card-foreground">
                                {formatDate(sale.date)}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground">
                                คลิกเพื่อดูรายละเอียด
                              </span>
                            </div>
                          </TableCell>

                          <TableCell
                            className={cn(
                              outfit.className,
                              "hidden text-right font-semibold text-muted-foreground min-[620px]:table-cell",
                            )}
                          >
                            {sale.itemCount}
                          </TableCell>

                          <TableCell className="text-right align-middle">
                            <div className="flex flex-col items-end">
                              <span
                                className={cn(
                                  outfit.className,
                                  "text-sm font-bold text-card-foreground min-[500px]:text-base",
                                )}
                              >
                                {formatCurrency(sale.totalPrice)}
                              </span>
                              <span
                                className={cn(
                                  "text-xs font-semibold min-[700px]:hidden",
                                  sale.totalProfit >= 0
                                    ? "text-main-green"
                                    : "text-main-red",
                                )}
                              >
                                กำไร {formatCurrency(sale.totalProfit)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="hidden text-right align-middle min-[700px]:table-cell">
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={cn(
                                  outfit.className,
                                  "font-bold",
                                  sale.totalProfit >= 0
                                    ? "text-main-green"
                                    : "text-main-red",
                                )}
                              >
                                {formatCurrency(sale.totalProfit)}
                              </span>
                              <span className="text-xs font-semibold text-muted-foreground">
                                {formatProfitMargin(sale)} margin
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right align-middle">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {paymentMethods.length > 0 ? (
                                  paymentMethods.map((method) => (
                                    <Badge
                                      key={method.label}
                                      variant="outline"
                                      className={cn(
                                        "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                                        method.className,
                                      )}
                                    >
                                      {method.label}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="h-7 rounded-full px-3 text-xs font-bold text-muted-foreground shadow-none"
                                  >
                                    ไม่ระบุ
                                  </Badge>
                                )}
                              </div>
                              <span className="hidden text-xs font-semibold text-muted-foreground min-[900px]:block">
                                {sale.itemCount} รายการ
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-white p-4 dark:bg-card sm:flex-row">
                  <p className="text-sm font-medium text-muted-foreground">
                    แสดง{" "}
                    <span className="font-bold text-card-foreground">
                      {page * limit + 1}
                    </span>
                    -
                    <span className="font-bold text-card-foreground">
                      {Math.min((page + 1) * limit, total)}
                    </span>{" "}
                    จาก{" "}
                    <span className="font-bold text-card-foreground">
                      {total.toLocaleString()}
                    </span>{" "}
                    บิล
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="h-8 font-bold"
                    >
                      ก่อนหน้า
                    </Button>
                    <div
                      className={cn(
                        outfit.className,
                        "flex h-8 items-center rounded-full bg-secondary px-4 text-sm font-bold text-card-foreground",
                      )}
                    >
                      {page + 1} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage(Math.min(totalPages - 1, page + 1))
                      }
                      disabled={page >= totalPages - 1}
                      className="h-8 font-bold"
                    >
                      ถัดไป
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sale Detail Dialog */}
        <SaleDetailDialog
          saleId={selectedSaleId}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
        />
      </div>
    </div>
  );
}
