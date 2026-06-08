"use client";

/**
 * Cancelled Tax Invoices Page - ใบกำกับภาษีที่ถูกยกเลิก
 * แสดงเฉพาะใบกำกับภาษีที่ถูกยกเลิก
 */

import { format } from "date-fns";
import {
  AlertCircle,
  Ban,
  Download,
  Receipt,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiResponse } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface CancelledTaxInvoice {
  numberPrint: string;
  date: string;
  customerName: string;
  nameCar: string;
  subVatePrice: number;
  vatePrice: number;
  totalPrice: number;
  userName: string;
}

interface CancelledSummary {
  totalCancelled: number;
  totalAmount: number;
  totalVat: number;
}

export default function CancelledTaxInvoicesPage() {
  const [page, setPage] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const limit = 20;

  // สร้าง URL สำหรับ API
  const buildApiUrl = () => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: (page * limit).toString(),
    });

    if (dateRange?.from) {
      params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
    }

    if (dateRange?.to) {
      params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
    }

    return `/api/tax-invoices/cancelled?${params.toString()}`;
  };

  // Fetch cancelled tax invoices
  const { data, error, isLoading } = useSWR<
    ApiResponse<{
      data: CancelledTaxInvoice[];
      summary: CancelledSummary;
      limit: number;
      offset: number;
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
  });

  const invoices = data?.success && data?.data?.data ? data.data.data : [];
  const summary =
    data?.success && data?.data?.summary ? data.data.summary : null;
  const totalPages = summary ? Math.ceil(summary.totalCancelled / limit) : 0;

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

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(0);
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb
        label="ใบกำกับภาษียกเลิก"
        href="/tax-invoices/cancelled"
      />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 md:mt-6 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm">
          <div className="mb-6 flex flex-col min-[798px]:flex-row min-[798px]:items-center min-[798px]:justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Ban strokeWidth={2.5} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold">
                  ใบกำกับภาษีที่ถูกยกเลิก
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  รายการใบกำกับภาษีทั้งหมดที่ถูกยกเลิก
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid gap-4 min-[600px]:grid-cols-3">
              <KPICard
                title="ยกเลิกทั้งหมด"
                value={summary.totalCancelled}
                icon={Ban}
                variant="orange"
                subtitle={`${summary.totalCancelled} ใบ`}
              />
              <KPICard
                title="มูลค่าที่ยกเลิก"
                value={summary.totalAmount}
                format="currency"
                icon={TrendingDown}
                variant="orange"
              />
              <KPICard
                title="VAT ที่ยกเลิก"
                value={summary.totalVat}
                format="currency"
                icon={Receipt}
                variant="purple"
              />
            </div>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">ช่วงวันที่</label>
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={handleDateRangeChange}
                  placeholder="เลือกช่วงวันที่"
                />
              </div>

              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export รายงาน
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alert Info */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-bold">หมายเหตุ</p>
                <p className="mt-1">
                  ใบกำกับภาษีที่ถูกยกเลิกจะไม่นับรวมในยอดขาย
                  แต่จะบันทึกไว้เพื่อการตรวจสอบและอ้างอิง
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cancelled Tax Invoices Table */}
        <Card className="border-none shadow-sm ring-1 ring-border/50 overflow-hidden">
          <CardHeader className="bg-red-50 border-b border-red-100">
            <CardTitle className="text-xl font-bold tracking-tight text-red-900">
              รายการใบกำกับภาษีที่ยกเลิก
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
                          วันที่ออกบิล
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
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          ผู้ออกบิล
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-16">
                            <Ban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground font-medium">
                              ไม่พบใบกำกับภาษีที่ถูกยกเลิก
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {dateRange?.from && dateRange?.to
                                ? "ในช่วงวันที่ที่เลือก"
                                : "ในระบบ"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoices.map((invoice) => (
                          <TableRow
                            key={invoice.numberPrint}
                            className="hover:bg-red-50/50 transition-all duration-200 border-border/40"
                          >
                            <TableCell className="font-mono font-bold text-red-600">
                              {invoice.numberPrint}
                              <Badge
                                variant="outline"
                                className="ml-2 bg-red-50 text-red-700 border-red-300 text-[10px]"
                              >
                                ยกเลิก
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {formatDate(invoice.date)}
                            </TableCell>
                            <TableCell>
                              <p className="font-bold text-foreground text-sm">
                                {invoice.customerName}
                              </p>
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {invoice.nameCar || "-"}
                            </TableCell>
                            <TableCell className="text-right font-bold text-muted-foreground line-through">
                              {formatCurrency(invoice.subVatePrice)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-muted-foreground line-through">
                              {formatCurrency(invoice.vatePrice)}
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg text-red-600 line-through">
                              {formatCurrency(invoice.totalPrice)}
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
                        {Math.min(
                          (page + 1) * limit,
                          summary?.totalCancelled || 0,
                        )}
                      </span>{" "}
                      จาก{" "}
                      <span className="text-foreground font-bold">
                        {summary?.totalCancelled.toLocaleString()}
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
