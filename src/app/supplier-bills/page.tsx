"use client";

/**
 * Supplier Bills Page - รายการบิลคู่ค้า / ซื้อเข้า
 */

import {
  Building2,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Clock3,
  Loader2,
  ReceiptText,
  Save,
  Search,
  Truck,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
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
import type {
  ApiResponse,
  SupplierBill,
  SupplierBillPaymentState,
  SupplierBillsPayload,
} from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const supplierStatusOptions = ["ชำระเงินแล้ว", "ค้างชำระ"] as const;

type SupplierEditableStatus = (typeof supplierStatusOptions)[number];

const zeroPayload: SupplierBillsPayload = {
  sourceTable: null,
  detailTable: null,
  items: [],
  summary: {
    billCount: 0,
    supplierCount: 0,
    totalAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    unpaidCount: 0,
    unpaidAmount: 0,
    unknownStatusCount: 0,
    detailItemCount: 0,
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value || 0);
}

function formatDateParts(dateString: string | null) {
  if (!dateString) {
    return { date: "-", time: "" };
  }

  const parsedDate = new Date(dateString);

  if (Number.isNaN(parsedDate.getTime())) {
    return { date: "-", time: "" };
  }

  return {
    date: parsedDate.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: parsedDate.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function getPaymentMeta(paymentState: SupplierBillPaymentState) {
  if (paymentState === "paid") {
    return {
      icon: CheckCircle2,
      className:
        "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
      rowClassName: "hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5",
    };
  }

  if (paymentState === "unpaid") {
    return {
      icon: Clock3,
      className:
        "border-red-100 bg-red-50 text-main-red dark:border-red-500/20 dark:bg-red-500/10",
      rowClassName: "hover:bg-red-50/40 dark:hover:bg-red-500/5",
    };
  }

  return {
    icon: CircleHelp,
    className:
      "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
    rowClassName: "hover:bg-blue-50/30 dark:hover:bg-blue-500/5",
  };
}

function matchesSearch(bill: SupplierBill, searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    bill.documentNo,
    bill.supplierCode,
    bill.supplierName,
    bill.status,
    bill.paymentLabel,
    bill.createdBy,
  ].some((value) => value.toLowerCase().includes(normalizedSearch));
}

function parseMoneyInput(value: string) {
  const number = Number(value.replace(/,/g, "").trim());

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Number(number.toFixed(2));
}

function normalizeEditableStatus(value: string) {
  const trimmedValue = value.trim();

  if (trimmedValue === "ชำระแล้ว" || trimmedValue === "จ่ายแล้ว") {
    return "ชำระเงินแล้ว";
  }

  if (trimmedValue === "ยังไม่จ่าย") {
    return "ค้างชำระ";
  }

  return trimmedValue;
}

function isSupplierStatusOption(
  value: string,
): value is SupplierEditableStatus {
  return supplierStatusOptions.some((option) => option === value);
}

function normalizeDialogStatus(value: string) {
  const normalizedStatus = normalizeEditableStatus(value);

  return isSupplierStatusOption(normalizedStatus)
    ? normalizedStatus
    : "ค้างชำระ";
}

function getStatusOptionClassName(option: string, isSelected: boolean) {
  if (option === "ชำระเงินแล้ว") {
    return isSelected
      ? "border-emerald-100 bg-emerald-50 text-main-green ring-1 ring-main-green/20 hover:bg-emerald-50 hover:!text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10"
      : "border-border bg-background text-muted-foreground hover:border-main-green/30 hover:bg-emerald-50 hover:!text-main-green";
  }

  if (option === "ค้างชำระ") {
    return isSelected
      ? "border-red-100 bg-red-50 text-main-red ring-1 ring-main-red/20 hover:bg-red-50 hover:!text-main-red dark:border-red-500/20 dark:bg-red-500/10"
      : "border-border bg-background text-muted-foreground hover:border-main-red/30 hover:bg-red-50 hover:!text-main-red";
  }

  return "";
}

function getEditableBillAmount(bill: SupplierBill) {
  if (bill.totalPrice > 0) {
    return bill.totalPrice;
  }

  if (bill.resultAmount > 0) {
    return bill.resultAmount;
  }

  if (bill.detailTotal > 0) {
    return bill.detailTotal;
  }

  return 0;
}

interface SupplierBillEditDialogProps {
  bill: SupplierBill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}

function SupplierBillEditDialog({
  bill,
  open,
  onOpenChange,
  onSaved,
}: SupplierBillEditDialogProps) {
  const [status, setStatus] = useState("");
  const [amount, setAmount] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bill || !open) {
      return;
    }

    setStatus(normalizeDialogStatus(bill.status || bill.paymentLabel || ""));
    setAmount(String(getEditableBillAmount(bill)));
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [bill, open]);

  const resetDialog = () => {
    setStatus("");
    setAmount("");
    setIsSaving(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetDialog();
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!bill) {
      return;
    }

    const parsedAmount = parseMoneyInput(amount);

    if (!isSupplierStatusOption(status)) {
      setErrorMessage("กรุณาเลือกสถานะชำระเงินแล้วหรือค้างชำระ");
      return;
    }

    if (parsedAmount === null) {
      setErrorMessage("กรุณาระบุยอดเงินให้ถูกต้อง");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch("/api/supplier-bills", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentNo: bill.documentNo,
          status,
          totalPrice: parsedAmount,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "บันทึกข้อมูลคู่ค้าไม่สำเร็จ");
      }

      setSuccessMessage("บันทึกข้อมูลเรียบร้อยแล้ว");
      await onSaved();
      handleOpenChange(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "บันทึกข้อมูลคู่ค้าไม่สำเร็จ",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const dateParts = bill ? formatDateParts(bill.date) : { date: "-", time: "" };
  const currentAmount = bill ? getEditableBillAmount(bill) : 0;

  return (
    <LargeDialog open={open} onOpenChange={handleOpenChange}>
      <LargeDialogContent size="lg">
        <LargeDialogHeader className="gap-2 px-5 py-5 md:px-6">
          <LargeDialogTitle className="text-primary text-xl md:text-2xl">
            แก้ไขบิลคู่ค้า
          </LargeDialogTitle>
          <LargeDialogDescription>
            {bill
              ? `${bill.documentNo || "ไม่ระบุเลขเอกสาร"} · ${bill.supplierName || "ไม่ระบุคู่ค้า"}`
              : "ปรับสถานะและยอดเงินของรายการคู่ค้า"}
          </LargeDialogDescription>
        </LargeDialogHeader>

        <LargeDialogBody className="px-5 py-5 md:px-6">
          {bill ? (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="rounded-[8px] border bg-[#FCFCFC] p-4">
                <div className="flex flex-col gap-4 min-[720px]:flex-row min-[720px]:items-start min-[720px]:justify-between">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                          getPaymentMeta(bill.paymentState).className,
                        )}
                      >
                        {bill.paymentLabel}
                      </Badge>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {dateParts.date}
                        {dateParts.time ? ` · ${dateParts.time}` : ""}
                      </span>
                    </div>

                    <div>
                      <p className="truncate text-xl font-bold text-card-foreground">
                        {bill.supplierName || "ไม่ระบุคู่ค้า"}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-muted-foreground">
                        {bill.documentNo || "-"}
                        {bill.supplierCode ? ` · ${bill.supplierCode}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[8px] border bg-white px-4 py-3 text-left dark:bg-card min-[720px]:min-w-[220px] min-[720px]:text-right">
                    <span className="text-sm font-bold text-muted-foreground">
                      ยอดปัจจุบัน
                    </span>
                    <p className="mt-1 text-2xl font-bold text-primary">
                      {formatCurrency(currentAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 min-[760px]:grid-cols-[1fr_0.85fr]">
                <div className="space-y-2">
                  <span className="block text-sm font-bold text-card-foreground">
                    สถานะ
                  </span>
                  <div className="grid gap-2 min-[420px]:grid-cols-2">
                    {supplierStatusOptions.map((option) => {
                      const isSelected = status === option;

                      return (
                        <Button
                          key={option}
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-10 border font-bold shadow-none",
                            getStatusOptionClassName(option, isSelected),
                          )}
                          onClick={() => setStatus(option)}
                        >
                          {option}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="supplier-bill-amount"
                    className="block text-sm font-bold text-card-foreground"
                  >
                    ยอดเงิน
                  </label>
                  <div className="relative">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                      ฿
                    </span>
                    <Input
                      id="supplier-bill-amount"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      className="h-12 rounded-[8px] pr-3 pl-9 text-lg font-bold"
                      placeholder="0.00"
                    />
                  </div>
                  <span className="block text-xs font-semibold text-muted-foreground">
                    ยอดเดิม {formatCurrency(currentAmount)}
                  </span>
                </div>
              </div>

              <div className="grid gap-2 rounded-[8px] border bg-muted/25 p-3 text-sm font-semibold min-[620px]:grid-cols-3">
                <div className="flex items-center justify-between gap-3 min-[620px]:block">
                  <span className="text-muted-foreground">รายการสินค้า</span>
                  <p className="font-bold text-card-foreground min-[620px]:mt-1">
                    {formatNumber(bill.itemCount)} รายการ
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 min-[620px]:block">
                  <span className="text-muted-foreground">ส่วนลด</span>
                  <p className="font-bold text-card-foreground min-[620px]:mt-1">
                    {formatCurrency(bill.discount + bill.productDiscount)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 min-[620px]:block">
                  <span className="text-muted-foreground">ผู้บันทึก</span>
                  <p className="truncate font-bold text-card-foreground min-[620px]:mt-1">
                    {bill.createdBy || "-"}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-[8px] border bg-white dark:bg-card">
                <div className="flex items-center justify-between gap-3 border-b bg-muted/25 px-3 py-2">
                  <span className="text-sm font-bold text-card-foreground">
                    รายการสินค้า
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">
                    {formatNumber(bill.lineItems.length || bill.itemCount)}{" "}
                    รายการ
                  </span>
                </div>

                {bill.lineItems.length > 0 ? (
                  <div className="max-h-[280px] divide-y overflow-y-auto">
                    {bill.lineItems.map((item, index) => (
                      <div
                        key={item.id || `${bill.id}-${index}`}
                        className="grid gap-3 px-3 py-3 min-[640px]:grid-cols-[minmax(0,1fr)_120px_130px] min-[640px]:items-center"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-card-foreground">
                            {item.name || "ไม่ระบุสินค้า"}
                          </p>
                          <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
                            {item.barcode || "ไม่มีบาร์โค้ด"}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-3 text-sm font-semibold min-[640px]:block min-[640px]:text-right">
                          <span className="text-muted-foreground min-[640px]:hidden">
                            จำนวน
                          </span>
                          <span className="text-card-foreground">
                            {formatNumber(item.quantity)}
                            {item.unit ? ` ${item.unit}` : ""}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-3 min-[640px]:block min-[640px]:text-right">
                          <span className="text-sm font-semibold text-muted-foreground min-[640px]:hidden">
                            รวม
                          </span>
                          <div>
                            <p
                              className={cn(
                                outfit.className,
                                "text-sm font-bold text-card-foreground",
                              )}
                            >
                              {formatCurrency(item.total)}
                            </p>
                            {item.discount > 0 ? (
                              <p className="mt-0.5 text-xs font-semibold text-muted-foreground">
                                ส่วนลด {formatCurrency(item.discount)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-sm font-semibold text-muted-foreground">
                    ยังไม่มีรายละเอียดสินค้าในฐานข้อมูลเดิมของบิลนี้
                  </div>
                )}
              </div>

              {errorMessage ? (
                <div className="rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-main-red dark:border-red-500/20 dark:bg-red-500/10">
                  {errorMessage}
                </div>
              ) : null}

              {successMessage ? (
                <div className="rounded-[8px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  {successMessage}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 border-t pt-4 min-[520px]:flex-row min-[520px]:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 font-bold"
                  disabled={isSaving}
                  onClick={() => handleOpenChange(false)}
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  className="h-10 font-bold"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  บันทึก
                </Button>
              </div>
            </form>
          ) : null}
        </LargeDialogBody>
      </LargeDialogContent>
    </LargeDialog>
  );
}

export default function SupplierBillsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<SupplierBill | null>(null);
  const {
    data: supplierBillsData,
    error,
    isLoading,
    mutate,
  } = useSWR<ApiResponse<SupplierBillsPayload>>(
    "/api/supplier-bills?limit=1000",
    fetcher,
    { refreshInterval: 60000 },
  );

  const payload =
    supplierBillsData?.success && supplierBillsData.data
      ? supplierBillsData.data
      : zeroPayload;
  const { summary } = payload;
  const displayedBills = payload.items.filter((bill) =>
    matchesSearch(bill, searchTerm),
  );
  const needsReviewCount = summary.unpaidCount + summary.unknownStatusCount;

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="บิลคู่ค้า" href="/supplier-bills" />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm md:mt-6">
          <div className="mb-6 flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold tracking-tight">
                  บิลคู่ค้า
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  ติดตามยอดซื้อเข้าและสถานะจ่ายของคู่ค้า
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-4">
            <KPICard
              title="เอกสารทั้งหมด"
              value={summary.billCount}
              unit="ใบ"
              icon={ReceiptText}
              variant="blue"
            />
            <KPICard
              title="ยอดรวม"
              value={summary.totalAmount}
              icon={ClipboardList}
              variant="orange"
              format="currency"
            />
            <KPICard
              title="คู่ค้า"
              value={summary.supplierCount}
              unit="เจ้า"
              icon={Building2}
              variant="purple"
            />
            <KPICard
              title="ต้องตรวจสถานะ"
              value={needsReviewCount}
              unit="ใบ"
              icon={Clock3}
              variant={needsReviewCount > 0 ? "orange" : "emerald"}
            />
          </div>
        </div>

        <Card className="rounded-3xl border bg-card shadow-sm">
          <CardContent className="pt-2">
            <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-center">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาเลขเอกสาร คู่ค้า หรือสถานะ..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 rounded-2xl pl-10 font-medium"
                />
              </div>

              {searchTerm ? (
                <Button
                  variant="outline"
                  className="h-11 gap-2 rounded-2xl font-bold"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                  ล้างคำค้นหา
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10">
                <ReceiptText className="h-6 w-6 text-main-orange" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการบิลคู่ค้า
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  {payload.sourceTable
                    ? "ติดตามสถานะและยอดเงินของรายการคู่ค้า"
                    : "ยังไม่พบข้อมูลบิลคู่ค้าในฐานข้อมูลเดิม"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-blue-50 px-4 text-sm font-bold text-main-blue dark:bg-blue-500/10">
                {formatNumber(displayedBills.length)} รายการ
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground shadow-none"
              >
                รวม {formatCurrency(summary.totalAmount)}
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 rounded-2xl border bg-white p-4 dark:bg-card">
              {[1, 2, 3, 4, 5].map((row) => (
                <Skeleton key={row} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : error || (supplierBillsData && !supplierBillsData.success) ? (
            <div className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-12 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <p className="text-lg font-bold text-main-red">
                เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {error?.message || "Unknown error"}
              </p>
            </div>
          ) : displayedBills.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <ReceiptText className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบรายการบิลคู่ค้า
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ลองเปลี่ยนคำค้นหาหรือตรวจสอบข้อมูลจากฐานเดิมอีกครั้ง
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
              <Table>
                <TableHeader className="bg-secondary/70">
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="w-[28%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                      เอกสาร
                    </TableHead>
                    <TableHead className="w-[30%] text-base font-bold text-card-foreground min-[500px]:text-lg">
                      คู่ค้า
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[780px]:table-cell">
                      รายการ
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      ยอดรวม
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[960px]:table-cell">
                      ส่วนลด
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      สถานะ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedBills.map((bill, index) => {
                    const paymentMeta = getPaymentMeta(bill.paymentState);
                    const PaymentIcon = paymentMeta.icon;
                    const dateParts = formatDateParts(bill.date);
                    const totalDiscount = bill.discount + bill.productDiscount;

                    return (
                      <TableRow
                        key={bill.id}
                        onClick={() => setSelectedBill(bill)}
                        className={cn(
                          "group cursor-pointer border-border/60 transition-colors duration-200",
                          paymentMeta.rowClassName,
                        )}
                      >
                        <TableCell className="px-4 py-4 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-sm font-bold text-main-orange select-none dark:border-orange-500/20 dark:bg-orange-500/10 min-[550px]:h-12 min-[550px]:w-12">
                              {index + 1}
                            </div>
                            <div className="flex min-w-0 flex-col gap-1">
                              <span
                                className={cn(
                                  outfit.className,
                                  "max-w-[120px] truncate text-sm font-bold text-card-foreground transition-colors group-hover:text-main-orange min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[550px]:text-base min-[1100px]:max-w-[420px]",
                                )}
                              >
                                {bill.documentNo || "ไม่ระบุเลขเอกสาร"}
                              </span>
                              <span className="text-xs font-semibold text-muted-foreground">
                                {dateParts.date}
                                {dateParts.time ? ` · ${dateParts.time}` : ""}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="max-w-[160px] truncate text-sm font-bold text-card-foreground min-[520px]:max-w-[260px] min-[1180px]:max-w-[420px]">
                              {bill.supplierName || "ไม่ระบุคู่ค้า"}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {bill.supplierCode || "ไม่มีรหัสคู่ค้า"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[780px]:table-cell">
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                outfit.className,
                                "font-bold text-card-foreground",
                              )}
                            >
                              {formatNumber(bill.itemCount)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              รายการสินค้า
                            </span>
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
                              {formatCurrency(bill.totalPrice)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground min-[780px]:hidden">
                              {formatNumber(bill.itemCount)} รายการ
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[960px]:table-cell">
                          <span
                            className={cn(
                              outfit.className,
                              "font-bold text-muted-foreground",
                            )}
                          >
                            {formatCurrency(totalDiscount)}
                          </span>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                                paymentMeta.className,
                              )}
                            >
                              <PaymentIcon className="h-3.5 w-3.5" />
                              {bill.paymentLabel}
                            </Badge>
                            {bill.createdBy ? (
                              <span className="hidden text-xs font-semibold text-muted-foreground min-[720px]:inline">
                                โดย {bill.createdBy}
                              </span>
                            ) : null}
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

      <SupplierBillEditDialog
        bill={selectedBill}
        open={selectedBill !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedBill(null);
          }
        }}
        onSaved={async () => {
          await mutate();
        }}
      />
    </div>
  );
}
