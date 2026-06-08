"use client";

import {
  Activity,
  Briefcase,
  DollarSign,
  Phone,
  ReceiptText,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Employee {
  Code: number;
  NameSure: string;
  Address: string;
  Phone: string;
  IDCard: string;
  DateBirthDay: string;
  Age: number;
  Positions: string;
  PriceToWorkDay: number;
}

interface Position {
  Code: number;
  NamePositions: string;
}

interface Payment {
  OrderNum: number;
  DatePost: string;
  NumberPrintPost?: string;
  CodeStaff: number;
  NameSure: string;
  NamePositions: string;
  TotalPrice: number;
  Datepayment: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (value: number, fractionDigits = 0) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
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

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        const [empRes, posRes, payRes] = await Promise.all([
          fetch("/api/employees"),
          fetch("/api/employees/positions"),
          fetch("/api/employees/payments?limit=20&excludeZero=true"),
        ]);

        const [empData, posData, payData] = await Promise.all([
          empRes.json(),
          posRes.json(),
          payRes.json(),
        ]);

        if (empData.success) {
          setEmployees(empData.data);
        }

        if (posData.success) {
          setPositions(posData.data);
        }

        if (payData.success) {
          setRecentPayments(payData.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
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

  if (error) {
    return (
      <div className="p-6 pb-16">
        <DashboardBreadcrumb label="พนักงาน" href="/employees" />
        <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

        <div className="rounded-2xl border border-red-100 bg-red-50 p-6 dark:border-red-500/20 dark:bg-red-500/10">
          <p className="font-bold text-main-red">เกิดข้อผิดพลาด</p>
          <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalSalary = recentPayments.reduce(
    (sum, payment) => sum + (payment.TotalPrice || 0),
    0,
  );

  const averageWage =
    employees.length > 0
      ? employees.reduce((sum, emp) => sum + (emp.PriceToWorkDay || 0), 0) /
        employees.length
      : 0;

  const employeesWithPhone = employees.filter((emp) => emp.Phone).length;

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="พนักงาน" href="/employees" />
      <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm">
          <div className="mb-6 flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">
                  จัดการข้อมูลพนักงาน
                </span>
                <p className="hidden font-medium text-foreground min-[798px]:block">
                  ข้อมูลพนักงาน ตำแหน่งงาน และการจ่ายเงินเดือน
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="พนักงานทั้งหมด"
              value={employees.length}
              subtitle={`${employeesWithPhone.toLocaleString("th-TH")} คนมีเบอร์ติดต่อ`}
              icon={Users}
              variant="blue"
            />
            <KPICard
              title="ตำแหน่งงาน"
              value={positions.length}
              subtitle="ตำแหน่ง"
              icon={Briefcase}
              variant="purple"
            />
            <KPICard
              title="ค่าแรงเฉลี่ย/วัน"
              value={averageWage}
              format="currency"
              icon={DollarSign}
              variant="emerald"
            />
            <KPICard
              title="จ่ายเงินล่าสุด"
              value={totalSalary}
              format="currency"
              subtitle="20 ครั้งล่าสุด"
              icon={ReceiptText}
              variant="orange"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                <Users className="h-6 w-6 text-main-blue" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายชื่อพนักงานทั้งหมด
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  ข้อมูลติดต่อ ตำแหน่ง และค่าแรงรายวันของทีม
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-blue-50 px-4 text-sm font-bold text-main-blue dark:bg-blue-500/10">
                {employees.length} คน
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground"
              >
                {positions.length} ตำแหน่ง
              </Badge>
            </div>
          </div>

          {employees.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบข้อมูลพนักงาน
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ยังไม่มีรายชื่อพนักงานในระบบ
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
              <Table>
                <TableHeader className="bg-secondary/70">
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="w-[36%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                      พนักงาน
                    </TableHead>
                    <TableHead className="hidden text-base font-bold text-card-foreground min-[640px]:table-cell min-[500px]:text-lg">
                      ตำแหน่ง
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                      เบอร์โทร
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[900px]:table-cell">
                      อายุ
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[1180px]:table-cell">
                      ที่อยู่
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      ค่าแรง/วัน
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp, index) => (
                    <TableRow
                      key={emp.Code}
                      className="group border-border/60 transition-colors duration-200 hover:bg-blue-50/30 dark:hover:bg-blue-500/5"
                    >
                      <TableCell className="px-4 py-4 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-sm font-bold text-main-blue select-none dark:border-blue-500/20 dark:bg-blue-500/10 min-[550px]:h-12 min-[550px]:w-12">
                            {index + 1}
                          </div>
                          <div className="flex min-w-0 flex-col">
                            <span className="max-w-[130px] truncate text-base font-bold text-card-foreground transition-colors group-hover:text-main-blue min-[420px]:max-w-[190px] min-[550px]:max-w-[280px] min-[1100px]:max-w-[420px]">
                              {emp.NameSure || "ไม่ระบุชื่อ"}
                            </span>
                            <p className="max-w-[130px] truncate text-sm font-semibold text-muted-foreground min-[420px]:max-w-[190px] min-[550px]:max-w-[280px] min-[640px]:hidden">
                              {emp.Positions || "ไม่ระบุตำแหน่ง"}
                            </p>
                            <p
                              className={cn(
                                outfit.className,
                                "text-xs font-semibold text-muted-foreground min-[760px]:hidden",
                              )}
                            >
                              {emp.Phone || "ไม่ระบุเบอร์โทร"}
                            </p>
                            {emp.Address ? (
                              <p className="hidden max-w-[280px] truncate text-xs font-medium text-muted-foreground min-[560px]:block min-[1180px]:hidden">
                                {emp.Address}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden align-middle min-[640px]:table-cell">
                        <Badge
                          variant="outline"
                          className="h-7 rounded-full border-blue-100 bg-blue-50 px-3 text-xs font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
                        >
                          {emp.Positions || "ไม่ระบุตำแหน่ง"}
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                        {emp.Phone ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                            <span
                              className={cn(
                                outfit.className,
                                "text-sm font-semibold text-card-foreground",
                              )}
                            >
                              {emp.Phone}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>

                      <TableCell
                        className={cn(
                          outfit.className,
                          "hidden text-right text-sm font-semibold text-muted-foreground min-[900px]:table-cell",
                        )}
                      >
                        {emp.Age > 0 ? `${emp.Age} ปี` : "-"}
                      </TableCell>

                      <TableCell className="hidden max-w-xs text-right align-middle min-[1180px]:table-cell">
                        <span className="line-clamp-2 text-xs font-medium text-muted-foreground">
                          {emp.Address || "-"}
                        </span>
                      </TableCell>

                      <TableCell className="text-right align-middle">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={cn(
                              outfit.className,
                              "text-sm font-bold text-card-foreground min-[500px]:text-base",
                            )}
                          >
                            {emp.PriceToWorkDay
                              ? formatCurrency(emp.PriceToWorkDay)
                              : "-"}
                          </span>
                          <span
                            className={cn(
                              outfit.className,
                              "text-xs font-semibold text-muted-foreground",
                            )}
                          >
                            รหัส {emp.Code}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 dark:border-purple-500/20 dark:bg-purple-500/10">
                <Briefcase className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  ตำแหน่งงาน
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  สรุปจำนวนพนักงานในแต่ละตำแหน่ง
                </p>
              </div>
            </div>

            <Badge className="h-8 w-fit rounded-full bg-purple-50 px-4 text-sm font-bold text-purple-600 dark:bg-purple-500/10">
              {positions.length} ตำแหน่ง
            </Badge>
          </div>

          {positions.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบข้อมูลตำแหน่งงาน
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ยังไม่มีรายการตำแหน่งในระบบ
              </p>
            </div>
          ) : (
            <div className="grid gap-3 min-[520px]:grid-cols-2 min-[900px]:grid-cols-4">
              {positions.map((pos) => {
                const empCount = employees.filter(
                  (emp) => emp.Positions?.trim() === pos.NamePositions,
                ).length;

                return (
                  <div
                    key={pos.Code}
                    className="rounded-2xl border bg-white p-4 transition-colors duration-200 hover:bg-purple-50/30 dark:bg-card dark:hover:bg-purple-500/5"
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 dark:border-purple-500/20 dark:bg-purple-500/10">
                        <Briefcase className="h-5 w-5 text-purple-600" />
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          outfit.className,
                          "rounded-full px-3 text-xs font-bold text-muted-foreground",
                        )}
                      >
                        รหัส {pos.Code}
                      </Badge>
                    </div>
                    <h3 className="line-clamp-1 text-base font-bold text-card-foreground">
                      {pos.NamePositions}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      {empCount.toLocaleString("th-TH")} คนในตำแหน่งนี้
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10">
                <ReceiptText className="h-6 w-6 text-main-orange" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  การจ่ายเงินเดือนล่าสุด
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  รายการจ่ายเงินพนักงาน 20 รายการล่าสุด
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-orange-50 px-4 text-sm font-bold text-main-orange dark:bg-orange-500/10">
                {recentPayments.length} รายการ
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  outfit.className,
                  "h-8 rounded-full px-4 text-sm font-bold text-card-foreground",
                )}
              >
                {formatCurrency(totalSalary, 2)}
              </Badge>
            </div>
          </div>

          {recentPayments.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <ReceiptText className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่มีข้อมูลการจ่ายเงิน
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ยังไม่พบรายการจ่ายเงินเดือนพนักงานล่าสุด
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
              <Table>
                <TableHeader className="bg-secondary/70">
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="w-[30%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                      เอกสาร
                    </TableHead>
                    <TableHead className="hidden text-base font-bold text-card-foreground min-[640px]:table-cell min-[500px]:text-lg">
                      พนักงาน
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                      วันที่จ่าย
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[900px]:table-cell">
                      ตำแหน่ง
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      จำนวนเงิน
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment, index) => {
                    const paymentDate =
                      payment.Datepayment || payment.DatePost || "";

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
                                {payment.NumberPrintPost ||
                                  `#${payment.OrderNum}`}
                              </span>
                              <p className="max-w-[120px] truncate text-sm font-semibold text-muted-foreground min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[640px]:hidden">
                                {payment.NameSure || "ไม่ระบุพนักงาน"}
                              </p>
                              <p className="hidden text-xs font-medium text-muted-foreground min-[560px]:block min-[760px]:hidden">
                                {formatDate(paymentDate)}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="hidden align-middle min-[640px]:table-cell">
                          <div className="flex min-w-0 flex-col">
                            <span className="max-w-[180px] truncate text-base font-bold text-card-foreground min-[900px]:max-w-[260px] min-[1200px]:max-w-[360px]">
                              {payment.NameSure || "ไม่ระบุพนักงาน"}
                            </span>
                            <span
                              className={cn(
                                outfit.className,
                                "text-xs font-semibold text-muted-foreground",
                              )}
                            >
                              รหัส {payment.CodeStaff || "-"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-semibold text-card-foreground">
                              {formatDate(paymentDate)}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">
                              เงินเดือนล่าสุด
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[900px]:table-cell">
                          <Badge
                            variant="outline"
                            className="h-7 rounded-full border-orange-100 bg-orange-50 px-3 text-xs font-bold text-main-orange shadow-none dark:border-orange-500/20 dark:bg-orange-500/10"
                          >
                            {payment.NamePositions || "ไม่ระบุตำแหน่ง"}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                outfit.className,
                                "text-sm font-bold text-card-foreground min-[500px]:text-base",
                              )}
                            >
                              {formatCurrency(payment.TotalPrice, 2)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground min-[900px]:hidden">
                              {payment.NamePositions || "ไม่ระบุตำแหน่ง"}
                            </span>
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
