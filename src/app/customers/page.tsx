"use client";

/**
 * Customers Page - หน้าลูกค้า
 * แสดงรายชื่อลูกค้าทั้งหมด พร้อมการจัดกลุ่มและประวัติการซื้อ
 */

import {
  Activity,
  Award,
  Calendar,
  Car,
  MapPin,
  Phone,
  Receipt,
  Search,
  TrendingUp,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  LargeDialog,
  LargeDialogBody,
  LargeDialogContent,
  LargeDialogDescription,
  LargeDialogHeader,
  LargeDialogTitle,
} from "@/components/ui/large-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type CustomerSegment = "VIP" | "Regular" | "New" | "Inactive";

interface Customer {
  code: number;
  codeCustomer: string;
  nameCustomer: string;
  phoneCustomer: string;
  nameCar: string;
  province: string;
  brandAndGenerate: string;
  caseCustomer: string;
  totalSpent: number;
  totalOrders: number;
  lastOrderDate: string | null;
  firstOrderDate: string | null;
  segment: CustomerSegment;
  daysSinceLastOrder: number | null;
}

interface CustomerSummary {
  total: number;
  vip: number;
  regular: number;
  new: number;
  inactive: number;
}

interface CustomersApiResponse {
  success: boolean;
  data?: {
    customers: Customer[];
    total: number;
    limit: number;
    offset: number;
  };
  summary?: CustomerSummary;
  error?: string;
}

interface PurchaseHistory {
  dateSalePost: string;
  numberPrintSalePost: string;
  nameCar: string;
  totalPrice: number;
  totalCost: number;
  totalProfit: number;
  status: string;
  itemCount: number;
}

interface CustomerDetail {
  customer: Customer;
  purchases: PurchaseHistory[];
  stats: {
    totalOrders: number;
    totalSpent: number;
    totalProfit: number;
    lastOrderDate: string | null;
    firstOrderDate: string | null;
    averageOrderValue: number;
  };
}

const segmentOptions: Array<{
  value: CustomerSegment | "all";
  label: string;
}> = [
  { value: "all", label: "ทั้งหมด" },
  { value: "VIP", label: "VIP" },
  { value: "Regular", label: "ปกติ" },
  { value: "New", label: "ใหม่" },
  { value: "Inactive", label: "ไม่ active" },
];

export default function CustomersPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [filterSegment, setFilterSegment] = useState<CustomerSegment | "all">(
    "all",
  );
  const limit = 50;

  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: (page * limit).toString(),
  });

  if (searchTerm) {
    params.set("search", searchTerm);
  }

  if (filterSegment !== "all") {
    params.set("segment", filterSegment);
  }

  const apiUrl = `/api/customers?${params.toString()}`;

  const { data, error, isLoading, isValidating } = useSWR<CustomersApiResponse>(
    apiUrl,
    async (url) => {
      const response = await fetch(url);
      return response.json();
    },
    {
      keepPreviousData: true,
      refreshInterval: 60000,
    },
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setPage(0);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  const customers =
    data?.success && data?.data?.customers ? data.data.customers : [];
  const total = data?.success && data?.data?.total ? data.data.total : 0;
  const summary = data?.summary || null;
  const totalPages = Math.ceil(total / limit);
  const hasActiveFilters = Boolean(searchInput || filterSegment !== "all");
  const showInitialLoading = isLoading && !data;
  const isRefreshing = isValidating && Boolean(data);

  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  const handleFilterSegment = (segment: CustomerSegment | "all") => {
    setFilterSegment(segment);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setFilterSegment("all");
    setPage(0);
  };

  const fetchCustomerDetail = async (code: number) => {
    try {
      setModalLoading(true);
      const response = await fetch(`/api/customers/${code}`);
      const result = await response.json();

      if (result.success) {
        const listCustomer = customers.find(
          (customer) => customer.code === code,
        );

        setSelectedCustomer({
          ...result.data,
          customer: {
            ...result.data.customer,
            segment: result.data.customer.segment ?? listCustomer?.segment,
            daysSinceLastOrder:
              result.data.customer.daysSinceLastOrder ??
              listCustomer?.daysSinceLastOrder,
          },
        });
        setModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch customer detail:", error);
    } finally {
      setModalLoading(false);
    }
  };

  const normalizeSegment = (
    segment: CustomerSegment | string | null | undefined,
  ): CustomerSegment => {
    if (
      segment === "VIP" ||
      segment === "Regular" ||
      segment === "New" ||
      segment === "Inactive"
    ) {
      return segment;
    }

    return "Regular";
  };

  const getSegmentMeta = (
    segment: CustomerSegment | string | null | undefined,
  ) => {
    const variants = {
      VIP: {
        label: "VIP",
        description: "ลูกค้าสำคัญ",
        className:
          "bg-amber-50 text-main-orange border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20",
        dotClass: "bg-main-orange",
      },
      Regular: {
        label: "ปกติ",
        description: "ซื้อสม่ำเสมอ",
        className:
          "bg-blue-50 text-main-blue border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20",
        dotClass: "bg-main-blue",
      },
      New: {
        label: "ใหม่",
        description: "รอประวัติซื้อ",
        className:
          "bg-emerald-50 text-main-green border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
        dotClass: "bg-main-green",
      },
      Inactive: {
        label: "ไม่ active",
        description: "เกิน 6 เดือน",
        className:
          "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:border-slate-500/20 dark:text-slate-300",
        dotClass: "bg-slate-400",
      },
    };

    return variants[normalizeSegment(segment)];
  };

  const getSegmentBadge = (
    segment: CustomerSegment | string | null | undefined,
  ) => {
    const segmentMeta = getSegmentMeta(segment);

    return (
      <Badge
        variant="outline"
        className={cn(
          "h-7 rounded-full px-3 text-xs font-bold shadow-none",
          segmentMeta.className,
        )}
      >
        <span className={cn("h-2 w-2 rounded-full", segmentMeta.dotClass)} />
        {segmentMeta.label}
      </Badge>
    );
  };

  const getFilterLabel = () => {
    if (filterSegment === "all") {
      return "ทั้งหมด";
    }

    return getSegmentMeta(filterSegment).label;
  };

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
    });
  };

  const formatDaysSince = (daysSinceLastOrder: number | null) => {
    if (daysSinceLastOrder === null) {
      return "ยังไม่มีประวัติซื้อ";
    }

    if (daysSinceLastOrder <= 0) {
      return "วันนี้";
    }

    return `${daysSinceLastOrder.toLocaleString("th-TH")} วันก่อน`;
  };

  if (showInitialLoading) {
    return (
      <div className="p-6 pb-16">
        <div className="flex h-96 items-center justify-center rounded-3xl border bg-card">
          <Activity className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 font-semibold text-card-foreground">
            กำลังโหลดข้อมูล...
          </span>
        </div>
      </div>
    );
  }

  if ((error && !data) || (data && !data.success)) {
    return (
      <div className="p-6 pb-16">
        <DashboardBreadcrumb label="ลูกค้า" href="/customers" />
        <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
          <p className="font-bold text-main-red">เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง</p>
          <p className="mt-1 text-sm font-medium text-red-600">
            {error?.message || data?.error || "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="ลูกค้า" href="/customers" />
      <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm md:mt-6">
          <div className="mb-6 flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold tracking-tight text-primary">
                  ลูกค้า
                </span>
                <p className="hidden font-medium text-foreground min-[798px]:block">
                  จัดการข้อมูลลูกค้าและประวัติการซื้อ
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <KPICard
              title="ลูกค้าทั้งหมด"
              value={summary?.total ?? 0}
              unit="คน"
              subtitle="คน"
              icon={Users}
              variant="blue"
              onClick={() => handleFilterSegment("all")}
            />
            <KPICard
              title="ลูกค้า VIP"
              value={summary?.vip ?? 0}
              unit="คน"
              subtitle={`${summary?.total ? ((summary.vip / summary.total) * 100).toFixed(1) : 0}%`}
              icon={Award}
              variant="orange"
              onClick={() => handleFilterSegment("VIP")}
            />
            <KPICard
              title="ลูกค้าปกติ"
              value={summary?.regular ?? 0}
              unit="คน"
              subtitle={`${summary?.total ? ((summary.regular / summary.total) * 100).toFixed(1) : 0}%`}
              icon={TrendingUp}
              variant="blue"
              onClick={() => handleFilterSegment("Regular")}
            />
            <KPICard
              title="ลูกค้าใหม่"
              value={summary?.new ?? 0}
              unit="คน"
              subtitle="ยังไม่มีประวัติซื้อ"
              icon={UserPlus}
              variant="emerald"
              onClick={() => handleFilterSegment("New")}
            />
            <KPICard
              title="ไม่ active"
              value={summary?.inactive ?? 0}
              unit="คน"
              subtitle=">6 เดือน"
              icon={Users}
              variant="purple"
              onClick={() => handleFilterSegment("Inactive")}
            />
          </div>
        </div>

        <Card className="rounded-3xl border bg-card shadow-sm">
          <CardContent className="pt-2">
            <div className="flex flex-col gap-3 min-[780px]:flex-row min-[780px]:items-center">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่อ, รหัส, เบอร์โทร, ทะเบียนรถ..."
                  value={searchInput}
                  onChange={(event) => handleSearch(event.target.value)}
                  className="h-11 rounded-2xl pl-10 font-medium"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {segmentOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={
                      filterSegment === option.value ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => handleFilterSegment(option.value)}
                    className="h-11 rounded-2xl px-4 font-bold"
                  >
                    {option.label}
                  </Button>
                ))}
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-11 gap-2 rounded-2xl px-4 font-bold"
                  >
                    <X className="h-4 w-4" />
                    ล้างตัวกรอง
                  </Button>
                )}
              </div>
            </div>

            {(hasActiveFilters || isRefreshing) && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-medium text-muted-foreground">
                {hasActiveFilters && <span>ตัวกรองที่เปิดใช้งาน:</span>}
                {searchInput && (
                  <Badge variant="secondary" className="font-bold">
                    ค้นหา: {searchInput}
                  </Badge>
                )}
                {filterSegment !== "all" && (
                  <Badge variant="secondary" className="font-bold">
                    กลุ่ม: {getFilterLabel()}
                  </Badge>
                )}
                {isRefreshing && (
                  <Badge
                    variant="outline"
                    className="h-7 rounded-full px-3 text-xs font-bold shadow-none"
                  >
                    <Activity className="h-3.5 w-3.5 animate-spin" />
                    กำลังอัปเดต
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                <Users className="h-6 w-6 text-main-blue" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายชื่อลูกค้า
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  คลิกที่ชื่อลูกค้าเพื่อดูข้อมูลรถและประวัติการซื้อ
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-blue-50 px-4 text-sm font-bold text-main-blue dark:bg-blue-500/10">
                {customers.length} คนในหน้านี้
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground"
              >
                ทั้งหมด {total.toLocaleString("th-TH")} คน
              </Badge>
            </div>
          </div>

          {customers.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบข้อมูลลูกค้า
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ลองปรับคำค้นหาหรือตัวกรองกลุ่มลูกค้าใหม่อีกครั้ง
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
                <Table>
                  <TableHeader className="bg-secondary/70">
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="w-[32%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                        ลูกค้า
                      </TableHead>
                      <TableHead className="hidden text-base font-bold text-card-foreground min-[640px]:table-cell min-[500px]:text-lg">
                        รถ
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                        เบอร์โทร
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        ยอดซื้อ
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[640px]:table-cell">
                        ครั้ง
                      </TableHead>
                      <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[900px]:table-cell">
                        ซื้อล่าสุด
                      </TableHead>
                      <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                        กลุ่ม
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer, index) => (
                      <TableRow
                        key={customer.code}
                        className="group cursor-pointer border-border/60 transition-colors duration-200 hover:bg-blue-50/30 dark:hover:bg-blue-500/5"
                        onClick={() => fetchCustomerDetail(customer.code)}
                      >
                        <TableCell className="px-4 py-4 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-sm font-bold text-main-blue select-none dark:border-blue-500/20 dark:bg-blue-500/10 min-[550px]:h-12 min-[550px]:w-12">
                              {page * limit + index + 1}
                            </div>
                            <div className="flex min-w-0 flex-col">
                              <span className="max-w-[130px] truncate text-base font-bold text-card-foreground transition-colors group-hover:text-main-blue min-[420px]:max-w-[190px] min-[550px]:max-w-[280px] min-[1100px]:max-w-[420px]">
                                {customer.nameCustomer || "ไม่ระบุชื่อลูกค้า"}
                              </span>
                              <span
                                className={cn(
                                  outfit.className,
                                  "text-xs font-semibold text-muted-foreground",
                                )}
                              >
                                {customer.codeCustomer || `#${customer.code}`}
                              </span>
                              <p className="max-w-[150px] truncate text-xs font-medium text-muted-foreground min-[420px]:max-w-[210px] min-[640px]:hidden">
                                {customer.nameCar || "ไม่ระบุทะเบียน"} ·{" "}
                                {customer.brandAndGenerate || "ไม่ระบุรุ่นรถ"}
                              </p>
                              <p
                                className={cn(
                                  outfit.className,
                                  "text-xs font-semibold text-muted-foreground min-[760px]:hidden",
                                )}
                              >
                                {customer.phoneCustomer || "ไม่ระบุเบอร์โทร"}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden align-middle min-[640px]:table-cell">
                          <div className="flex min-w-0 flex-col">
                            <span
                              className={cn(
                                outfit.className,
                                "max-w-[160px] truncate text-base font-bold text-card-foreground min-[900px]:max-w-[220px] min-[1200px]:max-w-[320px]",
                              )}
                            >
                              {customer.nameCar || "-"}
                            </span>
                            <span className="max-w-[160px] truncate text-xs font-medium text-muted-foreground min-[900px]:max-w-[220px] min-[1200px]:max-w-[320px]">
                              {customer.brandAndGenerate || "ไม่ระบุรุ่นรถ"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                          {customer.phoneCustomer ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              <span
                                className={cn(
                                  outfit.className,
                                  "text-sm font-semibold text-card-foreground",
                                )}
                              >
                                {customer.phoneCustomer}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground">
                              -
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                outfit.className,
                                "text-sm font-bold text-card-foreground min-[500px]:text-base",
                              )}
                            >
                              {formatCurrency(customer.totalSpent)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground min-[640px]:hidden">
                              {customer.totalOrders.toLocaleString("th-TH")} ครั้ง
                            </span>
                          </div>
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right text-sm font-bold text-muted-foreground min-[640px]:table-cell",
                          )}
                        >
                          {customer.totalOrders.toLocaleString("th-TH")}
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[900px]:table-cell">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-card-foreground">
                              {formatDate(customer.lastOrderDate)}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {formatDaysSince(customer.daysSinceLastOrder)}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-1">
                            {getSegmentBadge(customer.segment)}
                            <span className="hidden text-xs font-semibold text-muted-foreground min-[1100px]:block">
                              {getSegmentMeta(customer.segment).description}
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
                      {total.toLocaleString("th-TH")}
                    </span>{" "}
                    คน
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

        <LargeDialog open={modalOpen} onOpenChange={setModalOpen}>
          <LargeDialogContent size="2xl">
            <LargeDialogHeader>
              <LargeDialogTitle>
                {selectedCustomer?.customer.nameCustomer || "ข้อมูลลูกค้า"}
              </LargeDialogTitle>
              <LargeDialogDescription>
                ประวัติการซื้อและข้อมูลรายละเอียดทั้งหมด
              </LargeDialogDescription>
            </LargeDialogHeader>

            <LargeDialogBody>
              {modalLoading ? (
                <div className="flex h-72 items-center justify-center rounded-3xl border bg-card">
                  <Activity className="h-7 w-7 animate-spin text-primary" />
                  <span className="ml-2 text-base font-semibold text-card-foreground">
                    กำลังโหลด...
                  </span>
                </div>
              ) : selectedCustomer ? (
                <div className="space-y-6">
                  <div className="rounded-3xl border bg-card p-4 shadow-sm">
                    <div className="grid gap-4 min-[820px]:grid-cols-2">
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                            <Users className="h-5 w-5 text-main-blue" />
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-lg font-bold text-card-foreground">
                              {selectedCustomer.customer.nameCustomer}
                            </span>
                            <span
                              className={cn(
                                outfit.className,
                                "text-xs font-semibold text-muted-foreground",
                              )}
                            >
                              {selectedCustomer.customer.codeCustomer}
                            </span>
                          </div>
                          <div className="ml-auto">
                            {getSegmentBadge(selectedCustomer.customer.segment)}
                          </div>
                        </div>

                        <div className="grid gap-3 text-sm font-medium text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span
                              className={cn(
                                outfit.className,
                                "font-semibold text-card-foreground",
                              )}
                            >
                              {selectedCustomer.customer.phoneCustomer ||
                                "ไม่ระบุเบอร์โทร"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4" />
                            <span>
                              {selectedCustomer.customer.nameCar || "-"} ·{" "}
                              {selectedCustomer.customer.brandAndGenerate ||
                                "ไม่ระบุรุ่นรถ"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {selectedCustomer.customer.province || "-"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>
                              ซื้อล่าสุด{" "}
                              {formatDate(selectedCustomer.stats.lastOrderDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 min-[520px]:grid-cols-2">
                        <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                          <span className="text-sm font-semibold text-muted-foreground">
                            ยอดซื้อรวม
                          </span>
                          <p
                            className={cn(
                              outfit.className,
                              "mt-2 text-2xl font-bold text-card-foreground",
                            )}
                          >
                            {formatCurrency(selectedCustomer.stats.totalSpent)}
                          </p>
                        </div>
                        <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                          <span className="text-sm font-semibold text-muted-foreground">
                            จำนวนครั้ง
                          </span>
                          <p
                            className={cn(
                              outfit.className,
                              "mt-2 text-2xl font-bold text-card-foreground",
                            )}
                          >
                            {selectedCustomer.stats.totalOrders.toLocaleString(
                              "th-TH",
                            )}{" "}
                            ครั้ง
                          </p>
                        </div>
                        <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                          <span className="text-sm font-semibold text-muted-foreground">
                            เฉลี่ย/ครั้ง
                          </span>
                          <p
                            className={cn(
                              outfit.className,
                              "mt-2 text-2xl font-bold text-card-foreground",
                            )}
                          >
                            {formatCurrency(
                              selectedCustomer.stats.averageOrderValue,
                            )}
                          </p>
                        </div>
                        <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                          <span className="text-sm font-semibold text-muted-foreground">
                            กำไรรวม
                          </span>
                          <p
                            className={cn(
                              outfit.className,
                              "mt-2 text-2xl font-bold",
                              selectedCustomer.stats.totalProfit >= 0
                                ? "text-main-green"
                                : "text-main-red",
                            )}
                          >
                            {formatCurrency(selectedCustomer.stats.totalProfit)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
                    <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10">
                          <Receipt className="h-6 w-6 text-main-orange" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xl font-bold text-card-foreground">
                            ประวัติการซื้อ
                          </span>
                          <p className="text-sm font-medium text-muted-foreground">
                            รายการบิลขายทั้งหมดของลูกค้ารายนี้
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="h-8 rounded-full bg-orange-50 px-4 text-sm font-bold text-main-orange dark:bg-orange-500/10">
                          {selectedCustomer.purchases.length} รายการ
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            outfit.className,
                            "h-8 rounded-full px-4 text-sm font-bold text-card-foreground",
                          )}
                        >
                          {formatCurrency(selectedCustomer.stats.totalSpent)}
                        </Badge>
                      </div>
                    </div>

                    {selectedCustomer.purchases.length === 0 ? (
                      <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                          <Receipt className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-bold text-card-foreground">
                          ยังไม่มีประวัติการซื้อ
                        </h3>
                        <p className="mt-1 text-sm font-medium text-muted-foreground">
                          ลูกค้ารายนี้ยังไม่มีรายการบิลขายในระบบ
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
                        <Table>
                          <TableHeader className="bg-secondary/70">
                            <TableRow className="border-border/60 hover:bg-transparent">
                              <TableHead className="w-[32%] px-4 text-base font-bold text-card-foreground">
                                บิล
                              </TableHead>
                              <TableHead className="hidden text-base font-bold text-card-foreground min-[640px]:table-cell">
                                รถ
                              </TableHead>
                              <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                                รายการ
                              </TableHead>
                              <TableHead className="text-right text-base font-bold text-card-foreground">
                                ยอดขาย
                              </TableHead>
                              <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                                กำไร
                              </TableHead>
                              <TableHead className="text-right text-base font-bold text-card-foreground">
                                สถานะ
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedCustomer.purchases.map(
                              (purchase, index) => (
                                <TableRow
                                  key={`${purchase.numberPrintSalePost}-${index}`}
                                  className="group border-border/60 transition-colors duration-200 hover:bg-orange-50/30 dark:hover:bg-orange-500/5"
                                >
                                  <TableCell className="px-4 py-4 font-medium">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-sm font-bold text-main-orange select-none dark:border-orange-500/20 dark:bg-orange-500/10 min-[550px]:h-12 min-[550px]:w-12">
                                        {index + 1}
                                      </div>
                                      <div className="flex min-w-0 flex-col">
                                        <span
                                          className={cn(
                                            outfit.className,
                                            "max-w-[130px] truncate text-sm font-bold text-card-foreground transition-colors group-hover:text-main-orange min-[420px]:max-w-[190px] min-[550px]:max-w-[280px] min-[550px]:text-base",
                                          )}
                                        >
                                          {purchase.numberPrintSalePost}
                                        </span>
                                        <p className="text-xs font-medium text-muted-foreground">
                                          {formatDate(purchase.dateSalePost)}
                                        </p>
                                        <p
                                          className={cn(
                                            outfit.className,
                                            "text-xs font-semibold text-muted-foreground min-[640px]:hidden",
                                          )}
                                        >
                                          {purchase.nameCar || "-"}
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell
                                    className={cn(
                                      outfit.className,
                                      "hidden align-middle text-base font-bold text-card-foreground min-[640px]:table-cell",
                                    )}
                                  >
                                    {purchase.nameCar || "-"}
                                  </TableCell>

                                  <TableCell
                                    className={cn(
                                      outfit.className,
                                      "hidden text-right text-sm font-bold text-muted-foreground min-[760px]:table-cell",
                                    )}
                                  >
                                    {purchase.itemCount.toLocaleString("th-TH")}
                                  </TableCell>

                                  <TableCell className="text-right align-middle">
                                    <div className="flex flex-col items-end gap-1">
                                      <span
                                        className={cn(
                                          outfit.className,
                                          "text-sm font-bold text-card-foreground min-[500px]:text-base",
                                        )}
                                      >
                                        {formatCurrency(purchase.totalPrice)}
                                      </span>
                                      <span className="text-xs font-semibold text-muted-foreground min-[760px]:hidden">
                                        {purchase.itemCount.toLocaleString(
                                          "th-TH",
                                        )}{" "}
                                        รายการ
                                      </span>
                                    </div>
                                  </TableCell>

                                  <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                                    <span
                                      className={cn(
                                        outfit.className,
                                        "font-bold",
                                        purchase.totalProfit >= 0
                                          ? "text-main-green"
                                          : "text-main-red",
                                      )}
                                    >
                                      {formatCurrency(purchase.totalProfit)}
                                    </span>
                                  </TableCell>

                                  <TableCell className="text-right align-middle">
                                    <Badge
                                      variant="outline"
                                      className="h-7 rounded-full border-blue-100 bg-blue-50 px-3 text-xs font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
                                    >
                                      {purchase.status || "ปกติ"}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </LargeDialogBody>
          </LargeDialogContent>
        </LargeDialog>
      </div>
    </div>
  );
}
