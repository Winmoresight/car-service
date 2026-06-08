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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        <Card className="border-none shadow-sm ring-1 ring-border/50 overflow-hidden">
          <CardHeader className="bg-muted/5 border-b border-border/40">
            <CardTitle className="text-xl font-bold tracking-tight">
              รายการบิลขาย
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((row) => (
                  <Skeleton key={row} className="h-12 w-full" />
                ))}
              </div>
            ) : error || (data && !data.success) ? (
              <div className="text-center py-12">
                <p className="text-red-600 font-bold text-lg">
                  เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {error?.message || "Unknown error"}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow className="hover:bg-transparent border-none">
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          เลขที่บิล
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          วันที่
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          ลูกค้า
                        </TableHead>
                        <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                          รายการ
                        </TableHead>
                        <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                          ยอดขาย
                        </TableHead>
                        <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                          กำไร
                        </TableHead>
                        <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                          การชำระ
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-16">
                            <p className="text-muted-foreground font-medium">
                              ไม่พบข้อมูลบิลขาย
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        sales.map((sale) => (
                          <TableRow
                            key={sale.id}
                            className="cursor-pointer hover:bg-muted/20 transition-all duration-200 group border-border/40"
                            onClick={() => handleViewSale(sale.id)}
                          >
                            <TableCell className="font-mono font-bold text-primary group-hover:underline">
                              {sale.id}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {formatDate(sale.date)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-bold text-foreground">
                                  {sale.customerName}
                                </p>
                                {sale.customerPhone && (
                                  <p className="text-[10px] text-muted-foreground font-medium">
                                    {sale.customerPhone}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-muted-foreground">
                              {sale.itemCount}
                            </TableCell>
                            <TableCell className="text-right font-bold text-foreground">
                              {formatCurrency(sale.totalPrice)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={cn(
                                  "font-bold",
                                  sale.totalProfit >= 0
                                    ? "text-emerald-600"
                                    : "text-destructive",
                                )}
                              >
                                {formatCurrency(sale.totalProfit)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex gap-1.5 justify-center">
                                {sale.cash > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold shadow-none"
                                  >
                                    สด
                                  </Badge>
                                )}
                                {sale.transfer > 0 && (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold shadow-none"
                                  >
                                    โอน
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/5 border-t border-border/40">
                    <p className="text-sm text-muted-foreground font-medium">
                      แสดง{" "}
                      <span className="text-foreground font-bold">
                        {page * limit + 1}
                      </span>
                      -
                      <span className="text-foreground font-bold">
                        {Math.min((page + 1) * limit, total)}
                      </span>{" "}
                      จาก{" "}
                      <span className="text-foreground font-bold">
                        {total.toLocaleString()}
                      </span>{" "}
                      บิล
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="font-bold h-8"
                      >
                        ← ก่อนหน้า
                      </Button>
                      <div className="flex items-center gap-1 px-4 text-sm font-bold">
                        Page {page + 1} of {totalPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage(Math.min(totalPages - 1, page + 1))
                        }
                        disabled={page >= totalPages - 1}
                        className="font-bold h-8"
                      >
                        ถัดไป →
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

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
