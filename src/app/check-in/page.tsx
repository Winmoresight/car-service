"use client";

import {
  CalendarDays,
  Check,
  CircleCheck,
  CircleX,
  Clock3,
  History,
  KeyRound,
  Loader2,
  MapPin,
  Phone,
  RotateCcw,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LogoutButton } from "@/components/layout/logout-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type AttendanceStatus =
  | "full_day"
  | "absent"
  | "half_day"
  | "sunday_off"
  | "special_paid"
  | "special_unpaid";
type PageView = "attendance" | "history" | "profile";

interface CheckInData {
  date: string;
  serverTime: string;
  employee: {
    code: number;
    name: string;
    position: string;
    phone: string;
    address: string;
    birthDate: string | null;
    age: number | null;
  };
  record: {
    status: AttendanceStatus;
    updatedAt: string | null;
  } | null;
  history: Array<{
    date: string;
    status: AttendanceStatus;
    updatedAt: string | null;
  }>;
}

interface CheckInResponse {
  success: boolean;
  data?: CheckInData;
  error?: string;
}

const statusDetails: Record<
  AttendanceStatus,
  { label: string; dotClassName: string }
> = {
  full_day: { label: "มาทำงาน", dotClassName: "bg-main-green" },
  absent: { label: "ไม่มาทำงาน", dotClassName: "bg-main-red" },
  half_day: { label: "ทำงานครึ่งวัน", dotClassName: "bg-main-orange" },
  sunday_off: { label: "หยุดวันอาทิตย์", dotClassName: "bg-muted-foreground" },
  special_paid: { label: "หยุดพิเศษ (ได้ค่าแรง)", dotClassName: "bg-main-blue" },
  special_unpaid: {
    label: "หยุดพิเศษ (ไม่ได้ค่าแรง)",
    dotClassName: "bg-muted-foreground",
  },
};

const otherStatuses: AttendanceStatus[] = [
  "half_day",
  "sunday_off",
  "special_paid",
  "special_unpaid",
];

const navigation: Array<{
  value: PageView;
  label: string;
  icon: typeof Clock3;
}> = [
  { value: "attendance", label: "ลงชื่อ", icon: Clock3 },
  { value: "history", label: "ประวัติ", icon: History },
  { value: "profile", label: "ข้อมูลของฉัน", icon: UserRound },
];

function StatusLabel({ status }: { status: AttendanceStatus }) {
  const detail = statusDetails[status];
  return (
    <span className="flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className={cn("size-2.5 shrink-0 rounded-full", detail.dotClassName)}
      />
      <span className="truncate">{detail.label}</span>
    </span>
  );
}

function formatThaiDate(date: string, full = true) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: full ? "full" : "medium",
    timeZone: "Asia/Bangkok",
  }).format(new Date(`${date.slice(0, 10)}T12:00:00+07:00`));
}

function formatThaiTime(date: string) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  }).format(new Date(date));
}

export default function CheckInPage() {
  const [data, setData] = useState<CheckInData | null>(null);
  const [view, setView] = useState<PageView>("attendance");
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus | "">(
    "",
  );
  const [now, setNow] = useState<Date | null>(null);
  const [clockOffset, setClockOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successStatus, setSuccessStatus] = useState<AttendanceStatus | null>(
    null,
  );
  const [successTime, setSuccessTime] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const selectedDetail = useMemo(
    () => (selectedStatus ? statusDetails[selectedStatus] : null),
    [selectedStatus],
  );

  const loadCheckIn = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await fetch("/api/check-in", { cache: "no-store" });
      const result = (await response.json()) as CheckInResponse;
      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || "ไม่สามารถโหลดข้อมูลลงเวลาทำงานได้");
      }

      const offset = new Date(result.data.serverTime).getTime() - Date.now();
      setClockOffset(offset);
      setNow(new Date(Date.now() + offset));
      setData(result.data);
      setSelectedStatus("");
      return result.data;
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "ไม่สามารถโหลดข้อมูลลงเวลาทำงานได้",
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCheckIn();
  }, [loadCheckIn]);

  useEffect(() => {
    const interval = window.setInterval(
      () => setNow(new Date(Date.now() + clockOffset)),
      1_000,
    );
    return () => window.clearInterval(interval);
  }, [clockOffset]);

  const handleConfirm = async () => {
    if (!selectedStatus) return;

    try {
      setSaving(true);
      const response = await fetch("/api/check-in", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: selectedStatus }),
      });
      const result = (await response.json()) as CheckInResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.error || "ไม่สามารถบันทึกสถานะการทำงานได้");
      }

      const savedStatus = selectedStatus;
      const refreshedData = await loadCheckIn();
      setSuccessStatus(savedStatus);
      setSuccessTime(
        refreshedData?.record?.updatedAt ?? new Date().toISOString(),
      );
      setSuccessOpen(true);
    } catch (error) {
      toast.add({
        title: "❌ บันทึกไม่สำเร็จ",
        description: error instanceof Error ? error.message : "กรุณาลองใหม่อีกครั้ง",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-white sm:bg-[#F3F6FA] sm:px-4 sm:py-8">
      <main className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col bg-white px-5 py-5 sm:min-h-[760px] sm:rounded-[20px] sm:border sm:border-[#E2E7EE] sm:px-7 sm:py-7">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-[#E2E7EE] bg-white">
              <Image src="/logo.svg" alt="วิจิตรศิลป" width={34} height={34} />
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold">CAR SERVICE</div>
              <div className="truncate text-sm text-muted-foreground">
                ระบบลงชื่อพนักงาน
              </div>
            </div>
          </div>
          <LogoutButton className="h-10 shrink-0 rounded-[8px] border-0 bg-[#F4F4F4] px-3 text-sm font-medium hover:bg-[#E8E8E8]" />
        </header>

        {loading ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20 text-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground motion-reduce:animate-none" />
            <p className="text-muted-foreground">กำลังโหลดข้อมูลวันนี้</p>
          </div>
        ) : errorMessage || !data ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-red-50 text-main-red">
              <CircleX className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">ยังเปิดหน้าลงชื่อไม่ได้</h1>
              <p className="mt-2 text-muted-foreground">{errorMessage}</p>
            </div>
            <Button type="button" variant="outline" onClick={loadCheckIn}>
              <RotateCcw /> ลองใหม่
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {view === "attendance" ? (
              <div className="flex flex-1 flex-col">
                <section className="pt-7 text-center">
                  <p className="text-muted-foreground">
                    {formatThaiDate(data.date)}
                  </p>
                  <div className="mt-2 font-mono text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
                    {now
                      ? new Intl.DateTimeFormat("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                          timeZone: "Asia/Bangkok",
                        }).format(now)
                      : "--:--:--"}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      {data.employee.name} ·{" "}
                      {data.employee.position || "พนักงาน"}
                    </span>
                    {data.record ? (
                      <span className="inline-flex items-center gap-1 font-medium text-[#2E9B57]">
                        <CircleCheck className="size-4" />
                        ลงชื่อแล้ว
                      </span>
                    ) : null}
                  </div>
                </section>

                <section aria-labelledby="attendance-question" className="pt-7">
                  <h1
                    id="attendance-question"
                    className="text-xl font-semibold"
                  >
                    วันนี้คุณมาทำงานไหม?
                  </h1>
                  <p className="mt-1 text-muted-foreground">เลือกสถานะของวันนี้</p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      aria-pressed={selectedStatus === "full_day"}
                      onClick={() => setSelectedStatus("full_day")}
                      className={cn(
                        "flex min-h-28 flex-col items-start justify-between rounded-[12px] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] motion-reduce:active:scale-100",
                        selectedStatus === "full_day"
                          ? "border-[#95DBAC] bg-[#ECF7EF] text-[#176C3A]"
                          : "border-[#E2E7EE] bg-[#F8FAFC] hover:border-[#B9C4D2]",
                      )}
                    >
                      <span className="flex size-10 items-center justify-center rounded-full bg-white">
                        <CircleCheck className="size-6" />
                      </span>
                      <span className="text-lg font-semibold">มาทำงาน</span>
                    </button>
                    <button
                      type="button"
                      aria-pressed={
                        selectedStatus === "absent" ||
                        otherStatuses.includes(
                          selectedStatus as AttendanceStatus,
                        )
                      }
                      onClick={() => setSelectedStatus("absent")}
                      className={cn(
                        "flex min-h-28 flex-col items-start justify-between rounded-[12px] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] motion-reduce:active:scale-100",
                        selectedStatus === "absent" ||
                          otherStatuses.includes(
                            selectedStatus as AttendanceStatus,
                          )
                          ? "border-[#F0B9AD] bg-[#FDEFEE] text-[#A94F3B]"
                          : "border-[#E2E7EE] bg-[#F8FAFC] hover:border-[#B9C4D2]",
                      )}
                    >
                      <span className="flex size-10 items-center justify-center rounded-full bg-white">
                        <CircleX className="size-6" />
                      </span>
                      <span className="text-lg font-semibold">ไม่มาทำงาน</span>
                    </button>
                  </div>

                  {selectedStatus === "absent" ||
                  otherStatuses.includes(selectedStatus as AttendanceStatus) ? (
                    <div className="mt-4">
                      <label
                        htmlFor="other-attendance-status"
                        className="mb-2 block font-medium"
                      >
                        เหตุผลอื่น (ถ้ามี)
                      </label>
                      <Select
                        value={
                          otherStatuses.includes(
                            selectedStatus as AttendanceStatus,
                          )
                            ? selectedStatus
                            : ""
                        }
                        onValueChange={(value) =>
                          setSelectedStatus(value as AttendanceStatus)
                        }
                      >
                        <SelectTrigger
                          id="other-attendance-status"
                          className="h-12 w-full text-base"
                        >
                          <SelectValue placeholder="ไม่มาทำงานทั่วไป" />
                        </SelectTrigger>
                        <SelectContent className="w-[var(--radix-select-trigger-width)]">
                          {otherStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              <StatusLabel status={status} />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                </section>

                <section className="pt-4">
                  <Button
                    type="button"
                    className="h-12 w-full rounded-[8px] bg-[#3F7DF4] font-semibold hover:bg-[#326DE0]"
                    disabled={!selectedStatus || saving}
                    aria-busy={saving}
                    onClick={handleConfirm}
                  >
                    {saving ? <Loader2 className="animate-spin" /> : <Check />}
                    {saving
                      ? "กำลังบันทึก"
                      : selectedDetail
                        ? `ยืนยัน “${selectedDetail.label}”`
                        : "เลือกคำตอบก่อน"}
                  </Button>
                </section>
              </div>
            ) : null}

            {view === "history" ? (
              <section className="pt-8">
                <h1 className="text-2xl font-semibold">ประวัติการลงชื่อ</h1>
                <p className="mt-1 text-muted-foreground">30 รายการล่าสุดของคุณ</p>
                {data.history.length ? (
                  <div className="mt-6 divide-y rounded-[12px] border">
                    {data.history.map((item) => (
                      <div
                        key={item.date}
                        className="flex items-center justify-between gap-4 p-4"
                      >
                        <div>
                          <p className="font-medium">
                            {formatThaiDate(item.date, false)}
                          </p>
                          {item.updatedAt ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              บันทึก {formatThaiTime(item.updatedAt)} น.
                            </p>
                          ) : null}
                        </div>
                        <div className="text-sm font-medium">
                          <StatusLabel status={item.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-6 rounded-[12px] border border-dashed p-8 text-center text-muted-foreground">
                    ยังไม่มีประวัติการลงชื่อ
                  </div>
                )}
              </section>
            ) : null}

            {view === "profile" ? (
              <section className="pt-8">
                <h1 className="text-2xl font-semibold">ข้อมูลของฉัน</h1>
                <p className="mt-1 text-muted-foreground">
                  ข้อมูลนี้แก้ไขโดยเจ้าของระบบ
                </p>
                <div className="mt-6 space-y-3">
                  <ProfileRow
                    icon={UserRound}
                    label="ชื่อพนักงาน"
                    value={data.employee.name}
                  />
                  <ProfileRow
                    icon={Phone}
                    label="เบอร์โทร"
                    value={data.employee.phone || "ยังไม่มีข้อมูล"}
                  />
                  <ProfileRow
                    icon={CalendarDays}
                    label="วันเกิด"
                    value={
                      data.employee.birthDate
                        ? formatThaiDate(data.employee.birthDate, false)
                        : "ยังไม่มีข้อมูล"
                    }
                  />
                  <ProfileRow
                    icon={MapPin}
                    label="ที่อยู่"
                    value={data.employee.address || "ยังไม่มีข้อมูล"}
                  />
                </div>
                <Button asChild variant="outline" className="mt-6 h-12 w-full">
                  <Link href="/change-password">
                    <KeyRound /> เปลี่ยนรหัสผ่าน
                  </Link>
                </Button>
              </section>
            ) : null}
          </div>
        )}

        {!loading && data ? (
          <nav
            className="sticky bottom-0 z-30 -mx-5 mt-7 grid grid-cols-3 border-t border-[#E2E7EE] bg-white/95 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur sm:-mx-7 sm:-mb-7 sm:rounded-b-[20px]"
            aria-label="เมนูพนักงาน"
          >
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setView(item.value)}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[8px] px-2 text-sm font-medium transition-colors",
                    view === item.value
                      ? "bg-[#EFF5FF] text-[#2866D7]"
                      : "text-muted-foreground hover:bg-[#F4F4F4] hover:text-foreground",
                  )}
                  aria-current={view === item.value ? "page" : undefined}
                >
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        ) : null}
      </main>

      {successStatus ? (
        <AttendanceSuccessDialog
          open={successOpen}
          status={successStatus}
          time={successTime}
          onOpenChange={setSuccessOpen}
        />
      ) : null}
    </div>
  );
}

const successConfetti = [
  "attendance-success-confetti--1 left-1/2 top-1 size-2 -translate-x-1/2 rounded-full bg-violet-600",
  "attendance-success-confetti--2 left-2 top-[46%] size-3 rounded-full bg-amber-400",
  "attendance-success-confetti--3 right-2 top-[42%] size-2.5 rounded-full bg-sky-400",
  "attendance-success-confetti--4 bottom-6 left-8 size-2 rounded-full bg-lime-400",
  "attendance-success-confetti--5 left-5 top-8 h-4 w-2 -rotate-12 rounded-full border-l-2 border-red-400",
  "attendance-success-confetti--6 right-5 top-7 size-3 rotate-12 rounded-full border-2 border-orange-400 border-l-transparent",
  "attendance-success-confetti--7 bottom-4 right-9 h-2 w-4 -rotate-12 rounded-b-full border-b-2 border-blue-600",
  "attendance-success-confetti--8 bottom-10 left-1 h-3 w-3 -rotate-12 rounded-full border-l-2 border-t-2 border-blue-500",
  "attendance-success-confetti--9 bottom-9 right-0 h-0 w-0 rotate-12 border-y-[5px] border-l-[9px] border-y-transparent border-l-lime-400",
] as const;

function AttendanceSuccessDialog({
  open,
  status,
  time,
  onOpenChange,
}: {
  open: boolean;
  status: AttendanceStatus;
  time: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100%-2rem)] max-w-[400px] gap-0 rounded-[20px] border border-[#E2E7EE] bg-white p-0 text-base"
      >
        <div className="attendance-success-panel px-6 pt-5 pb-6 text-center">
          <div
            className="relative mx-auto flex size-36 items-center justify-center"
            aria-hidden="true"
          >
            {successConfetti.map((item) => (
              <span
                key={item}
                className={cn("attendance-success-confetti absolute", item)}
              />
            ))}
            <span className="attendance-success-ring attendance-success-ring--outer absolute flex size-24 items-center justify-center rounded-full bg-emerald-100">
              <span className="attendance-success-ring attendance-success-ring--middle flex size-20 items-center justify-center rounded-full bg-emerald-300">
                <span className="attendance-success-ring attendance-success-ring--inner flex size-16 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check
                    className="attendance-success-check size-9"
                    strokeWidth={3}
                  />
                </span>
              </span>
            </span>
          </div>

          <div className="attendance-success-copy attendance-success-copy--title">
            <DialogTitle className="text-3xl leading-tight font-semibold">
              ลงชื่อเรียบร้อยแล้ว
            </DialogTitle>
          </div>
          <div className="attendance-success-copy attendance-success-copy--detail">
            <DialogDescription className="mt-2 text-base leading-7">
              บันทึก “{statusDetails[status].label}”
              {time ? ` เวลา ${formatThaiTime(time)} น.` : ""}
            </DialogDescription>
          </div>

          <div className="attendance-success-copy attendance-success-copy--actions">
            <Button
              type="button"
              className="mt-7 h-12 w-full rounded-[8px] bg-[#3F7DF4] font-semibold hover:bg-[#326DE0]"
              onClick={() => onOpenChange(false)}
            >
              เสร็จสิ้น
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[12px] border p-4">
      <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 break-words font-medium">{value}</p>
      </div>
    </div>
  );
}
