"use client";

import { format } from "date-fns";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowUpDown,
  Banknote,
  CreditCard,
  DollarSign,
  Receipt,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Payment {
  OrderNum: number;
  DatePost: string;
  NumberPrintPost: string;
  CodeStaff: number;
  NameSure: string;
  NamePositions: string;
  TotalPrice: number;
  Datepayment: string;
  NameExpensesORIncome: string;
  Debit: number;
  Credit: number;
  MoneyCash: number;
  MoneyTransfer: number;
  NameBank: string;
  Remark: string;
  UserName: string;
}

interface Summary {
  totalAmount: number;
  totalCash: number;
  totalTransfer: number;
  totalDebit: number;
  totalCredit: number;
  salaryCount: number;
  expenseCount: number;
  debitCount: number;
  creditCount: number;
}

type PaymentFilter = "all" | "income" | "expense" | "salary";
type PaymentScope = "all" | "other";

const allowedLimits = [20, 50, 100, 200];

function parseDateParam(value: string | null) {
  if (!value) {
    return undefined;
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
}

function isPaymentFilter(value: string | null): value is PaymentFilter {
  return (
    value === "all" ||
    value === "income" ||
    value === "expense" ||
    value === "salary"
  );
}

function getFilterFromParams(params: URLSearchParams): PaymentFilter {
  const type = params.get("type");

  return isPaymentFilter(type) ? type : "all";
}

function getSelectedDateFromParams(params: URLSearchParams) {
  return (
    parseDateParam(params.get("date") || params.get("dateFrom")) ?? new Date()
  );
}

function getLimitFromParams(params: URLSearchParams) {
  const requestedLimit = Number(params.get("limit"));

  return allowedLimits.includes(requestedLimit) ? requestedLimit : 20;
}

function getScopeFromParams(params: URLSearchParams): PaymentScope {
  return params.get("scope") === "other" ? "other" : "all";
}

function isSameSelectedDate(first: Date | undefined, second: Date | undefined) {
  if (!first && !second) {
    return true;
  }

  if (!first || !second) {
    return false;
  }

  return format(first, "yyyy-MM-dd") === format(second, "yyyy-MM-dd");
}

export default function PaymentsPage() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const initialParams = new URLSearchParams(queryString);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PaymentFilter>(() =>
    getFilterFromParams(initialParams),
  );
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(() =>
    getSelectedDateFromParams(initialParams),
  );
  const [limit, setLimit] = useState(() => getLimitFromParams(initialParams));
  const [paymentScope, setPaymentScope] = useState<PaymentScope>(() =>
    getScopeFromParams(initialParams),
  );

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    const nextFilter = getFilterFromParams(params);
    const nextSelectedDate = getSelectedDateFromParams(params);
    const nextLimit = getLimitFromParams(params);
    const nextScope = getScopeFromParams(params);

    setFilter((currentFilter) =>
      currentFilter === nextFilter ? currentFilter : nextFilter,
    );
    setSelectedDate((currentSelectedDate) =>
      isSameSelectedDate(currentSelectedDate, nextSelectedDate)
        ? currentSelectedDate
        : nextSelectedDate,
    );
    setLimit((currentLimit) =>
      currentLimit === nextLimit ? currentLimit : nextLimit,
    );
    setPaymentScope((currentScope) =>
      currentScope === nextScope ? currentScope : nextScope,
    );
  }, [queryString]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return "-";
    }

    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getFilterLabel = () => {
    if (filter === "salary") {
      return "รายการมีพนักงาน";
    }

    if (filter === "income") {
      return "รายรับ";
    }

    if (filter === "expense") {
      return "รายจ่าย";
    }

    return "ทั้งหมด";
  };

  const getPaymentType = (payment: Payment) => {
    const hasEmployee =
      payment.CodeStaff > 0 && payment.NameSure && payment.NameSure !== "";

    const isDebit = (payment.Debit || 0) > 0;
    const isCredit = (payment.Credit || 0) > 0;

    if (hasEmployee) {
      return {
        label: "พนักงาน",
        className:
          "bg-red-50 text-main-red border-red-100 dark:bg-red-500/10 dark:border-red-500/20",
      };
    }

    if (isDebit && !isCredit) {
      return {
        label: "รายจ่าย",
        className:
          "bg-red-50 text-main-red border-red-100 dark:bg-red-500/10 dark:border-red-500/20",
      };
    }

    if (isCredit && !isDebit) {
      return {
        label: "รายรับ",
        className:
          "bg-emerald-50 text-main-green border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
      };
    }

    return {
      label: "ไม่ระบุ",
      className:
        "bg-blue-50 text-main-blue border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20",
    };
  };

  const getPaymentMethods = (payment: Payment) => {
    const methods = [];

    if (payment.MoneyCash > 0) {
      methods.push({
        label: "สด",
        amount: payment.MoneyCash,
        className:
          "bg-emerald-50 text-main-green border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20",
      });
    }

    if (payment.MoneyTransfer > 0) {
      methods.push({
        label: "โอน",
        amount: payment.MoneyTransfer,
        className:
          "bg-blue-50 text-main-blue border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20",
      });
    }

    return methods;
  };

  useEffect(() => {
    let shouldIgnoreResponse = false;

    async function fetchPayments() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          limit: limit.toString(),
          type: filter,
        });

        if (selectedDate) {
          const date = format(selectedDate, "yyyy-MM-dd");
          params.set("dateFrom", date);
          params.set("dateTo", date);
        }

        if (paymentScope === "other") {
          params.set("scope", paymentScope);
        }

        const res = await fetch(`/api/payments?${params.toString()}`);
        const data = await res.json();

        if (shouldIgnoreResponse) {
          return;
        }

        if (data.success) {
          setPayments(data.data);
          setSummary(data.summary);
        } else {
          setError(data.error || "เกิดข้อผิดพลาด");
        }
      } catch (err) {
        if (!shouldIgnoreResponse) {
          setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
        }
      } finally {
        if (!shouldIgnoreResponse) {
          setLoading(false);
        }
      }
    }

    fetchPayments();

    return () => {
      shouldIgnoreResponse = true;
    };
  }, [filter, limit, paymentScope, selectedDate]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <Activity className="h-8 w-8 animate-spin" />
          <span className="ml-2">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-6">
          <p className="font-bold text-main-red">เกิดข้อผิดพลาด</p>
          <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="จ่ายเงิน" href="/payments" />
      <hr className="mt-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6 mt-2 sm:mt-0">
        <div className="dark:bg-background mt-2 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm md:mt-6">
          <div className="flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Receipt strokeWidth={2.5} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="hidden sm:block text-primary text-2xl font-bold">
                  รายการรับ-จ่ายเงินทั้งหมด
                </span>
                <span className="block sm:hidden text-primary text-2xl font-bold">
                  รายการรับ-จ่ายเงิน
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  ติดตามรายรับ รายจ่าย เงินเดือน และการชำระเงินรายวัน
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => {
                  setFilter("all");
                  setPaymentScope("all");
                }}
                className="font-bold"
              >
                ทั้งหมด
              </Button>
              <Button
                variant={filter === "income" ? "default" : "outline"}
                onClick={() => {
                  setFilter("income");
                  setPaymentScope("all");
                }}
                className="font-bold"
              >
                <ArrowUpCircle className="mr-2 h-4 w-4" />
                รายรับ
              </Button>
              <Button
                variant={filter === "expense" ? "default" : "outline"}
                onClick={() => {
                  setFilter("expense");
                  setPaymentScope("all");
                }}
                className="font-bold"
              >
                <ArrowDownCircle className="mr-2 h-4 w-4" />
                รายจ่าย
              </Button>
              <Button
                variant={filter === "salary" ? "default" : "outline"}
                onClick={() => {
                  setFilter("salary");
                  setPaymentScope("all");
                }}
                className="font-bold"
              >
                <Users className="mr-2 h-4 w-4" />
                พนักงาน
              </Button>
            </div>
          </div>
          {summary && (
            <div className="space-y-4">
              {/* แถวบน - 4 cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                  title="ยอดรวมทั้งหมด"
                  value={summary.totalAmount || 0}
                  format="currency"
                  icon={DollarSign}
                  variant="emerald"
                />
                <KPICard
                  title="เงินสด"
                  value={summary.totalCash || 0}
                  format="currency"
                  subtitle={`${summary.totalAmount ? ((summary.totalCash / summary.totalAmount) * 100).toFixed(1) : 0}%`}
                  icon={Banknote}
                  variant="emerald"
                />
                <KPICard
                  title="เงินโอน"
                  value={summary.totalTransfer || 0}
                  format="currency"
                  subtitle={`${summary.totalAmount ? ((summary.totalTransfer / summary.totalAmount) * 100).toFixed(1) : 0}%`}
                  icon={CreditCard}
                  variant="blue"
                />
                <div className="bg-background dark:bg-secondary rounded-[8px] border p-4">
                  <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
                    <div className="flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border bg-white dark:bg-background/65 shrink-0">
                      <Activity
                        strokeWidth={2.5}
                        className="text-main-orange w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
                      />
                    </div>
                    <div className="flex flex-col items-end min-[600px]:items-start gap-1">
                      <span className="text-primary text-lg font-semibold">
                        ทั้งหมด
                      </span>
                      <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
                        <span className={`${outfit.className}`}>
                          {(summary.salaryCount || 0) +
                            (summary.expenseCount || 0)}
                        </span>{" "}
                        รายการ
                      </h3>
                    </div>
                  </div>
                </div>
              </div>

              {/* แถวล่าง - 4 cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <KPICard
                  title="รายรับ"
                  value={summary.totalCredit || 0}
                  format="currency"
                  subtitle={`${summary.creditCount || 0} รายการ`}
                  icon={ArrowUpCircle}
                  variant="emerald"
                />
                <KPICard
                  title="รายจ่าย"
                  value={summary.totalDebit || 0}
                  format="currency"
                  subtitle={`${summary.debitCount || 0} รายการ`}
                  icon={ArrowDownCircle}
                  variant="red"
                />
                <KPICard
                  title="รายการทั่วไป"
                  value={summary.expenseCount || 0}
                  unit="รายการ"
                  subtitle="รายการ"
                  icon={Receipt}
                  variant="blue"
                />
                <KPICard
                  title="รายการมีพนักงาน"
                  value={summary.salaryCount || 0}
                  unit="รายการ"
                  subtitle="รายการ"
                  icon={Users}
                  variant="orange"
                />
              </div>
            </div>
          )}
        </div>

        {/* ตารางรายการรับ-จ่าย */}
        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10">
                <ArrowUpDown className="h-6 w-6 text-main-orange" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการล่าสุด
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  รายการรับ-จ่ายตามวันที่ จำนวน และตัวกรองที่เลือก
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DatePicker
                date={selectedDate}
                onDateChange={setSelectedDate}
                placeholder="เลือกวันที่"
                className="h-8 w-full rounded-full font-bold min-[520px]:w-[230px]"
              />
              <Select
                value={limit.toString()}
                onValueChange={(value) => setLimit(Number(value))}
              >
                <SelectTrigger className="h-8 w-full rounded-full px-4 font-bold min-[520px]:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 รายการ</SelectItem>
                  <SelectItem value="50">50 รายการ</SelectItem>
                  <SelectItem value="100">100 รายการ</SelectItem>
                  <SelectItem value="200">200 รายการ</SelectItem>
                </SelectContent>
              </Select>
              <Badge className="h-8 rounded-full bg-orange-50 px-4 text-sm font-bold text-main-orange dark:bg-orange-500/10">
                {payments.length} รายการ
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground"
              >
                {getFilterLabel()}
              </Badge>
            </div>
          </div>

          {payments.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Receipt className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบรายการรับ-จ่าย
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ลองเปลี่ยนตัวกรองด้านบนเพื่อดูรายการอื่น
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
              <Table>
                <TableHeader className="bg-secondary/70">
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="w-[24%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                      เอกสาร
                    </TableHead>
                    <TableHead className="hidden text-base font-bold text-card-foreground min-[640px]:table-cell min-[500px]:text-lg">
                      รายการ
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                      วันที่
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                      ประเภท
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[900px]:table-cell">
                      รายรับ/รายจ่าย
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[1020px]:table-cell">
                      พนักงาน/ธนาคาร
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold min-[1100px]:table-cell text-card-foreground">
                      วิธีจ่าย
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      ยอดรวม
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment, index) => {
                    const paymentType = getPaymentType(payment);
                    const paymentMethods = getPaymentMethods(payment);
                    const hasEmployee =
                      payment.CodeStaff > 0 &&
                      payment.NameSure &&
                      payment.NameSure !== "";

                    return (
                      <TableRow
                        key={payment.OrderNum}
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
                                  "max-w-[120px] truncate text-sm font-bold text-card-foreground transition-colors group-hover:text-main-orange min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[550px]:text-base min-[1100px]:max-w-[420px]",
                                )}
                              >
                                {payment.NumberPrintPost || payment.OrderNum}
                              </span>
                              <p className="max-w-[120px] truncate text-sm font-semibold text-muted-foreground min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[640px]:hidden">
                                {payment.NameExpensesORIncome || "ไม่ระบุ"}
                              </p>
                              <p className="hidden text-xs font-medium text-muted-foreground min-[560px]:block min-[760px]:hidden">
                                {formatDate(payment.Datepayment)}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden align-middle min-[640px]:table-cell">
                          <div className="flex min-w-0 flex-col">
                            <span className="max-w-[180px] truncate text-sm font-bold text-card-foreground min-[900px]:max-w-[260px] min-[1200px]:max-w-[360px]">
                              {payment.NameExpensesORIncome || "ไม่ระบุ"}
                            </span>
                            <span className="max-w-[180px] truncate text-xs font-medium text-muted-foreground min-[900px]:max-w-[260px] min-[1200px]:max-w-[360px]">
                              {payment.UserName
                                ? `บันทึกโดย ${payment.UserName}`
                                : "ไม่มีข้อมูลผู้บันทึก"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                          <span className="text-sm font-semibold text-card-foreground">
                            {formatDate(payment.Datepayment)}
                          </span>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                          <Badge
                            variant="outline"
                            className={cn(
                              "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                              paymentType.className,
                            )}
                          >
                            {paymentType.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[900px]:table-cell">
                          <div className="flex flex-col items-end gap-1.5">
                            {payment.Debit > 0 && (
                              <div className="flex items-center gap-1.5">
                                <ArrowDownCircle className="h-4 w-4 text-main-red" />
                                <span
                                  className={cn(
                                    outfit.className,
                                    "text-sm font-bold text-main-red",
                                  )}
                                >
                                  -{formatCurrency(payment.Debit)}
                                </span>
                              </div>
                            )}
                            {payment.Credit > 0 && (
                              <div className="flex items-center gap-1.5">
                                <ArrowUpCircle className="h-4 w-4 text-main-green" />
                                <span
                                  className={cn(
                                    outfit.className,
                                    "text-sm font-bold text-main-green",
                                  )}
                                >
                                  +{formatCurrency(payment.Credit)}
                                </span>
                              </div>
                            )}
                            {payment.Debit === 0 && payment.Credit === 0 && (
                              <span className="text-xs font-medium text-muted-foreground">
                                ไม่มีข้อมูล
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[1020px]:table-cell">
                          <div className="flex flex-col items-end gap-1">
                            <span className="max-w-[220px] truncate text-sm font-semibold text-card-foreground">
                              {hasEmployee
                                ? payment.NameSure
                                : payment.NameBank || "-"}
                            </span>
                            <span className="max-w-[220px] truncate text-xs font-medium text-muted-foreground">
                              {hasEmployee
                                ? payment.NamePositions || "ไม่ระบุตำแหน่ง"
                                : payment.NameBank
                                  ? "ธนาคาร"
                                  : "ไม่มีข้อมูลธนาคาร"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[1100px]:table-cell">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {paymentMethods.length > 0 ? (
                              paymentMethods.map((method) => (
                                <Badge
                                  key={method.label}
                                  variant="outline"
                                  className={cn(
                                    "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                                    method.className,
                                  )}
                                >
                                  {method.label}
                                </Badge>
                              ))
                            ) : (
                              <Badge
                                variant="outline"
                                className="h-7 rounded-full px-3 text-xs font-bold text-muted-foreground shadow-none"
                              >
                                ไม่ระบุ
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                outfit.className,
                                "text-sm font-bold text-card-foreground min-[500px]:text-base",
                              )}
                            >
                              {formatCurrency(payment.TotalPrice)}
                            </span>

                            {/* แสดง Debit/Credit ในมุมมอง mobile */}
                            <div className="flex flex-wrap justify-end gap-2 min-[900px]:hidden">
                              {payment.Debit > 0 && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-main-red">
                                  <ArrowDownCircle className="h-3 w-3" />
                                  จ่าย {formatCurrency(payment.Debit)}
                                </span>
                              )}
                              {payment.Credit > 0 && (
                                <span className="flex items-center gap-1 text-xs font-semibold text-main-green">
                                  <ArrowUpCircle className="h-3 w-3" />
                                  รับ {formatCurrency(payment.Credit)}
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap justify-end gap-1 min-[1100px]:hidden">
                              {paymentMethods.length > 0 ? (
                                paymentMethods.map((method) => (
                                  <span
                                    key={method.label}
                                    className={cn(
                                      "text-xs font-semibold",
                                      method.label === "สด"
                                        ? "text-main-green"
                                        : "text-main-blue",
                                    )}
                                  >
                                    {method.label}{" "}
                                    {formatCurrency(method.amount)}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs font-semibold text-muted-foreground">
                                  ไม่ระบุวิธีจ่าย
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
