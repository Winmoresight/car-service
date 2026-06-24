"use client";

/**
 * Receivable Bills Page - หน้าลูกหนี้จากบิลขายหลัก
 * แสดงรายการบิลขายหลัก พร้อม filter
 */

import { format } from "date-fns";
import {
  Ban,
  Banknote,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Receipt,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { SaleDetailDialog } from "@/components/sales/sale-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface ReceivableBill {
  numberPrint: string;
  date: string;
  customerCode: string;
  customerName: string;
  nameCar: string;
  province: string;
  totalPrice: number;
  cash: number;
  transfer: number;
  paidAmount: number;
  receivableAmount: number;
  status: string;
  userName: string;
}

interface ReceivableSummary {
  totalAmount: number;
  paidAmount: number;
  totalCash: number;
  totalTransfer: number;
  receivableAmount: number;
  receivableCount: number;
}

type PaymentMethod = "cash" | "transfer";

interface CloseReceivableDialogState {
  invoice: ReceivableBill;
  paymentMethod: PaymentMethod;
}

export default function TaxInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [closingBillNo, setClosingBillNo] = useState<string | null>(null);
  const [closeDialogState, setCloseDialogState] =
    useState<CloseReceivableDialogState | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [transferBankName, setTransferBankName] = useState("");
  const [closeDialogError, setCloseDialogError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const limit = 20;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = (params.get("search") || "").trim();
    const startDate = parseDateParam(params.get("startDate"));
    const endDate = parseDateParam(params.get("endDate"));

    if (initialSearch) {
      setSearchTerm(initialSearch);
    }

    if (startDate || endDate) {
      setDateRange({
        from: startDate ?? endDate,
        to: endDate ?? startDate,
      });
    }
  }, []);

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

    return `/api/tax-invoices?${params.toString()}`;
  };

  // Fetch tax invoices data
  const { data, error, isLoading, mutate } = useSWR<
    ApiResponse<{
      taxInvoices: ReceivableBill[];
      summary: ReceivableSummary;
      total: number;
      limit: number;
      offset: number;
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
  });

  const taxInvoices =
    data?.success && data?.data?.taxInvoices ? data.data.taxInvoices : [];
  const summary =
    data?.success && data?.data?.summary ? data.data.summary : null;
  const total = data?.success && data?.data?.total ? data.data.total : 0;
  const totalPages = Math.ceil(total / limit);
  const selectedInvoice = selectedSaleId
    ? taxInvoices.find((invoice) => invoice.numberPrint === selectedSaleId) ||
      null
    : null;

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

  const handleViewSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSaleId(null);
  };

  const openCloseReceivableDialog = (
    invoice: ReceivableBill,
    paymentMethod: PaymentMethod,
  ) => {
    setCloseDialogState({ invoice, paymentMethod });
    setPaymentAmount(invoice.receivableAmount.toString());
    setTransferBankName("");
    setCloseDialogError(null);
  };

  const handleCloseReceivableDialog = () => {
    setCloseDialogState(null);
    setPaymentAmount("");
    setTransferBankName("");
    setCloseDialogError(null);
  };

  const closeReceivable = async (nameBank: string, amount: number) => {
    if (!closeDialogState) {
      return;
    }

    const { invoice, paymentMethod } = closeDialogState;

    try {
      setClosingBillNo(invoice.numberPrint);
      setActionMessage(null);
      setActionError(null);

      const response = await fetch("/api/tax-invoices", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          numberPrint: invoice.numberPrint,
          paymentMethod,
          nameBank,
          paymentAmount: amount,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถปรับสถานะลูกหนี้ได้");
      }

      const remainingAfter = Number(result.data?.receivableAmount) || 0;
      setActionMessage(
        remainingAfter > 0
          ? `บันทึกรับชำระบางส่วน ${invoice.numberPrint} แล้ว เหลือคงค้าง ${formatCurrency(remainingAfter)}`
          : `ปิดลูกหนี้ ${invoice.numberPrint} เรียบร้อยแล้ว`,
      );
      await mutate();
      handleCloseDialog();
      handleCloseReceivableDialog();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "ไม่สามารถปรับสถานะลูกหนี้ได้",
      );
    } finally {
      setClosingBillNo(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badgeClassName =
      "h-7 rounded-full px-3 text-xs font-bold shadow-none";

    return (
      <Badge
        variant="outline"
        className={cn(
          badgeClassName,
          "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
        )}
      >
        {status || "ค้างชำระ"}
      </Badge>
    );
  };

  const receivablePaymentAction = selectedInvoice ? (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex flex-col justify-between gap-3 min-[560px]:flex-row min-[560px]:items-center">
        <div className="flex flex-col">
          <span className="text-base font-bold text-card-foreground">
            ปิดยอดค้าง
          </span>
          <span className="text-sm font-semibold text-muted-foreground">
            ยอดค้างชำระ
          </span>
        </div>
        <span
          className={cn(
            outfit.className,
            "text-2xl font-bold text-main-orange",
          )}
        >
          {formatCurrency(selectedInvoice.receivableAmount)}
        </span>
      </div>

      <div className="mt-4 grid gap-2 min-[520px]:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          disabled={closingBillNo === selectedInvoice.numberPrint}
          onClick={() => openCloseReceivableDialog(selectedInvoice, "cash")}
          className="h-10 border-emerald-100 bg-white text-main-green shadow-none hover:border-main-green/40 hover:bg-emerald-50 hover:!text-main-green dark:border-emerald-500/20 dark:bg-card"
        >
          {closingBillNo === selectedInvoice.numberPrint ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Banknote className="h-4 w-4" />
          )}
          ชำระเงินสด
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={closingBillNo === selectedInvoice.numberPrint}
          onClick={() => openCloseReceivableDialog(selectedInvoice, "transfer")}
          className="h-10 border-blue-100 bg-white text-main-blue shadow-none hover:border-main-blue/40 hover:bg-blue-50 hover:!text-main-blue dark:border-blue-500/20 dark:bg-card"
        >
          {closingBillNo === selectedInvoice.numberPrint ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="h-4 w-4" />
          )}
          ชำระเงินโอน
        </Button>
      </div>
    </div>
  ) : null;

  const selectedCloseInvoice = closeDialogState?.invoice ?? null;
  const selectedCloseMethod = closeDialogState?.paymentMethod ?? null;
  const selectedCloseMethodLabel =
    selectedCloseMethod === "cash" ? "เงินสด" : "เงินโอน";
  const SelectedCloseMethodIcon =
    selectedCloseMethod === "cash" ? Banknote : CreditCard;
  const selectedCloseMethodColor =
    selectedCloseMethod === "cash"
      ? "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10"
      : "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10";

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="ลูกหนี้" href="/tax-invoices" />
      <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm md:mt-6">
          <div className="flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex min-h-12 min-w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <FileText className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold tracking-tight">
                  ลูกหนี้
                </span>
                <p className="text-foreground font-medium">
                  บิลขายหลักที่ยังค้างชำระ ({total.toLocaleString()} ใบ)
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="บิลค้างชำระ"
              value={total}
              unit="ใบ"
              icon={FileText}
              variant="blue"
            />
            <KPICard
              title="ยอดบิลก่อนหักรับ"
              value={summary?.totalAmount || 0}
              format="currency"
              icon={Receipt}
              variant="purple"
            />
            <KPICard
              title="รับแล้วบางส่วน"
              value={summary?.paidAmount || 0}
              format="currency"
              icon={Banknote}
              variant="emerald"
            />
            <KPICard
              title="ค้างชำระจริง"
              value={summary?.receivableAmount || 0}
              format="currency"
              icon={Ban}
              variant="orange"
              subtitle={`${summary?.receivableCount || 0} ใบ`}
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

        {actionMessage ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10">
            {actionMessage}
          </div>
        ) : null}

        {actionError ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-main-red dark:border-red-500/20 dark:bg-red-500/10">
            {actionError}
          </div>
        ) : null}

        {/* Receivable Bills Table */}
        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                <FileText className="h-6 w-6 text-main-blue" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการลูกหนี้
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  คลิกที่บิลเพื่อดูรายละเอียดสินค้า การชำระเงิน และสรุปบิล
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
                ไม่พบข้อมูลลูกหนี้
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
                        รับแล้ว
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[1120px]:table-cell">
                        ค้างจริง
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
                    {taxInvoices.map((invoice, index) => (
                      <TableRow
                        key={invoice.numberPrint}
                        className="group cursor-pointer border-border/60 transition-colors duration-200 hover:bg-blue-50/30 dark:hover:bg-blue-500/5"
                        onClick={() => handleViewSale(invoice.numberPrint)}
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
                                {invoice.numberPrint || "-"}
                              </span>
                              <p className="max-w-[120px] truncate text-sm font-semibold text-muted-foreground min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[640px]:hidden">
                                {invoice.customerName || "ไม่ระบุลูกค้า"}
                              </p>
                              <p className="hidden text-xs font-medium text-muted-foreground min-[560px]:block min-[760px]:hidden">
                                {formatDate(invoice.date)}
                              </p>
                            </div>
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
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-card-foreground">
                              {formatDate(invoice.date)}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              คลิกเพื่อดูรายละเอียด
                            </span>
                          </div>
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
                          {formatCurrency(invoice.paidAmount)}
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right text-sm font-bold text-main-orange min-[1120px]:table-cell",
                          )}
                        >
                          {formatCurrency(invoice.receivableAmount)}
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
                              ค้าง {formatCurrency(invoice.receivableAmount)}
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

        <SaleDetailDialog
          saleId={selectedSaleId}
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          paymentAction={receivablePaymentAction}
        />

        <Dialog
          open={closeDialogState !== null}
          onOpenChange={(open) => {
            if (!open) {
              handleCloseReceivableDialog();
            }
          }}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>ยืนยันปิดลูกหนี้</DialogTitle>
              <DialogDescription>
                ตรวจสอบยอดและวิธีชำระก่อนบันทึกสถานะลูกหนี้
              </DialogDescription>
            </DialogHeader>

            {selectedCloseInvoice && selectedCloseMethod ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 rounded-2xl border bg-muted/30 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-muted-foreground">
                      เลขที่บิล
                    </p>
                    <p className="truncate text-base font-bold text-card-foreground">
                      {selectedCloseInvoice.numberPrint}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                      selectedCloseMethodColor,
                    )}
                  >
                    <SelectedCloseMethodIcon className="h-3.5 w-3.5" />
                    {selectedCloseMethodLabel}
                  </Badge>
                </div>

                <div className="flex items-center justify-between rounded-2xl border bg-background px-4 py-3">
                  <span className="text-sm font-semibold text-muted-foreground">
                    ยอดคงเหลือ
                  </span>
                  <span
                    className={cn(
                      outfit.className,
                      "text-xl font-bold text-card-foreground",
                    )}
                  >
                    {formatCurrency(selectedCloseInvoice.receivableAmount)}
                  </span>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="payment-amount"
                    className="text-sm font-semibold text-card-foreground"
                  >
                    จำนวนรับชำระครั้งนี้
                  </label>
                  <Input
                    id="payment-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value);
                      if (closeDialogError) {
                        setCloseDialogError(null);
                      }
                    }}
                    placeholder="ระบุยอดที่รับจริง"
                    className="h-10 text-right"
                  />
                  <p className="text-xs font-medium text-muted-foreground">
                    ถ้ารับไม่ครบ ยอดคงเหลือจะยังเป็นสถานะค้างชำระ
                  </p>
                </div>

                {selectedCloseMethod === "transfer" ? (
                  <div className="space-y-2">
                    <label
                      htmlFor="transfer-bank-name"
                      className="text-sm font-semibold text-card-foreground"
                    >
                      ระบุธนาคาร
                    </label>
                    <Input
                      id="transfer-bank-name"
                      value={transferBankName}
                      onChange={(e) => {
                        setTransferBankName(e.target.value);
                        if (closeDialogError) {
                          setCloseDialogError(null);
                        }
                      }}
                      placeholder="เช่น KBank, SCB, Bangkok Bank"
                      autoComplete="off"
                      className="h-10"
                      aria-invalid={closeDialogError ? "true" : "false"}
                    />
                  </div>
                ) : null}

                {closeDialogError ? (
                  <p className="text-sm font-semibold text-main-red">
                    {closeDialogError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseReceivableDialog}
                disabled={closingBillNo !== null}
                className="h-10"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  const amount = Number(paymentAmount);

                  if (!Number.isFinite(amount) || amount <= 0) {
                    setCloseDialogError("กรุณาระบุยอดรับชำระที่มากกว่า 0");
                    return;
                  }

                  if (
                    selectedCloseInvoice &&
                    amount > selectedCloseInvoice.receivableAmount
                  ) {
                    setCloseDialogError("ยอดรับชำระมากกว่ายอดคงเหลือ");
                    return;
                  }

                  if (
                    closeDialogState?.paymentMethod === "transfer" &&
                    !transferBankName.trim()
                  ) {
                    setCloseDialogError("กรุณาระบุธนาคารสำหรับเงินโอน");
                    return;
                  }

                  await closeReceivable(transferBankName.trim(), amount);
                }}
                disabled={closingBillNo !== null || !closeDialogState}
                className="h-10 gap-2"
              >
                {closingBillNo !== null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                ยืนยันปิดยอด
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
