"use client";

import {
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Loader2,
  Printer,
  Save,
  Users,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { calculatePayrollBalance } from "@/lib/payroll";
import { cn } from "@/lib/utils";

type AttendanceStatus =
  | "full_day"
  | "half_day"
  | "absent"
  | "sunday_off"
  | "special_paid"
  | "special_unpaid";

interface Employee {
  code: number;
  name: string;
  phone: string;
  position: string;
  dailyWage: number;
}

interface AttendanceRecord {
  date: string;
  codeStaff: number;
  status: AttendanceStatus;
  note: string;
  updatedBy: string;
  updatedAt: string;
}

interface AttendancePayload {
  access: {
    canManage: boolean;
    employeeLinked: boolean;
  };
  employees: Employee[];
  records: AttendanceRecord[];
  advances: Array<{ date: string; codeStaff: number; amount: number }>;
  adjustments: PayrollAdjustment[];
}

interface AttendanceDraft {
  status: AttendanceStatus | "";
  note: string;
}

interface PayrollAdjustment {
  codeStaff: number;
  socialSecurity: number;
  monthlySocialSecurity: number;
  otherDeduction: number;
  manualAdvance: number;
  note: string;
  socialSecurityDeductedThisMonth: boolean;
  carryIn: number;
  snapshotPayableDays: number | null;
  snapshotGrossWage: number | null;
  snapshotSocialSecurity: number | null;
  snapshotOtherDeduction: number | null;
  snapshotAdvance: number | null;
  netWage: number | null;
  paidAmount: number | null;
  carryOut: number;
  paidAt: string | null;
  paidBy: string;
}

interface PayrollAdjustmentDraft {
  socialSecurity: string;
  otherDeduction: string;
  manualAdvance: string;
  note: string;
}

const statusOptions: Array<{
  value: AttendanceStatus;
  label: string;
  shortLabel: string;
  wageFactor: number;
  dotClassName: string;
}> = [
  {
    value: "full_day",
    label: "ทำงานเต็มวัน",
    shortLabel: "เต็มวัน",
    wageFactor: 1,
    dotClassName: "bg-main-green",
  },
  {
    value: "half_day",
    label: "ทำงานครึ่งวัน",
    shortLabel: "ครึ่งวัน",
    wageFactor: 0.5,
    dotClassName: "bg-main-orange",
  },
  {
    value: "absent",
    label: "ขาดงาน",
    shortLabel: "ขาด",
    wageFactor: 0,
    dotClassName: "bg-main-red",
  },
  {
    value: "sunday_off",
    label: "หยุดวันอาทิตย์ (ไม่ได้ค่าแรง)",
    shortLabel: "อาทิตย์",
    wageFactor: 0,
    dotClassName: "bg-muted-foreground",
  },
  {
    value: "special_paid",
    label: "หยุดพิเศษ (ได้ค่าแรง)",
    shortLabel: "หยุดได้ค่าแรง",
    wageFactor: 1,
    dotClassName: "bg-main-blue",
  },
  {
    value: "special_unpaid",
    label: "หยุดพิเศษ (ไม่ได้ค่าแรง)",
    shortLabel: "หยุดไม่ได้เงิน",
    wageFactor: 0,
    dotClassName: "bg-muted-foreground",
  },
];

const wageFactorByStatus = new Map(
  statusOptions.map((option) => [option.value, option.wageFactor]),
);

function StatusOptionLabel({
  option,
}: {
  option: (typeof statusOptions)[number];
}) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className={cn("size-2.5 shrink-0 rounded-full", option.dotClassName)}
      />
      <span className="truncate">{option.label}</span>
    </span>
  );
}

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function toInputDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getPayPeriod(value: string) {
  const date = parseInputDate(value);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const lastDay = new Date(year, month, 0).getDate();
  const startDay = day <= 15 ? 1 : 16;
  const endDay = day <= 15 ? 15 : lastDay;

  return {
    startDate: toInputDate(year, month, startDay),
    endDate: toInputDate(year, month, endDay),
    label: `${startDay}–${endDay} ${date.toLocaleDateString("th-TH", {
      month: "long",
      year: "numeric",
    })}`,
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDeduction(value: number) {
  return value > 0 ? `-${formatCurrency(value)}` : formatCurrency(0);
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatThaiDate(value: string) {
  return parseInputDate(value).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatWorkDays(value: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function getPeriodDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = parseInputDate(startDate);
  const end = parseInputDate(endDate);

  while (current <= end) {
    dates.push(
      toInputDate(
        current.getFullYear(),
        current.getMonth() + 1,
        current.getDate(),
      ),
    );
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function getReportStatus(status: AttendanceStatus | undefined) {
  if (status === "full_day") {
    return { label: "เต็ม", className: "text-main-green" };
  }

  if (status === "half_day") {
    return { label: "ครึ่ง", className: "text-main-orange" };
  }

  if (status === "absent") {
    return { label: "ขาด", className: "text-main-red" };
  }

  if (status === "sunday_off") {
    return { label: "อา.", className: "text-muted-foreground" };
  }

  if (status === "special_unpaid") {
    return { label: "หยุด", className: "text-muted-foreground" };
  }

  if (status === "special_paid") {
    return { label: "หยุด+", className: "text-main-blue" };
  }

  return { label: "—", className: "text-muted-foreground/60" };
}

export default function EmployeeAttendancePage() {
  const [selectedDate, setSelectedDate] = useState(getTodayInputValue);
  const [data, setData] = useState<AttendancePayload>({
    access: { canManage: false, employeeLinked: true },
    employees: [],
    records: [],
    advances: [],
    adjustments: [],
  });
  const [drafts, setDrafts] = useState<Record<number, AttendanceDraft>>({});
  const [adjustmentDrafts, setAdjustmentDrafts] = useState<
    Record<number, PayrollAdjustmentDraft>
  >({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAdjustments, setSavingAdjustments] = useState(false);
  const [settlingPayroll, setSettlingPayroll] = useState(false);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("daily");
  const [reportEmployeeCode, setReportEmployeeCode] = useState<number | null>(
    null,
  );
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [printingIndividualSlip, setPrintingIndividualSlip] = useState(false);
  const payPeriod = useMemo(() => getPayPeriod(selectedDate), [selectedDate]);
  const deductSocialSecurityThisPeriod = payPeriod.startDate.endsWith("-01");
  const periodDates = useMemo(
    () => getPeriodDates(payPeriod.startDate, payPeriod.endDate),
    [payPeriod.startDate, payPeriod.endDate],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadAttendance() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          startDate: payPeriod.startDate,
          endDate: payPeriod.endDate,
          refresh: String(refreshKey),
        });
        const response = await fetch(`/api/employees/attendance?${params}`, {
          signal: controller.signal,
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          const message = result.error || "โหลดข้อมูลวันทำงานไม่สำเร็จ";
          throw new Error(
            result.details ? `${message}: ${result.details}` : message,
          );
        }

        const nextData = result.data as AttendancePayload;
        const selectedRecords = new Map(
          nextData.records
            .filter((record) => record.date === selectedDate)
            .map((record) => [record.codeStaff, record]),
        );
        const nextDrafts: Record<number, AttendanceDraft> = {};
        const adjustmentByEmployee = new Map(
          nextData.adjustments.map((adjustment) => [
            adjustment.codeStaff,
            adjustment,
          ]),
        );
        const nextAdjustmentDrafts: Record<number, PayrollAdjustmentDraft> = {};

        for (const employee of nextData.employees) {
          const record = selectedRecords.get(employee.code);
          const adjustment = adjustmentByEmployee.get(employee.code);
          nextDrafts[employee.code] = {
            status: record?.status ?? "",
            note: record?.note ?? "",
          };
          nextAdjustmentDrafts[employee.code] = {
            socialSecurity: adjustment?.monthlySocialSecurity
              ? String(adjustment.monthlySocialSecurity)
              : "",
            otherDeduction: adjustment?.otherDeduction
              ? String(adjustment.otherDeduction)
              : "",
            manualAdvance: adjustment?.manualAdvance
              ? String(adjustment.manualAdvance)
              : "",
            note: adjustment?.note ?? "",
          };
        }

        setData(nextData);
        if (!nextData.access.canManage) {
          setActiveTab("payroll");
          setReportEmployeeCode(nextData.employees[0]?.code ?? null);
        }
        setDrafts(nextDrafts);
        setAdjustmentDrafts(nextAdjustmentDrafts);
        setBulkStatus("");
      } catch (loadError) {
        if (!controller.signal.aborted) {
          toast.add({
            title: "❌ โหลดข้อมูลไม่สำเร็จ",
            description:
              loadError instanceof Error
                ? loadError.message
                : "กรุณาลองโหลดข้อมูลวันทำงานอีกครั้ง",
          });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAttendance();

    return () => controller.abort();
  }, [payPeriod.startDate, payPeriod.endDate, selectedDate, refreshKey]);

  const dailySummary = useMemo(() => {
    const statuses = Object.values(drafts).map((draft) => draft.status);

    return {
      present: statuses.filter(
        (status) => status === "full_day" || status === "half_day",
      ).length,
      fullDay: statuses.filter((status) => status === "full_day").length,
      halfDay: statuses.filter((status) => status === "half_day").length,
      absent: statuses.filter((status) => status === "absent").length,
      off: statuses.filter(
        (status) =>
          status === "sunday_off" ||
          status === "special_paid" ||
          status === "special_unpaid",
      ).length,
      unrecorded: statuses.filter((status) => !status).length,
    };
  }, [drafts]);

  const periodRows = useMemo(() => {
    const recordsAsOfDate = data.records.filter(
      (record) => record.date <= selectedDate,
    );
    const advancesAsOfDate = data.advances.filter(
      (advance) => advance.date <= selectedDate,
    );
    const advanceByEmployee = advancesAsOfDate.reduce((amounts, advance) => {
      amounts.set(
        advance.codeStaff,
        (amounts.get(advance.codeStaff) ?? 0) + advance.amount,
      );
      return amounts;
    }, new Map<number, number>());

    return data.employees.map((employee) => {
      const records = recordsAsOfDate.filter(
        (record) => record.codeStaff === employee.code,
      );
      const count = (status: AttendanceStatus) =>
        records.filter((record) => record.status === status).length;
      const calculatedPayableDays = records.reduce(
        (sum, record) => sum + (wageFactorByStatus.get(record.status) ?? 0),
        0,
      );
      const calculatedGrossWage = Number(
        (calculatedPayableDays * employee.dailyWage).toFixed(2),
      );
      const recordedAdvanceAmount = advanceByEmployee.get(employee.code) ?? 0;
      const adjustment = adjustmentDrafts[employee.code];
      const monthlySocialSecurity = Number(adjustment?.socialSecurity) || 0;
      const savedAdjustment = data.adjustments.find(
        (item) => item.codeStaff === employee.code,
      );
      const settled = Boolean(savedAdjustment?.paidAt);
      const payableDays = settled
        ? (savedAdjustment?.snapshotPayableDays ?? calculatedPayableDays)
        : calculatedPayableDays;
      const grossWage = settled
        ? (savedAdjustment?.snapshotGrossWage ?? calculatedGrossWage)
        : calculatedGrossWage;
      const currentSocialSecurity = deductSocialSecurityThisPeriod
        ? monthlySocialSecurity
        : 0;
      const socialSecurity = settled
        ? (savedAdjustment?.snapshotSocialSecurity ?? currentSocialSecurity)
        : currentSocialSecurity;
      const otherDeduction = settled
        ? (savedAdjustment?.snapshotOtherDeduction ?? 0)
        : Number(adjustment?.otherDeduction) || 0;
      const manualAdvance = Number(adjustment?.manualAdvance) || 0;
      const calculatedAdvanceAmount = Number(
        (recordedAdvanceAmount + manualAdvance).toFixed(2),
      );
      const advanceAmount = settled
        ? (savedAdjustment?.snapshotAdvance ?? calculatedAdvanceAmount)
        : calculatedAdvanceAmount;
      const carryIn = savedAdjustment?.carryIn ?? 0;
      const calculatedNetWage = calculatePayrollBalance({
        grossWage,
        socialSecurity,
        otherDeduction,
        advanceAmount,
        carryIn,
      }).netWage;
      const absentDates = records
        .filter((record) => record.status === "absent")
        .map((record) => Number(record.date.slice(8, 10)))
        .filter((day) => Number.isFinite(day));
      const absenceUnits = records.reduce((sum, record) => {
        if (record.status === "absent") {
          return sum + 1;
        }

        return record.status === "half_day" ? sum + 0.5 : sum;
      }, 0);

      return {
        employee,
        fullDay: count("full_day"),
        halfDay: count("half_day"),
        absent: count("absent"),
        absentDates,
        absenceUnits,
        paidHoliday: count("special_paid"),
        unpaidHoliday: count("sunday_off") + count("special_unpaid"),
        recordedDays: records.length,
        payableDays,
        grossWage,
        monthlySocialSecurity,
        socialSecurity,
        socialSecurityDeductedThisMonth:
          savedAdjustment?.socialSecurityDeductedThisMonth ?? false,
        otherDeduction,
        recordedAdvanceAmount,
        manualAdvance,
        advanceAmount,
        carryIn,
        netWage: settled
          ? (savedAdjustment?.netWage ?? calculatedNetWage)
          : calculatedNetWage,
        paidAmount: savedAdjustment?.paidAmount ?? null,
        carryOut: savedAdjustment?.carryOut ?? 0,
        paidAt: savedAdjustment?.paidAt ?? null,
        paidBy: savedAdjustment?.paidBy ?? "",
      };
    });
  }, [adjustmentDrafts, data, deductSocialSecurityThisPeriod, selectedDate]);

  const attendanceByDateAndEmployee = useMemo(
    () =>
      new Map(
        data.records.map((record) => [
          `${record.date}:${record.codeStaff}`,
          record,
        ]),
      ),
    [data.records],
  );

  const advanceByDateAndEmployee = useMemo(
    () =>
      new Map(
        data.advances.map((advance) => [
          `${advance.date}:${advance.codeStaff}`,
          advance.amount,
        ]),
      ),
    [data.advances],
  );

  const periodTotals = useMemo(
    () => ({
      payableDays: periodRows.reduce((sum, row) => sum + row.payableDays, 0),
      grossWage: periodRows.reduce((sum, row) => sum + row.grossWage, 0),
      deductions: periodRows.reduce(
        (sum, row) => sum + row.socialSecurity + row.otherDeduction,
        0,
      ),
      advanceAmount: periodRows.reduce(
        (sum, row) => sum + row.advanceAmount,
        0,
      ),
      carryIn: periodRows.reduce((sum, row) => sum + row.carryIn, 0),
      netWage: periodRows.reduce((sum, row) => sum + row.netWage, 0),
    }),
    [periodRows],
  );

  const reportRows = periodRows;
  const selectedReportRow = useMemo(
    () =>
      reportEmployeeCode === null
        ? null
        : (periodRows.find((row) => row.employee.code === reportEmployeeCode) ??
          null),
    [periodRows, reportEmployeeCode],
  );
  const selectedAdjustmentNote = selectedReportRow
    ? adjustmentDrafts[selectedReportRow.employee.code]?.note.trim() || ""
    : "";
  const payrollSettled =
    data.employees.length > 0 && periodRows.every((row) => row.paidAt);
  const selectedEmployeeAdvances = useMemo(
    () =>
      selectedReportRow
        ? data.advances.filter(
            (advance) =>
              advance.codeStaff === selectedReportRow.employee.code &&
              advance.date <= selectedDate &&
              advance.amount > 0,
          )
        : [],
    [data.advances, selectedDate, selectedReportRow],
  );

  const updateDraft = (
    codeStaff: number,
    updates: Partial<AttendanceDraft>,
  ) => {
    if (updates.status !== undefined) {
      setBulkStatus("");
    }

    setDrafts((current) => ({
      ...current,
      [codeStaff]: { ...current[codeStaff], ...updates },
    }));
  };

  const updateAdjustmentDraft = (
    codeStaff: number,
    updates: Partial<PayrollAdjustmentDraft>,
  ) => {
    setAdjustmentDrafts((current) => ({
      ...current,
      [codeStaff]: { ...current[codeStaff], ...updates },
    }));
  };

  const setBulkStatuses = (status: AttendanceStatus | "") => {
    setDrafts((current) => {
      const hasUnrecordedEmployees = data.employees.some(
        (employee) => !current[employee.code]?.status,
      );

      return Object.fromEntries(
        data.employees.map((employee) => [
          employee.code,
          {
            ...current[employee.code],
            status:
              hasUnrecordedEmployees && current[employee.code]?.status
                ? current[employee.code].status
                : status,
          },
        ]),
      );
    });
  };

  const handleSave = async () => {
    const incomplete = data.employees.some(
      (employee) => !drafts[employee.code]?.status,
    );

    if (incomplete) {
      toast.add({
        title: "⚠️ ยังบันทึกวันทำงานไม่ได้",
        description: `กรุณาเลือกสถานะให้ครบอีก ${dailySummary.unrecorded} คน`,
      });
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/employees/attendance", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          items: data.employees.map((employee) => ({
            codeStaff: employee.code,
            status: drafts[employee.code].status,
            note: drafts[employee.code].note,
          })),
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.error || "บันทึกวันทำงานไม่สำเร็จ";
        throw new Error(
          result.details ? `${message}: ${result.details}` : message,
        );
      }

      toast.add({
        title: "✅ บันทึกวันทำงานแล้ว",
        description: `บันทึกข้อมูลพนักงาน ${result.data.savedCount} คนเรียบร้อยแล้ว`,
      });
      setRefreshKey((current) => current + 1);
    } catch (saveError) {
      toast.add({
        title: "❌ บันทึกวันทำงานไม่สำเร็จ",
        description:
          saveError instanceof Error ? saveError.message : "กรุณาลองบันทึกอีกครั้ง",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdjustments = async () => {
    try {
      setSavingAdjustments(true);
      const response = await fetch("/api/employees/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: payPeriod.startDate,
          periodEnd: payPeriod.endDate,
          items: data.employees.map((employee) => ({
            codeStaff: employee.code,
            socialSecurity:
              Number(adjustmentDrafts[employee.code]?.socialSecurity) || 0,
            otherDeduction:
              Number(adjustmentDrafts[employee.code]?.otherDeduction) || 0,
            manualAdvance:
              Number(adjustmentDrafts[employee.code]?.manualAdvance) || 0,
            note: adjustmentDrafts[employee.code]?.note || "",
          })),
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        const message = result.error || "บันทึกรายการหักไม่สำเร็จ";
        throw new Error(
          result.details ? `${message}: ${result.details}` : message,
        );
      }

      toast.add({
        title: "✅ บันทึกรายการหักและยอดเบิกแล้ว",
        description: `ข้อมูลรอบ ${payPeriod.label} ถูกบันทึกเรียบร้อยแล้ว`,
      });
      setRefreshKey((current) => current + 1);
      return true;
    } catch (saveError) {
      toast.add({
        title: "❌ บันทึกรายการหักและยอดเบิกไม่สำเร็จ",
        description:
          saveError instanceof Error
            ? saveError.message
            : "กรุณาลองบันทึกข้อมูลอีกครั้ง",
      });
      return false;
    } finally {
      setSavingAdjustments(false);
    }
  };

  const handleSettlePayroll = async () => {
    const saved = await handleSaveAdjustments();
    if (!saved) {
      return;
    }

    try {
      setSettlingPayroll(true);
      const response = await fetch("/api/employees/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: payPeriod.startDate,
          periodEnd: payPeriod.endDate,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "บันทึกการจ่ายเงินเดือนไม่สำเร็จ");
      }

      toast.add({
        title: "✅ ปิดรอบและบันทึกการจ่ายแล้ว",
        description: `ระบบบันทึกยอดสุทธิ ยอดหนี้คงเหลือ และเวลาจ่ายของรอบ ${payPeriod.label} แล้ว`,
      });
      setSettleDialogOpen(false);
      setRefreshKey((current) => current + 1);
    } catch (settlementError) {
      toast.add({
        title: "❌ ปิดรอบเงินเดือนไม่สำเร็จ",
        description:
          settlementError instanceof Error
            ? settlementError.message
            : "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setSettlingPayroll(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "พนักงาน",
      "ตำแหน่ง",
      "ค่าแรง/วัน",
      ...periodDates.map((date) => formatThaiDate(date)),
      "วันคิดเงิน",
      "ค่าแรงก่อนหัก",
      "ประกันสังคม",
      "หนี้/หักอื่น",
      "ยอดเบิก",
      "หนี้ยกมา",
      "สุทธิ",
      "จ่ายจริง",
      "จ่ายแล้วเมื่อ",
    ];
    const rows = reportRows.map((row) => [
      row.employee.name,
      row.employee.position,
      row.employee.dailyWage,
      ...periodDates.map(
        (date) =>
          getReportStatus(
            attendanceByDateAndEmployee.get(`${date}:${row.employee.code}`)
              ?.status,
          ).label,
      ),
      row.payableDays,
      row.grossWage,
      row.socialSecurity,
      row.otherDeduction,
      row.advanceAmount,
      row.carryIn,
      row.netWage,
      row.paidAmount ?? "ยังไม่จ่าย",
      row.paidAt ? new Date(row.paidAt).toLocaleString("th-TH") : "ยังไม่จ่าย",
    ]);
    const escapeCell = (value: string | number) =>
      `"${String(value).replaceAll('"', '""')}"`;
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `รายงานค่าแรง-${payPeriod.startDate}-${payPeriod.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    if (!selectedReportRow) {
      return;
    }

    setReportDialogOpen(false);
    setPrintingIndividualSlip(true);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => window.print());
    });
  };

  useEffect(() => {
    if (!printingIndividualSlip) {
      return;
    }

    const finishPrinting = () => {
      setPrintingIndividualSlip(false);
      setReportDialogOpen(true);
    };
    window.addEventListener("afterprint", finishPrinting);

    return () => window.removeEventListener("afterprint", finishPrinting);
  }, [printingIndividualSlip]);

  return (
    <div className="p-4 pb-16 print:p-0 sm:p-6">
      {printingIndividualSlip ? (
        <style>{`
          @page { size: A5 landscape; margin: 0; }
          @media print {
            html, body {
              width: 210mm !important;
              height: 148mm !important;
              margin: 0 !important;
              overflow: hidden !important;
            }
            [data-slot="dialog-overlay"],
            [data-slot="dialog-content"] {
              display: none !important;
            }
          }
        `}</style>
      ) : null}
      <div className="print:hidden">
        <DashboardBreadcrumb
          label="วันทำงานพนักงาน"
          href="/employees/attendance"
        />
        <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />
      </div>

      <div className="flex flex-col gap-6">
        <section className="rounded-3xl border bg-card p-4 print:hidden sm:p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-[8px] border border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10">
                <CalendarCheck2 className="size-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-card-foreground">
                  วันทำงานพนักงาน
                </h1>
                <p className="text-sm font-medium text-muted-foreground">
                  ลงเวลารายวันและสรุปค่าแรงรอบ {payPeriod.label}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <DatePicker
                date={parseInputDate(selectedDate)}
                onDateChange={(date) => {
                  if (date) {
                    setSelectedDate(
                      toInputDate(
                        date.getFullYear(),
                        date.getMonth() + 1,
                        date.getDate(),
                      ),
                    );
                  }
                }}
                className="h-10 w-full rounded-[8px] px-3 text-sm font-medium sm:w-[190px]"
              />
              <Button
                variant="outline"
                className="h-10 rounded-[8px] px-4 text-sm font-medium"
                onClick={() => setSelectedDate(getTodayInputValue())}
              >
                วันนี้
              </Button>
            </div>
          </div>
        </section>

        {!data.access.employeeLinked && !loading && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
            บัญชีพนักงานนี้ยังไม่ได้เชื่อมกับรายชื่อพนักงาน จึงยังไม่แสดงข้อมูลค่าแรง
            กรุณาให้ผู้บริหารตรวจสอบชื่อบัญชีพนักงาน
          </div>
        )}

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col gap-5"
        >
          <div className="rounded-3xl border bg-card p-4 print:hidden">
            <TabsList className="grid h-10 w-full grid-cols-3 overflow-hidden rounded-[8px] border bg-secondary p-0">
              <TabsTrigger
                value="daily"
                disabled={loading || !data.access.canManage}
                className="h-full rounded-none px-4 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:text-base"
              >
                ลงวันทำงาน
              </TabsTrigger>
              <TabsTrigger
                value="payroll"
                disabled={loading}
                className="h-full rounded-none px-4 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:text-base"
              >
                สรุปค่าแรง
              </TabsTrigger>
              <TabsTrigger
                value="report"
                disabled={loading}
                className="h-full rounded-none px-4 text-sm font-medium text-muted-foreground shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none sm:text-base"
              >
                รายงานรายวัน
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="report" className="mt-0">
            <section
              className={cn(
                "rounded-3xl border bg-card p-4 print:border-0",
                printingIndividualSlip && "print:hidden",
              )}
            >
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">
                    รายงานวันทำงานและยอดเบิก {payPeriod.label}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    คลิกชื่อพนักงานเพื่อดูสรุปและพิมพ์สลิป
                  </p>
                </div>
                <div className="flex flex-col gap-2 print:hidden sm:flex-row">
                  {data.access.canManage && (
                    <Button
                      variant="outline"
                      className="rounded-[8px] text-sm font-medium"
                      onClick={handleExportCsv}
                      disabled={reportRows.length === 0}
                    >
                      <Download />
                      ส่งออก Excel (CSV)
                    </Button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto rounded-[16px] border print:overflow-visible">
                <Table className="min-w-max text-sm print:min-w-0 print:text-[9px]">
                  <TableHeader>
                    <TableRow className="bg-secondary/70 hover:bg-secondary/70">
                      <TableHead className="sticky left-0 z-20 min-w-48 border-r bg-secondary font-semibold">
                        พนักงาน
                      </TableHead>
                      {periodDates.map((date) => {
                        const dateValue = parseInputDate(date);
                        const isSunday = dateValue.getDay() === 0;

                        return (
                          <TableHead
                            key={date}
                            className={cn(
                              "min-w-20 border-r text-center font-semibold",
                              isSunday && "bg-slate-100 dark:bg-slate-500/10",
                            )}
                          >
                            <span className="block">{dateValue.getDate()}</span>
                            <span className="block font-normal text-muted-foreground">
                              {isSunday ? "อา." : ""}
                            </span>
                          </TableHead>
                        );
                      })}
                      <TableHead className="min-w-24 text-right font-semibold">
                        วันคิดเงิน
                      </TableHead>
                      <TableHead className="min-w-20 text-right font-semibold">
                        ขาด
                      </TableHead>
                      <TableHead className="min-w-28 text-right font-semibold">
                        เบิก (บาท)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportRows.map((row) => (
                      <TableRow key={row.employee.code} className="[&>td]:py-4">
                        <TableCell className="sticky left-0 z-10 border-r bg-card p-0">
                          <button
                            type="button"
                            className="w-full px-3 py-4 text-left hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            onClick={() => {
                              setReportEmployeeCode(row.employee.code);
                              setReportDialogOpen(true);
                            }}
                            aria-label={`ดูสรุปและพิมพ์สลิปของ ${row.employee.name}`}
                          >
                            <span className="block font-semibold text-card-foreground underline-offset-4 hover:underline">
                              {row.employee.name}
                            </span>
                            <span className="block text-sm text-muted-foreground">
                              {row.employee.position || "ไม่ระบุตำแหน่ง"}
                            </span>
                          </button>
                        </TableCell>
                        {periodDates.map((date) => {
                          const key = `${date}:${row.employee.code}`;
                          const record = attendanceByDateAndEmployee.get(key);
                          const advance =
                            advanceByDateAndEmployee.get(key) ?? 0;
                          const status = getReportStatus(record?.status);
                          const isSunday = parseInputDate(date).getDay() === 0;

                          return (
                            <TableCell
                              key={date}
                              className={cn(
                                "border-r px-2 py-4 text-center",
                                isSunday && "bg-slate-50 dark:bg-slate-500/5",
                              )}
                            >
                              <span
                                className={cn(
                                  "block font-medium",
                                  status.className,
                                )}
                              >
                                {status.label}
                              </span>
                              {advance > 0 && (
                                <span className="mt-1 block font-medium text-main-orange">
                                  -{formatAmount(advance)}
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="py-4 text-right font-semibold text-main-green">
                          {formatWorkDays(row.payableDays)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "py-4 text-right font-medium",
                            row.absenceUnits > 0
                              ? "text-main-red"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.absenceUnits > 0
                            ? formatWorkDays(row.absenceUnits)
                            : "—"}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "py-4 text-right font-medium",
                            row.advanceAmount > 0
                              ? "text-main-orange"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.advanceAmount > 0
                            ? formatAmount(row.advanceAmount)
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>เต็ม = ทำงานเต็มวัน</span>
                <span>ครึ่ง = ทำงานครึ่งวัน</span>
                <span>ขาด = ขาดเต็มวัน</span>
                <span>หยุด+ = หยุดพิเศษได้ค่าแรง</span>
                <span>ตัวเลขบรรทัดล่าง = ยอดเบิก</span>
              </div>
            </section>

            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
              {selectedReportRow ? (
                <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-4xl gap-0 overflow-hidden rounded-2xl p-0 text-base print:hidden">
                  <DialogHeader className="border-b p-5 pr-14 text-left">
                    <DialogTitle className="text-xl font-semibold">
                      สรุปค่าแรง: {selectedReportRow.employee.name}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedReportRow.employee.position || "ไม่ระบุตำแหน่ง"} ·
                      รอบ {payPeriod.label}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="overflow-y-auto p-5">
                    <div className="overflow-hidden rounded-[12px] border">
                      <div className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-end">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            ยอดรับสุทธิ
                          </p>
                          <p className="mt-1 text-3xl font-semibold text-card-foreground">
                            {formatCurrency(selectedReportRow.netWage)}
                          </p>
                        </div>
                        <div className="sm:text-right">
                          <p className="text-sm font-medium text-muted-foreground">
                            สถานะการจ่าย
                          </p>
                          <p
                            className={cn(
                              "mt-1 text-lg font-semibold",
                              selectedReportRow.paidAmount === null
                                ? "text-main-orange"
                                : "text-main-green",
                            )}
                          >
                            {selectedReportRow.paidAmount === null
                              ? "ยังไม่จ่าย"
                              : `จ่ายแล้ว ${formatCurrency(selectedReportRow.paidAmount)}`}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 divide-x border-t bg-secondary/40 text-center">
                        <div className="p-3">
                          <p className="text-sm text-muted-foreground">
                            วันทำงานคิดเงิน
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatWorkDays(selectedReportRow.payableDays)} วัน
                          </p>
                        </div>
                        <div className="p-3">
                          <p className="text-sm text-muted-foreground">
                            ขาดงาน
                          </p>
                          <p className="mt-1 font-semibold">
                            {formatWorkDays(selectedReportRow.absenceUnits)} วัน
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <h3 className="font-semibold">สรุปการคำนวณ</h3>
                      <div className="mt-2 overflow-hidden rounded-[8px] border text-sm">
                        <div className="flex justify-between border-b px-3 py-2">
                          <span>รายรับก่อนหัก</span>
                          <span className="font-semibold">
                            {formatCurrency(selectedReportRow.grossWage)}
                          </span>
                        </div>
                        {selectedReportRow.socialSecurity > 0 ? (
                          <div className="flex justify-between border-b px-3 py-2">
                            <span>หักประกันสังคม</span>
                            <span>
                              {formatDeduction(
                                selectedReportRow.socialSecurity,
                              )}
                            </span>
                          </div>
                        ) : null}
                        {selectedReportRow.otherDeduction > 0 ? (
                          <div className="flex justify-between border-b px-3 py-2">
                            <span>หนี้/รายการหักอื่น</span>
                            <span>
                              {formatDeduction(
                                selectedReportRow.otherDeduction,
                              )}
                            </span>
                          </div>
                        ) : null}
                        {selectedReportRow.advanceAmount > 0 ? (
                          <div className="flex justify-between border-b px-3 py-2">
                            <span>ยอดเบิกรวม</span>
                            <span>
                              {formatDeduction(selectedReportRow.advanceAmount)}
                            </span>
                          </div>
                        ) : null}
                        {selectedReportRow.carryIn > 0 ? (
                          <div className="flex justify-between px-3 py-2">
                            <span>หนี้ยกมาจากรอบก่อน</span>
                            <span>
                              {formatDeduction(selectedReportRow.carryIn)}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      {selectedReportRow.monthlySocialSecurity <= 0 ? (
                        <p className="mt-2 text-sm text-main-orange">
                          ยังไม่ได้ตั้งค่าประกันสังคมรายเดือน
                        </p>
                      ) : !deductSocialSecurityThisPeriod &&
                        !selectedReportRow.socialSecurityDeductedThisMonth ? (
                        <p className="mt-2 text-sm text-main-orange">
                          ยังไม่พบการหักประกันสังคมในงวด 1–15
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-5 border-t pt-4">
                      <h3 className="font-semibold">รายการเบิกตามวันที่</h3>
                      {selectedEmployeeAdvances.length > 0 ? (
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {selectedEmployeeAdvances.map((advance) => (
                            <div
                              key={`${advance.date}:${advance.codeStaff}`}
                              className="flex justify-between rounded-[8px] bg-secondary/60 px-3 py-2 text-sm"
                            >
                              <span>{formatThaiDate(advance.date)}</span>
                              <span className="font-semibold text-main-orange">
                                {formatCurrency(advance.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          ไม่มีรายการเบิกในรอบนี้
                        </p>
                      )}
                    </div>
                  </div>

                  <DialogFooter className="m-0 rounded-none">
                    <Button
                      type="button"
                      className="rounded-[8px]"
                      onClick={handlePrintReport}
                    >
                      <Printer />
                      พิมพ์สลิป A5
                    </Button>
                  </DialogFooter>
                </DialogContent>
              ) : null}
            </Dialog>

            {selectedReportRow && printingIndividualSlip ? (
              <article className="hidden bg-white text-black print:fixed print:inset-0 print:flex print:h-[148mm] print:w-[210mm] print:flex-col print:overflow-hidden print:p-[8mm] print:[box-sizing:border-box] print:[print-color-adjust:exact]">
                <header className="flex items-start justify-between border-b-2 border-black pb-2">
                  <div>
                    <p className="text-xl font-bold">CAR SERVICE</p>
                    <p className="text-sm">ใบสรุปค่าแรงพนักงาน</p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">รอบ {payPeriod.label}</p>
                    <p>ข้อมูลถึง {formatThaiDate(selectedDate)}</p>
                  </div>
                </header>

                <section className="mt-2 grid grid-cols-4 gap-x-5 border-b pb-2 text-sm">
                  <p>
                    <span className="text-neutral-600">ชื่อพนักงาน:</span>{" "}
                    <strong>{selectedReportRow.employee.name}</strong>
                  </p>
                  <p>
                    <span className="text-neutral-600">เบอร์โทร:</span>{" "}
                    {selectedReportRow.employee.phone || "ไม่ระบุ"}
                  </p>
                  <p>
                    <span className="text-neutral-600">ตำแหน่ง:</span>{" "}
                    {selectedReportRow.employee.position || "ไม่ระบุ"}
                  </p>
                  <p>
                    <span className="text-neutral-600">ค่าแรง/วัน:</span>{" "}
                    {formatCurrency(selectedReportRow.employee.dailyWage)}
                  </p>
                </section>

                <section className="mt-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-base font-bold">สรุปวันทำงาน</h2>
                    {selectedReportRow.absentDates.length > 0 ? (
                      <p className="text-sm">
                        วันที่ขาด: {selectedReportRow.absentDates.join(", ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="mt-1 grid grid-cols-4 divide-x border py-1.5 text-center text-sm">
                    <div>
                      <p className="text-neutral-600">เต็มวัน</p>
                      <p className="font-bold">
                        {selectedReportRow.fullDay} วัน
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-600">ครึ่งวัน</p>
                      <p className="font-bold">
                        {selectedReportRow.halfDay} วัน
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-600">ขาดรวม</p>
                      <p className="font-bold">
                        {formatWorkDays(selectedReportRow.absenceUnits)} วัน
                      </p>
                    </div>
                    <div>
                      <p className="text-neutral-600">วันคิดเงิน</p>
                      <p className="font-bold">
                        {formatWorkDays(selectedReportRow.payableDays)} วัน
                      </p>
                    </div>
                  </div>
                </section>

                <div className="mt-2 grid grid-cols-2 gap-3">
                  <section>
                    <h2 className="text-base font-bold">สรุปรายรับและรายการหัก</h2>
                    <div className="mt-1 overflow-hidden border text-sm">
                      <div className="flex justify-between border-b px-3 py-1">
                        <span>รายรับก่อนหัก</span>
                        <strong>
                          {formatCurrency(selectedReportRow.grossWage)}
                        </strong>
                      </div>
                      <div className="flex justify-between border-b px-3 py-1">
                        <span>หักประกันสังคม</span>
                        <span>
                          {formatDeduction(selectedReportRow.socialSecurity)}
                        </span>
                      </div>
                      <div className="flex justify-between border-b px-3 py-1">
                        <span>หนี้/รายการหักอื่น</span>
                        <span>
                          {formatDeduction(selectedReportRow.otherDeduction)}
                        </span>
                      </div>
                      <div className="flex justify-between border-b px-3 py-1">
                        <span>ยอดเบิกรวม</span>
                        <span>
                          {formatDeduction(selectedReportRow.advanceAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between border-b px-3 py-1">
                        <span>หนี้ยกมาจากรอบก่อน</span>
                        <span>
                          {formatDeduction(selectedReportRow.carryIn)}
                        </span>
                      </div>
                      <div className="flex justify-between bg-neutral-100 px-3 py-1.5 text-base">
                        <strong>ยอดสุทธิ</strong>
                        <strong>
                          {formatCurrency(selectedReportRow.netWage)}
                        </strong>
                      </div>
                    </div>
                    {selectedAdjustmentNote ? (
                      <p className="mt-1 text-sm">
                        หมายเหตุรายการหัก: {selectedAdjustmentNote}
                      </p>
                    ) : null}
                  </section>

                  <section>
                    <div className="flex items-baseline justify-between">
                      <h2 className="text-base font-bold">
                        รายละเอียดการเบิกเงิน
                      </h2>
                      <p className="text-sm">
                        รวม {formatCurrency(selectedReportRow.advanceAmount)}
                      </p>
                    </div>
                    <div className="mt-1 overflow-hidden border text-sm">
                      {selectedEmployeeAdvances.length > 0 ? (
                        selectedEmployeeAdvances.map((advance) => (
                          <div
                            key={`${advance.date}:${advance.codeStaff}`}
                            className="flex justify-between gap-4 border-b px-3 py-1 last:border-b-0"
                          >
                            <span>{formatThaiDate(advance.date)}</span>
                            <span>{formatCurrency(advance.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-neutral-600">
                          ไม่มีรายการเบิกตามวันที่ในรอบนี้
                        </div>
                      )}
                      {selectedReportRow.manualAdvance > 0 ? (
                        <div className="flex justify-between border-t px-3 py-1">
                          <span>ยอดเบิกปรับเพิ่ม</span>
                          <span>
                            {formatCurrency(selectedReportRow.manualAdvance)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </section>
                </div>

                <section className="mt-auto grid grid-cols-2 gap-12 pt-3 text-center text-sm break-inside-avoid">
                  <div>
                    <p>ลงชื่อ ______________________________ ผู้รับเงิน</p>
                  </div>
                  <div>
                    <p>ลงชื่อ ______________________________ ผู้จ่ายเงิน/ผู้อนุมัติ</p>
                  </div>
                </section>
              </article>
            ) : null}
          </TabsContent>

          <TabsContent value="daily" className="mt-0">
            <section className="rounded-3xl border bg-card p-4">
              <div>
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">
                    ลงเวลาวันที่ {formatThaiDate(selectedDate)}
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    เลือกสถานะให้ครบทุกคนก่อนกดบันทึก
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <KPICard
                  title="พนักงานทั้งหมด"
                  value={data.employees.length}
                  unit="คน"
                  icon={Users}
                  variant="blue"
                />
                <KPICard
                  title="เต็มวัน"
                  value={dailySummary.fullDay}
                  unit="คน"
                  icon={CheckCircle2}
                  variant="emerald"
                />
                <KPICard
                  title="ครึ่งวัน"
                  value={dailySummary.halfDay}
                  unit="คน"
                  icon={Clock3}
                  variant="orange"
                />
                <KPICard
                  title="ขาดงาน"
                  value={dailySummary.absent}
                  unit="คน"
                  icon={Users}
                  variant="red"
                />
                <KPICard
                  title="วันหยุด"
                  value={dailySummary.off}
                  unit="คน"
                  icon={CalendarDays}
                />
                <KPICard
                  title="ยังไม่ลงสถานะ"
                  value={dailySummary.unrecorded}
                  unit="คน"
                  icon={Clock3}
                  variant="orange"
                />
              </div>

              <div className="my-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div className="w-full lg:w-auto">
                  <Select
                    value={bulkStatus}
                    onValueChange={(value) => {
                      setBulkStatus(value);
                      setBulkStatuses(value as AttendanceStatus);
                    }}
                  >
                    <SelectTrigger
                      className="!h-10 w-full rounded-[8px] border-border bg-background px-3 text-sm font-medium hover:bg-muted sm:w-[280px]"
                      disabled={
                        loading || saving || data.employees.length === 0
                      }
                    >
                      <SelectValue
                        placeholder={
                          dailySummary.unrecorded > 0
                            ? `กำหนดสถานะ ${dailySummary.unrecorded} คนที่ยังไม่ลง`
                            : "เปลี่ยนสถานะทั้งหมด"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <StatusOptionLabel option={option} />
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    ลงสถานะแล้ว {data.employees.length - dailySummary.unrecorded}{" "}
                    จาก {data.employees.length} คน
                  </p>
                  <Button
                    className="h-10 min-w-36 rounded-[8px] text-sm font-medium"
                    disabled={loading || saving || data.employees.length === 0}
                    onClick={handleSave}
                    aria-busy={saving}
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <Save />}
                    {saving ? "กำลังบันทึก" : "บันทึกวันทำงาน"}
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex min-h-56 items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                  กำลังโหลดข้อมูล...
                </div>
              ) : (
                <div className="overflow-x-auto rounded-[16px] border">
                  <Table>
                    <TableHeader className="bg-secondary/70">
                      <TableRow>
                        <TableHead className="min-w-52 font-semibold">
                          พนักงาน
                        </TableHead>
                        <TableHead className="min-w-72 font-semibold">
                          สถานะ
                        </TableHead>
                        <TableHead className="min-w-64 font-semibold">
                          หมายเหตุ
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.employees.map((employee) => {
                        const draft = drafts[employee.code] ?? {
                          status: "",
                          note: "",
                        };
                        return (
                          <TableRow key={employee.code} className="[&>td]:py-5">
                            <TableCell className="py-5">
                              <div className="font-semibold text-card-foreground">
                                {employee.name || `พนักงาน ${employee.code}`}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {employee.position || "ไม่ระบุตำแหน่ง"} · ค่าแรง{" "}
                                {formatCurrency(employee.dailyWage)}
                                /วัน
                              </div>
                            </TableCell>
                            <TableCell className="py-5">
                              <Select
                                value={draft.status}
                                onValueChange={(value) =>
                                  updateDraft(employee.code, {
                                    status: value as AttendanceStatus,
                                  })
                                }
                              >
                                <SelectTrigger className="!h-10 w-full max-w-sm rounded-[8px] border-border bg-background px-3 text-sm font-medium">
                                  <SelectValue placeholder="เลือกสถานะ" />
                                </SelectTrigger>
                                <SelectContent>
                                  {statusOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      <StatusOptionLabel option={option} />
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="py-5">
                              <Input
                                value={draft.note}
                                onChange={(event) =>
                                  updateDraft(employee.code, {
                                    note: event.target.value,
                                  })
                                }
                                placeholder="เช่น ลากิจ ร้านปิด"
                                maxLength={250}
                                className="!h-10 rounded-[8px] bg-background text-sm"
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="payroll" className="mt-0 flex flex-col gap-5">
            <section className="order-2 rounded-3xl border bg-card p-4">
              <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">
                    รายการหักและยอดเบิก
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    คำนวณถึง {formatThaiDate(selectedDate)}{" "}
                    จากค่าแรงสะสมและยอดหักในรอบนี้
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    ตั้งยอดประกันสังคมรายเดือนครั้งเดียว ระบบจะหักในงวด 1–15
                    และแสดงสถานะไว้ในงวด 16–สิ้นเดือน
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-10 rounded-[8px] text-sm font-medium"
                  disabled={
                    loading ||
                    savingAdjustments ||
                    !data.access.canManage ||
                    payrollSettled ||
                    data.employees.length === 0
                  }
                  onClick={handleSaveAdjustments}
                  aria-busy={savingAdjustments}
                >
                  {savingAdjustments ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Save />
                  )}
                  {savingAdjustments ? "กำลังบันทึก" : "บันทึกรายการ"}
                </Button>
              </div>

              <div className="overflow-x-auto rounded-[16px] border">
                <Table>
                  <TableHeader className="bg-secondary/70">
                    <TableRow>
                      <TableHead className="min-w-44 font-semibold">
                        พนักงาน
                      </TableHead>
                      <TableHead className="min-w-24 text-right font-semibold">
                        ทำงานแล้ว
                      </TableHead>
                      <TableHead className="min-w-28 text-right font-semibold">
                        ค่าแรงสะสม (บาท)
                      </TableHead>
                      <TableHead className="w-48 min-w-48 max-w-48 font-semibold">
                        ประกันสังคม/เดือน (บาท)
                      </TableHead>
                      <TableHead className="w-48 min-w-48 max-w-48 font-semibold">
                        หนี้ค้าง/หักอื่น (บาท)
                      </TableHead>
                      <TableHead className="w-48 min-w-48 max-w-48 font-semibold">
                        กรอกยอดเบิกเพิ่ม (บาท)
                      </TableHead>
                      <TableHead className="min-w-32 text-right font-semibold">
                        หนี้ยกมา (บาท)
                      </TableHead>
                      <TableHead className="min-w-36 text-right font-semibold">
                        วงเงินคงเหลือ (บาท)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodRows.map((row) => (
                      <TableRow key={row.employee.code} className="[&>td]:py-5">
                        <TableCell className="py-5">
                          <div className="font-semibold">
                            {row.employee.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatAmount(row.employee.dailyWage)} บาท/วัน
                          </div>
                        </TableCell>
                        <TableCell className="py-5 text-right font-semibold text-main-blue">
                          {formatWorkDays(row.payableDays)} วัน
                        </TableCell>
                        <TableCell className="py-5 text-right font-semibold">
                          {formatAmount(row.grossWage)}
                        </TableCell>
                        <TableCell className="w-48 min-w-48 max-w-48 py-5 align-top">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={
                              adjustmentDrafts[row.employee.code]
                                ?.socialSecurity ?? ""
                            }
                            onChange={(event) =>
                              updateAdjustmentDraft(row.employee.code, {
                                socialSecurity: event.target.value,
                              })
                            }
                            placeholder="0.00"
                            className="!h-10 rounded-[8px] border-slate-300 bg-white text-right text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 dark:bg-background"
                            aria-label={`ประกันสังคมรายเดือน ${row.employee.name}`}
                            disabled={
                              !data.access.canManage || Boolean(row.paidAt)
                            }
                          />
                          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                            {row.monthlySocialSecurity <= 0
                              ? "ยังไม่ได้ตั้งค่าประกันสังคม"
                              : deductSocialSecurityThisPeriod
                                ? "หักในงวด 1–15 นี้"
                                : row.socialSecurityDeductedThisMonth
                                  ? "หักแล้วในงวด 1–15 · งวดนี้ไม่หักซ้ำ"
                                  : "กำหนดให้หักงวด 1–15 · ยังไม่พบการบันทึก"}
                          </p>
                        </TableCell>
                        <TableCell className="w-48 min-w-48 max-w-48 py-5 align-top">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={
                              adjustmentDrafts[row.employee.code]
                                ?.otherDeduction ?? ""
                            }
                            onChange={(event) =>
                              updateAdjustmentDraft(row.employee.code, {
                                otherDeduction: event.target.value,
                              })
                            }
                            placeholder="0.00"
                            className="!h-10 rounded-[8px] border-slate-300 bg-white text-right text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 dark:bg-background"
                            aria-label={`หนี้ค้างหรือรายการหักอื่น ${row.employee.name}`}
                            disabled={
                              !data.access.canManage || Boolean(row.paidAt)
                            }
                          />
                        </TableCell>
                        <TableCell className="w-48 min-w-48 max-w-48 py-5 align-top">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={
                              adjustmentDrafts[row.employee.code]
                                ?.manualAdvance ?? ""
                            }
                            onChange={(event) =>
                              updateAdjustmentDraft(row.employee.code, {
                                manualAdvance: event.target.value,
                              })
                            }
                            placeholder="0.00"
                            className="!h-10 rounded-[8px] border-slate-300 bg-white text-right text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15 dark:bg-background"
                            aria-label={`ยอดเบิกเพิ่ม ${row.employee.name}`}
                            disabled={
                              !data.access.canManage || Boolean(row.paidAt)
                            }
                          />
                          {row.recordedAdvanceAmount > 0 && (
                            <div className="mt-1.5 text-right text-sm text-muted-foreground">
                              จากรายการรับจ่าย{" "}
                              {formatAmount(row.recordedAdvanceAmount)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "py-5 text-right font-semibold",
                            row.carryIn > 0
                              ? "text-main-red"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatAmount(row.carryIn)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "py-5 text-right text-base font-semibold",
                            row.netWage >= 0
                              ? "text-main-green"
                              : "text-main-red",
                          )}
                        >
                          {formatAmount(row.netWage)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                ถ้าวงเงินติดลบ หมายถึงมียอดเบิกหรือรายการหักเกินกว่าค่าแรงที่ทำได้
                และสามารถนำยอดไปเป็นหนี้ค้างของรอบถัดไปได้
              </p>
            </section>
            <section className="order-1 rounded-3xl border bg-card p-4">
              <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">
                    สรุปรอบค่าแรง {payPeriod.label}
                  </h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    {payrollSettled
                      ? `จ่ายแล้ว ${new Date(periodRows[0].paidAt ?? "").toLocaleString("th-TH")} โดย ${periodRows[0].paidBy || "ผู้ดูแลระบบ"}`
                      : `คำนวณถึง ${formatThaiDate(selectedDate)} หลังหักประกันสังคม รายการหักอื่น ยอดเบิก และหนี้ยกมา`}
                  </p>
                </div>
                {data.access.canManage && (
                  <Button
                    className="h-10 rounded-[8px] text-sm font-medium"
                    disabled={
                      loading ||
                      savingAdjustments ||
                      settlingPayroll ||
                      payrollSettled ||
                      data.employees.length === 0
                    }
                    onClick={() => setSettleDialogOpen(true)}
                    aria-busy={settlingPayroll}
                  >
                    {settlingPayroll ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <CheckCircle2 />
                    )}
                    {payrollSettled
                      ? "จ่ายเงินเดือนแล้ว"
                      : settlingPayroll
                        ? "กำลังปิดรอบ"
                        : "ยืนยันจ่ายเงินและปิดรอบ"}
                  </Button>
                )}
              </div>

              <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <KPICard
                  title="วันคิดค่าแรงรวม"
                  value={periodTotals.payableDays}
                  unit="วัน"
                  icon={CalendarCheck2}
                  variant="blue"
                />
                <KPICard
                  title="ค่าแรงก่อนหัก"
                  value={periodTotals.grossWage}
                  format="currency"
                  icon={WalletCards}
                  variant="emerald"
                />
                <KPICard
                  title="รายการหัก"
                  value={periodTotals.deductions}
                  format="currency"
                  icon={WalletCards}
                  variant="red"
                />
                <KPICard
                  title="ยอดเบิก"
                  value={periodTotals.advanceAmount}
                  format="currency"
                  icon={WalletCards}
                  variant="orange"
                />
                <KPICard
                  title="หนี้ยกมา"
                  value={periodTotals.carryIn}
                  format="currency"
                  icon={WalletCards}
                  variant="red"
                />
                <KPICard
                  title="คงเหลือประมาณการ"
                  value={periodTotals.netWage}
                  format="currency"
                  icon={WalletCards}
                  variant={periodTotals.netWage >= 0 ? "emerald" : "red"}
                />
              </div>

              <div className="overflow-x-auto rounded-[16px] border">
                <Table>
                  <TableHeader className="bg-secondary/70">
                    <TableRow>
                      <TableHead className="min-w-48 font-semibold">
                        พนักงาน
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        ค่าแรง/วัน (บาท)
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        เต็มวัน
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        ครึ่งวัน
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        ขาด
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        หยุดได้ค่าแรง
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        วันคิดเงิน
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        ขาดรวม
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        ก่อนหัก (บาท)
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        ประกันสังคม (บาท)
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        หนี้/หักอื่น (บาท)
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        ยอดเบิก (บาท)
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        หนี้ยกมา (บาท)
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        คงเหลือ (บาท)
                      </TableHead>
                      <TableHead className="text-right font-semibold">
                        จ่ายจริง (บาท)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {periodRows.map((row) => (
                      <TableRow key={row.employee.code} className="[&>td]:py-5">
                        <TableCell className="py-5">
                          <div className="font-semibold">
                            {row.employee.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            บันทึกแล้ว {row.recordedDays} วัน · หยุดไม่ได้เงิน{" "}
                            {row.unpaidHoliday} วัน
                          </div>
                          {row.absentDates.length > 0 && (
                            <div className="text-sm font-medium text-main-red">
                              ขาดวันที่ {row.absentDates.join(", ")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(row.employee.dailyWage)}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.fullDay}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.halfDay}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right",
                            row.absent > 0
                              ? "text-main-red"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.absent}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right",
                            row.paidHoliday > 0
                              ? "text-main-blue"
                              : "text-muted-foreground",
                          )}
                        >
                          {row.paidHoliday}
                        </TableCell>
                        <TableCell className="py-5 text-right font-semibold">
                          {formatWorkDays(row.payableDays)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right",
                            row.absenceUnits > 0
                              ? "text-main-red"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatWorkDays(row.absenceUnits)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatAmount(row.grossWage)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right",
                            row.socialSecurity > 0
                              ? "text-main-red"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatAmount(row.socialSecurity)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right",
                            row.otherDeduction > 0
                              ? "text-main-red"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatAmount(row.otherDeduction)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right",
                            row.advanceAmount > 0
                              ? "text-main-orange"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatAmount(row.advanceAmount)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right",
                            row.carryIn > 0
                              ? "text-main-red"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatAmount(row.carryIn)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "py-5 text-right font-semibold",
                            row.netWage >= 0
                              ? "text-main-green"
                              : "text-main-red",
                          )}
                        >
                          {formatAmount(row.netWage)}
                        </TableCell>
                        <TableCell className="py-5 text-right font-semibold text-main-green">
                          {row.paidAmount === null
                            ? "—"
                            : formatAmount(row.paidAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>
          </TabsContent>
        </Tabs>

        <Dialog
          open={settleDialogOpen}
          onOpenChange={(open) => {
            if (!savingAdjustments && !settlingPayroll) {
              setSettleDialogOpen(open);
            }
          }}
        >
          <DialogContent
            showCloseButton={false}
            className="max-w-lg gap-0 overflow-hidden rounded-2xl p-0 text-base"
          >
            <DialogHeader className="border-b p-5 text-left">
              <DialogTitle className="text-xl font-semibold">
                ยืนยันจ่ายเงินและปิดรอบ
              </DialogTitle>
              <DialogDescription>รอบค่าแรง {payPeriod.label}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 p-5">
              <div className="flex justify-between gap-4 rounded-[8px] bg-secondary/60 px-4 py-3">
                <span className="text-muted-foreground">พนักงาน</span>
                <strong>{data.employees.length} คน</strong>
              </div>
              <div className="flex justify-between gap-4 rounded-[8px] bg-secondary/60 px-4 py-3">
                <span className="text-muted-foreground">ยอดสุทธิรวม</span>
                <strong>{formatCurrency(periodTotals.netWage)}</strong>
              </div>
              <p className="text-sm text-muted-foreground">
                หลังยืนยัน ระบบจะบันทึกยอดสุทธิ ยอดหนี้คงเหลือ และเวลาจ่าย
                จากนั้นจะไม่สามารถแก้รายการหักของรอบนี้ได้
              </p>
            </div>
            <DialogFooter className="m-0 rounded-none">
              <Button
                type="button"
                variant="outline"
                className="rounded-[8px]"
                disabled={savingAdjustments || settlingPayroll}
                onClick={() => setSettleDialogOpen(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                className="rounded-[8px]"
                disabled={savingAdjustments || settlingPayroll}
                onClick={handleSettlePayroll}
                aria-busy={savingAdjustments || settlingPayroll}
              >
                {savingAdjustments || settlingPayroll ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <CheckCircle2 />
                )}
                {savingAdjustments
                  ? "กำลังบันทึกรายการ"
                  : settlingPayroll
                    ? "กำลังปิดรอบ"
                    : "ยืนยันจ่ายเงิน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
