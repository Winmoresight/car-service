"use client";

/**
 * Receivable Payments Page - รายการรับชำระลูกหนี้รายวัน
 */

import { format } from "date-fns";
import {
  Banknote,
  CalendarClock,
  CreditCard,
  FileText,
  Receipt,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { SaleDetailDialog } from "@/components/sales/sale-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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

function parseDateParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
}

interface ReceivablePayment {
  id: string;
  paidAt: string;
  numberPrint: string;
  customerCode: string;
  customerName: string;
  nameCar: string;
  province: string;
  paidAmount: number;
  totalPrice: number;
  paymentMethod: "cash" | "transfer";
  nameBank: string;
  createdBy: string;
  source: "web" | "legacy";
}

interface ReceivablePaymentSummary {
  count: number;
  total: number;
  cash: number;
  transfer: number;
}

export default function ReceivablePaymentsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const limit = 30;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedDateParam = parseDateParam(params.get("date"));
    const initialSearch = (params.get("search") || "").trim();

    if (selectedDateParam) {
      setSelectedDate(selectedDateParam);
    }

    if (initialSearch) {
      setSearchTerm(initialSearch);
    }
  }, []);

  const buildApiUrl = () => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: (page * limit).toString(),
    });

    if (selectedDate) {
      params.append("date", format(selectedDate, "yyyy-MM-dd"));
    }

    if (searchTerm) {
      params.append("search", searchTerm);
    }

    return `/api/tax-invoices/payments?${params.toString()}`;
  };

  const { data, error, isLoading } = useSWR<
    ApiResponse<{
      payments: ReceivablePayment[];
      summary: ReceivablePaymentSummary;
      total: number;
      limit: number;
      offset: number;
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
  });

  const payments =
    data?.success && data?.data?.payments ? data.data.payments : [];
  const summary =
    data?.success && data?.data?.summary ? data.data.summary : null;
  const total = data?.success && data?.data?.total ? data.data.total : 0;
  const totalPages = Math.ceil(total / limit);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDateTime = (dateString: string) => {
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setPage(0);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSelectedDate(new Date());
    setSearchTerm("");
    setPage(0);
  };

  const handleViewSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setSelectedSaleId(null);
    setIsDialogOpen(false);
  };

  const getPaymentBadge = (payment: ReceivablePayment) => {
    if (payment.paymentMethod === "transfer") {
      return (
        <Badge
          variant="outline"
          className="h-7 rounded-full border-blue-100 bg-blue-50 px-3 text-xs font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
        >
          <CreditCard className="h-3 w-3" />
          เงินโอน
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="h-7 rounded-full border-emerald-100 bg-emerald-50 px-3 text-xs font-bold text-main-green shadow-none dark:border-emerald-500/20 dark:bg-emerald-500/10"
      >
        <Banknote className="h-3 w-3" />
        เงินสด
      </Badge>
    );
  };

  const dateLabel = selectedDate ? format(selectedDate, "d MMM yyyy") : "วันนี้";
  const isSelectedDateToday =
    !selectedDate ||
    format(selectedDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const hasActiveFilters = Boolean(searchTerm) || !isSelectedDateToday;

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="รับชำระลูกหนี้" href="/tax-invoices/payments" />
      <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm">
          <div className="mb-6 flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex min-h-12 min-w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Receipt className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold tracking-tight">
                  รับชำระลูกหนี้
                </span>
                <p className="text-foreground font-medium">
                  รายการลูกหนี้ที่มาชำระเงิน ({dateLabel})
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="รับชำระทั้งหมด"
              value={summary?.total || 0}
              format="currency"
              icon={Receipt}
              variant="emerald"
            />
            <KPICard
              title="เงินสด"
              value={summary?.cash || 0}
              format="currency"
              icon={Banknote}
              variant="emerald"
            />
            <KPICard
              title="เงินโอน"
              value={summary?.transfer || 0}
              format="currency"
              icon={CreditCard}
              variant="blue"
            />
            <KPICard
              title="จำนวนรายการ"
              value={summary?.count || 0}
              unit="รายการ"
              icon={FileText}
              variant="orange"
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเลขบิล, ลูกค้า, รถ, จังหวัด, ธนาคาร..."
                value={searchTerm}
                onChange={(event) => handleSearch(event.target.value)}
                className="pl-10"
              />
            </div>

            <DatePicker
              date={selectedDate}
              onDateChange={handleDateChange}
              placeholder="เลือกวันที่รับชำระ"
              className="w-full md:w-[240px]"
            />

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearFilters}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                วันนี้
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <CalendarClock className="h-6 w-6 text-main-green" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการรับชำระ
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  คลิกที่รายการเพื่อดูรายละเอียดบิล
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-emerald-50 px-4 text-sm font-bold text-main-green dark:bg-emerald-500/10">
                {payments.length} รายการในหน้านี้
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
              {[1, 2, 3, 4, 5, 6].map((row) => (
                <Skeleton key={row} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : error || (data && !data.success) ? (
            <div className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-12 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <p className="text-lg font-bold text-main-red">
                โหลดรายการรับชำระไม่สำเร็จ
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {error?.message || "Unknown error"}
              </p>
            </div>
          ) : payments.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ยังไม่มีรายการรับชำระ
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ลองเปลี่ยนวันที่หรือคำค้นหาใหม่อีกครั้ง
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
                        เวลา
                      </TableHead>
                      <TableHead className="hidden text-base font-bold text-card-foreground min-[920px]:table-cell">
                        รถ/จังหวัด
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        วิธีชำระ
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        ยอดรับ
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment, index) => (
                      <TableRow
                        key={`${payment.source}-${payment.id}-${payment.numberPrint}`}
                        className="group cursor-pointer border-border/60 transition-colors duration-200 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5"
                        onClick={() => handleViewSale(payment.numberPrint)}
                      >
                        <TableCell className="px-4 py-4 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-sm font-bold text-main-green select-none dark:border-emerald-500/20 dark:bg-emerald-500/10 min-[550px]:h-12 min-[550px]:w-12">
                              {page * limit + index + 1}
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span
                                className={cn(
                                  outfit.className,
                                  "max-w-[120px] truncate text-sm font-bold text-card-foreground transition-colors group-hover:text-main-green min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[550px]:text-base min-[1100px]:max-w-[420px]",
                                )}
                              >
                                {payment.numberPrint || "-"}
                              </span>
                              <p className="max-w-[120px] truncate text-sm font-semibold text-muted-foreground min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[640px]:hidden">
                                {payment.customerName || "ไม่ระบุลูกค้า"}
                              </p>
                              <p className="hidden text-xs font-medium text-muted-foreground min-[560px]:block min-[760px]:hidden">
                                {formatTime(payment.paidAt)}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden align-middle min-[640px]:table-cell">
                          <div className="flex min-w-0 flex-col">
                            <span className="max-w-[180px] truncate text-base font-bold text-card-foreground transition-colors group-hover:text-main-green min-[900px]:max-w-[260px] min-[1200px]:max-w-[360px]">
                              {payment.customerName || "ไม่ระบุลูกค้า"}
                            </span>
                            <span
                              className={cn(
                                outfit.className,
                                "text-xs font-semibold text-muted-foreground",
                              )}
                            >
                              {payment.customerCode || "ไม่มีรหัสลูกค้า"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-card-foreground">
                              {formatTime(payment.paidAt)}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {formatDateTime(payment.paidAt)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden align-middle min-[920px]:table-cell">
                          <div className="flex min-w-0 flex-col">
                            <span className="max-w-[180px] truncate text-sm font-bold text-card-foreground min-[1180px]:max-w-[260px]">
                              {payment.nameCar || "-"}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {payment.province || "ไม่ระบุจังหวัด"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-1">
                            {getPaymentBadge(payment)}
                            {payment.nameBank ? (
                              <span className="text-xs font-semibold text-muted-foreground">
                                {payment.nameBank}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end">
                            <span
                              className={cn(
                                outfit.className,
                                "text-sm font-bold text-card-foreground min-[500px]:text-base",
                              )}
                            >
                              {formatCurrency(payment.paidAmount)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground min-[920px]:hidden">
                              {payment.nameCar || payment.province || "-"}
                            </span>
                          </div>
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

        <SaleDetailDialog
          saleId={selectedSaleId}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
        />
      </div>
    </div>
  );
}
