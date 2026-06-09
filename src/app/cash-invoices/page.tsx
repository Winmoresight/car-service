"use client";

/**
 * Cash Invoices Page - ใบกำกับภาษีเงินสดหน้าร้าน (PSC)
 * แสดงรายการใบกำกับภาษีเงินสดที่มีรหัสขึ้นต้นด้วย psc จาก DetailSalePost
 */

import { format } from "date-fns";
import {
  Download,
  FileText,
  Receipt,
  Search,
  ShoppingCart,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { outfit } from "@/components/fonts/fonts";
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

interface CashInvoice {
  invoiceNo: string;
  dateSalePost: string;
  customerCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalAmount: number;
  userName: string;
  typeSale: string;
}

export default function CashInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
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

    return `/api/cash-invoices?${params.toString()}`;
  };

  // Fetch cash invoices data
  const { data, error, isLoading } = useSWR<
    ApiResponse<{
      cashInvoices: CashInvoice[];
      total: number;
      limit: number;
      offset: number;
      summary: {
        totalAmount: number;
        totalInvoices: number;
        totalQuantity: number;
      };
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
  });

  const cashInvoices =
    data?.success && data?.data?.cashInvoices ? data.data.cashInvoices : [];
  const total = data?.success && data?.data?.total ? data.data.total : 0;
  const summary =
    data?.success && data?.data?.summary
      ? data.data.summary
      : {
          totalAmount: 0,
          totalInvoices: 0,
          totalQuantity: 0,
        };
  const totalPages = Math.ceil(total / limit);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return "-";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDateRange(undefined);
    setPage(0);
  };

  const hasActiveFilters = searchTerm || dateRange?.from || dateRange?.to;

  const getStatusBadge = (typeSale: string) => {
    // TypeSale: '1' = ตรอ, '2' = พรบ, '3' = ภาษี, '4' = บริการ, '25' = อะไหล่
    const typeMap: Record<string, { label: string; className: string }> = {
      "1": {
        label: "ตรอ",
        className:
          "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
      },
      "2": {
        label: "พรบ",
        className:
          "border-purple-100 bg-purple-50 text-purple-600 dark:border-purple-500/20 dark:bg-purple-500/10",
      },
      "3": {
        label: "ภาษี",
        className:
          "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
      },
      "4": {
        label: "บริการ",
        className:
          "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
      },
      "25": {
        label: "อะไหล่",
        className:
          "border-cyan-100 bg-cyan-50 text-cyan-700 dark:border-cyan-500/20 dark:bg-cyan-500/10",
      },
    };

    const type = typeMap[typeSale];
    if (type) {
      return (
        <Badge
          variant="outline"
          className={cn(
            "h-7 rounded-full px-3 text-xs font-bold shadow-none",
            type.className,
          )}
        >
          {type.label}
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="h-7 rounded-full px-3 text-xs font-bold text-muted-foreground shadow-none"
      >
        {typeSale || "-"}
      </Badge>
    );
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="ใบกำกับเงินสด" href="/cash-invoices" />
      <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm">
          {/* Header Block inside the white box */}
          <div className="flex flex-col min-[798px]:flex-row min-[798px]:items-center min-[798px]:justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Receipt strokeWidth={2.5} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold">
                  ใบกำกับภาษีเงินสดหน้าร้าน (PSC)
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  รายการใบกำกับภาษีเงินสดทั้งหมด ({total.toLocaleString()} รายการ)
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
          <div className="grid min-[600px]:grid-cols-2 min-[1280px]:grid-cols-4 gap-4">
            <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4">
              <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-white dark:bg-background/65 shrink-0">
                  <FileText
                    strokeWidth={2.5}
                    className="text-main-blue w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                  />
                </div>
                <div className="flex flex-col items-end min-[600px]:items-start gap-1">
                  <span className="text-primary text-lg font-semibold">
                    ใบกำกับทั้งหมด
                  </span>
                  <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                    <span className={`${outfit.className}`}>
                      {summary.totalInvoices.toLocaleString()}
                    </span>{" "}
                    ใบ
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4">
              <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-white dark:bg-background/65 shrink-0">
                  <Receipt
                    strokeWidth={2.5}
                    className="text-main-green w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                  />
                </div>
                <div className="flex flex-col items-end min-[600px]:items-start gap-1">
                  <span className="text-primary text-lg font-semibold">
                    รายการทั้งหมด
                  </span>
                  <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                    <span className={`${outfit.className}`}>
                      {total.toLocaleString()}
                    </span>{" "}
                    รายการ
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4">
              <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-white dark:bg-background/65 shrink-0">
                  <ShoppingCart
                    strokeWidth={2.5}
                    className="text-main-orange w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                  />
                </div>
                <div className="flex flex-col items-end min-[600px]:items-start gap-1">
                  <span className="text-primary text-lg font-semibold">
                    จำนวนสินค้า
                  </span>
                  <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                    <span className={`${outfit.className}`}>
                      {summary.totalQuantity.toLocaleString()}
                    </span>{" "}
                    ชิ้น
                  </h3>
                </div>
              </div>
            </div>

            <div className="col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4">
              <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] min-[450px]:h-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-white dark:bg-background/65 shrink-0">
                  <TrendingUp
                    strokeWidth={2.5}
                    className="text-main-green w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                  />
                </div>
                <div className="flex flex-col items-end min-[600px]:items-start gap-1">
                  <span className="text-primary text-lg font-semibold">
                    ยอดขายรวม
                  </span>
                  <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                    <span className={`${outfit.className}`}>
                      {(summary.totalAmount || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>{" "}
                    บาท
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* Filters & Actions below the cards */}
          <div className="mt-6 flex flex-col md:flex-row gap-4 pt-6 border-t border-border/50">
            <div className="flex-1 relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเลขที่บิล, รหัสลูกค้า, ชื่อสินค้า..."
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

        {/* Cash Invoices Table */}
        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                <FileText className="h-6 w-6 text-main-blue" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการใบกำกับภาษีเงินสด (PSC)
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  เลขที่บิลแสดงเป็นข้อความปกติ เพื่อรองรับรหัส PSC ที่ยาว
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-blue-50 px-4 text-sm font-bold text-main-blue dark:bg-blue-500/10">
                {cashInvoices.length} รายการในหน้านี้
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground"
              >
                ทั้งหมด {total.toLocaleString()} รายการ
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
          ) : cashInvoices.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบข้อมูลใบกำกับภาษีเงินสด
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
                      <TableHead className="w-[30%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                        เลขที่บิล
                      </TableHead>
                      <TableHead className="hidden text-base font-bold text-card-foreground min-[640px]:table-cell min-[500px]:text-lg">
                        สินค้า/บริการ
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                        วันที่
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[900px]:table-cell">
                        รหัสลูกค้า
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[620px]:table-cell">
                        จำนวน
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[980px]:table-cell">
                        ราคา/หน่วย
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        ยอดรวม
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        ประเภท
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[1180px]:table-cell">
                        ผู้บันทึก
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashInvoices.map((invoice, index) => (
                      <TableRow
                        key={`${invoice.invoiceNo}-${index}`}
                        className="group border-border/60 transition-colors duration-200 hover:bg-blue-50/30 dark:hover:bg-blue-500/5"
                      >
                        <TableCell className="px-4 py-4 font-medium">
                          <div className="flex min-w-0 flex-col">
                            <span
                              className={cn(
                                outfit.className,
                                "block max-w-[170px] truncate text-sm font-bold text-card-foreground transition-colors group-hover:text-main-blue min-[420px]:max-w-[240px] min-[550px]:max-w-[320px] min-[550px]:text-base min-[1100px]:max-w-[460px]",
                              )}
                            >
                              {invoice.invoiceNo || "-"}
                            </span>
                            <p className="max-w-[170px] truncate text-sm font-semibold text-muted-foreground min-[420px]:max-w-[240px] min-[550px]:max-w-[320px] min-[640px]:hidden">
                              {invoice.productName || "-"}
                            </p>
                            <p className="hidden text-xs font-medium text-muted-foreground min-[560px]:block min-[760px]:hidden">
                              {formatDate(invoice.dateSalePost)}
                            </p>
                            <p
                              className={cn(
                                outfit.className,
                                "text-xs font-semibold text-muted-foreground min-[900px]:hidden",
                              )}
                            >
                              ลูกค้า {invoice.customerCode || "-"}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="hidden align-middle min-[640px]:table-cell">
                          <div className="flex min-w-0 flex-col">
                            <span className="max-w-[180px] truncate text-base font-bold text-card-foreground transition-colors group-hover:text-main-blue min-[900px]:max-w-[260px] min-[1200px]:max-w-[380px]">
                              {invoice.productName || "-"}
                            </span>
                            <span
                              className={cn(
                                outfit.className,
                                "text-xs font-semibold text-muted-foreground",
                              )}
                            >
                              ส่วนลด{" "}
                              {invoice.discount > 0
                                ? formatCurrency(invoice.discount)
                                : "-"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                          <span className="text-sm font-semibold text-card-foreground">
                            {formatDate(invoice.dateSalePost)}
                          </span>
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right text-sm font-semibold text-muted-foreground min-[900px]:table-cell",
                          )}
                        >
                          {invoice.customerCode || "-"}
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right text-sm font-bold text-muted-foreground min-[620px]:table-cell",
                          )}
                        >
                          {invoice.quantity.toLocaleString()}
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right text-sm font-semibold text-muted-foreground min-[980px]:table-cell",
                          )}
                        >
                          {formatCurrency(invoice.unitPrice)}
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                outfit.className,
                                "text-sm font-bold text-card-foreground min-[500px]:text-base",
                              )}
                            >
                              {formatCurrency(invoice.totalAmount)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground min-[620px]:hidden">
                              {invoice.quantity.toLocaleString()} ชิ้น
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          {getStatusBadge(invoice.typeSale)}
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[1180px]:table-cell">
                          <span className="text-sm font-semibold text-card-foreground">
                            {invoice.userName || "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

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
                    รายการ
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
      </div>
    </div>
  );
}
