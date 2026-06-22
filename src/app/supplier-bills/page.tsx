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
  FilePlus2,
  Loader2,
  Plus,
  ReceiptText,
  Save,
  Search,
  Trash2,
  Truck,
  UserPlus,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import AsyncSearchableSelect from "@/components/ui/async-searchable-select";
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
import type {
  ApiResponse,
  SupplierBill,
  SupplierBillPaymentState,
  SupplierBillsCatalogPayload,
  SupplierBillsPayload,
  SupplierCatalogProduct,
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

interface SupplierBillDraftLine {
  id: string;
  barcode: string;
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discount: string;
  cost: string;
  caseProduct: number;
}

interface NewSupplierDraft {
  name: string;
  type: string;
  address: string;
  phone: string;
  taxId: string;
  detail: string;
}

const defaultSupplierBillStatus: SupplierEditableStatus = "ค้างชำระ";

function getTodayInputDate() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function createEmptyLine(): SupplierBillDraftLine {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    barcode: "",
    name: "",
    quantity: "1",
    unit: "",
    unitPrice: "",
    discount: "",
    cost: "",
    caseProduct: 25,
  };
}

function createEmptySupplier(): NewSupplierDraft {
  return {
    name: "",
    type: "",
    address: "",
    phone: "",
    taxId: "",
    detail: "",
  };
}

function getMoneyInputValue(value: number) {
  return value > 0 ? String(value) : "";
}

function parsePositiveNumberInput(value: string) {
  const parsed = parseMoneyInput(value);

  return parsed !== null && parsed > 0 ? parsed : null;
}

function getDraftLineTotal(item: SupplierBillDraftLine) {
  const quantity = parsePositiveNumberInput(item.quantity) ?? 0;
  const unitPrice = parseMoneyInput(item.unitPrice) ?? 0;
  const discount = parseMoneyInput(item.discount) ?? 0;

  return Number(Math.max(quantity * unitPrice - discount, 0).toFixed(2));
}

function getDraftTotals(
  items: SupplierBillDraftLine[],
  specialDiscountInput: string,
) {
  const subTotal = Number(
    items
      .reduce((sum, item) => {
        const quantity = parsePositiveNumberInput(item.quantity) ?? 0;
        const unitPrice = parseMoneyInput(item.unitPrice) ?? 0;

        return sum + quantity * unitPrice;
      }, 0)
      .toFixed(2),
  );
  const productDiscount = Number(
    items
      .reduce((sum, item) => sum + (parseMoneyInput(item.discount) ?? 0), 0)
      .toFixed(2),
  );
  const specialDiscount = parseMoneyInput(specialDiscountInput) ?? 0;

  return {
    subTotal,
    productDiscount,
    specialDiscount,
    totalPrice: Number(
      Math.max(subTotal - productDiscount - specialDiscount, 0).toFixed(2),
    ),
  };
}

async function fetchSupplierProductOptions(
  search: string,
  signal: AbortSignal,
) {
  const params = new URLSearchParams({ q: search });
  const response = await fetch(`/api/supplier-bills/catalog?${params}`, {
    signal,
  });
  const result =
    (await response.json()) as ApiResponse<SupplierBillsCatalogPayload>;

  return result.success && result.data ? result.data.products : [];
}

function uniqueCatalogOptionsByName<T extends { name: string }>(options: T[]) {
  const seenNames = new Set<string>();

  return options.filter((option) => {
    if (seenNames.has(option.name)) {
      return false;
    }

    seenNames.add(option.name);
    return true;
  });
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

interface SupplierBillCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
}

function SupplierBillCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: SupplierBillCreateDialogProps) {
  const [supplierMode, setSupplierMode] = useState<"existing" | "new">(
    "existing",
  );
  const [selectedSupplierCode, setSelectedSupplierCode] = useState("");
  const [newSupplier, setNewSupplier] =
    useState<NewSupplierDraft>(createEmptySupplier);
  const [billDate, setBillDate] = useState(getTodayInputDate);
  const [status, setStatus] = useState<SupplierEditableStatus>(
    defaultSupplierBillStatus,
  );
  const [createdBy, setCreatedBy] = useState("admin");
  const [specialDiscount, setSpecialDiscount] = useState("");
  const [items, setItems] = useState<SupplierBillDraftLine[]>([
    createEmptyLine(),
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: catalogData, isLoading: catalogLoading } = useSWR<
    ApiResponse<SupplierBillsCatalogPayload>
  >(open ? "/api/supplier-bills/catalog" : null, fetcher);
  const catalog =
    catalogData?.success && catalogData.data ? catalogData.data : null;
  const suppliers = catalog?.suppliers ?? [];
  const selectedSupplier = suppliers.find(
    (supplier) => supplier.code === selectedSupplierCode,
  );
  const creditorTypes = catalog?.creditorTypes ?? [];
  const units = uniqueCatalogOptionsByName(catalog?.units ?? []);
  const totals = getDraftTotals(items, specialDiscount);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSupplierMode("existing");
    setSelectedSupplierCode("");
    setNewSupplier(createEmptySupplier());
    setBillDate(getTodayInputDate());
    setStatus(defaultSupplierBillStatus);
    setCreatedBy("admin");
    setSpecialDiscount("");
    setItems([createEmptyLine()]);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(false);
  }, [open]);

  const updateLine = (id: string, updates: Partial<SupplierBillDraftLine>) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    );
  };

  const applyProductToLine = (
    line: SupplierBillDraftLine,
    product: SupplierCatalogProduct,
  ) => {
    updateLine(line.id, {
      barcode: product.barcode,
      name: product.name,
      unit: product.unit || line.unit,
      unitPrice: getMoneyInputValue(product.unitPrice),
      cost: getMoneyInputValue(product.cost),
      caseProduct: product.caseProduct || 25,
    });
  };

  const removeLine = (id: string) => {
    setItems((currentItems) =>
      currentItems.length > 1
        ? currentItems.filter((item) => item.id !== id)
        : currentItems,
    );
  };

  const validateForm = () => {
    if (supplierMode === "existing" && !selectedSupplierCode) {
      return "กรุณาเลือกคู่ค้า";
    }

    if (supplierMode === "new" && !newSupplier.name.trim()) {
      return "กรุณาระบุชื่อคู่ค้าใหม่";
    }

    const validItems = items.filter((item) => item.name.trim());

    if (validItems.length === 0) {
      return "กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ";
    }

    for (const item of validItems) {
      const quantity = parsePositiveNumberInput(item.quantity);
      const unitPrice = parseMoneyInput(item.unitPrice);
      const discount = parseMoneyInput(item.discount) ?? 0;

      if (quantity === null) {
        return `กรุณาระบุจำนวนของ ${item.name} ให้ถูกต้อง`;
      }

      if (unitPrice === null) {
        return `กรุณาระบุราคาต่อหน่วยของ ${item.name} ให้ถูกต้อง`;
      }

      if (discount > quantity * unitPrice) {
        return `ส่วนลดของ ${item.name} ต้องไม่เกินยอดรายการ`;
      }
    }

    if (totals.productDiscount + totals.specialDiscount > totals.subTotal) {
      return "ส่วนลดรวมต้องไม่เกินยอดรวมสินค้า";
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const payloadItems = items
      .filter((item) => item.name.trim())
      .map((item) => ({
        barcode: item.barcode.trim(),
        name: item.name.trim(),
        quantity: parsePositiveNumberInput(item.quantity) ?? 1,
        unit: item.unit.trim() || "-",
        unitPrice: parseMoneyInput(item.unitPrice) ?? 0,
        discount: parseMoneyInput(item.discount) ?? 0,
        cost: parseMoneyInput(item.cost) ?? 0,
        caseProduct: item.caseProduct || 25,
      }));

    try {
      setIsSaving(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      const response = await fetch("/api/supplier-bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          supplierCode:
            supplierMode === "existing" ? selectedSupplierCode : undefined,
          supplier:
            supplierMode === "new"
              ? {
                  name: newSupplier.name,
                  type: newSupplier.type,
                  address: newSupplier.address,
                  phone: newSupplier.phone,
                  taxId: newSupplier.taxId,
                  detail: newSupplier.detail,
                }
              : undefined,
          billDate,
          status,
          createdBy,
          specialDiscount: parseMoneyInput(specialDiscount) ?? 0,
          items: payloadItems,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "บันทึกบิลคู่ค้าไม่สำเร็จ");
      }

      setSuccessMessage("บันทึกบิลคู่ค้าเรียบร้อยแล้ว");
      await onCreated();
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "บันทึกบิลคู่ค้าไม่สำเร็จ",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <LargeDialog open={open} onOpenChange={onOpenChange}>
      <LargeDialogContent size="2xl">
        <LargeDialogHeader className="gap-2 px-5 py-5 md:px-6">
          <LargeDialogTitle className="text-primary text-xl md:text-2xl">
            เพิ่มบิลคู่ค้า
          </LargeDialogTitle>
          <LargeDialogDescription>
            บันทึกข้อมูลจากบิลคู่ค้าที่มีอยู่แล้ว เพื่อติดตามยอดและสถานะจ่าย
          </LargeDialogDescription>
        </LargeDialogHeader>

        <LargeDialogBody className="px-5 py-5 md:px-6">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-4 min-[920px]:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-4 rounded-[8px] border bg-[#FCFCFC] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-card-foreground">ข้อมูลคู่ค้า</h3>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      เลือกคู่ค้าเดิมหรือเพิ่มคู่ค้าใหม่
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-9 font-bold shadow-none",
                        supplierMode === "existing" &&
                          "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      )}
                      onClick={() => setSupplierMode("existing")}
                    >
                      <Building2 className="h-4 w-4" />
                      คู่ค้าเดิม
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-9 font-bold shadow-none",
                        supplierMode === "new" &&
                          "border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                      )}
                      onClick={() => setSupplierMode("new")}
                    >
                      <UserPlus className="h-4 w-4" />
                      เพิ่มใหม่
                    </Button>
                  </div>
                </div>

                {supplierMode === "existing" ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <span className="block text-sm font-bold text-card-foreground">
                        คู่ค้า
                      </span>
                      <Select
                        value={selectedSupplierCode}
                        onValueChange={setSelectedSupplierCode}
                        disabled={catalogLoading}
                      >
                        <SelectTrigger className="h-11 w-full rounded-[8px] font-bold">
                          <SelectValue placeholder="เลือกคู่ค้า" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem
                              key={supplier.code}
                              value={supplier.code}
                            >
                              {supplier.code} · {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedSupplier ? (
                      <div className="grid gap-3 rounded-[8px] border bg-white p-3 text-sm font-semibold min-[560px]:grid-cols-2">
                        <div>
                          <span className="text-muted-foreground">รหัส</span>
                          <p className="mt-1 font-bold text-card-foreground">
                            {selectedSupplier.code}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ประเภท</span>
                          <p className="mt-1 font-bold text-card-foreground">
                            {selectedSupplier.type || "-"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">โทร</span>
                          <p className="mt-1 font-bold text-card-foreground">
                            {selectedSupplier.phone || "-"}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">เลขภาษี</span>
                          <p className="mt-1 font-bold text-card-foreground">
                            {selectedSupplier.taxId || "-"}
                          </p>
                        </div>
                        <div className="min-[560px]:col-span-2">
                          <span className="text-muted-foreground">ที่อยู่</span>
                          <p className="mt-1 font-bold text-card-foreground">
                            {selectedSupplier.address || "-"}
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid gap-3 min-[560px]:grid-cols-2">
                    <div className="space-y-2 min-[560px]:col-span-2">
                      <label
                        htmlFor="new-supplier-name"
                        className="block text-sm font-bold text-card-foreground"
                      >
                        ชื่อคู่ค้า
                      </label>
                      <Input
                        id="new-supplier-name"
                        value={newSupplier.name}
                        onChange={(event) =>
                          setNewSupplier((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        className="h-11 rounded-[8px] font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="block text-sm font-bold text-card-foreground">
                        ประเภทคู่ค้า
                      </span>
                      <Select
                        value={newSupplier.type}
                        onValueChange={(value) =>
                          setNewSupplier((current) => ({
                            ...current,
                            type: value,
                          }))
                        }
                      >
                        <SelectTrigger className="h-11 w-full rounded-[8px] font-bold">
                          <SelectValue placeholder="เลือกประเภท" />
                        </SelectTrigger>
                        <SelectContent>
                          {creditorTypes.map((type) => (
                            <SelectItem key={type.id} value={type.name}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="new-supplier-phone"
                        className="block text-sm font-bold text-card-foreground"
                      >
                        โทร
                      </label>
                      <Input
                        id="new-supplier-phone"
                        value={newSupplier.phone}
                        onChange={(event) =>
                          setNewSupplier((current) => ({
                            ...current,
                            phone: event.target.value,
                          }))
                        }
                        className="h-11 rounded-[8px] font-semibold"
                      />
                    </div>

                    <div className="space-y-2 min-[560px]:col-span-2">
                      <label
                        htmlFor="new-supplier-address"
                        className="block text-sm font-bold text-card-foreground"
                      >
                        ที่อยู่
                      </label>
                      <Input
                        id="new-supplier-address"
                        value={newSupplier.address}
                        onChange={(event) =>
                          setNewSupplier((current) => ({
                            ...current,
                            address: event.target.value,
                          }))
                        }
                        className="h-11 rounded-[8px] font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="new-supplier-tax"
                        className="block text-sm font-bold text-card-foreground"
                      >
                        เลขภาษี
                      </label>
                      <Input
                        id="new-supplier-tax"
                        value={newSupplier.taxId}
                        onChange={(event) =>
                          setNewSupplier((current) => ({
                            ...current,
                            taxId: event.target.value,
                          }))
                        }
                        className="h-11 rounded-[8px] font-semibold"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="new-supplier-detail"
                        className="block text-sm font-bold text-card-foreground"
                      >
                        รายละเอียด
                      </label>
                      <Input
                        id="new-supplier-detail"
                        value={newSupplier.detail}
                        onChange={(event) =>
                          setNewSupplier((current) => ({
                            ...current,
                            detail: event.target.value,
                          }))
                        }
                        className="h-11 rounded-[8px] font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 rounded-[8px] border bg-[#FCFCFC] p-4">
                <div>
                  <h3 className="font-bold text-card-foreground">ข้อมูลบิล</h3>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    เลขเอกสารจะรันอัตโนมัติเมื่อบันทึก
                  </p>
                </div>

                <div className="grid gap-3 min-[560px]:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="supplier-bill-date"
                      className="block text-sm font-bold text-card-foreground"
                    >
                      วันที่บิล
                    </label>
                    <Input
                      id="supplier-bill-date"
                      type="date"
                      value={billDate}
                      onChange={(event) => setBillDate(event.target.value)}
                      className="h-11 rounded-[8px] font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-sm font-bold text-card-foreground">
                      สถานะ
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {supplierStatusOptions.map((option) => {
                        const isSelected = status === option;

                        return (
                          <Button
                            key={option}
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-11 font-bold shadow-none",
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
                      htmlFor="supplier-bill-user"
                      className="block text-sm font-bold text-card-foreground"
                    >
                      ผู้บันทึก
                    </label>
                    <Input
                      id="supplier-bill-user"
                      value={createdBy}
                      onChange={(event) => setCreatedBy(event.target.value)}
                      className="h-11 rounded-[8px] font-semibold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="supplier-bill-special-discount"
                      className="block text-sm font-bold text-card-foreground"
                    >
                      ส่วนลดพิเศษ
                    </label>
                    <Input
                      id="supplier-bill-special-discount"
                      inputMode="decimal"
                      value={specialDiscount}
                      onChange={(event) =>
                        setSpecialDiscount(event.target.value)
                      }
                      className="h-11 rounded-[8px] font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="rounded-[8px] border bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-muted-foreground">
                      ยอดรวมสุทธิ
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(totals.totalPrice)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm font-semibold">
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">ยอดรวมสินค้า</span>
                      <span>{formatCurrency(totals.subTotal)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">ส่วนลดสินค้า</span>
                      <span>{formatCurrency(totals.productDiscount)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">ส่วนลดพิเศษ</span>
                      <span>{formatCurrency(totals.specialDiscount)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[8px] border bg-card p-4">
              <div className="mb-4 flex flex-col justify-between gap-3 min-[680px]:flex-row min-[680px]:items-center">
                <div>
                  <h3 className="font-bold text-card-foreground">รายการสินค้า</h3>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    กรอกจากบิลคู่ค้า หรือเลือกสินค้าเดิมเพื่อช่วยเติมข้อมูล
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 font-bold"
                  onClick={() =>
                    setItems((current) => [...current, createEmptyLine()])
                  }
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มรายการ
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-[8px] border bg-white p-3"
                  >
                    <div className="grid gap-3 min-[760px]:grid-cols-[minmax(190px,0.8fr)_minmax(0,1.2fr)]">
                      <div className="min-w-0 space-y-2">
                        <span className="block text-xs font-bold text-muted-foreground">
                          สินค้าเดิม
                        </span>
                        <AsyncSearchableSelect<SupplierCatalogProduct>
                          selectedLabel={item.barcode || item.name}
                          placeholder="ค้นหาเดิม"
                          searchPlaceholder="ค้นหาสินค้าหรือบาร์โค้ด..."
                          emptyMessage="ไม่พบสินค้าเดิม"
                          fetchOptions={fetchSupplierProductOptions}
                          getOptionKey={(product) => product.barcode}
                          getOptionLabel={(product) => product.name}
                          getOptionDescription={(product) =>
                            [product.barcode, product.unit]
                              .filter(Boolean)
                              .join(" · ")
                          }
                          isOptionSelected={(product) =>
                            !!item.barcode && product.barcode === item.barcode
                          }
                          onSelect={(product) =>
                            applyProductToLine(item, product)
                          }
                        />
                      </div>

                      <div className="min-w-0 space-y-2">
                        <label
                          htmlFor={`supplier-item-name-${item.id}`}
                          className="block text-xs font-bold text-muted-foreground"
                        >
                          รายการสินค้า
                        </label>
                        <Input
                          id={`supplier-item-name-${item.id}`}
                          value={item.name}
                          onChange={(event) =>
                            updateLine(item.id, { name: event.target.value })
                          }
                          className="h-11 rounded-[8px] font-semibold"
                          placeholder={`รายการที่ ${index + 1}`}
                        />
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 min-[760px]:grid-cols-[90px_120px_minmax(120px,1fr)_minmax(120px,1fr)_minmax(140px,1fr)_44px] min-[760px]:items-end">
                      <div className="space-y-2">
                        <label
                          htmlFor={`supplier-item-quantity-${item.id}`}
                          className="block text-xs font-bold text-muted-foreground"
                        >
                          จำนวน
                        </label>
                        <Input
                          id={`supplier-item-quantity-${item.id}`}
                          inputMode="decimal"
                          value={item.quantity}
                          onChange={(event) =>
                            updateLine(item.id, {
                              quantity: event.target.value,
                            })
                          }
                          className="h-11 rounded-[8px] font-semibold"
                        />
                      </div>

                      <div className="space-y-2">
                        <span className="block text-xs font-bold text-muted-foreground">
                          หน่วย
                        </span>
                        <Select
                          value={item.unit}
                          onValueChange={(value) =>
                            updateLine(item.id, { unit: value })
                          }
                        >
                          <SelectTrigger className="h-11 w-full rounded-[8px] font-bold">
                            <SelectValue placeholder="หน่วย" />
                          </SelectTrigger>
                          <SelectContent>
                            {units.map((unit) => (
                              <SelectItem key={unit.id} value={unit.name}>
                                {unit.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`supplier-item-price-${item.id}`}
                          className="block text-xs font-bold text-muted-foreground"
                        >
                          ราคาต่อหน่วย
                        </label>
                        <Input
                          id={`supplier-item-price-${item.id}`}
                          inputMode="decimal"
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateLine(item.id, {
                              unitPrice: event.target.value,
                            })
                          }
                          className="h-11 rounded-[8px] font-semibold"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`supplier-item-discount-${item.id}`}
                          className="block text-xs font-bold text-muted-foreground"
                        >
                          ส่วนลด
                        </label>
                        <Input
                          id={`supplier-item-discount-${item.id}`}
                          inputMode="decimal"
                          value={item.discount}
                          onChange={(event) =>
                            updateLine(item.id, {
                              discount: event.target.value,
                            })
                          }
                          className="h-11 rounded-[8px] font-semibold"
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <span className="block text-xs font-bold text-muted-foreground">
                          จำนวนเงิน
                        </span>
                        <Input
                          value={formatCurrency(getDraftLineTotal(item))}
                          readOnly
                          tabIndex={-1}
                          className="h-11 rounded-[8px] bg-muted/30 text-right font-bold text-primary shadow-none"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-11 w-full rounded-[8px] text-main-red min-[760px]:w-11"
                        disabled={items.length === 1}
                        onClick={() => removeLine(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">ลบรายการ</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
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
                onClick={() => onOpenChange(false)}
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
                บันทึกบิลคู่ค้า
              </Button>
            </div>
          </form>
        </LargeDialogBody>
      </LargeDialogContent>
    </LargeDialog>
  );
}

export default function SupplierBillsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBill, setSelectedBill] = useState<SupplierBill | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
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

            <Button
              type="button"
              className="h-11 w-full gap-2 rounded-[8px] font-bold min-[520px]:w-fit"
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <FilePlus2 className="h-4 w-4" />
              เพิ่มบิลคู่ค้า
            </Button>
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
      <SupplierBillCreateDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreated={async () => {
          await mutate();
        }}
      />
    </div>
  );
}
