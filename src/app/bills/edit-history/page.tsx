"use client";

/**
 * Bill Edit History Page - ประวัติการแก้ไขบิล
 * แสดงรายการแก้ไข/เปลี่ยนแปลงบิลทั้งหมด
 */

import { format } from "date-fns";
import {
  AlertCircle,
  Download,
  Edit,
  Eye,
  Filter,
  History,
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
    }).format(value);
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(dateString).toLocaleDateString("th-TH", {
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

  const getChangeTypeBadge = (changeType: string) => {
    switch (changeType) {
      case "amount_change":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-300 text-[10px]">
            แก้ไขยอดเงิน
          </Badge>
        );
      case "payment_method_change":
        return (
          <Badge className="bg-orange-50 text-orange-700 border-orange-300 text-[10px]">
            เปลี่ยนวิธีชำระเงิน
          </Badge>
        );
      case "bank_added":
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-300 text-[10px]"
          >
            เพิ่มบัญชีธนาคาร
          </Badge>
        );
      case "bank_change":
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 text-blue-700 border-blue-300 text-[10px]"
          >
            แก้ไขธนาคาร
          </Badge>
        );
      case "no_change":
        return (
          <Badge
            variant="outline"
            className="bg-gray-50 text-gray-500 border-gray-300 text-[10px]"
          >
            ไม่มีการเปลี่ยนแปลง
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-[10px]">
            อื่นๆ
          </Badge>
        );
    }
  };

  const renderChange = (oldValue: number, newValue: number) => {
    if (oldValue === newValue) {
      return <span className="text-muted-foreground">ไม่มีการเปลี่ยนแปลง</span>;
    }

    const diff = newValue - oldValue;
    const isIncrease = diff > 0;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground line-through">
            {formatCurrency(oldValue)}
          </span>
          <span className="text-xs text-muted-foreground">→</span>
          <span className="font-bold">{formatCurrency(newValue)}</span>
        </div>
        <Badge
          variant={isIncrease ? "default" : "destructive"}
          className="text-[10px] w-fit"
        >
          {isIncrease ? "+" : ""}
          {formatCurrency(diff)}
        </Badge>
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
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 flex-1">
                    <p className="font-bold text-lg">📊 การวิเคราะห์การแก้ไข</p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 pl-8">
                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700 font-medium">
                      แก้ไขเงินสด
                    </p>
                    <p className="text-2xl font-bold text-amber-900">
                      {totalSummary.totalCashChanges}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-1">
                      {(
                        (summary.totalCashChanges / summary.totalEdits) *
                        100
                      ).toFixed(1)}
                      % ของทั้งหมด
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700 font-medium">
                      แก้ไขเงินโอน
                    </p>
                    <p className="text-2xl font-bold text-amber-900">
                      {totalSummary.totalTransferChanges}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-1">
                      {(
                        (summary.totalTransferChanges / summary.totalEdits) *
                        100
                      ).toFixed(1)}
                      % ของทั้งหมด
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-amber-200">
                    <p className="text-xs text-amber-700 font-medium">
                      แก้ไขธนาคาร
                    </p>
                    <p className="text-2xl font-bold text-amber-900">
                      {totalSummary.totalBankChanges}
                    </p>
                    <p className="text-[10px] text-amber-600 mt-1">
                      {(
                        (summary.totalBankChanges / summary.totalEdits) *
                        100
                      ).toFixed(1)}
                      % ของทั้งหมด
                    </p>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-red-200">
                    <p className="text-xs text-red-700 font-medium">
                      ส่วนต่างรวม (Absolute)
                    </p>
                    <p className="text-2xl font-bold text-red-900">
                      {formatCurrency(summary.totalAmountDifference)}
                    </p>
                    <p className="text-[10px] text-red-600 mt-1">
                      ผลรวมของส่วนต่างทั้งหมด
                    </p>
                  </div>
                </div>

                <div className="bg-blue-100 p-3 rounded-lg border border-blue-200 mt-3">
                  <p className="text-xs text-blue-800 font-medium mb-2">
                    💡 สรุป:
                  </p>
                  <ul className="text-xs text-blue-900 space-y-1 pl-4">
                    <li className="list-disc">
                      <strong>{totalSummary.totalAmountChanges}</strong> รายการ
                      (
                      {(
                        (totalSummary.totalAmountChanges /
                          totalSummary.totalEdits) *
                        100
                      ).toFixed(1)}
                      %) มีการเปลี่ยนแปลงจำนวนเงินจริง
                    </li>
                    <li className="list-disc">
                      <strong>{totalSummary.totalPaymentMethodChanges}</strong>{" "}
                      รายการ (
                      {(
                        (totalSummary.totalPaymentMethodChanges /
                          totalSummary.totalEdits) *
                        100
                      ).toFixed(1)}
                      %) เปลี่ยนวิธีการชำระเงิน (สด↔โอน)
                    </li>
                    <li className="list-disc">
                      <strong>{totalSummary.totalBankAdded}</strong> รายการ (
                      {(
                        (totalSummary.totalBankAdded /
                          totalSummary.totalEdits) *
                        100
                      ).toFixed(1)}
                      %) เพิ่มบัญชีธนาคาร (ไม่มีผลต่อยอดเงิน)
                    </li>
                    <li className="list-disc">
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
                    </li>
                    <li className="list-disc text-gray-600">
                      <strong>{totalSummary.totalNoChanges}</strong> รายการ (
                      {(
                        (totalSummary.totalNoChanges /
                          totalSummary.totalEdits) *
                        100
                      ).toFixed(1)}
                      %) ไม่มีการเปลี่ยนแปลงเลย (อาจเป็น bug ของระบบเก่า)
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
        <Card className="border-none shadow-sm ring-1 ring-border/50 overflow-hidden">
          <CardHeader className="bg-blue-50 border-b border-blue-100">
            <CardTitle className="text-xl font-bold tracking-tight text-blue-900">
              รายการแก้ไขบิล
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
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
                          วันที่/เวลาแก้ไข
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          เงินสด
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          เงินโอน
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          ธนาคาร
                        </TableHead>
                        <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                          ส่วนต่าง
                        </TableHead>
                        <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                          ประเภท
                        </TableHead>
                        <TableHead className="font-bold text-xs uppercase tracking-wider">
                          ผู้แก้ไข
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayedEdits.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-16">
                            <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground font-medium">
                              {filterType !== "all"
                                ? "ไม่พบรายการที่ตรงกับตัวกรอง"
                                : "ไม่พบประวัติการแก้ไข"}
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        displayedEdits.map((edit, index) => (
                          <TableRow
                            key={`${edit.numberPrint}-${index}`}
                            className="hover:bg-blue-50/50 transition-all duration-200 border-border/40 cursor-pointer"
                            onClick={() => setSelectedEdit(edit)}
                          >
                            <TableCell className="font-mono font-bold text-blue-600">
                              {edit.numberPrint}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                              {formatDateTime(edit.editDate, edit.editTime)}
                            </TableCell>
                            <TableCell>
                              {renderChange(
                                edit.changes.cash.old,
                                edit.changes.cash.new,
                              )}
                            </TableCell>
                            <TableCell>
                              {renderChange(
                                edit.changes.transfer.old,
                                edit.changes.transfer.new,
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                {edit.changes.bank.old ===
                                edit.changes.bank.new ? (
                                  <span className="text-sm font-medium">
                                    {edit.changes.bank.new || "-"}
                                  </span>
                                ) : (
                                  <>
                                    <span className="text-xs text-muted-foreground line-through">
                                      {edit.changes.bank.old || "ไม่ระบุ"}
                                    </span>
                                    <span className="text-xs">→</span>
                                    <span className="text-sm font-bold text-foreground">
                                      {edit.changes.bank.new || "ไม่ระบุ"}
                                    </span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span
                                className={cn(
                                  "font-bold text-lg",
                                  edit.totalChange > 0
                                    ? "text-emerald-600"
                                    : edit.totalChange < 0
                                      ? "text-red-600"
                                      : "text-muted-foreground",
                                )}
                              >
                                {edit.totalChange > 0 && "+"}
                                {formatCurrency(edit.totalChange)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {getChangeTypeBadge(edit.changeType)}
                            </TableCell>
                            <TableCell className="font-medium">
                              <Badge variant="outline" className="font-medium">
                                {edit.editedBy}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Detail Popup */}
                <AnimatePresence>
                  {selectedEdit && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                      {/* Backdrop */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSelectedEdit(null)}
                      />

                      {/* Popup Content */}
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
                      >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                              <Eye className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h2 className="text-xl font-bold text-white">
                                รายละเอียดการแก้ไข
                              </h2>
                              <p className="text-blue-100 text-sm">
                                บิลเลขที่ {selectedEdit.numberPrint}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedEdit(null)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            <X className="h-5 w-5 text-white" />
                          </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
                          <div className="space-y-6">
                            {/* Info Cards */}
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <p className="text-xs text-blue-600 font-medium mb-1">
                                  วันที่แก้ไข
                                </p>
                                <p className="text-lg font-bold text-blue-900">
                                  {new Date(
                                    selectedEdit.editDate,
                                  ).toLocaleDateString("th-TH", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  })}
                                </p>
                                <p className="text-sm text-blue-700 mt-1">
                                  เวลา {selectedEdit.editTime}
                                </p>
                              </div>

                              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                <p className="text-xs text-purple-600 font-medium mb-1">
                                  ผู้แก้ไข
                                </p>
                                <p className="text-lg font-bold text-purple-900">
                                  {selectedEdit.editedBy}
                                </p>
                              </div>
                            </div>

                            {/* Changes Detail */}
                            <div className="space-y-4">
                              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <Edit className="h-5 w-5 text-blue-600" />
                                การเปลี่ยนแปลง
                              </h3>

                              {/* Cash Change */}
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="font-semibold text-gray-700">
                                    💵 เงินสด
                                  </p>
                                  {selectedEdit.changes.cash.old !==
                                    selectedEdit.changes.cash.new && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      มีการเปลี่ยนแปลง
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-4 items-center">
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">
                                      ก่อนแก้ไข
                                    </p>
                                    <p className="text-lg font-bold text-gray-900">
                                      {formatCurrency(
                                        selectedEdit.changes.cash.old,
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-2xl">→</span>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">
                                      หลังแก้ไข
                                    </p>
                                    <p className="text-lg font-bold text-blue-600">
                                      {formatCurrency(
                                        selectedEdit.changes.cash.new,
                                      )}
                                    </p>
                                  </div>
                                </div>
                                {selectedEdit.changes.cash.old !==
                                  selectedEdit.changes.cash.new && (
                                  <div className="mt-3 pt-3 border-t border-gray-300">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">
                                        ส่วนต่าง:
                                      </span>
                                      <span
                                        className={cn(
                                          "font-bold text-lg",
                                          selectedEdit.changes.cash.new -
                                            selectedEdit.changes.cash.old >
                                            0
                                            ? "text-emerald-600"
                                            : "text-red-600",
                                        )}
                                      >
                                        {selectedEdit.changes.cash.new -
                                          selectedEdit.changes.cash.old >
                                          0 && "+"}
                                        {formatCurrency(
                                          selectedEdit.changes.cash.new -
                                            selectedEdit.changes.cash.old,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Transfer Change */}
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="font-semibold text-gray-700">
                                    🏦 เงินโอน
                                  </p>
                                  {selectedEdit.changes.transfer.old !==
                                    selectedEdit.changes.transfer.new && (
                                    <Badge
                                      variant="destructive"
                                      className="text-xs"
                                    >
                                      มีการเปลี่ยนแปลง
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-4 items-center">
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">
                                      ก่อนแก้ไข
                                    </p>
                                    <p className="text-lg font-bold text-gray-900">
                                      {formatCurrency(
                                        selectedEdit.changes.transfer.old,
                                      )}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-2xl">→</span>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">
                                      หลังแก้ไข
                                    </p>
                                    <p className="text-lg font-bold text-blue-600">
                                      {formatCurrency(
                                        selectedEdit.changes.transfer.new,
                                      )}
                                    </p>
                                  </div>
                                </div>
                                {selectedEdit.changes.transfer.old !==
                                  selectedEdit.changes.transfer.new && (
                                  <div className="mt-3 pt-3 border-t border-gray-300">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600">
                                        ส่วนต่าง:
                                      </span>
                                      <span
                                        className={cn(
                                          "font-bold text-lg",
                                          selectedEdit.changes.transfer.new -
                                            selectedEdit.changes.transfer.old >
                                            0
                                            ? "text-emerald-600"
                                            : "text-red-600",
                                        )}
                                      >
                                        {selectedEdit.changes.transfer.new -
                                          selectedEdit.changes.transfer.old >
                                          0 && "+"}
                                        {formatCurrency(
                                          selectedEdit.changes.transfer.new -
                                            selectedEdit.changes.transfer.old,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Bank Change */}
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="font-semibold text-gray-700">
                                    🏛️ ธนาคาร
                                  </p>
                                  {selectedEdit.changes.bank.old !==
                                    selectedEdit.changes.bank.new && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-blue-50 text-blue-700 border-blue-300"
                                    >
                                      มีการเปลี่ยนแปลง
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-4 items-center">
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">
                                      ก่อนแก้ไข
                                    </p>
                                    <p className="text-sm font-bold text-gray-900">
                                      {selectedEdit.changes.bank.old || "ไม่ระบุ"}
                                    </p>
                                  </div>
                                  <div className="text-center">
                                    <span className="text-2xl">→</span>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">
                                      หลังแก้ไข
                                    </p>
                                    <p className="text-sm font-bold text-blue-600">
                                      {selectedEdit.changes.bank.new || "ไม่ระบุ"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Total Change Summary */}
                            <div
                              className={cn(
                                "rounded-xl p-6 border-2",
                                selectedEdit.totalChange > 0
                                  ? "bg-emerald-50 border-emerald-300"
                                  : selectedEdit.totalChange < 0
                                    ? "bg-red-50 border-red-300"
                                    : "bg-gray-50 border-gray-300",
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-600 mb-1">
                                    ส่วนต่างรวมทั้งหมด
                                  </p>
                                  <p
                                    className={cn(
                                      "text-3xl font-bold",
                                      selectedEdit.totalChange > 0
                                        ? "text-emerald-600"
                                        : selectedEdit.totalChange < 0
                                          ? "text-red-600"
                                          : "text-gray-600",
                                    )}
                                  >
                                    {selectedEdit.totalChange > 0 && "+"}
                                    {formatCurrency(selectedEdit.totalChange)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {selectedEdit.totalChange === 0 ? (
                                    <Badge
                                      variant="outline"
                                      className="text-sm"
                                    >
                                      ไม่กระทบยอดเงิน
                                    </Badge>
                                  ) : selectedEdit.totalChange > 0 ? (
                                    <Badge className="text-sm bg-emerald-600">
                                      เพิ่มขึ้น
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="destructive"
                                      className="text-sm"
                                    >
                                      ลดลง
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
                          <Button
                            onClick={() => setSelectedEdit(null)}
                            variant="outline"
                            className="gap-2"
                          >
                            <X className="h-4 w-4" />
                            ปิด
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

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
                        {Math.min((page + 1) * limit, summary?.totalEdits || 0)}
                      </span>{" "}
                      จาก{" "}
                      <span className="text-foreground font-bold">
                        {summary?.totalEdits.toLocaleString()}
                      </span>{" "}
                      รายการ
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
