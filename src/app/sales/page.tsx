"use client";

/**
 * Sales Page - หน้ายอดขาย
 * แสดงรายการบิลขายจากฐานข้อมูลจริง พร้อม filter และค้นหา
 */

import { format } from "date-fns";
import {
  Banknote,
  CreditCard,
  Download,
  FileText,
  HandCoins,
  Search,
  Wallet,
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

function parseDateParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
}

function getTodayRange(): DateRange {
  const today = new Date();

  return {
    from: today,
    to: today,
  };
}

function isSameDateRange(first: DateRange | undefined, second: DateRange) {
  if (!first?.from || !first?.to || !second.from || !second.to) {
    return false;
  }

  return (
    format(first.from, "yyyy-MM-dd") === format(second.from, "yyyy-MM-dd") &&
    format(first.to, "yyyy-MM-dd") === format(second.to, "yyyy-MM-dd")
  );
}

interface SaleItem {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  totalProfit: number;
  cash: number;
  transfer: number;
  deposits: number;
  receivableAmount: number;
  status: string;
  itemCount: number;
}

type SalesFilter = "all" | "cash" | "transfer" | "unpaid";

const allowedLimits = [20, 50, 100, 200];

function getLimitFromParams(params: URLSearchParams) {
  const requestedLimit = Number(params.get("limit"));

  return allowedLimits.includes(requestedLimit) ? requestedLimit : 20;
}

function getSalesFilterFromParams(params: URLSearchParams) {
  const method = params.get("status");

  if (method === "cash" || method === "transfer" || method === "unpaid") {
    return method;
  }

  return "all";
}

function getSalesListTitle(filter: SalesFilter) {
  if (filter === "cash") {
    return "รายการบิลขายเงินสด";
  }

  if (filter === "transfer") {
    return "รายการบิลขายเงินโอน";
  }

  if (filter === "unpaid") {
    return "รายการบิลขายค้างชำระ";
  }

  return "รายการบิลขายทั้งหมด";
}

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() =>
    getTodayRange(),
  );
  const [limit, setLimit] = useState(20);
  const [salesFilter, setSalesFilter] = useState<SalesFilter>("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialSearch = (params.get("search") || "").trim();
    const startDate = parseDateParam(params.get("startDate"));
    const endDate = parseDateParam(params.get("endDate"));
    const initialLimit = getLimitFromParams(params);
    const initialSalesFilter = getSalesFilterFromParams(params);

    if (initialSearch) {
      setSearchTerm(initialSearch);
    }

    if (startDate || endDate) {
      setDateRange({
        from: startDate ?? endDate,
        to: endDate ?? startDate,
      });
    } else {
      setDateRange(getTodayRange());
    }

    setLimit(initialLimit);
    setSalesFilter(initialSalesFilter);
  }, []);

  // สร้าง URL สำหรับ API พร้อม query parameters
  const buildApiUrl = () => {
    const trimmedSearch = searchTerm.trim();
    const isUsingDefaultDateRange = isSameDateRange(dateRange, getTodayRange());
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: (page * limit).toString(),
    });

    if (trimmedSearch) {
      params.append("search", trimmedSearch);
    }

    if (dateRange?.from && (!trimmedSearch || !isUsingDefaultDateRange)) {
      params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
    }

    if (dateRange?.to && (!trimmedSearch || !isUsingDefaultDateRange)) {
      params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
    }

    if (salesFilter !== "all") {
      params.append("status", salesFilter);
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
        totalCash: number;
        totalTransfer: number;
        totalDeposits: number;
        totalReceivable: number;
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
  const todayRange = getTodayRange();
  const isDefaultTodayRange = isSameDateRange(dateRange, todayRange);
  const salesListTitle = getSalesListTitle(salesFilter);

  const formatCurrencyCompact = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
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

  const getPaymentMethods = (sale: SaleItem) => {
    const methods = [];

    if (sale.cash > 0) {
      methods.push({
        label: "สด",
        className:
          "bg-emerald-50 text-main-green border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
      });
    }

    if (sale.transfer > 0) {
      methods.push({
        label: "โอน",
        className:
          "bg-blue-50 text-main-blue border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20",
      });
    }

    return methods;
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0); // Reset to first page
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(0); // Reset to first page
  };

  const handleSalesFilterChange = (nextSalesFilter: SalesFilter) => {
    setSalesFilter(nextSalesFilter);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDateRange(todayRange);
    setSalesFilter("all");
    setPage(0);
  };

  const hasActiveFilters =
    searchTerm || salesFilter !== "all" || !isDefaultTodayRange;

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
        <div className="mt-2 flex w-full flex-col rounded-2xl border bg-card p-4 md:mt-6">
          {/* Header Block inside the white box */}
          <div className="mb-5 flex flex-col gap-4 min-[798px]:flex-row min-[798px]:items-center min-[798px]:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[8px] border bg-secondary">
                <Banknote className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-semibold text-primary">
                  ยอดขาย
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  สรุปยอดขายและรายการบิล
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-[8px] border-main-green/40 text-main-green hover:bg-emerald-50 hover:text-main-green"
              >
                <Download className="h-4 w-4" />
                ดาวน์โหลด Excel
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 min-[600px]:grid-cols-2 xl:grid-cols-3">
            <KPICard
              title="ยอดขายรวม"
              value={summary?.totalSales || 0}
              format="currency"
              icon={Banknote}
            />
            <KPICard
              title="ยอดขายเงินสด"
              value={summary?.totalCash || 0}
              format="currency"
              icon={Banknote}
              variant="emerald"
            />
            <KPICard
              title="ยอดขายเงินโอน"
              value={summary?.totalTransfer || 0}
              format="currency"
              icon={CreditCard}
              variant="blue"
            />
            <KPICard
              title="จำนวนบิล"
              value={total}
              unit="บิล"
              icon={FileText}
              variant="blue"
            />
            <KPICard
              title="เงินค่ามัดจำ"
              value={summary?.totalDeposits || 0}
              format="currency"
              icon={HandCoins}
              variant="orange"
            />
            <KPICard
              title="ยอดค้างชำระ"
              value={summary?.totalReceivable || 0}
              format="currency"
              icon={Wallet}
              variant="red"
            />
          </div>

          {/* Filters & Actions below the cards */}
          <div className="mt-5 flex flex-col gap-3 border-t border-border/60 pt-5 xl:flex-row xl:items-center">
            <div className="relative min-w-0 flex-1 xl:max-w-md">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="ค้นหาเลขที่บิล ชื่อลูกค้า หรือทะเบียนรถ..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="!h-10 rounded-[8px] bg-background pr-10 pl-10 text-sm"
              />
              {searchTerm ? (
                <button
                  type="button"
                  aria-label="ล้างคำค้นหา"
                  onClick={() => handleSearch("")}
                  className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-10 overflow-hidden rounded-[8px] border bg-secondary">
                <Button
                  variant={salesFilter === "all" ? "default" : "ghost"}
                  onClick={() => handleSalesFilterChange("all")}
                  className="h-full rounded-none border-0 px-4 text-sm font-medium"
                >
                  ทั้งหมด
                </Button>
                <Button
                  variant={salesFilter === "cash" ? "default" : "ghost"}
                  onClick={() => handleSalesFilterChange("cash")}
                  className="h-full rounded-none border-0 px-4 text-sm font-medium"
                >
                  เงินสด
                </Button>
                <Button
                  variant={salesFilter === "transfer" ? "default" : "ghost"}
                  onClick={() => handleSalesFilterChange("transfer")}
                  className="h-full rounded-none border-0 px-4 text-sm font-medium"
                >
                  เงินโอน
                </Button>
                <Button
                  variant={salesFilter === "unpaid" ? "default" : "ghost"}
                  onClick={() => handleSalesFilterChange("unpaid")}
                  className="h-full rounded-none border-0 px-4 text-sm font-medium"
                >
                  ค้างชำระ
                </Button>
              </div>
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                placeholder="เลือกช่วงวันที่"
                className="w-full min-[520px]:w-auto"
                triggerClassName="h-10 w-full rounded-[8px] px-3 text-sm font-medium min-[520px]:w-[240px]"
              />
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setPage(0);
                }}
              >
                <SelectTrigger className="!h-10 w-full rounded-[8px] border-border bg-background px-3 text-sm font-medium hover:bg-muted aria-expanded:bg-muted min-[520px]:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 รายการ</SelectItem>
                  <SelectItem value="50">50 รายการ</SelectItem>
                  <SelectItem value="100">100 รายการ</SelectItem>
                  <SelectItem value="200">200 รายการ</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  className="h-10 rounded-[8px] text-sm font-medium"
                >
                  <X className="h-4 w-4" />
                  ล้างตัวกรอง
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="overflow-hidden rounded-3xl border bg-card p-4">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                <FileText className="h-6 w-6 text-main-blue" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-semibold text-card-foreground">
                  {salesListTitle}
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  คลิกที่บิลเพื่อดูรายละเอียดสินค้าและการชำระเงิน
                </p>
              </div>
            </div>

            <Badge
              variant="secondary"
              className="h-8 rounded-full px-4 text-sm font-medium"
            >
              {sales.length} จาก {total.toLocaleString()} บิล
            </Badge>
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
          ) : sales.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบข้อมูล{salesListTitle.replace(/^รายการ/, "")}
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
                      <TableHead className="w-[24%] px-4 text-base font-semibold text-card-foreground">
                        เลขที่บิล
                      </TableHead>
                      <TableHead className="hidden text-base font-semibold text-card-foreground min-[640px]:table-cell">
                        ลูกค้า
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-semibold text-card-foreground min-[760px]:table-cell">
                        วันที่
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-semibold text-card-foreground min-[620px]:table-cell">
                        รายการ
                      </TableHead>
                      <TableHead className="text-right text-base font-semibold text-card-foreground">
                        ยอดขาย
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-semibold text-card-foreground min-[620px]:table-cell">
                        เงินค่ามัดจำ
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-semibold text-card-foreground min-[820px]:table-cell">
                        ยอดค้างชำระ
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-semibold text-card-foreground min-[700px]:table-cell">
                        กำไร
                      </TableHead>
                      <TableHead className="text-right text-base font-semibold text-card-foreground">
                        การชำระ
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => {
                      const paymentMethods = getPaymentMethods(sale);

                      return (
                        <TableRow
                          key={sale.id}
                          className="group cursor-pointer border-border/60 transition-colors duration-200 hover:bg-blue-50/30 dark:hover:bg-blue-500/5"
                          onClick={() => handleViewSale(sale.id)}
                        >
                          <TableCell className="px-4 py-5 font-medium">
                            <div className="flex items-center">
                              <div className="flex min-w-0 flex-col">
                                <span
                                  className={cn(
                                    outfit.className,
                                    "max-w-[120px] truncate text-sm font-semibold text-card-foreground transition-colors group-hover:text-main-blue min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[550px]:text-base min-[1100px]:max-w-[420px]",
                                  )}
                                >
                                  {sale.id}
                                </span>
                                <p className="max-w-[120px] truncate text-sm font-semibold text-muted-foreground min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[640px]:hidden">
                                  {sale.customerName}
                                </p>
                                <p className="hidden text-sm font-medium text-muted-foreground min-[560px]:block min-[760px]:hidden">
                                  {formatDate(sale.date)}
                                </p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="hidden py-5 align-middle min-[640px]:table-cell">
                            <div className="flex min-w-0 flex-col">
                              <span className="max-w-[180px] truncate text-base font-semibold text-card-foreground min-[900px]:max-w-[260px] min-[1200px]:max-w-[360px]">
                                {sale.customerName}
                              </span>
                              {sale.customerPhone ? (
                                <span
                                  className={cn(
                                    outfit.className,
                                    "text-sm font-medium text-muted-foreground",
                                  )}
                                >
                                  {sale.customerPhone}
                                </span>
                              ) : (
                                <span className="text-sm font-medium text-muted-foreground">
                                  ไม่ระบุเบอร์โทร
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="hidden py-5 text-right align-middle min-[760px]:table-cell">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-semibold text-card-foreground">
                                {formatDate(sale.date)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell
                            className={cn(
                              outfit.className,
                              "hidden py-5 text-right font-semibold text-muted-foreground min-[620px]:table-cell",
                            )}
                          >
                            {sale.itemCount}
                          </TableCell>

                          <TableCell className="py-5 text-right align-middle">
                            <div className="flex flex-col items-end">
                              <span
                                className={cn(
                                  outfit.className,
                                  "text-sm font-semibold text-card-foreground min-[500px]:text-base",
                                )}
                              >
                                {formatCurrencyCompact(sale.totalPrice)}
                              </span>
                              <span
                                className={cn(
                                  "text-sm font-medium min-[700px]:hidden",
                                  sale.totalProfit >= 0
                                    ? "text-main-green"
                                    : "text-main-red",
                                )}
                              >
                                กำไร {formatCurrencyCompact(sale.totalProfit)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="hidden py-5 text-right align-middle min-[620px]:table-cell">
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={cn(
                                  outfit.className,
                                  "text-sm font-semibold text-primary min-[500px]:text-base",
                                )}
                              >
                                {formatCurrencyCompact(sale.deposits)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="hidden py-5 text-right align-middle min-[820px]:table-cell">
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={cn(
                                  outfit.className,
                                  "text-sm font-semibold min-[500px]:text-base",
                                  sale.receivableAmount > 0
                                    ? "text-main-red"
                                    : "text-main-green",
                                )}
                              >
                                {sale.receivableAmount > 0
                                  ? formatCurrencyCompact(sale.receivableAmount)
                                  : "ชำระครบ"}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="hidden py-5 text-right align-middle min-[700px]:table-cell">
                            <div className="flex flex-col items-end gap-1">
                              <span
                                className={cn(
                                  outfit.className,
                                  "text-base font-semibold",
                                  sale.totalProfit >= 0
                                    ? "text-main-green"
                                    : "text-main-red",
                                )}
                              >
                                {formatCurrencyCompact(sale.totalProfit)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-5 text-right align-middle">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {paymentMethods.length > 0 ? (
                                  paymentMethods.map((method) => (
                                    <Badge
                                      key={method.label}
                                      variant="outline"
                                      className={cn(
                                        "h-7 rounded-full px-3 text-sm font-medium shadow-none",
                                        method.className,
                                      )}
                                    >
                                      {method.label}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="h-7 rounded-full px-3 text-sm font-medium text-muted-foreground shadow-none"
                                  >
                                    ไม่ระบุ
                                  </Badge>
                                )}
                              </div>
                              <span className="hidden text-sm font-medium text-muted-foreground min-[900px]:block">
                                {sale.itemCount} รายการ
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
              )}
            </>
          )}
        </div>

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
