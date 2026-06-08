"use client";

/**
 * Bill Edit History Page - ประวัติการแก้ไขบิล
 * แสดงรายการแก้ไข/เปลี่ยนแปลงบิลทั้งหมด
 */

import { format } from "date-fns";
import {
  AlertCircle,
  Banknote,
  Building2,
  CreditCard,
  Download,
  Edit,
  Filter,
  History,
  type LucideIcon,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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

interface BillEditHistory {
  numberPrint: string;
  editDate: string;
  editTime: string;
  changes: {
    cash: { old: number; new: number };
    transfer: { old: number; new: number };
    bank: { old: string; new: string };
  };
  editedBy: string;
  totalChange: number;
  changeType:
    | "amount_change"
    | "payment_method_change"
    | "bank_added"
    | "bank_change"
    | "no_change";
}

interface EditSummary {
  totalEdits: number;
  totalCashChanges: number;
  totalTransferChanges: number;
  totalBankChanges: number;
  totalAmountChanges: number;
  totalBankOnlyChanges: number;
  totalAmountDifference: number;
  totalPaymentMethodChanges: number;
  totalBankAdded: number;
  totalNoChanges: number;
}

export default function BillEditHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [filterType, setFilterType] = useState<
    "all" | "amountChanges" | "bankOnly"
  >("all");
  const [selectedEdit, setSelectedEdit] = useState<BillEditHistory | null>(
    null,
  );
  const limit = 20;

  // สร้าง URL สำหรับ API
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

    if (filterType !== "all") {
      params.append("filterType", filterType);
    }

    return `/api/bills/edit-history?${params.toString()}`;
  };

  // Fetch edit history with filters
  const { data, error, isLoading } = useSWR<
    ApiResponse<{
      data: BillEditHistory[];
      summary: EditSummary;
      limit: number;
      offset: number;
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
  });

  // Fetch total summary without filters (for display in KPI and filter dropdown)
  const { data: totalSummaryData } = useSWR<
    ApiResponse<{
      data: BillEditHistory[];
      summary: EditSummary;
      limit: number;
      offset: number;
    }>
  >(`/api/bills/edit-history?limit=1&offset=0`, fetcher, {
    refreshInterval: 60000,
  });

  const edits = data?.success && data?.data?.data ? data.data.data : [];
  const summary =
    data?.success && data?.data?.summary ? data.data.summary : null;
  const totalSummary =
    totalSummaryData?.success && totalSummaryData?.data?.summary
      ? totalSummaryData.data.summary
      : summary; // fallback to filtered summary if total not loaded yet

  // ไม่ต้องกรองฝั่ง client อีกแล้ว เพราะ backend กรองให้แล้ว
  const displayedEdits = edits;
  const totalDisplayed = edits.length;
  const totalPages = summary ? Math.ceil(summary.totalEdits / limit) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    if (!dateString) {
      return timeString || "-";
    }

    const parsedDate = new Date(dateString);

    if (Number.isNaN(parsedDate.getTime())) {
      return timeString || "-";
    }

    const date = parsedDate.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    return `${date} ${timeString}`;
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
    setFilterType("all");
    setPage(0);
  };

  const hasActiveFilters =
    searchTerm || dateRange?.from || dateRange?.to || filterType !== "all";

  const getChangeTypeMeta = (changeType: string) => {
    switch (changeType) {
      case "amount_change":
        return {
          label: "แก้ไขยอดเงิน",
          description: "ยอดชำระเปลี่ยน",
          className:
            "border-red-100 bg-red-50 text-main-red dark:border-red-500/20 dark:bg-red-500/10",
        };
      case "payment_method_change":
        return {
          label: "เปลี่ยนวิธีชำระ",
          description: "สด/โอนเปลี่ยน",
          className:
            "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
        };
      case "bank_added":
        return {
          label: "เพิ่มธนาคาร",
          description: "เพิ่มบัญชีรับโอน",
          className:
            "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
        };
      case "bank_change":
        return {
          label: "แก้ไขธนาคาร",
          description: "ชื่อธนาคารเปลี่ยน",
          className:
            "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
        };
      case "no_change":
        return {
          label: "ไม่เปลี่ยน",
          description: "ไม่มีผลต่าง",
          className:
            "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300",
        };
      default:
        return {
          label: "อื่นๆ",
          description: "ไม่ระบุประเภท",
          className: "text-muted-foreground",
        };
    }
  };

  const getChangeTypeBadge = (changeType: string) => {
    const changeTypeMeta = getChangeTypeMeta(changeType);

    return (
      <Badge
        variant="outline"
        className={cn(
          "h-7 rounded-full px-3 text-xs font-bold shadow-none",
          changeTypeMeta.className,
        )}
      >
        {changeTypeMeta.label}
      </Badge>
    );
  };

  const renderChange = (oldValue: number, newValue: number) => {
    if (oldValue === newValue) {
      return <span className="text-muted-foreground">ไม่มีการเปลี่ยนแปลง</span>;
    }

    const diff = newValue - oldValue;
    const isIncrease = diff > 0;

    return (
      <div className="flex flex-col items-start gap-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              outfit.className,
              "text-xs font-semibold text-muted-foreground line-through",
            )}
          >
            {formatCurrency(oldValue)}
          </span>
          <span className="text-xs text-muted-foreground">→</span>
          <span
            className={cn(
              outfit.className,
              "text-sm font-bold text-card-foreground",
            )}
          >
            {formatCurrency(newValue)}
          </span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "h-6 w-fit rounded-full px-2 text-[10px] font-bold shadow-none",
            isIncrease
              ? "border-emerald-100 bg-emerald-50 text-main-green"
              : "border-red-100 bg-red-50 text-main-red",
          )}
        >
          {isIncrease ? "+" : ""}
          {formatCurrency(diff)}
        </Badge>
      </div>
    );
  };

  const renderAmountDetailCard = ({
    title,
    icon: Icon,
    oldValue,
    newValue,
    accentClass,
  }: {
    title: string;
    icon: LucideIcon;
    oldValue: number;
    newValue: number;
    accentClass: string;
  }) => {
    const diff = newValue - oldValue;
    const hasChange = oldValue !== newValue;

    return (
      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-xl border",
                accentClass,
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-card-foreground">{title}</span>
              <span className="text-xs font-medium text-muted-foreground">
                ก่อนแก้ไข → หลังแก้ไข
              </span>
            </div>
          </div>
          {hasChange ? (
            <Badge
              variant="outline"
              className="h-7 rounded-full border-red-100 bg-red-50 px-3 text-xs font-bold text-main-red shadow-none"
            >
              มีการเปลี่ยนแปลง
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="h-7 rounded-full px-3 text-xs font-bold text-muted-foreground shadow-none"
            >
              คงเดิม
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="rounded-xl bg-secondary/70 p-3 text-center">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              ก่อนแก้ไข
            </p>
            <p
              className={cn(
                outfit.className,
                "text-base font-bold text-card-foreground",
              )}
            >
              {formatCurrency(oldValue)}
            </p>
          </div>
          <span className="text-sm font-bold text-muted-foreground">→</span>
          <div className="rounded-xl bg-secondary/70 p-3 text-center">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              หลังแก้ไข
            </p>
            <p
              className={cn(
                outfit.className,
                "text-base font-bold text-card-foreground",
              )}
            >
              {formatCurrency(newValue)}
            </p>
          </div>
        </div>

        {hasChange ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border bg-card px-3 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              ส่วนต่าง
            </span>
            <span
              className={cn(
                outfit.className,
                "text-lg font-bold",
                diff > 0 ? "text-main-green" : "text-main-red",
              )}
            >
              {diff > 0 && "+"}
              {formatCurrency(diff)}
            </span>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="ประวัติการแก้ไขบิล" href="/bills/edit-history" />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 md:mt-6 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm">
          <div className="mb-6 flex flex-col min-[798px]:flex-row min-[798px]:items-center min-[798px]:justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <History strokeWidth={2.5} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold">
                  ประวัติการแก้ไขบิล
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  บันทึกการแก้ไข/เปลี่ยนแปลงบิลทั้งหมด
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && totalSummary && (
            <div className="grid gap-4 min-[600px]:grid-cols-3">
              <KPICard
                title="แก้ไขทั้งหมด"
                value={totalSummary.totalEdits}
                icon={Edit}
                variant="blue"
                subtitle={`${totalSummary.totalEdits.toLocaleString()} ครั้ง`}
              />
              <KPICard
                title="แก้ไขจำนวนเงินจริง"
                value={totalSummary.totalAmountChanges}
                icon={TrendingUp}
                variant="emerald"
                subtitle={`${totalSummary.totalAmountChanges.toLocaleString()} ครั้ง`}
              />
              <KPICard
                title="แก้ไขเฉพาะธนาคาร"
                value={totalSummary.totalBankOnlyChanges}
                icon={History}
                variant="orange"
                subtitle={`${totalSummary.totalBankOnlyChanges.toLocaleString()} ครั้ง (ไม่เปลี่ยนยอด)`}
              />
            </div>
          )}
        </div>

        {/* Alert Analysis */}
        {summary && totalSummary && (
          <Card className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
            <CardContent className="p-0">
              <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <AlertCircle className="h-6 w-6 text-main-blue" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-card-foreground">
                      การวิเคราะห์การแก้ไข
                    </span>
                    <p className="text-sm font-medium text-muted-foreground">
                      แยกประเภทการเปลี่ยนแปลง เพื่อดูรูปแบบการแก้ไขบิล
                    </p>
                  </div>
                </div>

                <Badge
                  variant="outline"
                  className="h-8 w-fit rounded-full border-blue-100 bg-blue-50 px-4 text-sm font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
                >
                  {totalSummary.totalEdits.toLocaleString()} รายการ
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 min-[600px]:grid-cols-2 min-[1180px]:grid-cols-4">
                  <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                    <p className="text-sm font-semibold text-muted-foreground">
                      แก้ไขเงินสด
                    </p>
                    <p
                      className={cn(
                        outfit.className,
                        "mt-2 text-2xl font-bold text-card-foreground",
                      )}
                    >
                      {totalSummary.totalCashChanges}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-3 h-7 rounded-full border-blue-100 bg-blue-50 px-3 text-xs font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
                    >
                      {(
                        (summary.totalCashChanges / summary.totalEdits) *
                        100
                      ).toFixed(1)}
                      % ของทั้งหมด
                    </Badge>
                  </div>

                  <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                    <p className="text-sm font-semibold text-muted-foreground">
                      แก้ไขเงินโอน
                    </p>
                    <p
                      className={cn(
                        outfit.className,
                        "mt-2 text-2xl font-bold text-card-foreground",
                      )}
                    >
                      {totalSummary.totalTransferChanges}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-3 h-7 rounded-full border-emerald-100 bg-emerald-50 px-3 text-xs font-bold text-main-green shadow-none dark:border-emerald-500/20 dark:bg-emerald-500/10"
                    >
                      {(
                        (summary.totalTransferChanges / summary.totalEdits) *
                        100
                      ).toFixed(1)}
                      % ของทั้งหมด
                    </Badge>
                  </div>

                  <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                    <p className="text-sm font-semibold text-muted-foreground">
                      แก้ไขธนาคาร
                    </p>
                    <p
                      className={cn(
                        outfit.className,
                        "mt-2 text-2xl font-bold text-card-foreground",
                      )}
                    >
                      {totalSummary.totalBankChanges}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-3 h-7 rounded-full border-orange-100 bg-orange-50 px-3 text-xs font-bold text-main-orange shadow-none dark:border-orange-500/20 dark:bg-orange-500/10"
                    >
                      {(
                        (summary.totalBankChanges / summary.totalEdits) *
                        100
                      ).toFixed(1)}
                      % ของทั้งหมด
                    </Badge>
                  </div>

                  <div className="rounded-2xl border border-red-100 bg-red-50/40 p-4 dark:border-red-500/20 dark:bg-red-500/10">
                    <p className="text-sm font-semibold text-main-red">
                      ส่วนต่างรวม (Absolute)
                    </p>
                    <p
                      className={cn(
                        outfit.className,
                        "mt-2 text-2xl font-bold text-main-red",
                      )}
                    >
                      {formatCurrency(summary.totalAmountDifference)}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-muted-foreground">
                      ผลรวมของส่วนต่างทั้งหมด
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                  <p className="mb-3 text-sm font-bold text-main-blue">
                    สรุปภาพรวม
                  </p>
                  <ul className="space-y-2 text-sm font-medium text-card-foreground">
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-main-blue" />
                      <span>
                        <strong>{totalSummary.totalAmountChanges}</strong>{" "}
                        รายการ (
                        {(
                          (totalSummary.totalAmountChanges /
                            totalSummary.totalEdits) *
                          100
                        ).toFixed(1)}
                        %) มีการเปลี่ยนแปลงจำนวนเงินจริง
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-main-blue" />
                      <span>
                        <strong>
                          {totalSummary.totalPaymentMethodChanges}
                        </strong>{" "}
                        รายการ (
                        {(
                          (totalSummary.totalPaymentMethodChanges /
                            totalSummary.totalEdits) *
                          100
                        ).toFixed(1)}
                        %) เปลี่ยนวิธีการชำระเงิน (สด↔โอน)
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-main-blue" />
                      <span>
                        <strong>{totalSummary.totalBankAdded}</strong> รายการ (
                        {(
                          (totalSummary.totalBankAdded /
                            totalSummary.totalEdits) *
                          100
                        ).toFixed(1)}
                        %) เพิ่มบัญชีธนาคาร (ไม่มีผลต่อยอดเงิน)
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-main-blue" />
                      <span>
                        <strong>
                          {totalSummary.totalBankOnlyChanges -
                            totalSummary.totalBankAdded}
                        </strong>{" "}
                        รายการ (
                        {(
                          ((totalSummary.totalBankOnlyChanges -
                            totalSummary.totalBankAdded) /
                            totalSummary.totalEdits) *
                          100
                        ).toFixed(1)}
                        %) แก้ไขชื่อธนาคาร
                      </span>
                    </li>
                    <li className="flex gap-2 text-muted-foreground">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                      <span>
                        <strong>{totalSummary.totalNoChanges}</strong> รายการ (
                        {(
                          (totalSummary.totalNoChanges /
                            totalSummary.totalEdits) *
                          100
                        ).toFixed(1)}
                        %) ไม่มีการเปลี่ยนแปลงเลย (อาจเป็น bug ของระบบเก่า)
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters & Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* First Row */}
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาเลขที่บิล..."
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filter Type */}
                <Select
                  value={filterType}
                  onValueChange={(
                    value: "all" | "amountChanges" | "bankOnly",
                  ) => {
                    setFilterType(value);
                    setPage(0);
                  }}
                >
                  <SelectTrigger className="w-full md:w-[250px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="กรองตามประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <span>แสดงทั้งหมด</span>
                        {summary && totalSummary && (
                          <Badge variant="outline" className="text-[10px]">
                            {totalSummary.totalEdits}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="amountChanges">
                      <div className="flex items-center gap-2">
                        <span>🔴 แก้ไขยอดเงินเท่านั้น</span>
                        {summary && totalSummary && (
                          <Badge variant="destructive" className="text-[10px]">
                            {totalSummary.totalAmountChanges}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="bankOnly">
                      <div className="flex items-center gap-2">
                        <span>🏦 แก้ไขธนาคารเท่านั้น</span>
                        {summary && totalSummary && (
                          <Badge variant="secondary" className="text-[10px]">
                            {totalSummary.totalBankOnlyChanges}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
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

              {/* Active Filters */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>ตัวกรองที่เปิดใช้งาน:</span>
                  {searchTerm && (
                    <Badge variant="secondary">ค้นหา: {searchTerm}</Badge>
                  )}
                  {filterType !== "all" && (
                    <Badge variant="secondary">
                      {filterType === "amountChanges"
                        ? "แก้ไขยอดเงิน"
                        : "แก้ไขธนาคาร"}
                    </Badge>
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

              {/* Filtered Count Info */}
              {filterType !== "all" && summary && totalSummary && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800 font-medium">
                    พบ {totalSummary.totalEdits} รายการ
                    {filterType === "amountChanges" && " ที่มีการเปลี่ยนยอดเงิน"}
                    {filterType === "bankOnly" && " ที่แก้ไขเฉพาะธนาคาร"}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Edit History Table */}
        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                <History className="h-6 w-6 text-main-blue" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการแก้ไขบิล
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  คลิกที่รายการเพื่อดูรายละเอียดก่อนและหลังแก้ไข
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-blue-50 px-4 text-sm font-bold text-main-blue dark:bg-blue-500/10">
                {totalDisplayed} รายการในหน้านี้
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground"
              >
                ทั้งหมด {(summary?.totalEdits || 0).toLocaleString()} รายการ
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
          ) : displayedEdits.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <History className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                {filterType !== "all"
                  ? "ไม่พบรายการที่ตรงกับตัวกรอง"
                  : "ไม่พบประวัติการแก้ไข"}
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ลองปรับคำค้นหา ตัวกรอง หรือช่วงวันที่ใหม่อีกครั้ง
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
                <Table>
                  <TableHeader className="bg-secondary/70">
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="w-[28%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                        เลขที่บิล
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                        วันที่แก้ไข
                      </TableHead>
                      <TableHead className="hidden text-base font-bold text-card-foreground min-[900px]:table-cell">
                        เงินสด
                      </TableHead>
                      <TableHead className="hidden text-base font-bold text-card-foreground min-[1020px]:table-cell">
                        เงินโอน
                      </TableHead>
                      <TableHead className="hidden text-base font-bold text-card-foreground min-[1180px]:table-cell">
                        ธนาคาร
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        ส่วนต่าง
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        ประเภท
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[860px]:table-cell">
                        ผู้แก้ไข
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedEdits.map((edit, index) => {
                      const changeTypeMeta = getChangeTypeMeta(edit.changeType);

                      return (
                        <TableRow
                          key={`${edit.numberPrint}-${index}`}
                          className="group cursor-pointer border-border/60 transition-colors duration-200 hover:bg-blue-50/30 dark:hover:bg-blue-500/5"
                          onClick={() => setSelectedEdit(edit)}
                        >
                          <TableCell className="px-4 py-4 font-medium">
                            <div className="flex min-w-0 flex-col">
                              <span
                                className={cn(
                                  outfit.className,
                                  "block max-w-[150px] truncate text-sm font-bold text-card-foreground transition-colors group-hover:text-main-blue min-[420px]:max-w-[220px] min-[550px]:max-w-[300px] min-[550px]:text-base min-[1100px]:max-w-[420px]",
                                )}
                              >
                                {edit.numberPrint || "-"}
                              </span>
                              <p className="text-xs font-medium text-muted-foreground min-[760px]:hidden">
                                {formatDateTime(edit.editDate, edit.editTime)}
                              </p>
                              <p className="text-xs font-semibold text-muted-foreground min-[860px]:hidden">
                                แก้ไขโดย {edit.editedBy || "-"}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                            <span className="text-sm font-semibold text-card-foreground">
                              {formatDateTime(edit.editDate, edit.editTime)}
                            </span>
                          </TableCell>

                          <TableCell className="hidden align-middle min-[900px]:table-cell">
                            {renderChange(
                              edit.changes.cash.old,
                              edit.changes.cash.new,
                            )}
                          </TableCell>

                          <TableCell className="hidden align-middle min-[1020px]:table-cell">
                            {renderChange(
                              edit.changes.transfer.old,
                              edit.changes.transfer.new,
                            )}
                          </TableCell>

                          <TableCell className="hidden align-middle min-[1180px]:table-cell">
                            <div className="flex flex-col gap-1">
                              {edit.changes.bank.old ===
                              edit.changes.bank.new ? (
                                <span className="text-sm font-semibold text-card-foreground">
                                  {edit.changes.bank.new || "-"}
                                </span>
                              ) : (
                                <>
                                  <span className="text-xs font-medium text-muted-foreground line-through">
                                    {edit.changes.bank.old || "ไม่ระบุ"}
                                  </span>
                                  <span className="text-xs font-bold text-muted-foreground">
                                    →
                                  </span>
                                  <span className="text-sm font-bold text-card-foreground">
                                    {edit.changes.bank.new || "ไม่ระบุ"}
                                  </span>
                                </>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right align-middle">
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={cn(
                                  outfit.className,
                                  "text-sm font-bold min-[500px]:text-base",
                                  edit.totalChange > 0
                                    ? "text-main-green"
                                    : edit.totalChange < 0
                                      ? "text-main-red"
                                      : "text-muted-foreground",
                                )}
                              >
                                {edit.totalChange > 0 && "+"}
                                {formatCurrency(edit.totalChange)}
                              </span>
                              <span className="text-xs font-semibold text-muted-foreground min-[900px]:hidden">
                                สด {formatCurrency(edit.changes.cash.new)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="text-right align-middle">
                            <div className="flex flex-col items-end gap-1">
                              {getChangeTypeBadge(edit.changeType)}
                              <span className="hidden text-xs font-semibold text-muted-foreground min-[1100px]:block">
                                {changeTypeMeta.description}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="hidden text-right align-middle min-[860px]:table-cell">
                            <Badge
                              variant="outline"
                              className="h-7 rounded-full px-3 text-xs font-bold text-card-foreground shadow-none"
                            >
                              {edit.editedBy || "-"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                      {Math.min((page + 1) * limit, summary?.totalEdits || 0)}
                    </span>{" "}
                    จาก{" "}
                    <span className="font-bold text-card-foreground">
                      {(summary?.totalEdits || 0).toLocaleString()}
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

        <AnimatePresence>
          {selectedEdit && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setSelectedEdit(null)}
              />

              <motion.div
                initial={{ scale: 0.96, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.96, opacity: 0, y: 12 }}
                className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border bg-card shadow-2xl"
              >
                <div className="flex items-start justify-between gap-4 border-b bg-secondary/50 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                      <History className="h-6 w-6 text-main-blue" />
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <h2 className="text-xl font-bold text-card-foreground">
                        รายละเอียดการแก้ไข
                      </h2>
                      <p
                        className={cn(
                          outfit.className,
                          "truncate text-sm font-semibold text-muted-foreground",
                        )}
                      >
                        บิลเลขที่ {selectedEdit.numberPrint}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedEdit(null)}
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-background hover:text-card-foreground"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    <div className="grid gap-4 min-[760px]:grid-cols-[1.2fr_1fr_1fr]">
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <span className="text-sm font-semibold text-muted-foreground">
                          วันที่/เวลาแก้ไข
                        </span>
                        <p className="mt-2 text-lg font-bold text-card-foreground">
                          {formatDateTime(
                            selectedEdit.editDate,
                            selectedEdit.editTime,
                          )}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <span className="text-sm font-semibold text-muted-foreground">
                          ผู้แก้ไข
                        </span>
                        <p className="mt-2 text-lg font-bold text-card-foreground">
                          {selectedEdit.editedBy || "-"}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <span className="text-sm font-semibold text-muted-foreground">
                          ประเภท
                        </span>
                        <div className="mt-2">
                          {getChangeTypeBadge(selectedEdit.changeType)}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                          <Edit className="h-6 w-6 text-main-blue" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xl font-bold text-card-foreground">
                            การเปลี่ยนแปลง
                          </span>
                          <p className="text-sm font-medium text-muted-foreground">
                            เปรียบเทียบค่าก่อนและหลังการแก้ไข
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-4 min-[860px]:grid-cols-2">
                        {renderAmountDetailCard({
                          title: "เงินสด",
                          icon: Banknote,
                          oldValue: selectedEdit.changes.cash.old,
                          newValue: selectedEdit.changes.cash.new,
                          accentClass:
                            "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
                        })}

                        {renderAmountDetailCard({
                          title: "เงินโอน",
                          icon: CreditCard,
                          oldValue: selectedEdit.changes.transfer.old,
                          newValue: selectedEdit.changes.transfer.new,
                          accentClass:
                            "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
                        })}

                        <div className="rounded-2xl border bg-white p-4 dark:bg-card min-[860px]:col-span-2">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10">
                                <Building2 className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-card-foreground">
                                  ธนาคาร
                                </span>
                                <span className="text-xs font-medium text-muted-foreground">
                                  ก่อนแก้ไข → หลังแก้ไข
                                </span>
                              </div>
                            </div>
                            {selectedEdit.changes.bank.old !==
                            selectedEdit.changes.bank.new ? (
                              <Badge
                                variant="outline"
                                className="h-7 rounded-full border-blue-100 bg-blue-50 px-3 text-xs font-bold text-main-blue shadow-none"
                              >
                                มีการเปลี่ยนแปลง
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="h-7 rounded-full px-3 text-xs font-bold text-muted-foreground shadow-none"
                              >
                                คงเดิม
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <div className="rounded-xl bg-secondary/70 p-3 text-center">
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                ก่อนแก้ไข
                              </p>
                              <p className="text-sm font-bold text-card-foreground">
                                {selectedEdit.changes.bank.old || "ไม่ระบุ"}
                              </p>
                            </div>
                            <span className="text-sm font-bold text-muted-foreground">
                              →
                            </span>
                            <div className="rounded-xl bg-secondary/70 p-3 text-center">
                              <p className="mb-1 text-xs font-medium text-muted-foreground">
                                หลังแก้ไข
                              </p>
                              <p className="text-sm font-bold text-card-foreground">
                                {selectedEdit.changes.bank.new || "ไม่ระบุ"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border bg-card p-4 shadow-sm">
                      <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-white p-4 dark:bg-card min-[640px]:flex-row min-[640px]:items-center">
                        <div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            ส่วนต่างรวมทั้งหมด
                          </span>
                          <p
                            className={cn(
                              outfit.className,
                              "mt-1 text-3xl font-bold",
                              selectedEdit.totalChange > 0
                                ? "text-main-green"
                                : selectedEdit.totalChange < 0
                                  ? "text-main-red"
                                  : "text-muted-foreground",
                            )}
                          >
                            {selectedEdit.totalChange > 0 && "+"}
                            {formatCurrency(selectedEdit.totalChange)}
                          </p>
                        </div>

                        {selectedEdit.totalChange === 0 ? (
                          <Badge
                            variant="outline"
                            className="h-8 rounded-full px-4 text-sm font-bold text-muted-foreground shadow-none"
                          >
                            ไม่กระทบยอดเงิน
                          </Badge>
                        ) : selectedEdit.totalChange > 0 ? (
                          <Badge className="h-8 rounded-full bg-emerald-50 px-4 text-sm font-bold text-main-green shadow-none">
                            เพิ่มขึ้น
                          </Badge>
                        ) : (
                          <Badge className="h-8 rounded-full bg-red-50 px-4 text-sm font-bold text-main-red shadow-none">
                            ลดลง
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end border-t bg-secondary/40 px-6 py-4">
                  <Button
                    onClick={() => setSelectedEdit(null)}
                    variant="outline"
                    className="gap-2 font-bold"
                  >
                    <X className="h-4 w-4" />
                    ปิด
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
