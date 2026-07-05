"use client";

/**
 * Supplier Bills Page - รายการบิลคู่ค้า / ซื้อเข้า
 */

import {
  AlertCircle,
  Barcode,
  Building2,
  Camera,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Clock3,
  FilePlus2,
  Loader2,
  Package,
  Percent,
  Plus,
  ReceiptText,
  Save,
  Search,
  Trash2,
  Truck,
  UserPlus,
  X,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { BarcodeCameraDialog } from "@/components/stock/barcode-camera-dialog";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  ApiResponse,
  ProductBarcodeLinkResult,
  StockCatalogOption,
  StockProductCatalogPayload,
  StockProductCreateResult,
  SupplierBill,
  SupplierBillLineItem,
  SupplierBillPaymentState,
  SupplierBillsCatalogPayload,
  SupplierBillsPayload,
  SupplierBillVatMode,
  SupplierCatalogOption,
  SupplierCatalogProduct,
  SupplierCatalogSupplier,
} from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const supplierStatusOptions = ["ชำระเงินแล้ว", "ค้างชำระ"] as const;
const supplierBillVatOptions = [
  { value: "none", label: "ไม่มี VAT" },
  { value: "included", label: "รวม VAT 7%" },
  { value: "excluded", label: "บวก VAT 7%" },
] as const satisfies readonly {
  value: SupplierBillVatMode;
  label: string;
}[];
const defaultSupplierBillVatMode: SupplierBillVatMode = "none";
const defaultSupplierBillVatRate = 7;

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
    vatBillCount: 0,
    vatBaseAmount: 0,
    vatAmount: 0,
  },
};

function formatCurrency(value: number, fractionDigits = 0) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
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
    getVatModeLabel(bill.vatMode),
    bill.createdBy,
    bill.note,
  ].some((value) =>
    String(value || "")
      .toLowerCase()
      .includes(normalizedSearch),
  );
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

function getVatModeLabel(mode: SupplierBillVatMode) {
  return (
    supplierBillVatOptions.find((option) => option.value === mode)?.label ??
    "ไม่มี VAT"
  );
}

function getVatModeClassName(mode: SupplierBillVatMode, isSelected: boolean) {
  if (mode === "none") {
    return isSelected
      ? "border-slate-200 bg-slate-100 text-slate-700 ring-1 ring-slate-400/20 hover:bg-slate-100 hover:!text-slate-700"
      : "border-border bg-background text-muted-foreground hover:border-slate-300 hover:bg-slate-50 hover:!text-slate-700";
  }

  if (mode === "included") {
    return isSelected
      ? "border-blue-100 bg-blue-50 text-main-blue ring-1 ring-main-blue/20 hover:bg-blue-50 hover:!text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10"
      : "border-border bg-background text-muted-foreground hover:border-main-blue/30 hover:bg-blue-50 hover:!text-main-blue";
  }

  return isSelected
    ? "border-orange-100 bg-orange-50 text-main-orange ring-1 ring-main-orange/20 hover:bg-orange-50 hover:!text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10"
    : "border-border bg-background text-muted-foreground hover:border-main-orange/30 hover:bg-orange-50 hover:!text-main-orange";
}

function calculateSupplierBillVat(
  vatInputAmount: number,
  vatMode: SupplierBillVatMode,
  vatRate = defaultSupplierBillVatRate,
) {
  const safeInputAmount = Number(Math.max(vatInputAmount, 0).toFixed(2));

  if (vatMode === "none") {
    return {
      vatBaseAmount: safeInputAmount,
      vatAmount: 0,
      totalPrice: safeInputAmount,
    };
  }

  if (vatMode === "included") {
    const vatBaseAmount = Number(
      (safeInputAmount / (1 + vatRate / 100)).toFixed(2),
    );
    const vatAmount = Number((safeInputAmount - vatBaseAmount).toFixed(2));

    return {
      vatBaseAmount,
      vatAmount,
      totalPrice: safeInputAmount,
    };
  }

  const vatAmount = Number((safeInputAmount * (vatRate / 100)).toFixed(2));

  return {
    vatBaseAmount: safeInputAmount,
    vatAmount,
    totalPrice: Number((safeInputAmount + vatAmount).toFixed(2)),
  };
}

function getVatInputLabel(vatMode: SupplierBillVatMode) {
  if (vatMode === "excluded") {
    return "ยอดก่อน VAT";
  }

  return "ยอดเงิน";
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
  rowNo: string;
  orderNo: string;
  productCode: string;
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

interface SupplierProductDraft {
  categoryId: string;
  barcode: string;
  name: string;
  unit: string;
  packageQuantity: string;
  packageUnit: string;
  costPrice: string;
  retailPrice: string;
}

interface EmployeeUserOption {
  nameUser: string;
}

interface SupplierBillSupplierSummary {
  key: string;
  supplierCode: string;
  supplierName: string;
  billCount: number;
  itemCount: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  unknownAmount: number;
}

type SupplierScanFeedback = {
  type: "success" | "warning" | "error";
  message: string;
};

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
    rowNo: "",
    orderNo: "",
    productCode: "",
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

function createEmptyProductDraft(): SupplierProductDraft {
  return {
    categoryId: "25",
    barcode: "",
    name: "",
    unit: "",
    packageQuantity: "1",
    packageUnit: "",
    costPrice: "",
    retailPrice: "",
  };
}

function getMoneyInputValue(value: number) {
  return value > 0 ? String(value) : "";
}

function parsePositiveNumberInput(value: string) {
  const parsed = parseMoneyInput(value);

  return parsed !== null && parsed > 0 ? parsed : null;
}

function normalizeBarcodeValue(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function getResponseErrorMessage<T>(response: ApiResponse<T>) {
  return response.success ? "" : response.error;
}

function buildSupplierBillSupplierSummaries(items: SupplierBill[]) {
  const summaryMap = new Map<string, SupplierBillSupplierSummary>();

  for (const bill of items) {
    const key = bill.supplierCode || bill.supplierName || "ไม่ระบุคู่ค้า";
    const current = summaryMap.get(key) ?? {
      key,
      supplierCode: bill.supplierCode,
      supplierName: bill.supplierName || "ไม่ระบุคู่ค้า",
      billCount: 0,
      itemCount: 0,
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      unknownAmount: 0,
    };

    current.supplierCode ||= bill.supplierCode;
    current.supplierName =
      current.supplierName === "ไม่ระบุคู่ค้า" && bill.supplierName
        ? bill.supplierName
        : current.supplierName;
    current.billCount += 1;
    current.itemCount += bill.itemCount;
    current.totalAmount = Number(
      (current.totalAmount + bill.totalPrice).toFixed(2),
    );

    if (bill.paymentState === "paid") {
      current.paidAmount = Number(
        (current.paidAmount + bill.totalPrice).toFixed(2),
      );
    } else if (bill.paymentState === "unpaid") {
      current.unpaidAmount = Number(
        (current.unpaidAmount + bill.totalPrice).toFixed(2),
      );
    } else {
      current.unknownAmount = Number(
        (current.unknownAmount + bill.totalPrice).toFixed(2),
      );
    }

    summaryMap.set(key, current);
  }

  return Array.from(summaryMap.values()).sort((left, right) => {
    if (right.totalAmount !== left.totalAmount) {
      return right.totalAmount - left.totalAmount;
    }

    return right.billCount - left.billCount;
  });
}

function getScanFeedbackClassName(type: SupplierScanFeedback["type"]) {
  if (type === "success") {
    return "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10";
  }

  if (type === "warning") {
    return "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10";
  }

  return "border-red-100 bg-red-50 text-main-red dark:border-red-500/20 dark:bg-red-500/10";
}

function getLineProductUpdates(
  line: SupplierBillDraftLine,
  product: SupplierCatalogProduct,
) {
  return {
    productCode: product.productCode || line.productCode,
    barcode: product.barcode,
    name: product.name,
    unit: product.unit || line.unit,
    unitPrice: getMoneyInputValue(product.unitPrice),
    cost: getMoneyInputValue(product.cost),
    caseProduct: product.caseProduct || 25,
  };
}

function applyProductToDraftLine(
  line: SupplierBillDraftLine,
  product: SupplierCatalogProduct,
) {
  return {
    ...line,
    ...getLineProductUpdates(line, product),
  };
}

function createLineFromProduct(product: SupplierCatalogProduct) {
  return applyProductToDraftLine(createEmptyLine(), product);
}

function createEditableLineFromBillItem(
  item: SupplierBillLineItem,
  index: number,
): SupplierBillDraftLine {
  return {
    id: item.id || `supplier-edit-line-${index}`,
    rowNo: item.rowNo ?? "",
    orderNo: item.orderNo ?? "",
    productCode: "",
    barcode: item.barcode,
    name: item.name,
    quantity: getMoneyInputValue(item.quantity) || "1",
    unit: item.unit,
    unitPrice: getMoneyInputValue(item.unitPrice),
    discount: getMoneyInputValue(item.discount),
    cost: "",
    caseProduct: 25,
  };
}

function getIncrementedQuantityInput(value: string) {
  const nextQuantity = Number(
    ((parsePositiveNumberInput(value) ?? 0) + 1).toFixed(2),
  );

  return Number.isInteger(nextQuantity)
    ? String(nextQuantity)
    : String(nextQuantity);
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

async function fetchEmployeeUserOptions(search: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/employees/users?search=${encodeURIComponent(search)}&limit=12`,
    { signal },
  );
  const data = (await response.json()) as {
    success: boolean;
    data?: EmployeeUserOption[];
  };

  return data.success && data.data ? data.data : [];
}

async function fetchSupplierProductByBarcode(barcode: string) {
  const normalizedBarcode = normalizeBarcodeValue(barcode);
  const params = new URLSearchParams({ q: normalizedBarcode });
  const response = await fetch(`/api/supplier-bills/catalog?${params}`);
  const result =
    (await response.json()) as ApiResponse<SupplierBillsCatalogPayload>;

  if (!response.ok || !result.success) {
    throw new Error(getResponseErrorMessage(result) || "ค้นหาสินค้าไม่สำเร็จ");
  }

  const catalogProduct =
    result.data.products.find(
      (product) =>
        normalizeBarcodeValue(product.barcode).toLowerCase() ===
        normalizedBarcode.toLowerCase(),
    ) ?? null;

  if (catalogProduct) {
    return catalogProduct;
  }

  const lookupParams = new URLSearchParams({ barcode: normalizedBarcode });
  const lookupResponse = await fetch(`/api/products/lookup?${lookupParams}`);
  const lookupResult = (await lookupResponse.json()) as ApiResponse<{
    barcode: string;
    productCode: string;
    name: string;
    unit: string;
    costPrice: number;
    retailPrice: number;
  }>;

  if (!lookupResponse.ok || !lookupResult.success) {
    return null;
  }

  return {
    productCode: lookupResult.data.productCode,
    barcode: lookupResult.data.barcode,
    name: lookupResult.data.name,
    unit: lookupResult.data.unit,
    unitPrice: lookupResult.data.costPrice,
    cost: lookupResult.data.costPrice,
    caseProduct: 25,
  } satisfies SupplierCatalogProduct;
}

function filterStockCatalogOptions(
  options: StockCatalogOption[],
  search: string,
  signal: AbortSignal,
) {
  if (signal.aborted) {
    return [];
  }

  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return options;
  }

  return options.filter((option) =>
    option.name.toLowerCase().includes(normalizedSearch),
  );
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
  const [vatMode, setVatMode] = useState<SupplierBillVatMode>(
    defaultSupplierBillVatMode,
  );
  const [note, setNote] = useState("");
  const [lineItems, setLineItems] = useState<SupplierBillDraftLine[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bill || !open) {
      return;
    }

    setStatus(normalizeDialogStatus(bill.status || bill.paymentLabel || ""));
    setAmount(String(getEditableBillAmount(bill)));
    setVatMode(bill.vatMode || defaultSupplierBillVatMode);
    setNote(bill.note || "");
    setLineItems(bill.lineItems.map(createEditableLineFromBillItem));
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [bill, open]);

  const resetDialog = () => {
    setStatus("");
    setAmount("");
    setVatMode(defaultSupplierBillVatMode);
    setNote("");
    setLineItems([]);
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

  const updateLineItem = (
    id: string,
    updates: Partial<SupplierBillDraftLine>,
  ) => {
    setLineItems((currentItems) =>
      currentItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    );
  };

  const removeLineItem = (id: string) => {
    setLineItems((currentItems) =>
      currentItems.filter((item) => item.id !== id),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!bill) {
      return;
    }

    const lineItemsTotal = Number(
      lineItems
        .reduce((sum, item) => sum + getDraftLineTotal(item), 0)
        .toFixed(2),
    );
    const calculatedAmount =
      lineItems.length > 0
        ? Number(Math.max(lineItemsTotal - bill.discount, 0).toFixed(2))
        : null;
    const vatInputAmount = calculatedAmount ?? parseMoneyInput(amount);
    const vatTotals =
      vatInputAmount === null
        ? null
        : calculateSupplierBillVat(vatInputAmount, vatMode);
    const updateItems = [];

    if (!isSupplierStatusOption(status)) {
      setErrorMessage("กรุณาเลือกสถานะชำระเงินแล้วหรือค้างชำระ");
      return;
    }

    if (vatTotals === null || vatInputAmount === null) {
      setErrorMessage("กรุณาระบุยอดเงินให้ถูกต้อง");
      return;
    }

    if (bill.lineItems.length > 0 && lineItems.length === 0) {
      setErrorMessage("บิลคู่ค้าต้องมีรายการสินค้าอย่างน้อย 1 รายการ");
      return;
    }

    for (const item of lineItems) {
      const quantity = parsePositiveNumberInput(item.quantity);
      const unitPrice = parseMoneyInput(item.unitPrice);
      const discount = parseMoneyInput(item.discount) ?? 0;

      if (!item.name.trim()) {
        setErrorMessage("กรุณาระบุชื่อสินค้าให้ครบทุกบรรทัด");
        return;
      }

      if (!item.rowNo && !item.orderNo) {
        setErrorMessage("ข้อมูลแถวรายการสินค้าไม่ครบ กรุณาโหลดหน้านี้ใหม่");
        return;
      }

      if (quantity === null || unitPrice === null || discount < 0) {
        setErrorMessage("กรุณาระบุจำนวน ราคา และส่วนลดให้ถูกต้อง");
        return;
      }

      if (discount > quantity * unitPrice) {
        setErrorMessage("ส่วนลดรายการสินค้าต้องไม่เกินยอดของรายการ");
        return;
      }

      updateItems.push({
        rowNo: item.rowNo,
        orderNo: item.orderNo,
        barcode: item.barcode,
        name: item.name,
        quantity,
        unit: item.unit,
        unitPrice,
        discount,
      });
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
          totalPrice: vatTotals.totalPrice,
          vatInputAmount,
          vatMode,
          vatRate: defaultSupplierBillVatRate,
          note,
          items: bill.lineItems.length > 0 ? updateItems : undefined,
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
  const lineItemsTotal = Number(
    lineItems
      .reduce((sum, item) => sum + getDraftLineTotal(item), 0)
      .toFixed(2),
  );
  const calculatedAmount =
    bill && lineItems.length > 0
      ? Number(Math.max(lineItemsTotal - bill.discount, 0).toFixed(2))
      : null;
  const amountInputValue =
    calculatedAmount !== null ? String(calculatedAmount) : amount;
  const editVatInputAmount = calculatedAmount ?? parseMoneyInput(amount) ?? 0;
  const editVatBreakdown = calculateSupplierBillVat(
    editVatInputAmount,
    vatMode,
  );
  const productDiscount = Number(
    lineItems
      .reduce((sum, item) => sum + (parseMoneyInput(item.discount) ?? 0), 0)
      .toFixed(2),
  );
  const discountTotal =
    lineItems.length > 0 && bill
      ? Number((bill.discount + productDiscount).toFixed(2))
      : bill
        ? bill.discount + bill.productDiscount
        : 0;

  return (
    <LargeDialog open={open} onOpenChange={handleOpenChange}>
      <LargeDialogContent size="2xl">
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
                      {bill.vatMode !== "none" ? (
                        <Badge
                          variant="outline"
                          className="h-7 rounded-full border-blue-100 bg-blue-50 px-3 text-xs font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
                        >
                          {getVatModeLabel(bill.vatMode)}
                        </Badge>
                      ) : null}
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
                    {getVatInputLabel(vatMode)}
                  </label>
                  <div className="relative">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-lg font-bold text-muted-foreground">
                      ฿
                    </span>
                    <Input
                      id="supplier-bill-amount"
                      inputMode="decimal"
                      value={amountInputValue}
                      onChange={(event) => {
                        if (calculatedAmount === null) {
                          setAmount(event.target.value);
                        }
                      }}
                      readOnly={calculatedAmount !== null}
                      className={cn(
                        "h-12 rounded-[8px] pr-3 pl-9 text-lg font-bold",
                        calculatedAmount !== null && "bg-muted/30 shadow-none",
                      )}
                      placeholder="0.00"
                    />
                  </div>
                  <span className="block text-xs font-semibold text-muted-foreground">
                    {calculatedAmount !== null
                      ? "คำนวณจากรายการสินค้า"
                      : `ยอดเดิม ${formatCurrency(currentAmount)}`}
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-[8px] border bg-muted/20 p-3">
                <div className="flex flex-col justify-between gap-2 min-[560px]:flex-row min-[560px]:items-center">
                  <span className="text-sm font-bold text-card-foreground">
                    ภาษีคู่ค้า
                  </span>
                  {vatMode !== "none" ? (
                    <Badge
                      variant="outline"
                      className="h-7 rounded-full border-blue-100 bg-blue-50 px-3 text-xs font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
                    >
                      VAT {defaultSupplierBillVatRate}%
                    </Badge>
                  ) : null}
                </div>
                <div className="grid gap-2 min-[620px]:grid-cols-3">
                  {supplierBillVatOptions.map((option) => {
                    const isSelected = vatMode === option.value;

                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-10 border font-bold shadow-none",
                          getVatModeClassName(option.value, isSelected),
                        )}
                        onClick={() => setVatMode(option.value)}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
                <div className="grid gap-2 text-sm font-semibold min-[620px]:grid-cols-3">
                  <div className="flex justify-between gap-3 rounded-[8px] border bg-white px-3 py-2 dark:bg-card min-[620px]:block">
                    <span className="text-muted-foreground">ก่อน VAT</span>
                    <p className="font-bold text-card-foreground min-[620px]:mt-1">
                      {formatCurrency(editVatBreakdown.vatBaseAmount, 2)}
                    </p>
                  </div>
                  <div className="flex justify-between gap-3 rounded-[8px] border bg-white px-3 py-2 dark:bg-card min-[620px]:block">
                    <span className="text-muted-foreground">VAT</span>
                    <p className="font-bold text-main-blue min-[620px]:mt-1">
                      {formatCurrency(editVatBreakdown.vatAmount, 2)}
                    </p>
                  </div>
                  <div className="flex justify-between gap-3 rounded-[8px] border bg-white px-3 py-2 dark:bg-card min-[620px]:block">
                    <span className="text-muted-foreground">สุทธิ</span>
                    <p className="font-bold text-primary min-[620px]:mt-1">
                      {formatCurrency(editVatBreakdown.totalPrice, 2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 rounded-[8px] border bg-muted/25 p-3 text-sm font-semibold min-[620px]:grid-cols-3">
                <div className="flex items-center justify-between gap-3 min-[620px]:block">
                  <span className="text-muted-foreground">รายการสินค้า</span>
                  <p className="font-bold text-card-foreground min-[620px]:mt-1">
                    {formatNumber(lineItems.length || bill.itemCount)} รายการ
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 min-[620px]:block">
                  <span className="text-muted-foreground">ส่วนลด</span>
                  <p className="font-bold text-card-foreground min-[620px]:mt-1">
                    {formatCurrency(discountTotal)}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 min-[620px]:block">
                  <span className="text-muted-foreground">ผู้บันทึก</span>
                  <p className="truncate font-bold text-card-foreground min-[620px]:mt-1">
                    {bill.createdBy || "-"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="supplier-edit-note"
                  className="block text-sm font-bold text-card-foreground"
                >
                  หมายเหตุ
                </label>
                <textarea
                  id="supplier-edit-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-24 w-full resize-y rounded-[8px] border bg-background px-3 py-2 text-sm font-semibold outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  placeholder="พิมพ์หมายเหตุของบิลนี้"
                />
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

                {lineItems.length > 0 ? (
                  <div className="space-y-3 bg-muted/20 p-3">
                    {lineItems.map((item, index) => {
                      const itemTotal = getDraftLineTotal(item);

                      return (
                        <div
                          key={item.id || `${bill.id}-${index}`}
                          className="overflow-hidden rounded-[8px] border bg-background shadow-sm"
                        >
                          <div className="flex flex-col gap-2 border-b bg-[#FCFCFC] px-4 py-3 dark:bg-muted/20 min-[680px]:flex-row min-[680px]:items-center min-[680px]:justify-between">
                            <div className="flex min-w-0 items-center gap-2">
                              <Badge
                                variant="outline"
                                className="h-7 rounded-full bg-white px-2.5 text-xs font-bold shadow-none dark:bg-card"
                              >
                                รายการที่ {index + 1}
                              </Badge>
                              <span className="truncate text-sm font-bold text-card-foreground">
                                {item.name || "ไม่ระบุสินค้า"}
                              </span>
                            </div>
                            <div className="flex flex-col gap-2 min-[680px]:flex-row min-[680px]:items-center">
                              <div className="flex items-center justify-between gap-3 rounded-[8px] border bg-white px-3 py-2 text-sm font-bold dark:bg-card min-[680px]:min-w-[170px]">
                                <span className="text-xs text-muted-foreground">
                                  ยอดรายการ
                                </span>
                                <span
                                  className={cn(
                                    outfit.className,
                                    "text-primary",
                                  )}
                                >
                                  {formatCurrency(itemTotal)}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 border-red-100 px-3 font-bold text-main-red shadow-none hover:border-main-red/30 hover:bg-red-50 hover:!text-main-red disabled:text-muted-foreground"
                                disabled={lineItems.length <= 1 || isSaving}
                                onClick={() => removeLineItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                ลบ
                              </Button>
                            </div>
                          </div>

                          <div className="grid gap-4 p-4">
                            <div className="grid gap-3 min-[760px]:grid-cols-[minmax(0,1.3fr)_minmax(150px,0.7fr)]">
                              <div className="space-y-1.5">
                                <label
                                  htmlFor={`supplier-edit-name-${item.id}`}
                                  className="block text-xs font-bold text-muted-foreground"
                                >
                                  รายการสินค้า
                                </label>
                                <Input
                                  id={`supplier-edit-name-${item.id}`}
                                  value={item.name}
                                  onChange={(event) =>
                                    updateLineItem(item.id, {
                                      name: event.target.value,
                                    })
                                  }
                                  className="h-10 rounded-[8px] font-semibold"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label
                                  htmlFor={`supplier-edit-barcode-${item.id}`}
                                  className="block text-xs font-bold text-muted-foreground"
                                >
                                  บาร์โค้ด
                                </label>
                                <Input
                                  id={`supplier-edit-barcode-${item.id}`}
                                  value={item.barcode}
                                  onChange={(event) =>
                                    updateLineItem(item.id, {
                                      barcode: event.target.value,
                                    })
                                  }
                                  className="h-10 rounded-[8px] font-semibold"
                                  placeholder="-"
                                />
                              </div>
                            </div>

                            <div className="grid gap-3 min-[760px]:grid-cols-[minmax(80px,0.7fr)_minmax(100px,0.7fr)_minmax(120px,1fr)_minmax(120px,1fr)_minmax(130px,1fr)]">
                              <div className="space-y-1.5">
                                <label
                                  htmlFor={`supplier-edit-quantity-${item.id}`}
                                  className="block text-xs font-bold text-muted-foreground"
                                >
                                  จำนวน
                                </label>
                                <Input
                                  id={`supplier-edit-quantity-${item.id}`}
                                  inputMode="decimal"
                                  value={item.quantity}
                                  onChange={(event) =>
                                    updateLineItem(item.id, {
                                      quantity: event.target.value,
                                    })
                                  }
                                  className="h-10 rounded-[8px] text-right font-semibold"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label
                                  htmlFor={`supplier-edit-unit-${item.id}`}
                                  className="block text-xs font-bold text-muted-foreground"
                                >
                                  หน่วย
                                </label>
                                <Input
                                  id={`supplier-edit-unit-${item.id}`}
                                  value={item.unit}
                                  onChange={(event) =>
                                    updateLineItem(item.id, {
                                      unit: event.target.value,
                                    })
                                  }
                                  className="h-10 rounded-[8px] font-semibold"
                                  placeholder="-"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label
                                  htmlFor={`supplier-edit-unit-price-${item.id}`}
                                  className="block text-xs font-bold text-muted-foreground"
                                >
                                  ราคา/หน่วย
                                </label>
                                <Input
                                  id={`supplier-edit-unit-price-${item.id}`}
                                  inputMode="decimal"
                                  value={item.unitPrice}
                                  onChange={(event) =>
                                    updateLineItem(item.id, {
                                      unitPrice: event.target.value,
                                    })
                                  }
                                  className="h-10 rounded-[8px] text-right font-semibold"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label
                                  htmlFor={`supplier-edit-discount-${item.id}`}
                                  className="block text-xs font-bold text-muted-foreground"
                                >
                                  ส่วนลด
                                </label>
                                <Input
                                  id={`supplier-edit-discount-${item.id}`}
                                  inputMode="decimal"
                                  value={item.discount}
                                  onChange={(event) =>
                                    updateLineItem(item.id, {
                                      discount: event.target.value,
                                    })
                                  }
                                  className="h-10 rounded-[8px] text-right font-semibold"
                                  placeholder="0.00"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <span className="block text-xs font-bold text-muted-foreground">
                                  รวม
                                </span>
                                <Input
                                  value={formatCurrency(itemTotal)}
                                  readOnly
                                  tabIndex={-1}
                                  className={cn(
                                    outfit.className,
                                    "h-10 rounded-[8px] bg-muted/30 text-right font-bold text-primary shadow-none",
                                  )}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
  const [createdBy, setCreatedBy] = useState("");
  const [specialDiscount, setSpecialDiscount] = useState("");
  const [vatMode, setVatMode] = useState<SupplierBillVatMode>(
    defaultSupplierBillVatMode,
  );
  const [note, setNote] = useState("");
  const [items, setItems] = useState<SupplierBillDraftLine[]>([
    createEmptyLine(),
  ]);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [barcodeReplacementLineId, setBarcodeReplacementLineId] = useState<
    string | null
  >(null);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);
  const [newProductBarcode, setNewProductBarcode] = useState<string | null>(
    null,
  );
  const [productDraft, setProductDraft] = useState<SupplierProductDraft>(
    createEmptyProductDraft,
  );
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [createProductError, setCreateProductError] = useState<string | null>(
    null,
  );
  const [scanFeedback, setScanFeedback] = useState<SupplierScanFeedback | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    data: catalogData,
    isLoading: catalogLoading,
    mutate: mutateCatalog,
  } = useSWR<ApiResponse<SupplierBillsCatalogPayload>>(
    open ? "/api/supplier-bills/catalog" : null,
    fetcher,
  );
  const selectedProductCategoryId =
    Number.parseInt(productDraft.categoryId || "25", 10) || 25;
  const isNewProductEditorOpen = Boolean(newProductBarcode);
  const {
    data: productCatalogData,
    isLoading: productCatalogLoading,
    mutate: mutateProductCatalog,
  } = useSWR<ApiResponse<StockProductCatalogPayload>>(
    open && isNewProductEditorOpen
      ? `/api/stock?type=catalog&categoryId=${selectedProductCategoryId}`
      : null,
    fetcher,
  );
  const catalog =
    catalogData?.success && catalogData.data ? catalogData.data : null;
  const productCatalog =
    productCatalogData?.success && productCatalogData.data
      ? productCatalogData.data
      : null;
  const suppliers = catalog?.suppliers ?? [];
  const selectedSupplier = suppliers.find(
    (supplier) => supplier.code === selectedSupplierCode,
  );
  const selectedSupplierLabel = selectedSupplier
    ? `${selectedSupplier.code} · ${selectedSupplier.name}`
    : "";
  const creditorTypes = catalog?.creditorTypes ?? [];
  const units = uniqueCatalogOptionsByName(catalog?.units ?? []);
  const selectedProductCategory = productCatalog?.categories.find(
    (category) => String(category.id) === productDraft.categoryId,
  );
  const barcodeReplacementLine = barcodeReplacementLineId
    ? items.find((item) => item.id === barcodeReplacementLineId)
    : null;
  const totals = getDraftTotals(items, specialDiscount);
  const vatBreakdown = calculateSupplierBillVat(totals.totalPrice, vatMode);
  const fetchSupplierOptions = useCallback(
    async (search: string, signal: AbortSignal) => {
      if (signal.aborted) {
        return [];
      }

      const normalizedSearch = search.trim().toLowerCase();

      if (!normalizedSearch) {
        return suppliers;
      }

      return suppliers.filter((supplier) =>
        [
          supplier.code,
          supplier.name,
          supplier.phone,
          supplier.type,
          supplier.taxId,
        ].some((value) => value.toLowerCase().includes(normalizedSearch)),
      );
    },
    [suppliers],
  );
  const fetchSupplierUnitOptions = useCallback(
    async (search: string, signal: AbortSignal) => {
      if (signal.aborted) {
        return [];
      }

      const normalizedSearch = search.trim().toLowerCase();

      if (!normalizedSearch) {
        return units;
      }

      return units.filter((unit) =>
        unit.name.toLowerCase().includes(normalizedSearch),
      );
    },
    [units],
  );
  const fetchProductCategoryOptions = useCallback(
    async (search: string, signal: AbortSignal) =>
      filterStockCatalogOptions(
        productCatalog?.categories ?? [],
        search,
        signal,
      ),
    [productCatalog?.categories],
  );
  const fetchProductUnitOptions = useCallback(
    async (search: string, signal: AbortSignal) =>
      filterStockCatalogOptions(productCatalog?.units ?? [], search, signal),
    [productCatalog?.units],
  );

  useEffect(() => {
    if (!open) {
      setIsBarcodeScannerOpen(false);
      setBarcodeReplacementLineId(null);
      setIsLookingUpBarcode(false);
      return;
    }

    setSupplierMode("existing");
    setSelectedSupplierCode("");
    setNewSupplier(createEmptySupplier());
    setBillDate(getTodayInputDate());
    setStatus(defaultSupplierBillStatus);
    setCreatedBy("");
    setSpecialDiscount("");
    setVatMode(defaultSupplierBillVatMode);
    setNote("");
    setItems([createEmptyLine()]);
    setIsBarcodeScannerOpen(false);
    setBarcodeReplacementLineId(null);
    setIsLookingUpBarcode(false);
    setNewProductBarcode(null);
    setProductDraft(createEmptyProductDraft());
    setIsCreatingProduct(false);
    setCreateProductError(null);
    setScanFeedback(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(false);
  }, [open]);

  useEffect(() => {
    if (!open || !isNewProductEditorOpen || !productCatalog) {
      return;
    }

    setProductDraft((current) => {
      const categoryId =
        current.categoryId ||
        (productCatalog.categories[0]?.id
          ? String(productCatalog.categories[0].id)
          : "");
      const unit = current.unit || productCatalog.units[0]?.name || "";
      const packageUnit = current.packageUnit || unit;

      if (
        current.categoryId === categoryId &&
        current.unit === unit &&
        current.packageUnit === packageUnit
      ) {
        return current;
      }

      return {
        ...current,
        categoryId,
        unit,
        packageUnit,
      };
    });
  }, [isNewProductEditorOpen, open, productCatalog]);

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
    updateLine(line.id, getLineProductUpdates(line, product));
  };

  const updateProductDraft = (updates: Partial<SupplierProductDraft>) => {
    setProductDraft((current) => ({ ...current, ...updates }));
  };

  const handleBarcodeScannerOpenChange = (nextOpen: boolean) => {
    setIsBarcodeScannerOpen(nextOpen);

    if (!nextOpen) {
      setBarcodeReplacementLineId(null);
    }
  };

  const openAddProductScanner = () => {
    setBarcodeReplacementLineId(null);
    setIsBarcodeScannerOpen(true);
  };

  const openBarcodeReplacementScanner = (lineId: string) => {
    setNewProductBarcode(null);
    setCreateProductError(null);
    setScanFeedback(null);
    setBarcodeReplacementLineId(lineId);
    setIsBarcodeScannerOpen(true);
  };

  const applyScannedProductToItems = (product: SupplierCatalogProduct) => {
    const normalizedProductBarcode = normalizeBarcodeValue(
      product.barcode,
    ).toLowerCase();

    setItems((currentItems) => {
      const existingIndex = normalizedProductBarcode
        ? currentItems.findIndex(
            (item) =>
              normalizeBarcodeValue(item.barcode).toLowerCase() ===
              normalizedProductBarcode,
          )
        : -1;

      if (existingIndex >= 0) {
        return currentItems.map((item, index) =>
          index === existingIndex
            ? {
                ...item,
                quantity: getIncrementedQuantityInput(item.quantity),
              }
            : item,
        );
      }

      const emptyIndex = currentItems.findIndex(
        (item) => !item.name.trim() && !item.barcode.trim(),
      );

      if (emptyIndex >= 0) {
        return currentItems.map((item, index) =>
          index === emptyIndex ? applyProductToDraftLine(item, product) : item,
        );
      }

      return [...currentItems, createLineFromProduct(product)];
    });
  };

  const handleBarcodeReplacementDetected = async (barcode: string) => {
    const targetLine = barcodeReplacementLineId
      ? items.find((item) => item.id === barcodeReplacementLineId)
      : null;

    if (!targetLine) {
      setScanFeedback({
        type: "error",
        message: "ไม่พบรายการสินค้าที่ต้องการเปลี่ยนรหัส",
      });
      return;
    }

    if (!targetLine.productCode && !targetLine.barcode) {
      setScanFeedback({
        type: "warning",
        message: "เลือกสินค้าเดิมในแถวนี้ก่อน แล้วค่อยสแกนรหัสจริง",
      });
      return;
    }

    if (
      targetLine.barcode &&
      normalizeBarcodeValue(targetLine.barcode).toLowerCase() ===
        barcode.toLowerCase()
    ) {
      setScanFeedback({
        type: "warning",
        message: "รหัสที่สแกนตรงกับรหัสของรายการนี้อยู่แล้ว",
      });
      return;
    }

    try {
      setIsLookingUpBarcode(true);
      setCreateProductError(null);
      setScanFeedback(null);
      setNewProductBarcode(null);

      const response = await fetch("/api/products/barcodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productCode: targetLine.productCode,
          oldBarcode: targetLine.barcode,
          newBarcode: barcode,
          source: "supplier-bill",
        }),
      });
      const result =
        (await response.json()) as ApiResponse<ProductBarcodeLinkResult>;

      if (!response.ok || !result.success) {
        throw new Error(
          getResponseErrorMessage(result) || "เปลี่ยนบาร์โค้ดสินค้าไม่สำเร็จ",
        );
      }

      updateLine(targetLine.id, {
        productCode: result.data.productCode,
        barcode: result.data.newBarcode,
        name: targetLine.name || result.data.productName,
      });
      await mutateCatalog().catch(() => undefined);
      setScanFeedback({
        type: "success",
        message: `อัปเดตรหัสของ ${targetLine.name || result.data.productName} เป็น ${result.data.newBarcode} แล้ว รหัสเดิมยังสแกนย้อนหลังได้`,
      });
    } catch (error) {
      setScanFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "เปลี่ยนบาร์โค้ดสินค้าไม่สำเร็จ",
      });
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  const handleBarcodeDetected = async (rawBarcode: string) => {
    const barcode = normalizeBarcodeValue(rawBarcode);

    if (!barcode) {
      setScanFeedback({
        type: "error",
        message: "กรุณาระบุบาร์โค้ด",
      });
      return;
    }

    if (barcodeReplacementLineId) {
      await handleBarcodeReplacementDetected(barcode);
      return;
    }

    try {
      setIsLookingUpBarcode(true);
      setCreateProductError(null);
      setScanFeedback(null);
      setNewProductBarcode(null);

      const product = await fetchSupplierProductByBarcode(barcode);

      if (product) {
        applyScannedProductToItems(product);
        setScanFeedback({
          type: "success",
          message: `พบ ${product.name} แล้ว เติมเข้ารายการสินค้าเรียบร้อย`,
        });
        return;
      }

      setNewProductBarcode(barcode);
      setProductDraft((current) => ({
        ...createEmptyProductDraft(),
        categoryId: current.categoryId || "25",
        barcode,
        unit: current.unit,
        packageUnit: current.packageUnit || current.unit,
      }));
      setScanFeedback({
        type: "warning",
        message: `ยังไม่พบสินค้าเลข ${barcode} ในระบบเดิม เพิ่มข้อมูลสินค้าใหม่ก่อนใช้งาน`,
      });
    } catch (error) {
      setScanFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "ค้นหาสินค้าจากบาร์โค้ดไม่สำเร็จ",
      });
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  const handleCreateScannedProduct = async () => {
    try {
      setIsCreatingProduct(true);
      setCreateProductError(null);

      const response = await fetch("/api/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: Number.parseInt(productDraft.categoryId, 10),
          barcode: productDraft.barcode,
          name: productDraft.name,
          unit: productDraft.unit,
          packageQuantity: productDraft.packageQuantity,
          packageUnit: productDraft.packageUnit || productDraft.unit,
          costPrice: productDraft.costPrice,
          retailPrice: productDraft.retailPrice,
        }),
      });
      const result =
        (await response.json()) as ApiResponse<StockProductCreateResult>;

      if (!response.ok || !result.success) {
        throw new Error(getResponseErrorMessage(result) || "เพิ่มสินค้าไม่สำเร็จ");
      }

      const createdProduct = result.data;
      const productForBill: SupplierCatalogProduct = {
        productCode: createdProduct.productCode,
        barcode: createdProduct.barcode,
        name: createdProduct.name,
        unit: createdProduct.unit,
        unitPrice: createdProduct.costPrice,
        cost: createdProduct.costPrice,
        caseProduct: createdProduct.categoryId || 25,
      };

      applyScannedProductToItems(productForBill);
      await Promise.all([
        mutateCatalog().catch(() => undefined),
        mutateProductCatalog().catch(() => undefined),
      ]);

      setNewProductBarcode(null);
      setProductDraft((current) => ({
        ...createEmptyProductDraft(),
        categoryId: current.categoryId || "25",
        unit: current.unit,
        packageUnit: current.packageUnit || current.unit,
      }));
      setScanFeedback({
        type: "success",
        message: `เพิ่ม ${createdProduct.name} แล้ว เติมเข้ารายการสินค้าเรียบร้อย`,
      });
    } catch (error) {
      setCreateProductError(
        error instanceof Error ? error.message : "เพิ่มสินค้าไม่สำเร็จ",
      );
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const handleCancelNewProduct = () => {
    setNewProductBarcode(null);
    setCreateProductError(null);
    setProductDraft(createEmptyProductDraft());
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

    if (!createdBy.trim()) {
      return "กรุณาเลือกผู้บันทึกก่อนเพิ่มบิลคู่ค้า";
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
          createdBy: createdBy.trim(),
          specialDiscount: parseMoneyInput(specialDiscount) ?? 0,
          vatMode,
          vatRate: defaultSupplierBillVatRate,
          note,
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

        <LargeDialogBody className="px-5 py-4 md:px-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid items-start gap-4 min-[920px]:grid-cols-[1.05fr_0.95fr]">
              <div className="space-y-3 rounded-[8px] border bg-[#FCFCFC] p-4">
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
                      <AsyncSearchableSelect<SupplierCatalogSupplier>
                        selectedLabel={selectedSupplierLabel}
                        placeholder="เลือกคู่ค้า"
                        searchPlaceholder="ค้นหาคู่ค้า..."
                        emptyMessage="ไม่พบคู่ค้า"
                        disabled={catalogLoading}
                        fetchOptions={fetchSupplierOptions}
                        getOptionKey={(supplier) => supplier.code}
                        getOptionLabel={(supplier) =>
                          `${supplier.code} · ${supplier.name}`
                        }
                        getOptionDescription={(supplier) =>
                          [supplier.phone, supplier.type, supplier.taxId]
                            .filter(Boolean)
                            .join(" · ")
                        }
                        isOptionSelected={(supplier) =>
                          supplier.code === selectedSupplierCode
                        }
                        onSelect={(supplier) =>
                          setSelectedSupplierCode(supplier.code)
                        }
                        triggerClassName="h-11 rounded-[8px] py-0 font-bold"
                      />
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
                        <SelectTrigger className="h-11 w-full rounded-[8px] py-0 font-bold data-[size=default]:h-11">
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

                <div className="space-y-2">
                  <label
                    htmlFor="supplier-bill-note"
                    className="block text-sm font-bold text-card-foreground"
                  >
                    หมายเหตุ
                  </label>
                  <textarea
                    id="supplier-bill-note"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="min-h-16 w-full resize-y rounded-[8px] border bg-background px-3 py-2 text-sm font-semibold outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    placeholder="พิมพ์หมายเหตุเล็ก ๆ น้อย ๆ ของบิลนี้"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-[8px] border bg-[#FCFCFC] p-4">
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
                    <span className="block text-sm font-bold text-card-foreground">
                      ผู้บันทึก
                      <span className="text-main-red"> *</span>
                    </span>
                    <AsyncSearchableSelect<EmployeeUserOption>
                      selectedLabel={createdBy || undefined}
                      placeholder="เลือกผู้บันทึก"
                      searchPlaceholder="ค้นหาชื่อพนักงาน..."
                      emptyMessage="ไม่พบชื่อพนักงาน"
                      fetchOptions={fetchEmployeeUserOptions}
                      getOptionKey={(employee) => employee.nameUser}
                      getOptionLabel={(employee) => employee.nameUser}
                      isOptionSelected={(employee) =>
                        employee.nameUser === createdBy
                      }
                      onSelect={(employee) => setCreatedBy(employee.nameUser)}
                      triggerClassName="h-11 rounded-[8px] py-0 font-semibold"
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

                  <div className="space-y-2 min-[560px]:col-span-2">
                    <div className="flex flex-col justify-between gap-2 min-[560px]:flex-row min-[560px]:items-center">
                      <span className="block text-sm font-bold text-card-foreground">
                        ภาษีคู่ค้า
                      </span>
                      {vatMode !== "none" ? (
                        <Badge
                          variant="outline"
                          className="h-7 rounded-full border-blue-100 bg-blue-50 px-3 text-xs font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
                        >
                          VAT {defaultSupplierBillVatRate}%
                        </Badge>
                      ) : null}
                    </div>
                    <div className="grid gap-2 min-[620px]:grid-cols-3">
                      {supplierBillVatOptions.map((option) => {
                        const isSelected = vatMode === option.value;

                        return (
                          <Button
                            key={option.value}
                            type="button"
                            variant="outline"
                            className={cn(
                              "h-10 border font-bold shadow-none",
                              getVatModeClassName(option.value, isSelected),
                            )}
                            onClick={() => setVatMode(option.value)}
                          >
                            {option.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-[8px] border bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-muted-foreground">
                      ยอดรวมสุทธิ
                    </span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(vatBreakdown.totalPrice, 2)}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-x-4 gap-y-2 text-sm font-semibold min-[560px]:grid-cols-2">
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
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">ก่อน VAT</span>
                      <span>
                        {formatCurrency(vatBreakdown.vatBaseAmount, 2)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-muted-foreground">VAT</span>
                      <span className="font-bold text-main-blue">
                        {formatCurrency(vatBreakdown.vatAmount, 2)}
                      </span>
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
                <div className="flex flex-col gap-2 min-[440px]:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 font-bold text-primary hover:text-primary"
                    disabled={isLookingUpBarcode}
                    onClick={openAddProductScanner}
                  >
                    {isLookingUpBarcode ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    สแกนสินค้า
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 font-bold text-primary hover:text-primary"
                    onClick={() =>
                      setItems((current) => [...current, createEmptyLine()])
                    }
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มรายการ
                  </Button>
                </div>
              </div>

              {scanFeedback ? (
                <div
                  className={cn(
                    "mb-4 flex items-start gap-2 rounded-[8px] border px-4 py-3 text-sm font-bold",
                    getScanFeedbackClassName(scanFeedback.type),
                  )}
                >
                  {scanFeedback.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <span>{scanFeedback.message}</span>
                </div>
              ) : null}

              {isNewProductEditorOpen ? (
                <div className="mb-4 rounded-[8px] border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                  <div className="mb-4 flex flex-col justify-between gap-3 min-[760px]:flex-row min-[760px]:items-start">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-blue-100 bg-white text-main-blue dark:border-blue-500/20 dark:bg-background">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-card-foreground">
                          เพิ่มสินค้าใหม่จากบาร์โค้ด
                        </h4>
                        <p className="mt-1 text-sm font-semibold text-muted-foreground">
                          สินค้านี้จะถูกสร้างในสต็อกก่อน แล้วเติมกลับเข้าบิลคู่ค้า
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 rounded-[8px] bg-white font-bold shadow-none dark:bg-background"
                      disabled={isCreatingProduct}
                      onClick={handleCancelNewProduct}
                    >
                      ยกเลิก
                    </Button>
                  </div>

                  <div className="grid gap-3 min-[760px]:grid-cols-3">
                    <div className="space-y-2">
                      <label
                        htmlFor="supplier-new-product-barcode"
                        className="block text-xs font-bold text-muted-foreground"
                      >
                        บาร์โค้ด
                      </label>
                      <Input
                        id="supplier-new-product-barcode"
                        value={productDraft.barcode}
                        onChange={(event) =>
                          updateProductDraft({ barcode: event.target.value })
                        }
                        className="h-11 rounded-[8px] bg-white font-bold text-main-blue dark:bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-muted-foreground">
                        ประเภทสินค้า
                      </span>
                      <AsyncSearchableSelect<StockCatalogOption>
                        selectedLabel={selectedProductCategory?.name}
                        placeholder="เลือกประเภทสินค้า"
                        searchPlaceholder="ค้นหาประเภทสินค้า..."
                        emptyMessage="ไม่พบประเภทสินค้า"
                        disabled={productCatalogLoading || !productCatalog}
                        fetchOptions={fetchProductCategoryOptions}
                        getOptionKey={(category) => String(category.id)}
                        getOptionLabel={(category) => category.name}
                        isOptionSelected={(category) =>
                          String(category.id) === productDraft.categoryId
                        }
                        onSelect={(category) =>
                          updateProductDraft({
                            categoryId: String(category.id),
                          })
                        }
                        triggerClassName="h-11 rounded-[8px] bg-white font-bold dark:bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="supplier-new-product-name"
                        className="block text-xs font-bold text-muted-foreground"
                      >
                        ชื่อสินค้า
                      </label>
                      <Input
                        id="supplier-new-product-name"
                        value={productDraft.name}
                        onChange={(event) =>
                          updateProductDraft({ name: event.target.value })
                        }
                        className="h-11 rounded-[8px] bg-white font-semibold dark:bg-background"
                        placeholder="ชื่อสินค้า"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-muted-foreground">
                        หน่วย
                      </span>
                      <AsyncSearchableSelect<StockCatalogOption>
                        selectedLabel={productDraft.unit}
                        placeholder="เลือกหน่วย"
                        searchPlaceholder="ค้นหาหน่วย..."
                        emptyMessage="ไม่พบหน่วย"
                        disabled={productCatalogLoading || !productCatalog}
                        fetchOptions={fetchProductUnitOptions}
                        getOptionKey={(unit) => String(unit.id)}
                        getOptionLabel={(unit) => unit.name}
                        isOptionSelected={(unit) =>
                          unit.name === productDraft.unit
                        }
                        onSelect={(unit) =>
                          updateProductDraft({
                            unit: unit.name,
                            packageUnit: productDraft.packageUnit || unit.name,
                          })
                        }
                        triggerClassName="h-11 rounded-[8px] bg-white font-bold dark:bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="supplier-new-product-package-quantity"
                        className="block text-xs font-bold text-muted-foreground"
                      >
                        จำนวนบรรจุ
                      </label>
                      <Input
                        id="supplier-new-product-package-quantity"
                        inputMode="numeric"
                        value={productDraft.packageQuantity}
                        onChange={(event) =>
                          updateProductDraft({
                            packageQuantity: event.target.value,
                          })
                        }
                        className="h-11 rounded-[8px] bg-white text-right font-semibold dark:bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <span className="block text-xs font-bold text-muted-foreground">
                        หน่วยบรรจุ
                      </span>
                      <AsyncSearchableSelect<StockCatalogOption>
                        selectedLabel={productDraft.packageUnit}
                        placeholder="เลือกหน่วยบรรจุ"
                        searchPlaceholder="ค้นหาหน่วยบรรจุ..."
                        emptyMessage="ไม่พบหน่วยบรรจุ"
                        disabled={productCatalogLoading || !productCatalog}
                        fetchOptions={fetchProductUnitOptions}
                        getOptionKey={(unit) => String(unit.id)}
                        getOptionLabel={(unit) => unit.name}
                        isOptionSelected={(unit) =>
                          unit.name === productDraft.packageUnit
                        }
                        onSelect={(unit) =>
                          updateProductDraft({ packageUnit: unit.name })
                        }
                        triggerClassName="h-11 rounded-[8px] bg-white font-bold dark:bg-background"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="supplier-new-product-cost"
                        className="block text-xs font-bold text-muted-foreground"
                      >
                        ราคาซื้อ/ทุน
                      </label>
                      <Input
                        id="supplier-new-product-cost"
                        inputMode="decimal"
                        value={productDraft.costPrice}
                        onChange={(event) =>
                          updateProductDraft({
                            costPrice: event.target.value,
                          })
                        }
                        className="h-11 rounded-[8px] bg-white text-right font-semibold dark:bg-background"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="supplier-new-product-retail"
                        className="block text-xs font-bold text-muted-foreground"
                      >
                        ราคาขาย
                      </label>
                      <Input
                        id="supplier-new-product-retail"
                        inputMode="decimal"
                        value={productDraft.retailPrice}
                        onChange={(event) =>
                          updateProductDraft({
                            retailPrice: event.target.value,
                          })
                        }
                        className="h-11 rounded-[8px] bg-white text-right font-semibold dark:bg-background"
                        placeholder="0.00"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        className="h-11 w-full rounded-[8px] font-bold"
                        disabled={
                          isCreatingProduct ||
                          productCatalogLoading ||
                          !productCatalog
                        }
                        onClick={handleCreateScannedProduct}
                      >
                        {isCreatingProduct ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        บันทึกสินค้า
                      </Button>
                    </div>
                  </div>

                  {createProductError ? (
                    <div className="mt-4 flex items-start gap-2 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-main-red dark:border-red-500/20 dark:bg-red-500/10">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{createProductError}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

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
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1">
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
                                !!item.barcode &&
                                product.barcode === item.barcode
                              }
                              onSelect={(product) =>
                                applyProductToLine(item, product)
                              }
                            />
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-11 w-11 shrink-0 rounded-[8px] text-main-blue shadow-none hover:text-main-blue"
                                disabled={
                                  isLookingUpBarcode ||
                                  (!item.productCode && !item.barcode)
                                }
                                onClick={() =>
                                  openBarcodeReplacementScanner(item.id)
                                }
                              >
                                <Barcode className="h-4 w-4" />
                                <span className="sr-only">สแกนรหัสจริง</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>สแกนรหัสจริงของสินค้า</TooltipContent>
                          </Tooltip>
                        </div>
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
                        <AsyncSearchableSelect<SupplierCatalogOption>
                          selectedLabel={item.unit}
                          placeholder="หน่วย"
                          searchPlaceholder="ค้นหาหน่วย..."
                          emptyMessage="ไม่พบหน่วย"
                          fetchOptions={fetchSupplierUnitOptions}
                          getOptionKey={(unit) => String(unit.id)}
                          getOptionLabel={(unit) => unit.name}
                          isOptionSelected={(unit) => unit.name === item.unit}
                          onSelect={(unit) =>
                            updateLine(item.id, { unit: unit.name })
                          }
                          triggerClassName="mb-0 h-11 rounded-[8px] py-0 font-bold"
                        />
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
      <BarcodeCameraDialog
        open={isBarcodeScannerOpen}
        onOpenChange={handleBarcodeScannerOpenChange}
        onDetected={handleBarcodeDetected}
        title={
          barcodeReplacementLine ? "สแกนบาร์โค้ดจริงของสินค้า" : "สแกนบาร์โค้ดสินค้า"
        }
        description={
          barcodeReplacementLine
            ? `ระบบจะเปลี่ยนรหัสของ ${barcodeReplacementLine.name || barcodeReplacementLine.barcode} และเก็บรหัสเดิมไว้ให้สแกนย้อนหลัง`
            : "ระบบจะค้นหาสินค้าจากบาร์โค้ดแล้วเติมเข้าบิลคู่ค้า"
        }
      />
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
  const displayedBills = useMemo(
    () => payload.items.filter((bill) => matchesSearch(bill, searchTerm)),
    [payload.items, searchTerm],
  );
  const supplierSummaries = useMemo(
    () => buildSupplierBillSupplierSummaries(displayedBills),
    [displayedBills],
  );
  const displayedTotalAmount = supplierSummaries.reduce(
    (sum, supplier) => sum + supplier.totalAmount,
    0,
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

          <div className="grid gap-4 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-5">
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
              title="VAT คู่ค้า"
              value={summary.vatAmount}
              subtitle={`${formatNumber(summary.vatBillCount)} ใบมี VAT`}
              icon={Percent}
              variant="blue"
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

        {isLoading ? (
          <div className="rounded-3xl border bg-card p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-44 rounded-xl" />
                <Skeleton className="h-4 w-64 rounded-xl" />
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border bg-white p-4 dark:bg-card">
              {[1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ) : supplierSummaries.length > 0 ? (
          <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
            <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-purple-100 bg-purple-50 dark:border-purple-500/20 dark:bg-purple-500/10">
                  <Building2 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-card-foreground">
                    สรุปยอดตามคู่ค้า
                  </span>
                  <p className="text-sm font-medium text-muted-foreground">
                    รวมยอดจากรายการที่กำลังแสดงอยู่ตอนนี้
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge className="h-8 rounded-full bg-purple-50 px-4 text-sm font-bold text-purple-700 dark:bg-purple-500/10">
                  {formatNumber(supplierSummaries.length)} คู่ค้า
                </Badge>
                <Badge
                  variant="outline"
                  className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground shadow-none"
                >
                  รวม {formatCurrency(displayedTotalAmount)}
                </Badge>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
              <Table>
                <TableHeader className="bg-secondary/70">
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                      คู่ค้า
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                      เอกสาร
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[940px]:table-cell">
                      รายการสินค้า
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      ยอดรวม
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[860px]:table-cell">
                      ค้างชำระ
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[1100px]:table-cell">
                      ชำระแล้ว
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierSummaries.map((supplier, index) => (
                    <TableRow
                      key={supplier.key}
                      className="border-border/60 hover:bg-purple-50/30 dark:hover:bg-purple-500/5"
                    >
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-purple-100 bg-purple-50 text-sm font-bold text-purple-700 select-none dark:border-purple-500/20 dark:bg-purple-500/10">
                            {index + 1}
                          </div>
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="max-w-[180px] truncate text-sm font-bold text-card-foreground min-[520px]:max-w-[320px] min-[1180px]:max-w-[520px]">
                              {supplier.supplierName}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {supplier.supplierCode || "ไม่มีรหัสคู่ค้า"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                        <span className="font-bold text-card-foreground">
                          {formatNumber(supplier.billCount)} ใบ
                        </span>
                      </TableCell>

                      <TableCell className="hidden text-right align-middle min-[940px]:table-cell">
                        <span className="font-bold text-card-foreground">
                          {formatNumber(supplier.itemCount)} รายการ
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
                            {formatCurrency(supplier.totalAmount)}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground min-[760px]:hidden">
                            {formatNumber(supplier.billCount)} ใบ
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="hidden text-right align-middle min-[860px]:table-cell">
                        <span
                          className={cn(
                            outfit.className,
                            supplier.unpaidAmount > 0
                              ? "font-bold text-main-red"
                              : "font-bold text-muted-foreground",
                          )}
                        >
                          {formatCurrency(supplier.unpaidAmount)}
                        </span>
                      </TableCell>

                      <TableCell className="hidden text-right align-middle min-[1100px]:table-cell">
                        <span
                          className={cn(
                            outfit.className,
                            "font-bold text-main-green",
                          )}
                        >
                          {formatCurrency(supplier.paidAmount)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

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
                            {bill.note ? (
                              <span className="max-w-[160px] truncate text-xs font-semibold text-main-orange min-[520px]:max-w-[260px] min-[1180px]:max-w-[420px]">
                                หมายเหตุ: {bill.note}
                              </span>
                            ) : null}
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
                            {bill.vatAmount > 0 ? (
                              <span className="text-xs font-bold text-main-blue">
                                VAT {formatCurrency(bill.vatAmount, 2)}
                              </span>
                            ) : null}
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
