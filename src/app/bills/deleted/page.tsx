"use client";

/**
 * Bill Cancellation Review Page - อนุมัติบิลที่ยกเลิก
 */

import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ReviewStatusFilter = "pending" | "approved" | "all";
type CancellationReviewReason = "status_cancelled" | "missing";
type CancellationReviewStatus = "pending" | "approved";

interface CancellationReview {
  numberPrint: string;
  originalDate: string | null;
  customerName: string;
  totalPrice: number;
  totalProfit: number;
  cash: number;
  transfer: number;
  legacyStatus: string;
  userName: string;
  detectedReason: CancellationReviewReason;
  detectedAt: string;
  reviewStatus: CancellationReviewStatus;
  approvedAt: string | null;
  approvedBy: string;
  note: string;
}

interface CancellationReviewSummary {
  totalReviews: number;
  pendingCount: number;
  approvedCount: number;
  pendingAmount: number;
  approvedAmount: number;
}

interface AuthUser {
  codePerson: string;
  nameUser: string;
  username: string;
}

export default function DeletedBillsPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [approvingBill, setApprovingBill] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const limit = 20;

  const buildApiUrl = () => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: (page * limit).toString(),
      status: statusFilter,
    });

    if (dateRange?.from) {
      params.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
    }

    if (dateRange?.to) {
      params.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
    }

    return `/api/bills/cancellation-reviews?${params.toString()}`;
  };

  const { data, error, isLoading, mutate } = useSWR<
    ApiResponse<{
      items: CancellationReview[];
      summary: CancellationReviewSummary;
      total: number;
      limit: number;
      offset: number;
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
  });
  const { data: userData } = useSWR<ApiResponse<AuthUser>>(
    "/api/auth/me",
    fetcher,
  );

  const bills = data?.success && data.data?.items ? data.data.items : [];
  const summary =
    data?.success && data.data?.summary ? data.data.summary : null;
  const total = data?.success && data.data ? data.data.total : 0;
  const totalPages = Math.ceil(total / limit);
  const currentUser =
    userData?.success && userData.data
      ? userData.data.nameUser || userData.data.username
      : "WEB";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (dateString: string | null) => {
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

  const handleStatusFilterChange = (value: ReviewStatusFilter) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(0);
  };

  const getReasonLabel = (reason: CancellationReviewReason) => {
    return reason === "missing" ? "บิลหายจากตาราง" : "โปรแกรมเก่าตั้งยกเลิก";
  };

  const getStatusFilterLabel = (status: ReviewStatusFilter) => {
    if (status === "approved") {
      return "อนุมัติแล้ว";
    }

    if (status === "all") {
      return "ทั้งหมด";
    }

    return "รออนุมัติ";
  };

  const getReviewStatusBadge = (status: CancellationReviewStatus) => {
    if (status === "approved") {
      return (
        <Badge
          variant="outline"
          className="h-7 rounded-full border-emerald-100 bg-emerald-50 px-3 text-xs font-bold text-main-green shadow-none dark:border-emerald-500/20 dark:bg-emerald-500/10"
        >
          <CheckCircle2 className="h-3 w-3" />
          อนุมัติแล้ว
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className="h-7 rounded-full border-orange-100 bg-orange-50 px-3 text-xs font-bold text-main-orange shadow-none dark:border-orange-500/20 dark:bg-orange-500/10"
      >
        <Clock3 className="h-3 w-3" />
        รออนุมัติ
      </Badge>
    );
  };

  const handleApprove = async (bill: CancellationReview) => {
    try {
      setApprovingBill(bill.numberPrint);
      setActionMessage(null);

      const response = await fetch("/api/bills/cancellation-reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numberPrint: bill.numberPrint,
          approvedBy: currentUser,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "อนุมัติรายการยกเลิกไม่สำเร็จ");
      }

      setActionMessage(`อนุมัติรายการยกเลิก ${bill.numberPrint} แล้ว`);
      await mutate();
    } catch (error) {
      setActionMessage(
        error instanceof Error ? error.message : "อนุมัติรายการยกเลิกไม่สำเร็จ",
      );
    } finally {
      setApprovingBill(null);
    }
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="อนุมัติยกเลิกบิล" href="/bills/deleted" />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm md:mt-6">
          <div className="mb-6 flex flex-col justify-between gap-4 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Trash2 strokeWidth={2.5} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold tracking-tight">
                  อนุมัติยกเลิกบิล
                </span>
                <p className="text-foreground font-medium">
                  รายการที่โปรแกรมเก่ายกเลิกหรือทำให้บิลหายจากตาราง
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-10 w-fit gap-2 font-bold"
              onClick={() => mutate()}
            >
              <RefreshCw className="h-4 w-4" />
              สแกนใหม่
            </Button>
          </div>

          {summary ? (
            <div className="grid gap-4 min-[600px]:grid-cols-2 xl:grid-cols-4">
              <KPICard
                title="รออนุมัติ"
                value={summary.pendingCount}
                unit="บิล"
                icon={Clock3}
                variant="orange"
                subtitle={formatCurrency(summary.pendingAmount)}
              />
              <KPICard
                title="มูลค่ารออนุมัติ"
                value={summary.pendingAmount}
                format="currency"
                icon={TrendingDown}
                variant="orange"
              />
              <KPICard
                title="อนุมัติแล้ว"
                value={summary.approvedCount}
                unit="บิล"
                icon={CheckCircle2}
                variant="emerald"
                subtitle={formatCurrency(summary.approvedAmount)}
              />
              <KPICard
                title="รายการทั้งหมด"
                value={summary.totalReviews}
                unit="บิล"
                icon={Trash2}
                variant="blue"
                subtitle={`${summary.totalReviews.toLocaleString()} บิล`}
              />
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-4 border-t border-border/50 pt-6 min-[920px]:flex-row min-[920px]:items-end min-[920px]:justify-between">
            <div className="flex flex-col gap-3 min-[560px]:flex-row min-[560px]:items-end">
              <div className="space-y-2">
                <span className="block text-sm font-bold text-card-foreground">
                  ช่วงวันที่ยกเลิก
                </span>
                <DateRangePicker
                  dateRange={dateRange}
                  onDateRangeChange={handleDateRangeChange}
                  placeholder="ทุกช่วงเวลา"
                />
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-bold text-card-foreground">
                  สถานะตรวจสอบ
                </span>
                <div className="flex flex-wrap gap-2">
                  {(["pending", "approved", "all"] as const).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      variant={statusFilter === status ? "default" : "outline"}
                      className="h-10 rounded-[8px] font-bold"
                      onClick={() => handleStatusFilterChange(status)}
                    >
                      {getStatusFilterLabel(status)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10">
              เว็บจำบิลที่เคยเห็นไว้เอง
              แล้วสร้างรายการรออนุมัติเมื่อโปรแกรมเก่าตั้งยกเลิกหรือบิลหายไป
            </div>
          </div>
        </div>

        {actionMessage ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10">
            {actionMessage}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10">
                <AlertTriangle className="h-6 w-6 text-main-orange" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการยกเลิก
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  ตรวจรายการจากโปรแกรมเก่า แล้วกดอนุมัติรับทราบบนเว็บ
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-orange-50 px-4 text-sm font-bold text-main-orange dark:bg-orange-500/10">
                {bills.length} รายการในหน้านี้
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
            </div>
          ) : bills.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบรายการยกเลิกตามตัวกรองนี้
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {dateRange?.from || dateRange?.to
                  ? "ในช่วงวันที่ที่เลือก"
                  : "ในประวัติทั้งหมด"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
                <Table>
                  <TableHeader className="bg-secondary/70">
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="w-[22%] px-4 text-base font-bold text-card-foreground">
                        เลขที่บิล
                      </TableHead>
                      <TableHead className="hidden text-base font-bold text-card-foreground min-[720px]:table-cell">
                        ลูกค้า
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                        วันที่
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground">
                        ยอดขาย
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[900px]:table-cell">
                        กำไร
                      </TableHead>
                      <TableHead className="hidden text-center text-base font-bold text-card-foreground min-[1120px]:table-cell">
                        การชำระ
                      </TableHead>
                      <TableHead className="hidden text-center text-base font-bold text-card-foreground min-[980px]:table-cell">
                        สาเหตุ
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground">
                        ตรวจสอบ
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((bill, index) => (
                      <TableRow
                        key={bill.numberPrint}
                        className="group border-border/60 transition-colors duration-200 hover:bg-orange-50/30 dark:hover:bg-orange-500/5"
                      >
                        <TableCell className="px-4 py-4 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-sm font-bold text-main-orange select-none dark:border-orange-500/20 dark:bg-orange-500/10 min-[550px]:h-12 min-[550px]:w-12">
                              {page * limit + index + 1}
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span
                                className={cn(
                                  outfit.className,
                                  "max-w-[120px] truncate text-sm font-bold text-card-foreground transition-colors group-hover:text-main-orange min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[550px]:text-base min-[1100px]:max-w-[420px]",
                                )}
                              >
                                {bill.numberPrint}
                              </span>
                              <p className="max-w-[120px] truncate text-sm font-semibold text-muted-foreground min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[720px]:hidden">
                                {bill.customerName}
                              </p>
                              <p className="hidden text-xs font-medium text-muted-foreground min-[560px]:block min-[760px]:hidden">
                                {formatDate(bill.originalDate)}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden align-middle min-[720px]:table-cell">
                          <div className="flex min-w-0 flex-col">
                            <span className="max-w-[180px] truncate text-base font-bold text-card-foreground min-[900px]:max-w-[260px] min-[1200px]:max-w-[360px]">
                              {bill.customerName}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {bill.userName || "ไม่ระบุผู้ทำรายการ"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-card-foreground">
                              {formatDate(bill.originalDate)}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              พบเมื่อ {formatDate(bill.detectedAt)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end">
                            <span
                              className={cn(
                                outfit.className,
                                "text-sm font-bold text-card-foreground line-through min-[500px]:text-base",
                              )}
                            >
                              {formatCurrency(bill.totalPrice)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground min-[900px]:hidden">
                              กำไร {formatCurrency(bill.totalProfit)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right text-sm font-bold min-[900px]:table-cell",
                            bill.totalProfit >= 0
                              ? "text-main-green"
                              : "text-main-red",
                          )}
                        >
                          <span className="line-through">
                            {formatCurrency(bill.totalProfit)}
                          </span>
                        </TableCell>

                        <TableCell className="hidden text-center min-[1120px]:table-cell">
                          <div className="flex justify-center gap-1.5">
                            {bill.cash > 0 ? (
                              <Badge
                                variant="outline"
                                className="rounded-full border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 line-through"
                              >
                                สด {formatCurrency(bill.cash)}
                              </Badge>
                            ) : null}
                            {bill.transfer > 0 ? (
                              <Badge
                                variant="outline"
                                className="rounded-full border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 line-through"
                              >
                                โอน {formatCurrency(bill.transfer)}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-center min-[980px]:table-cell">
                          <Badge
                            variant="outline"
                            className="h-7 rounded-full border-red-100 bg-red-50 px-3 text-xs font-bold text-main-red shadow-none dark:border-red-500/20 dark:bg-red-500/10"
                          >
                            {getReasonLabel(bill.detectedReason)}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-2">
                            {getReviewStatusBadge(bill.reviewStatus)}
                            {bill.reviewStatus === "pending" ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 rounded-[8px] font-bold"
                                disabled={approvingBill !== null}
                                onClick={() => handleApprove(bill)}
                              >
                                {approvingBill === bill.numberPrint ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                                อนุมัติ
                              </Button>
                            ) : (
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                {bill.approvedBy || "WEB"} ·{" "}
                                {formatDate(bill.approvedAt)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 ? (
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
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
