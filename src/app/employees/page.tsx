"use client";

import {
  Activity,
  Briefcase,
  CalendarCheck2,
  CalendarDays,
  ChevronRight,
  DollarSign,
  IdCard,
  KeyRound,
  LoaderCircle,
  MapPin,
  Phone,
  Plus,
  ReceiptText,
  Save,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { toast } from "@/components/ui/toast";
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

const emptyEmployeeDraft = {
  name: "",
  position: "",
  phone: "",
  dailyWage: "",
  idCard: "",
  birthDate: "",
  address: "",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [employeePhone, setEmployeePhone] = useState("");
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [employeeDraft, setEmployeeDraft] = useState(emptyEmployeeDraft);

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
          setCanManage(Boolean(empData.access?.canManage));
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

  useEffect(() => {
    setEmployeePhone(selectedEmployee?.Phone || "");
  }, [selectedEmployee]);

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

  const closeEmployeeDetails = () => {
    if (!deleteDialogOpen && !isDeleting) {
      setSelectedEmployee(null);
    }
  };

  const handleDeleteDialogChange = (open: boolean) => {
    if (isDeleting) {
      return;
    }

    setDeleteDialogOpen(open);
    if (!open) {
      setConfirmationCode("");
    }
  };

  const updateEmployeeAccess = async (action?: "reset_password") => {
    if (!selectedEmployee) return;

    try {
      setIsSavingAccess(true);
      const response = await fetch("/api/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: selectedEmployee.Code,
          phone: employeePhone,
          action,
        }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        data?: { phone: string };
        error?: string;
      };
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "อัปเดตบัญชีพนักงานไม่สำเร็จ");
      }

      const phone = result.data.phone;
      setEmployeePhone(phone);
      setEmployees((current) =>
        current.map((employee) =>
          employee.Code === selectedEmployee.Code
            ? { ...employee, Phone: phone }
            : employee,
        ),
      );
      setSelectedEmployee((current) =>
        current ? { ...current, Phone: phone } : current,
      );
      toast.add({
        title: action ? "รีเซ็ตรหัสผ่านแล้ว" : "บันทึกเบอร์โทรแล้ว",
        description: action
          ? "พนักงานเข้าใช้ด้วย 123456 และต้องตั้งรหัสใหม่อีกครั้ง"
          : "พนักงานใช้เบอร์นี้เป็นชื่อผู้ใช้งานได้แล้ว",
      });
    } catch (accessError) {
      toast.add({
        title: "อัปเดตบัญชีไม่สำเร็จ",
        description:
          accessError instanceof Error
            ? accessError.message
            : "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsSavingAccess(false);
    }
  };

  const deleteEmployee = async () => {
    if (
      !selectedEmployee ||
      confirmationCode !== String(selectedEmployee.Code)
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/employees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: selectedEmployee.Code,
          confirmationCode,
        }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message || result.error || "ลบพนักงานไม่สำเร็จ");
      }

      setEmployees((current) =>
        current.filter((employee) => employee.Code !== selectedEmployee.Code),
      );
      setDeleteDialogOpen(false);
      setConfirmationCode("");
      setSelectedEmployee(null);
      toast.add({
        title: "✅ ลบพนักงานแล้ว",
        description: `${selectedEmployee.NameSure || `รหัส ${selectedEmployee.Code}`} ถูกนำออกจากรายชื่อพนักงาน`,
      });
    } catch (deleteError) {
      toast.add({
        title: "❌ ลบพนักงานไม่สำเร็จ",
        description:
          deleteError instanceof Error
            ? deleteError.message
            : "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const createEmployee = async () => {
    try {
      setIsCreating(true);
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(employeeDraft),
      });
      const result = (await response.json()) as {
        success?: boolean;
        data?: Employee;
        error?: string;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "เพิ่มพนักงานไม่สำเร็จ");
      }

      setEmployees((current) =>
        [...current, result.data as Employee].sort((a, b) => a.Code - b.Code),
      );
      setEmployeeDraft(emptyEmployeeDraft);
      setCreateDialogOpen(false);
      toast.add({
        title: "✅ เพิ่มพนักงานแล้ว",
        description: `${result.data.NameSure} เข้าระบบด้วยเบอร์โทรและรหัสเริ่มต้น 123456 ได้ทันที`,
      });
    } catch (createError) {
      toast.add({
        title: "❌ เพิ่มพนักงานไม่สำเร็จ",
        description:
          createError instanceof Error
            ? createError.message
            : "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="พนักงาน" href="/employees" />
      <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6 mt-2 sm:mt-0">
        <div className="mt-2 flex w-full flex-col rounded-3xl border bg-card p-4 md:mt-6">
          <div className="mb-5 flex flex-col justify-between gap-4 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Users className="h-6 w-6 text-primary" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-primary">พนักงาน</span>
                <p className="hidden font-medium text-foreground min-[798px]:block">
                  รายชื่อ ตำแหน่ง และค่าแรงของทีม
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {canManage && (
                <Button
                  type="button"
                  className="h-10 rounded-[8px]"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus />
                  เพิ่มพนักงาน
                </Button>
              )}
              <Button asChild className="h-10">
                <Link href="/employees/attendance">
                  <CalendarCheck2 />
                  บันทึกวันทำงาน
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="พนักงานทั้งหมด"
              value={employees.length}
              unit="คน"
              subtitle={`${employeesWithPhone.toLocaleString("th-TH")} คนมีเบอร์ติดต่อ`}
              icon={Users}
              variant="blue"
            />
            <KPICard
              title="ตำแหน่งงาน"
              value={positions.length}
              unit="ตำแหน่ง"
              icon={Briefcase}
              variant="blue"
            />
            <KPICard
              title="ค่าแรงเฉลี่ย/วัน"
              value={averageWage}
              format="currency"
              icon={DollarSign}
              variant="emerald"
            />
            <KPICard
              title="ยอดจ่ายล่าสุด"
              value={totalSalary}
              format="currency"
              subtitle={`${recentPayments.length.toLocaleString("th-TH")} รายการล่าสุด`}
              icon={ReceiptText}
              variant="red"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card p-4">
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
                    <TableHead className="w-12 px-3">
                      <span className="sr-only">ดูรายละเอียด</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow
                      key={emp.Code}
                      className="group cursor-pointer border-border/60 transition-colors duration-200 hover:bg-blue-50/30 focus-visible:bg-blue-50/30 focus-visible:outline-2 focus-visible:outline-primary dark:hover:bg-blue-500/5"
                      tabIndex={0}
                      aria-label={`ดูรายละเอียด ${emp.NameSure || `พนักงานรหัส ${emp.Code}`}`}
                      onClick={() => setSelectedEmployee(emp)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedEmployee(emp);
                        }
                      }}
                    >
                      <TableCell className="px-4 py-5 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border bg-secondary text-main-blue select-none">
                            <Users className="h-5 w-5" />
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
                                "text-sm font-semibold text-muted-foreground min-[760px]:hidden",
                              )}
                            >
                              {emp.Phone || "ไม่ระบุเบอร์โทร"}
                            </p>
                            {emp.Address ? (
                              <p className="hidden max-w-[280px] truncate text-sm font-medium text-muted-foreground min-[560px]:block min-[1180px]:hidden">
                                {emp.Address}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden align-middle min-[640px]:table-cell">
                        <Badge
                          variant="outline"
                          className="h-7 rounded-full border-blue-100 bg-blue-50 px-3 text-sm font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
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
                        <span className="line-clamp-2 text-sm font-medium text-muted-foreground">
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
                              "text-sm font-semibold text-muted-foreground",
                            )}
                          >
                            รหัส {emp.Code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 text-right align-middle">
                        <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-main-blue" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card p-4">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                <Briefcase className="h-6 w-6 text-main-blue" />
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

            <Badge
              variant="outline"
              className="h-8 w-fit rounded-full px-4 text-sm font-bold text-card-foreground"
            >
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
            <div className="grid gap-4 min-[520px]:grid-cols-2 min-[900px]:grid-cols-4">
              {positions.map((pos) => {
                const empCount = employees.filter(
                  (emp) => emp.Positions?.trim() === pos.NamePositions,
                ).length;

                return (
                  <KPICard
                    key={pos.Code}
                    title={pos.NamePositions}
                    value={empCount}
                    unit="คน"
                    subtitle={`รหัสตำแหน่ง ${pos.Code}`}
                    icon={Briefcase}
                    variant="blue"
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card p-4">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10">
                <ReceiptText className="h-6 w-6 text-main-red" />
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
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground"
              >
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
                              <p className="hidden text-sm font-medium text-muted-foreground min-[560px]:block min-[760px]:hidden">
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
                                "text-sm font-semibold text-muted-foreground",
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
                            <span className="text-sm font-medium text-muted-foreground">
                              เงินเดือนล่าสุด
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[900px]:table-cell">
                          <Badge
                            variant="outline"
                            className="h-7 rounded-full border-orange-100 bg-orange-50 px-3 text-sm font-bold text-main-orange shadow-none dark:border-orange-500/20 dark:bg-orange-500/10"
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
                            <span className="text-sm font-semibold text-muted-foreground min-[900px]:hidden">
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

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (isCreating) return;
          setCreateDialogOpen(open);
          if (!open) setEmployeeDraft(emptyEmployeeDraft);
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] max-w-xl gap-0 overflow-y-auto rounded-2xl p-0 text-base"
        >
          <DialogHeader className="flex-row items-start gap-3 border-b p-5 pr-4 text-left">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] border bg-secondary text-main-blue">
              <Plus className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold">
                เพิ่มพนักงาน
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                ระบบจะสร้างบัญชีเบอร์โทรพร้อมรหัสเริ่มต้น 123456
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={isCreating}
                aria-label="ปิดหน้าต่างเพิ่มพนักงาน"
              >
                <span aria-hidden="true" className="text-2xl leading-none">
                  ×
                </span>
              </Button>
            </DialogClose>
          </DialogHeader>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="employee-name" className="font-medium">
                ชื่อพนักงาน <span className="text-main-red">*</span>
              </label>
              <Input
                id="employee-name"
                value={employeeDraft.name}
                onChange={(event) =>
                  setEmployeeDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                maxLength={200}
                placeholder="ชื่อ–นามสกุล หรือชื่อเรียก"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="employee-position" className="font-medium">
                ตำแหน่ง <span className="text-main-red">*</span>
              </label>
              <Select
                value={employeeDraft.position}
                onValueChange={(position) =>
                  setEmployeeDraft((current) => ({ ...current, position }))
                }
              >
                <SelectTrigger id="employee-position" className="w-full">
                  <SelectValue placeholder="เลือกตำแหน่ง" />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((position) => (
                    <SelectItem
                      key={position.Code}
                      value={position.NamePositions}
                    >
                      {position.NamePositions}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="employee-phone" className="font-medium">
                เบอร์โทร <span className="text-main-red">*</span>
              </label>
              <Input
                id="employee-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={employeeDraft.phone}
                onChange={(event) =>
                  setEmployeeDraft((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="0xx-xxx-xxxx"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="employee-wage" className="font-medium">
                ค่าแรงต่อวัน <span className="text-main-red">*</span>
              </label>
              <Input
                id="employee-wage"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={employeeDraft.dailyWage}
                onChange={(event) =>
                  setEmployeeDraft((current) => ({
                    ...current,
                    dailyWage: event.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="employee-id-card" className="font-medium">
                เลขบัตรประชาชน
              </label>
              <Input
                id="employee-id-card"
                inputMode="numeric"
                value={employeeDraft.idCard}
                onChange={(event) =>
                  setEmployeeDraft((current) => ({
                    ...current,
                    idCard: event.target.value.replace(/\D/g, "").slice(0, 13),
                  }))
                }
                placeholder="13 หลัก"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="employee-birth-date" className="font-medium">
                วันเกิด
              </label>
              <Input
                id="employee-birth-date"
                type="date"
                value={employeeDraft.birthDate}
                onChange={(event) =>
                  setEmployeeDraft((current) => ({
                    ...current,
                    birthDate: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label htmlFor="employee-address" className="font-medium">
                ที่อยู่
              </label>
              <Input
                id="employee-address"
                value={employeeDraft.address}
                onChange={(event) =>
                  setEmployeeDraft((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                maxLength={500}
                placeholder="ที่อยู่ปัจจุบัน"
              />
            </div>
          </div>

          <DialogFooter className="m-0 rounded-none border-t bg-muted/40 p-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isCreating}>
                ยกเลิก
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={() => void createEmployee()}
              disabled={
                isCreating ||
                !employeeDraft.name.trim() ||
                !employeeDraft.position ||
                !employeeDraft.phone.trim() ||
                employeeDraft.dailyWage === ""
              }
            >
              {isCreating ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Plus />
              )}
              {isCreating ? "กำลังเพิ่ม" : "เพิ่มพนักงาน"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedEmployee !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeEmployeeDetails();
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] max-w-2xl gap-0 overflow-y-auto rounded-2xl p-0 text-base"
        >
          {selectedEmployee ? (
            <>
              <DialogHeader className="flex-row items-start gap-3 border-b p-5 pr-4 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border bg-secondary text-main-blue">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <DialogTitle className="text-xl leading-tight font-semibold">
                    {selectedEmployee.NameSure || "ไม่ระบุชื่อ"}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm">
                    รหัสพนักงาน {selectedEmployee.Code}
                  </DialogDescription>
                </div>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label="ปิดรายละเอียดพนักงาน"
                  >
                    <span aria-hidden="true" className="text-2xl leading-none">
                      ×
                    </span>
                  </Button>
                </DialogClose>
              </DialogHeader>

              <div className="grid gap-3 p-5 sm:grid-cols-2">
                {[
                  {
                    label: "ตำแหน่ง",
                    value: selectedEmployee.Positions || "ไม่ระบุ",
                    icon: Briefcase,
                  },
                  {
                    label: "ค่าแรงต่อวัน",
                    value: selectedEmployee.PriceToWorkDay
                      ? formatCurrency(selectedEmployee.PriceToWorkDay, 2)
                      : "ไม่ระบุ",
                    icon: DollarSign,
                  },
                  {
                    label: "เบอร์โทร",
                    value: selectedEmployee.Phone || "ไม่ระบุ",
                    icon: Phone,
                  },
                  {
                    label: "เลขบัตรประชาชน",
                    value: selectedEmployee.IDCard || "ไม่ระบุ",
                    icon: IdCard,
                  },
                  {
                    label: "วันเกิด",
                    value: formatDate(selectedEmployee.DateBirthDay),
                    icon: CalendarDays,
                  },
                  {
                    label: "อายุ",
                    value:
                      selectedEmployee.Age > 0
                        ? `${selectedEmployee.Age} ปี`
                        : "ไม่ระบุ",
                    icon: Users,
                  },
                ].map((detail) => {
                  const DetailIcon = detail.icon;

                  return (
                    <div
                      key={detail.label}
                      className="flex min-w-0 gap-3 rounded-xl bg-secondary p-4"
                    >
                      <DetailIcon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-muted-foreground">
                          {detail.label}
                        </p>
                        <p className="mt-1 break-words font-medium text-foreground">
                          {detail.value}
                        </p>
                      </div>
                    </div>
                  );
                })}

                <div className="flex min-w-0 gap-3 rounded-xl bg-secondary p-4 sm:col-span-2">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">
                      ที่อยู่
                    </p>
                    <p className="mt-1 break-words font-medium text-foreground">
                      {selectedEmployee.Address || "ไม่ระบุ"}
                    </p>
                  </div>
                </div>

                {canManage ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 sm:col-span-2">
                    <div className="flex items-start gap-3">
                      <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-main-blue" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-foreground">
                          บัญชีเข้าสู่ระบบของพนักงาน
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          ใช้เบอร์โทรเป็นชื่อผู้ใช้ รหัสเริ่มต้นคือ 123456
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <Input
                        type="tel"
                        inputMode="tel"
                        aria-label="เบอร์โทรสำหรับเข้าสู่ระบบ"
                        value={employeePhone}
                        onChange={(event) =>
                          setEmployeePhone(event.target.value)
                        }
                        placeholder="กรอกเบอร์โทร 10 หลัก"
                        className="h-10 bg-white"
                        disabled={isSavingAccess}
                      />
                      <Button
                        type="button"
                        onClick={() => void updateEmployeeAccess()}
                        disabled={isSavingAccess}
                        className="h-10 shrink-0"
                      >
                        {isSavingAccess ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <Save />
                        )}
                        บันทึกเบอร์
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        void updateEmployeeAccess("reset_password")
                      }
                      disabled={isSavingAccess || !selectedEmployee.Phone}
                      className="mt-3 h-10 w-full bg-white sm:w-auto"
                    >
                      <KeyRound /> รีเซ็ตรหัสเป็น 123456
                    </Button>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="m-0 rounded-none border-t bg-muted/40 p-4 sm:justify-between">
                {canManage ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 />
                    ลบพนักงาน
                  </Button>
                ) : (
                  <span />
                )}
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    ปิด
                  </Button>
                </DialogClose>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogChange}>
        <DialogContent
          showCloseButton={false}
          className="max-w-md gap-0 rounded-2xl p-0 text-base"
        >
          {selectedEmployee ? (
            <>
              <DialogHeader className="flex-row items-start gap-3 border-b p-5 pr-4 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-red-100 bg-red-50 text-main-red">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <DialogTitle className="text-xl leading-tight font-semibold">
                    ยืนยันการลบพนักงาน
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-sm leading-relaxed">
                    การลบจะนำ {selectedEmployee.NameSure || "พนักงานคนนี้"}{" "}
                    ออกจากรายชื่อ และทำได้เฉพาะเมื่อยังไม่มีประวัติที่ต้องเก็บรักษา
                  </DialogDescription>
                </div>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label="ยกเลิกการลบพนักงาน"
                    disabled={isDeleting}
                  >
                    <span aria-hidden="true" className="text-2xl leading-none">
                      ×
                    </span>
                  </Button>
                </DialogClose>
              </DialogHeader>

              <div className="p-5">
                <label
                  htmlFor="employee-delete-code"
                  className="mb-2 block text-sm font-medium text-foreground"
                >
                  พิมพ์รหัสพนักงาน {selectedEmployee.Code} เพื่อยืนยัน
                </label>
                <Input
                  id="employee-delete-code"
                  inputMode="numeric"
                  autoComplete="off"
                  value={confirmationCode}
                  onChange={(event) => setConfirmationCode(event.target.value)}
                  className="h-10 rounded-[8px] bg-background px-3 text-base"
                  placeholder={String(selectedEmployee.Code)}
                  aria-describedby="employee-delete-code-help"
                  disabled={isDeleting}
                  autoFocus
                />
                <p
                  id="employee-delete-code-help"
                  className="mt-2 text-sm leading-relaxed text-muted-foreground"
                >
                  ระบบจะไม่ลบประวัติเงินเดือนหรือวันทำงานย้อนหลังโดยอัตโนมัติ
                </p>
              </div>

              <DialogFooter className="m-0 rounded-none border-t bg-muted/40 p-4">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isDeleting}>
                    ยกเลิก
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={
                    confirmationCode !== String(selectedEmployee.Code) ||
                    isDeleting
                  }
                  aria-busy={isDeleting}
                  onClick={deleteEmployee}
                >
                  {isDeleting ? (
                    <LoaderCircle className="animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Trash2 />
                  )}
                  {isDeleting ? "กำลังลบ" : "ยืนยันการลบ"}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
