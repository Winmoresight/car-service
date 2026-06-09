"use client";

/**
 * Tax Invoices Page - หน้าใบกำกับภาษี
 * แสดงรายการใบกำกับภาษีทั้งหมด พร้อม filter
 */

import { format } from "date-fns";
import { Ban, Download, FileText, Receipt, Search, X } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Input } from "@/components/ui/input";
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

interface TaxInvoice {
  numberPrint: string;
  date: string;
  customerCode: string;
  customerName: string;
  nameCar: string;
  province: string;
  subVatePrice: number;
  vatePrice: number;
  totalPrice: number;
  status: string;
  userName: string;
}

export default function TaxInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<string>("all");
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

    if (status && status !== "all") {
      params.append("status", status);
    }

    if (dateRange?.from) {
      params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
    }

    if (dateRange?.to) {
      params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
    }

    return `/api/tax-invoices?${params.toString()}`;
  };

  // Fetch tax invoices data
  const { data, error, isLoading } = useSWR<
    ApiResponse<{
      taxInvoices: TaxInvoice[];
      total: number;
      limit: number;
      offset: number;
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
  });

  const taxInvoices =
    data?.success && data?.data?.taxInvoices ? data.data.taxInvoices : [];
  const total = data?.success && data?.data?.total ? data.data.total : 0;
  const totalPages = Math.ceil(total / limit);

  // คำนวณสถิติ
  const totalAmount = taxInvoices.reduce((sum, inv) => sum + inv.totalPrice, 0);
  const totalVat = taxInvoices.reduce((sum, inv) => sum + inv.vatePrice, 0);
  const pendingCount = taxInvoices.filter(
    (inv) => inv.status === "ค้างชำระ",
  ).length;

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
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    setPage(0);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setStatus("all");
    setDateRange(undefined);
    setPage(0);
  };

  const hasActiveFilters =
    searchTerm ||
    (status && status !== "all") ||
    dateRange?.from ||
    dateRange?.to;

  const getStatusBadge = (status: string) => {
    const badgeClassName =
      "h-7 rounded-full px-3 text-xs font-bold shadow-none";

    switch (status) {
      case "ชำระเงินแล้ว":
        return (
          <Badge
            variant="outline"
            className={cn(
              badgeClassName,
              "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
            )}
          >
            ชำระแล้ว
          </Badge>
        );
      case "ค้างชำระ":
        return (
          <Badge
            variant="outline"
            className={cn(
              badgeClassName,
              "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
            )}
          >
            ค้างชำระ
          </Badge>
        );
      case "ยกเลิก":
        return (
          <Badge
            variant="outline"
            className={cn(
              badgeClassName,
              "border-red-100 bg-red-50 text-main-red dark:border-red-500/20 dark:bg-red-500/10",
            )}
          >
            ยกเลิก
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className={cn(badgeClassName, "text-muted-foreground")}
          >
            {status || "-"}
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="ใบกำกับภาษี" href="/tax-invoices" />
      <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm">
          <div className="flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex min-h-12 min-w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <FileText className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold tracking-tight">
                  ใบกำกับภาษี
                </span>
                <p className="text-foreground font-medium">
                  รายการใบกำกับภาษีทั้งหมด ({total.toLocaleString()} ใบ)
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="ใบกำกับทั้งหมด"
              value={total}
              unit="ใบ"
              icon={FileText}
              variant="blue"
            />
            <KPICard
              title="ยอดรวมทั้งหมด"
              value={totalAmount}
              format="currency"
              icon={Receipt}
              variant="purple"
            />
            <KPICard
              title="VAT รวม"
              value={totalVat}
              format="currency"
              icon={Receipt}
              variant="emerald"
            />
            <KPICard
              title="ค้างชำระ"
              value={pendingCount}
              unit="ใบ"
              icon={Ban}
              variant="orange"
              subtitle={`${pendingCount} ใบ`}
            />
          </div>
        </div>

        {/* Filters & Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* First Row: Search, Status, and Date Range */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาเลขที่บิล, ชื่อลูกค้า, รหัสลูกค้า..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Status Filter */}
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="สถานะ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">สถานะทั้งหมด</SelectItem>
                    <SelectItem value="ชำระเงินแล้ว">ชำระแล้ว</SelectItem>
                    <SelectItem value="ค้างชำระ">ค้างชำระ</SelectItem>
                    <SelectItem value="ยกเลิก">ยกเลิก</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Range Picker */}
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={handleDateRangeChange}
                  placeholder="เลือกช่วงวันที่"
                />

                {/* Clear Filters */}
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

                {/* Export */}
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>ตัวกรองที่เปิดใช้งาน:</span>
                  {searchTerm && (
                    <Badge variant="secondary">ค้นหา: {searchTerm}</Badge>
                  )}
                  {status && status !== "all" && (
                    <Badge variant="secondary">สถานะ: {status}</Badge>
                  )}
                  {dateRange?.from && (
                    <Badge variant="secondary">
                      {format(dateRange.from, "d MMM yyyy")}
                      {dateRange.to &&
                        ` - ${format(dateRange.to, "d MMM yyyy")}`}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tax Invoices Table */}
        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                <FileText className="h-6 w-6 text-main-blue" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการใบกำกับภาษี
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  เลขที่บิลแสดงเป็นข้อความปกติ พร้อมแยกลูกค้า รถ และยอด VAT ให้อ่านง่าย
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-blue-50 px-4 text-sm font-bold text-main-blue dark:bg-blue-500/10">
                {taxInvoices.length} รายการในหน้านี้
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground"
              >
                ทั้งหมด {total.toLocaleString()} ใบ
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
          ) : taxInvoices.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบข้อมูลใบกำกับภาษี
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ลองปรับคำค้นหา สถานะ หรือช่วงวันที่ใหม่อีกครั้ง
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
                <Table>
                  <TableHeader className="bg-secondary/70">
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="w-[24%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                        เลขที่บิล
                      </TableHead>
                      <TableHead className="hidden text-base font-bold text-card-foreground min-[640px]:table-cell min-[500px]:text-lg">
                        ลูกค้า
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                        วันที่
                      </TableHead>
                      <TableHead className="hidden text-base font-bold text-card-foreground min-[900px]:table-cell">
                        รถ/จังหวัด
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[1020px]:table-cell">
                        ก่อน VAT
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[1120px]:table-cell">
                        VAT 7%
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        ยอดรวม
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        สถานะ
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[1240px]:table-cell">
                        ผู้ออกบิล
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxInvoices.map((invoice) => (
                      <TableRow
                        key={invoice.numberPrint}
                        className="group border-border/60 transition-colors duration-200 hover:bg-blue-50/30 dark:hover:bg-blue-500/5"
                      >
                        <TableCell className="px-4 py-4 font-medium">
                          <div className="flex min-w-0 flex-col">
                            <span
                              className={cn(
                                outfit.className,
                                "block max-w-[150px] truncate text-sm font-bold text-card-foreground transition-colors group-hover:text-main-blue min-[420px]:max-w-[210px] min-[550px]:max-w-[300px] min-[550px]:text-base min-[1100px]:max-w-[420px]",
                              )}
                            >
                              {invoice.numberPrint || "-"}
                            </span>
                            <p className="max-w-[150px] truncate text-sm font-semibold text-muted-foreground min-[420px]:max-w-[210px] min-[550px]:max-w-[300px] min-[640px]:hidden">
                              {invoice.customerName || "ไม่ระบุลูกค้า"}
                            </p>
                            <p className="hidden text-xs font-medium text-muted-foreground min-[560px]:block min-[760px]:hidden">
                              {formatDate(invoice.date)}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="hidden align-middle min-[640px]:table-cell">
                          <div className="flex min-w-0 flex-col">
                            <span className="max-w-[180px] truncate text-base font-bold text-card-foreground transition-colors group-hover:text-main-blue min-[900px]:max-w-[260px] min-[1200px]:max-w-[360px]">
                              {invoice.customerName || "ไม่ระบุลูกค้า"}
                            </span>
                            <span
                              className={cn(
                                outfit.className,
                                "text-xs font-semibold text-muted-foreground",
                              )}
                            >
                              {invoice.customerCode || "ไม่มีรหัสลูกค้า"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                          <span className="text-sm font-semibold text-card-foreground">
                            {formatDate(invoice.date)}
                          </span>
                        </TableCell>

                        <TableCell className="hidden align-middle min-[900px]:table-cell">
                          <div className="flex min-w-0 flex-col">
                            <span className="max-w-[180px] truncate text-sm font-bold text-card-foreground min-[1180px]:max-w-[260px]">
                              {invoice.nameCar || "-"}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {invoice.province || "ไม่ระบุจังหวัด"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right text-sm font-semibold text-muted-foreground min-[1020px]:table-cell",
                          )}
                        >
                          {formatCurrency(invoice.subVatePrice)}
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right text-sm font-bold text-main-green min-[1120px]:table-cell",
                          )}
                        >
                          {formatCurrency(invoice.vatePrice)}
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end">
                            <span
                              className={cn(
                                outfit.className,
                                "text-sm font-bold text-card-foreground min-[500px]:text-base",
                              )}
                            >
                              {formatCurrency(invoice.totalPrice)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground min-[1020px]:hidden">
                              VAT {formatCurrency(invoice.vatePrice)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          {getStatusBadge(invoice.status)}
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[1240px]:table-cell">
                          <span className="text-sm font-semibold text-card-foreground">
                            {invoice.userName || "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
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
                    ใบ
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
