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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
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
    switch (status) {
      case "ชำระเงินแล้ว":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
            ชำระแล้ว
          </Badge>
        );
      case "ค้างชำระ":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
            ค้างชำระ
          </Badge>
        );
      case "ยกเลิก":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            ยกเลิก
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="ใบกำกับภาษี" href="/tax-invoices" />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

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
        <Card className="border-none shadow-sm ring-1 ring-border/50 overflow-hidden">
          <CardHeader className="bg-muted/5 border-b border-border/40">
            <CardTitle className="text-xl font-bold tracking-tight">
              รายการใบกำกับภาษี
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : error || (data && !data.success) ? (
              <div className="text-center py-12">
                <p className="text-red-600 font-bold text-lg">
                  เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
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
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          ทะเบียนรถ
                        </TableHead>
                        <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                          ก่อน VAT
                        </TableHead>
                        <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                          VAT 7%
                        </TableHead>
                        <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                          ยอดรวม
                        </TableHead>
                        <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                          สถานะ
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          ผู้ออกบิล
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxInvoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-16">
                            <p className="text-muted-foreground font-medium">
                              ไม่พบข้อมูลใบกำกับภาษี
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        taxInvoices.map((invoice) => (
                          <TableRow
                            key={invoice.numberPrint}
                            className="hover:bg-muted/20 transition-all duration-200 border-border/40"
                          >
                            <TableCell className="font-mono font-bold text-primary">
                              {invoice.numberPrint}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {formatDate(invoice.date)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-bold text-foreground text-sm">
                                  {invoice.customerName}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-medium">
                                  {invoice.customerCode}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {invoice.nameCar || "-"}
                            </TableCell>
                            <TableCell className="text-right font-bold text-foreground">
                              {formatCurrency(invoice.subVatePrice)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600">
                              {formatCurrency(invoice.vatePrice)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg text-foreground">
                              {formatCurrency(invoice.totalPrice)}
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(invoice.status)}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {invoice.userName}
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
                      ใบ
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
      </div>
    </div>
  );
}
