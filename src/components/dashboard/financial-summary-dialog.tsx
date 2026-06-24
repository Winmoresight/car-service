"use client";

import { format, startOfMonth, subDays } from "date-fns";
import { th } from "date-fns/locale";
import {
  Banknote,
  CalendarDays,
  CircleCheckBig,
  CreditCard,
  FileText,
  Info,
  Receipt,
  TrendingDown,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  LargeDialog,
  LargeDialogBody,
  LargeDialogContent,
  LargeDialogDescription,
  LargeDialogHeader,
  LargeDialogTitle,
} from "@/components/ui/large-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type {
  ApiResponse,
  FinancialSummary,
  FinancialSummaryList,
  FinancialSummaryListItem,
} from "@/types/api";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "ไม่สามารถดึงข้อมูลสรุปได้");
  }

  return result;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value || 0);
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("th-TH", {
    year: "2-digit",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMethodLabel(item: FinancialSummaryListItem) {
  if (item.method === "cash") {
    return "เงินสด";
  }

  if (item.method === "transfer") {
    return "เงินโอน";
  }

  if (item.method === "mixed") {
    return "สด + โอน";
  }

  return "ไม่ระบุช่องทาง";
}

function MethodBadge({ item }: { item: FinancialSummaryListItem }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-full px-2 text-[11px] font-bold shadow-none",
        item.method === "cash" &&
          "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
        item.method === "transfer" &&
          "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
        item.method === "mixed" &&
          "border-violet-100 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300",
        item.method === "unspecified" &&
          "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
      )}
    >
      {getMethodLabel(item)}
    </Badge>
  );
}

interface ListPanelProps {
  title: string;
  subtitle: string;
  list: FinancialSummaryList;
  icon: typeof Receipt;
  tone: "green" | "red" | "blue" | "orange";
  className?: string;
}

function ListPanel({
  title,
  subtitle,
  list,
  icon: Icon,
  tone,
  className,
}: ListPanelProps) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-[10px] border bg-card",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b bg-muted/25 px-4 py-3 shrink-0">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border",
              tone === "green" &&
                "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
              tone === "red" &&
                "border-red-100 bg-red-50 text-main-red dark:border-red-500/20 dark:bg-red-500/10",
              tone === "blue" &&
                "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
              tone === "orange" &&
                "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-card-foreground">
              {title}
            </h3>
            <p className="truncate text-xs font-semibold text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 rounded-full font-bold">
          {list.totalCount.toLocaleString("th-TH")}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {list.items.length === 0 ? (
          <div className="flex h-full min-h-[200px] items-center justify-center px-4 text-center">
            <div>
              <FileText className="mx-auto h-7 w-7 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-bold text-muted-foreground">
                ไม่มีรายการในช่วงวันที่เลือก
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {list.items.map((item) => (
              <div
                key={item.id}
                className="px-4 py-3 hover:bg-muted/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-card-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs font-semibold text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-sm font-bold",
                      tone === "red" ? "text-main-red" : "text-card-foreground",
                    )}
                  >
                    {formatCurrency(item.amount)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {formatDateTime(item.occurredAt)}
                  </span>
                  <MethodBadge item={item} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {list.totalCount > list.items.length ? (
        <div className="border-t bg-muted/20 px-4 py-2 text-center text-xs font-semibold text-muted-foreground shrink-0">
          แสดง {list.items.length.toLocaleString("th-TH")} จาก{" "}
          {list.totalCount.toLocaleString("th-TH")} รายการ
        </div>
      ) : null}
    </section>
  );
}

interface FinancialSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: Date;
}

export function FinancialSummaryDialog({
  open,
  onOpenChange,
  initialDate,
}: FinancialSummaryDialogProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: initialDate,
    to: initialDate,
  });

  const [activeTxList, setActiveTxList] = useState<
    | "paid"
    | "income"
    | "expenses"
    | "receivables"
    | "employees"
    | "transfers"
    | "outstanding"
  >("paid");

  useEffect(() => {
    if (open) {
      setDateRange({ from: initialDate, to: initialDate });
      setActiveTxList("paid");
    }
  }, [initialDate, open]);

  const dateFrom = format(dateRange.from ?? initialDate, "yyyy-MM-dd");
  const dateTo = format(
    dateRange.to ?? dateRange.from ?? initialDate,
    "yyyy-MM-dd",
  );
  const apiUrl = open
    ? `/api/dashboard/financial-summary?dateFrom=${dateFrom}&dateTo=${dateTo}`
    : null;
  const { data, error, isLoading } = useSWR<ApiResponse<FinancialSummary>>(
    apiUrl,
    fetcher,
    { keepPreviousData: true, refreshInterval: 30000 },
  );
  const summary = data?.success ? data.data : undefined;
  const periodLabel = useMemo(() => {
    const from = dateRange.from ?? initialDate;
    const to = dateRange.to ?? from;

    if (format(from, "yyyy-MM-dd") === format(to, "yyyy-MM-dd")) {
      return format(from, "d MMMM yyyy", { locale: th });
    }

    return `${format(from, "d MMM yyyy", { locale: th })} – ${format(to, "d MMM yyyy", { locale: th })}`;
  }, [dateRange.from, dateRange.to, initialDate]);

  const setPreset = (from: Date, to: Date) => {
    setDateRange({ from, to });
  };

  const txListFilters = useMemo(() => {
    if (!summary) return [];
    return [
      {
        id: "paid",
        label: "บิลชำระครบ",
        count: summary.lists.paidSales.totalCount,
        tone: "green",
        icon: CircleCheckBig,
      },
      {
        id: "income",
        label: "รายรับทั้งหมด",
        count: summary.lists.income.totalCount,
        tone: "green",
        icon: Banknote,
      },
      {
        id: "expenses",
        label: "รายจ่ายทั้งหมด",
        count: summary.lists.expenses.totalCount,
        tone: "red",
        icon: TrendingDown,
      },
      {
        id: "receivables",
        label: "รับชำระลูกหนี้",
        count: summary.lists.receivablePayments.totalCount,
        tone: "green",
        icon: Receipt,
      },
      {
        id: "employees",
        label: "จ่ายเงินพนักงาน",
        count: summary.lists.employeePayments.totalCount,
        tone: "orange",
        icon: Users,
      },
      {
        id: "transfers",
        label: "รายการโอน",
        count: summary.lists.transfers.totalCount,
        tone: "blue",
        icon: CreditCard,
      },
      {
        id: "outstanding",
        label: "ลูกหนี้ค้างชำระ",
        count: summary.lists.outstandingReceivables.totalCount,
        tone: "orange",
        icon: FileText,
      },
    ] as const;
  }, [summary]);

  return (
    <LargeDialog open={open} onOpenChange={onOpenChange}>
      <LargeDialogContent
        size="2xl"
        className="md:h-[90vh] md:max-h-[850px] flex flex-col overflow-hidden"
      >
        <LargeDialogHeader className="gap-4">
          <div className="flex flex-col gap-4 pr-10 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-col gap-1.5">
              <LargeDialogTitle>สรุปรายรับ–รายจ่าย</LargeDialogTitle>
              <LargeDialogDescription className="text-xs">
                สรุปยอดขายตามประเภท พร้อมสูตรเงินสุทธิและรายการประกอบทุกหมวด
              </LargeDialogDescription>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-bold text-muted-foreground">
                <span className="flex items-center gap-1 text-foreground font-bold">
                  <CalendarDays className="h-3.5 w-3.5 text-main-blue" />
                  ช่วงข้อมูล: {periodLabel}
                </span>
                <span className="h-3 w-px bg-border hidden sm:inline" />
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground/80 font-normal">
                  <Info className="h-3.5 w-3.5" />
                  อัปเดตอัตโนมัติทุก 30 วินาที
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center shrink-0">
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={(range) => {
                  if (range?.from) {
                    setDateRange(range);
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPreset(new Date(), new Date())}
                >
                  วันนี้
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPreset(subDays(new Date(), 6), new Date())}
                >
                  7 วัน
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setPreset(startOfMonth(new Date()), new Date())
                  }
                >
                  เดือนนี้
                </Button>
              </div>
            </div>
          </div>
        </LargeDialogHeader>

        <LargeDialogBody className="bg-muted/10 p-0 flex-1 flex flex-col overflow-hidden">
          {isLoading && !summary ? (
            <div className="flex-1 grid place-items-center m-6 rounded-[12px] border bg-card">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-3 text-sm font-bold text-muted-foreground">
                  กำลังคำนวณสรุปการเงิน…
                </p>
              </div>
            </div>
          ) : error || !summary ? (
            <div className="flex-1 grid place-items-center m-6 rounded-[12px] border border-red-100 bg-red-50/50 px-6 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <div>
                <TrendingDown className="mx-auto h-9 w-9 text-main-red" />
                <p className="mt-3 text-lg font-bold text-main-red">
                  คำนวณข้อมูลไม่สำเร็จ
                </p>
                <p className="mt-1 text-sm font-semibold text-muted-foreground">
                  {error instanceof Error
                    ? error.message
                    : "กรุณาลองเลือกช่วงวันที่ใหม่"}
                </p>
              </div>
            </div>
          ) : (
            <Tabs
              defaultValue="overview"
              className="flex-1 flex flex-col overflow-hidden"
            >
              <div className="border-b bg-background px-6 py-2 md:px-8 shrink-0">
                <TabsList className="w-full sm:w-auto bg-muted/65 p-0.5 rounded-lg">
                  <TabsTrigger
                    value="overview"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    <span>สรุปการเงิน</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="categories"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md"
                  >
                    <Receipt className="h-3.5 w-3.5" />
                    <span>ยอดขายสินค้า</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="transactions"
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md"
                  >
                    <Banknote className="h-3.5 w-3.5" />
                    <span>รายการธุรกรรม</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-hidden min-h-0 relative">
                {/* Tab 1: Overview */}
                <TabsContent
                  value="overview"
                  className="h-full overflow-y-auto p-6 md:p-8 focus-visible:outline-none mt-0"
                >
                  <div className="space-y-6">
                    <section className="grid overflow-hidden rounded-[12px] border border-blue-100 bg-blue-50/55 dark:border-blue-500/20 dark:bg-blue-500/10 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.7fr)]">
                      <div className="p-5 md:p-6">
                        <div className="flex items-center gap-2">
                          <Badge className="rounded-full bg-main-blue text-white">
                            ยอดหลักสำหรับปิดยอด
                          </Badge>
                          <span className="text-xs font-semibold text-muted-foreground">
                            สูตรเดียวกับโปรแกรมเก่า
                          </span>
                        </div>
                        <p className="mt-4 text-sm font-bold text-main-blue">
                          เงินสุทธิ
                        </p>
                        <p className="mt-1 text-4xl font-bold tracking-tight text-card-foreground">
                          {formatCurrency(summary.totals.netAmount)} บาท
                        </p>
                        <p className="mt-3 text-xs font-semibold leading-5 text-muted-foreground">
                          ยอดขาย + รายรับ + รับชำระลูกหนี้ − รายจ่าย − เงินโอนจากยอดขาย
                          − ลูกหนี้ค้างชำระ
                        </p>
                      </div>

                      <div className="grid border-t bg-background/65 sm:grid-cols-2 lg:grid-cols-1 lg:border-t-0 lg:border-l">
                        <div className="p-4">
                          <p className="text-xs font-bold text-muted-foreground">
                            ยอดขายทั้งหมด
                          </p>
                          <p className="mt-1 text-2xl font-bold text-card-foreground">
                            {formatCurrency(summary.metrics.salesTotal)} บาท
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                            {formatQuantity(summary.metrics.soldQuantity)}{" "}
                            รายการสินค้า
                          </p>
                        </div>
                        <div className="border-t p-4 sm:border-t-0 sm:border-l lg:border-t lg:border-l-0">
                          <p className="text-xs font-bold text-muted-foreground">
                            บิลที่ชำระครบ
                          </p>
                          <p className="mt-1 text-2xl font-bold text-main-green">
                            {summary.metrics.paidSalesCount.toLocaleString(
                              "th-TH",
                            )}{" "}
                            จาก{" "}
                            {(
                              summary.metrics.salesBillCount ?? 0
                            ).toLocaleString("th-TH")}{" "}
                            บิล
                          </p>
                          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                            รวม {formatCurrency(summary.metrics.paidSalesTotal)}{" "}
                            บาท
                          </p>
                        </div>
                      </div>
                    </section>

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                      <section className="overflow-hidden rounded-[10px] border bg-card">
                        <div className="border-b bg-muted/25 px-4 py-3">
                          <h3 className="text-sm font-bold text-card-foreground">
                            วิธีคำนวณเงินสุทธิ
                          </h3>
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            ดูได้ชัดว่าตัวเลขแต่ละก้อนถูกบวกหรือลบ
                          </p>
                        </div>
                        <div className="divide-y">
                          {[
                            {
                              label: "ยอดขายทั้งหมด",
                              value: summary.metrics.salesTotal,
                              sign: "+",
                            },
                            {
                              label: "รายรับอื่น",
                              value: summary.metrics.income,
                              sign: "+",
                            },
                            {
                              label: "รับชำระลูกหนี้",
                              value: summary.metrics.receivableCollected,
                              sign: "+",
                            },
                            {
                              label: "รายจ่ายรวม",
                              value: summary.metrics.expenses,
                              sign: "−",
                            },
                            {
                              label: "เงินโอนจากยอดขาย",
                              value: summary.metrics.salesTransfer,
                              sign: "−",
                            },
                            {
                              label: "ลูกหนี้ค้างชำระ",
                              value: summary.metrics.outstandingReceivables,
                              sign: "−",
                            },
                          ].map((item) => (
                            <div
                              key={item.label}
                              className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-2 px-4 py-2.5 text-sm"
                            >
                              <span
                                className={cn(
                                  "flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold",
                                  item.sign === "+"
                                    ? "bg-emerald-50 text-main-green dark:bg-emerald-500/10"
                                    : "bg-red-50 text-main-red dark:bg-red-500/10",
                                )}
                              >
                                {item.sign}
                              </span>
                              <span className="font-semibold text-muted-foreground">
                                {item.label}
                              </span>
                              <span className="font-bold text-card-foreground">
                                {formatCurrency(item.value)} บาท
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t bg-blue-50/60 px-4 py-3 dark:bg-blue-500/10">
                          <span className="text-sm font-bold text-main-blue">
                            เท่ากับเงินสุทธิ
                          </span>
                          <span className="text-xl font-bold text-card-foreground">
                            {formatCurrency(summary.totals.netAmount)} บาท
                          </span>
                        </div>
                      </section>

                      <section className="overflow-hidden rounded-[10px] border bg-card">
                        <div className="border-b bg-muted/25 px-4 py-3">
                          <h3 className="text-sm font-bold text-card-foreground">
                            ข้อมูลประกอบสำหรับตรวจยอด
                          </h3>
                          <p className="text-[11px] font-semibold text-muted-foreground">
                            เป็นรายละเอียดช่องทาง ไม่ใช่เงินสุทธิอีกชุด
                          </p>
                        </div>
                        <div className="grid grid-cols-2">
                          {[
                            {
                              label: "ยอดขายเงินสด",
                              value: summary.metrics.salesCash,
                              detail: "จากบิลขาย",
                              icon: Wallet,
                              tone: "green",
                            },
                            {
                              label: "ยอดขายเงินโอน",
                              value: summary.metrics.salesTransfer,
                              detail: "จากบิลขาย",
                              icon: CreditCard,
                              tone: "blue",
                            },
                            {
                              label: "ยอดมัดจำ",
                              value: summary.metrics.deposits,
                              detail: "รวมอยู่ในยอดขายแล้ว",
                              icon: Receipt,
                              tone: "orange",
                            },
                            {
                              label: "รับชำระลูกหนี้",
                              value: summary.metrics.receivableCollected,
                              detail: `สด ${formatCurrency(
                                summary.metrics.receivableCollectedCash,
                              )} · โอน ${formatCurrency(
                                summary.metrics.receivableCollectedTransfer,
                              )}`,
                              icon: CircleCheckBig,
                              tone: "green",
                            },
                          ].map((item, index) => (
                            <div
                              key={item.label}
                              className={cn(
                                "p-4",
                                index % 2 === 1 && "border-l",
                                index >= 2 && "border-t",
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-xs font-bold text-muted-foreground">
                                    {item.label}
                                  </p>
                                  <p className="mt-1 text-lg font-bold text-card-foreground">
                                    {formatCurrency(item.value)} บาท
                                  </p>
                                </div>
                                <item.icon
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    item.tone === "blue"
                                      ? "text-main-blue"
                                      : item.tone === "orange"
                                        ? "text-main-orange"
                                        : "text-main-green",
                                  )}
                                />
                              </div>
                              <p className="mt-1 text-[10px] font-semibold text-muted-foreground">
                                {item.detail}
                              </p>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>

                    {summary.metrics.unclassifiedIncome > 0 ||
                    summary.metrics.unclassifiedExpenses > 0 ? (
                      <div className="flex items-start gap-3 rounded-[10px] border border-orange-100 bg-orange-50/70 p-4 text-sm dark:border-orange-500/20 dark:bg-orange-500/10">
                        <Info className="mt-0.5 h-5 w-5 shrink-0 text-main-orange" />
                        <div>
                          <p className="font-bold text-card-foreground">
                            มีรายการรับ–จ่ายที่ไม่ได้ระบุช่องทาง
                          </p>
                          <p className="mt-1 font-semibold text-muted-foreground">
                            รายรับ{" "}
                            {formatCurrency(summary.metrics.unclassifiedIncome)}{" "}
                            บาท · รายจ่าย{" "}
                            {formatCurrency(
                              summary.metrics.unclassifiedExpenses,
                            )}{" "}
                            บาท — ระบบนับรายการเหล่านี้เป็นเงินสดเพื่อให้เข้ากับวิธีคำนวณเดิม
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </TabsContent>

                {/* Tab 2: Category Sales */}
                <TabsContent
                  value="categories"
                  className="h-full overflow-y-auto p-6 md:p-8 focus-visible:outline-none mt-0"
                >
                  <div className="max-w-3xl mx-auto space-y-6">
                    <section className="overflow-hidden rounded-[10px] border bg-card flex flex-col">
                      <div className="border-b bg-muted/25 px-4 py-4 shrink-0">
                        <h2 className="text-base font-bold text-card-foreground">
                          ยอดขายแยกตามประเภทสินค้า
                        </h2>
                        <p className="text-xs font-semibold text-muted-foreground">
                          จำนวนที่ขายได้และยอดขายรวมจากรายการสินค้าในบิล
                        </p>
                      </div>

                      <div className="overflow-y-auto min-h-0">
                        <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_90px_120px] border-b bg-muted/95 backdrop-blur-sm px-4 py-2 text-xs font-bold text-muted-foreground">
                          <span>ประเภท</span>
                          <span className="text-right">จำนวน</span>
                          <span className="text-right">จำนวนเงิน</span>
                        </div>
                        {summary.categories.length === 0 ? (
                          <div className="px-4 py-10 text-center text-sm font-bold text-muted-foreground">
                            ไม่มีรายการขายในช่วงวันที่เลือก
                          </div>
                        ) : (
                          <div className="divide-y">
                            {summary.categories.map((category) => (
                              <div
                                key={category.name}
                                className="grid grid-cols-[minmax(0,1fr)_90px_120px] items-center px-4 py-2.5 text-sm hover:bg-muted/5 transition-colors"
                              >
                                <span className="truncate font-bold text-card-foreground">
                                  {category.name}
                                </span>
                                <span className="text-right font-semibold text-muted-foreground">
                                  {formatQuantity(category.quantity)}
                                </span>
                                <span className="text-right font-bold text-card-foreground">
                                  {formatCurrency(category.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t bg-muted/15 px-4 py-3 shrink-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold text-card-foreground">
                            รวมสินค้าที่ขาย
                          </span>
                          <span className="font-bold text-card-foreground">
                            {formatQuantity(summary.metrics.soldQuantity)}{" "}
                            รายการ ·{" "}
                            {formatCurrency(summary.metrics.salesTotal)} บาท
                          </span>
                        </div>
                      </div>
                    </section>
                  </div>
                </TabsContent>

                {/* Tab 3: Transactions */}
                <TabsContent
                  value="transactions"
                  className="h-full flex flex-col overflow-hidden p-6 md:p-8 focus-visible:outline-none mt-0"
                >
                  <div className="flex-1 flex flex-col overflow-hidden min-h-0">
                    {/* Horizontal scrollable pills */}
                    <div className="flex gap-2 overflow-x-auto pb-3 shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none">
                      {txListFilters.map((filter) => {
                        const isActive = activeTxList === filter.id;
                        return (
                          <button
                            key={filter.id}
                            type="button"
                            onClick={() => setActiveTxList(filter.id)}
                            className={cn(
                              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer",
                              isActive
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-background text-muted-foreground border-input hover:text-foreground hover:bg-muted/40",
                            )}
                          >
                            <filter.icon
                              className={cn(
                                "h-3.5 w-3.5",
                                !isActive && "text-muted-foreground/80",
                              )}
                            />
                            <span>{filter.label}</span>
                            <span
                              className={cn(
                                "ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-extrabold",
                                isActive
                                  ? "bg-primary-foreground/20 text-primary-foreground"
                                  : "bg-muted text-muted-foreground border",
                              )}
                            >
                              {filter.count.toLocaleString("th-TH")}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Content Box */}
                    <div className="flex-1 min-h-0 relative">
                      {activeTxList === "paid" && (
                        <ListPanel
                          title="บิลขายที่ชำระครบแล้ว"
                          subtitle={`ชำระครบ ${summary.metrics.paidSalesCount.toLocaleString(
                            "th-TH",
                          )} จากทั้งหมด ${(
                            summary.metrics.salesBillCount ?? 0
                          ).toLocaleString("th-TH")} บิล · รวม ${formatCurrency(
                            summary.metrics.paidSalesTotal,
                          )} บาท`}
                          list={summary.lists.paidSales}
                          icon={CircleCheckBig}
                          tone="green"
                          className="h-full"
                        />
                      )}
                      {activeTxList === "income" && (
                        <ListPanel
                          title="รายการรับทั้งหมด"
                          subtitle={`รวม ${formatCurrency(summary.metrics.income)} บาท`}
                          list={summary.lists.income}
                          icon={Banknote}
                          tone="green"
                          className="h-full"
                        />
                      )}
                      {activeTxList === "expenses" && (
                        <ListPanel
                          title="รายการจ่ายทั้งหมด"
                          subtitle={`ไม่รวมรายการพนักงาน · ${formatCurrency(
                            summary.metrics.expenses -
                              summary.metrics.employeeExpenses,
                          )} บาท`}
                          list={summary.lists.expenses}
                          icon={TrendingDown}
                          tone="red"
                          className="h-full"
                        />
                      )}
                      {activeTxList === "receivables" && (
                        <ListPanel
                          title="รายการรับชำระลูกหนี้"
                          subtitle={`รวม ${formatCurrency(
                            summary.metrics.receivableCollected,
                          )} บาท`}
                          list={summary.lists.receivablePayments}
                          icon={Receipt}
                          tone="green"
                          className="h-full"
                        />
                      )}
                      {activeTxList === "employees" && (
                        <ListPanel
                          title="รายการเบิกจ่ายเงินพนักงาน"
                          subtitle={`รวม ${formatCurrency(
                            summary.metrics.employeeExpenses,
                          )} บาท`}
                          list={summary.lists.employeePayments}
                          icon={Users}
                          tone="orange"
                          className="h-full"
                        />
                      )}
                      {activeTxList === "transfers" && (
                        <ListPanel
                          title="รายการโอน"
                          subtitle={`ยอดขายเงินโอน ${formatCurrency(
                            summary.metrics.salesTransfer,
                          )} บาท`}
                          list={summary.lists.transfers}
                          icon={CreditCard}
                          tone="blue"
                          className="h-full"
                        />
                      )}
                      {activeTxList === "outstanding" && (
                        <ListPanel
                          title="รายการลูกหนี้ค้างชำระ"
                          subtitle={`${summary.metrics.outstandingReceivableCount.toLocaleString(
                            "th-TH",
                          )} ใบ · ${formatCurrency(
                            summary.metrics.outstandingReceivables,
                          )} บาท`}
                          list={summary.lists.outstandingReceivables}
                          icon={FileText}
                          tone="orange"
                          className="h-full"
                        />
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </LargeDialogBody>
      </LargeDialogContent>
    </LargeDialog>
  );
}
