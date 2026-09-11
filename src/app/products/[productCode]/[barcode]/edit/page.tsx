"use client";

import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Barcode,
  Boxes,
  Camera,
  CheckCircle2,
  Loader2,
  Package,
  Save,
  ShieldCheck,
  Tag,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { outfit } from "@/components/fonts/fonts";
import { BarcodePreview } from "@/components/products/barcode-preview";
import { BarcodeCameraDialog } from "@/components/stock/barcode-camera-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  ApiResponse,
  ProductBarcodeLinkResult,
  ProductManagementDetail,
  ProductManagementPayload,
} from "@/types/api";

const fetcher = (url: string) => fetch(url).then((response) => response.json());

interface ProductFormState {
  name: string;
  categoryId: string;
  unit: string;
  packageUnit: string;
  packageQuantity: string;
  costPrice: string;
  retailPrice: string;
  lowStock: string;
  includeInBestSeller: boolean;
  includeInProfitAnalysis: boolean;
  analyticsExclusionReason: string;
}

function createFormState(product: ProductManagementDetail): ProductFormState {
  return {
    name: product.name,
    categoryId: String(product.categoryId),
    unit: product.unit,
    packageUnit: product.packageUnit || product.unit,
    packageQuantity: String(product.packageQuantity || 1),
    costPrice: String(product.costPrice),
    retailPrice: String(product.retailPrice),
    lowStock: String(product.lowStock),
    includeInBestSeller: product.includeInBestSeller,
    includeInProfitAnalysis: product.includeInProfitAnalysis,
    analyticsExclusionReason: product.analyticsExclusionReason,
  };
}

function getResponseError<T>(response: ApiResponse<T>) {
  return response.success ? "" : response.error;
}

function FieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-bold text-card-foreground"
    >
      {children}
    </label>
  );
}

function AnalyticsToggle({
  checked,
  description,
  icon: Icon,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  icon: typeof BarChart3;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
        checked
          ? "border-blue-200 bg-blue-50/60 dark:border-blue-500/30 dark:bg-blue-500/10"
          : "border-orange-200 bg-orange-50/50 dark:border-orange-500/30 dark:bg-orange-500/10"
      }`}
      onClick={() => onCheckedChange(!checked)}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
          checked
            ? "border-blue-100 bg-white text-main-blue dark:border-blue-500/20 dark:bg-card"
            : "border-orange-100 bg-white text-main-orange dark:border-orange-500/20 dark:bg-card"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-card-foreground">{label}</p>
        <p className="mt-1 text-xs font-semibold text-muted-foreground">
          {description}
        </p>
      </div>
      <span
        aria-hidden="true"
        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-main-blue" : "bg-muted-foreground/30"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
}

export default function ProductEditPage() {
  const router = useRouter();
  const params = useParams<{ productCode: string; barcode: string }>();
  const productCode = params.productCode;
  const barcode = params.barcode;
  const apiUrl = `/api/products/${encodeURIComponent(productCode)}?barcode=${encodeURIComponent(barcode)}`;
  const { data, error, isLoading, mutate } = useSWR<
    ApiResponse<ProductManagementPayload>
  >(apiUrl, fetcher);
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [barcodeDraft, setBarcodeDraft] = useState("");
  const [isSavingBarcode, setIsSavingBarcode] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [barcodeSuccess, setBarcodeSuccess] = useState<string | null>(null);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);

  const payload = data?.success ? data.data : null;
  const product = payload?.product ?? null;

  useEffect(() => {
    if (product && !form) {
      setForm(createFormState(product));
      setBarcodeDraft(product.barcode);
    }
  }, [form, product]);

  const updateForm = (updates: Partial<ProductFormState>) => {
    setForm((current) => (current ? { ...current, ...updates } : current));
    setSaveError(null);
    setSaveSuccess(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form || !product) {
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(null);

      const response = await fetch(
        `/api/products/${encodeURIComponent(product.productCode)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, barcode: product.barcode }),
        },
      );
      const result =
        (await response.json()) as ApiResponse<ProductManagementDetail>;

      if (!response.ok || !result.success) {
        throw new Error(getResponseError(result) || "บันทึกข้อมูลสินค้าไม่สำเร็จ");
      }

      setForm(createFormState(result.data));
      setSaveSuccess("บันทึกข้อมูลสินค้าเรียบร้อยแล้ว");
      await mutate(
        payload
          ? {
              success: true,
              data: { ...payload, product: result.data },
              timestamp: new Date().toISOString(),
            }
          : undefined,
        { revalidate: true },
      );
    } catch (submitError) {
      setSaveError(
        submitError instanceof Error
          ? submitError.message
          : "บันทึกข้อมูลสินค้าไม่สำเร็จ",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleBarcodeUpdate = async () => {
    if (!product) {
      return;
    }

    const newBarcode = barcodeDraft.trim().replace(/\s+/g, "");

    if (!newBarcode) {
      setBarcodeError("กรุณาระบุบาร์โค้ดใหม่");
      return;
    }

    if (newBarcode.length > 30) {
      setBarcodeError("บาร์โค้ดต้องมีความยาวไม่เกิน 30 ตัวอักษร");
      return;
    }

    if (newBarcode === product.barcode) {
      setBarcodeError("บาร์โค้ดใหม่ตรงกับรหัสปัจจุบัน");
      return;
    }

    try {
      setIsSavingBarcode(true);
      setBarcodeError(null);
      setBarcodeSuccess(null);

      const response = await fetch("/api/products/barcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: product.productCode,
          oldBarcode: product.barcode,
          newBarcode,
          source: "product-management",
        }),
      });
      const result =
        (await response.json()) as ApiResponse<ProductBarcodeLinkResult>;

      if (!response.ok || !result.success) {
        throw new Error(getResponseError(result) || "เปลี่ยนบาร์โค้ดไม่สำเร็จ");
      }

      setBarcodeDraft(result.data.newBarcode);
      setBarcodeSuccess(
        `เปลี่ยนเป็น ${result.data.newBarcode} แล้ว โดยบาร์โค้ดเดิมยังใช้ค้นหาประวัติได้`,
      );
      router.replace(
        `/products/${encodeURIComponent(product.productCode)}/${encodeURIComponent(result.data.newBarcode)}/edit`,
      );
    } catch (submitError) {
      setBarcodeError(
        submitError instanceof Error
          ? submitError.message
          : "เปลี่ยนบาร์โค้ดไม่สำเร็จ",
      );
    } finally {
      setIsSavingBarcode(false);
    }
  };

  const requestError =
    error?.message || (data && !data.success ? data.error : null);

  return (
    <div className="p-4 pb-16 sm:p-6">
      <DashboardBreadcrumb label="จัดการสินค้า" href="/products" />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="mx-auto mt-2 max-w-5xl space-y-5 md:mt-6">
        <div className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-primary">
                จัดการสินค้า
              </h1>
              <p className="mt-1 text-sm font-semibold text-muted-foreground">
                แก้ไขข้อมูลหลัก ราคา และการแจ้งเตือนของสินค้า
              </p>
            </div>
          </div>

          <Button asChild variant="outline" className="h-10 font-bold">
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
              กลับไปรายการสินค้า
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-[420px] w-full rounded-2xl" />
          </div>
        ) : requestError || !payload || !product || !form ? (
          <Card className="rounded-2xl border-red-100 bg-red-50/60 shadow-sm dark:border-red-500/20 dark:bg-red-500/10">
            <CardContent className="py-10 text-center">
              <AlertCircle className="mx-auto h-9 w-9 text-main-red" />
              <h2 className="mt-3 text-lg font-bold text-main-red">
                เปิดข้อมูลสินค้าไม่สำเร็จ
              </h2>
              <p className="mt-1 font-semibold text-muted-foreground">
                {requestError || "ไม่พบสินค้าที่ต้องการจัดการ"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <Card className="rounded-2xl shadow-sm">
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Tag className="h-4 w-4" /> รหัสสินค้า
                    </div>
                    <p className={`${outfit.className} mt-2 text-lg font-bold`}>
                      {product.productCode}
                    </p>
                  </div>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Boxes className="h-4 w-4" /> สต็อกปัจจุบัน
                    </div>
                    <p className={`${outfit.className} mt-2 text-lg font-bold`}>
                      {product.stock.toLocaleString("th-TH")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 rounded-xl border p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div>
                    <div className="flex items-center gap-2">
                      <Barcode className="h-4 w-4 text-main-blue" />
                      <h2 className="font-bold text-card-foreground">
                        เปลี่ยนบาร์โค้ด
                      </h2>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">
                      พิมพ์รหัสใหม่เพื่อดูตัวอย่างได้ทันที บาร์โค้ดเดิมจะยังค้นหารายการย้อนหลังได้
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                      <div className="flex min-w-0 flex-1 gap-2">
                        <Input
                          aria-label="บาร์โค้ดสินค้า"
                          value={barcodeDraft}
                          onChange={(event) => {
                            setBarcodeDraft(event.target.value);
                            setBarcodeError(null);
                            setBarcodeSuccess(null);
                          }}
                          className={`${outfit.className} h-11 min-w-0 flex-1 rounded-xl font-bold`}
                          maxLength={30}
                          placeholder="ระบุหรือสแกนบาร์โค้ดใหม่"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-11 w-11 shrink-0 rounded-xl"
                          onClick={() => setIsBarcodeScannerOpen(true)}
                          disabled={isSavingBarcode}
                          aria-label="เปิดกล้องสแกนบาร์โค้ด"
                          title="เปิดกล้องสแกนบาร์โค้ด"
                        >
                          <Camera className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 px-4 font-bold"
                        onClick={handleBarcodeUpdate}
                        disabled={isSavingBarcode}
                      >
                        {isSavingBarcode ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Barcode className="h-4 w-4" />
                        )}
                        {isSavingBarcode ? "กำลังเปลี่ยน..." : "อัปเดตบาร์โค้ด"}
                      </Button>
                    </div>
                    {barcodeError ? (
                      <p className="mt-3 text-sm font-semibold text-main-red">
                        {barcodeError}
                      </p>
                    ) : null}
                    {barcodeSuccess ? (
                      <p className="mt-3 text-sm font-semibold text-main-green">
                        {barcodeSuccess}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-xl bg-muted/25 p-3">
                    <p className="mb-2 text-xs font-bold text-muted-foreground">
                      ตัวอย่างบาร์โค้ด
                    </p>
                    <BarcodePreview value={barcodeDraft} />
                  </div>
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm font-semibold text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    รหัสสินค้ายังคงเดิมเพื่อเป็นกุญแจเชื่อมบิลและประวัติทั้งหมด
                    ส่วนยอดคงเหลือต้องปรับผ่านรายการสต็อก
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardContent className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-card-foreground">
                    ข้อมูลทั่วไป
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    ข้อมูลที่ใช้แสดงในหน้าขาย บิล และรายงานสินค้า
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <FieldLabel htmlFor="product-name">ชื่อสินค้า</FieldLabel>
                    <Input
                      id="product-name"
                      value={form.name}
                      onChange={(event) =>
                        updateForm({ name: event.target.value })
                      }
                      className="h-11 rounded-xl font-semibold"
                      maxLength={250}
                      required
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="product-category">
                      ประเภทสินค้า
                    </FieldLabel>
                    <Select
                      value={form.categoryId}
                      onValueChange={(value) =>
                        updateForm({ categoryId: value })
                      }
                    >
                      <SelectTrigger
                        id="product-category"
                        className="h-11 w-full rounded-xl px-3 font-semibold"
                      >
                        <SelectValue placeholder="เลือกประเภทสินค้า" />
                      </SelectTrigger>
                      <SelectContent>
                        {payload.categories.map((category) => (
                          <SelectItem
                            key={category.id}
                            value={String(category.id)}
                          >
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel htmlFor="product-unit">หน่วยขาย</FieldLabel>
                    <Select
                      value={form.unit}
                      onValueChange={(value) => updateForm({ unit: value })}
                    >
                      <SelectTrigger
                        id="product-unit"
                        className="h-11 w-full rounded-xl px-3 font-semibold"
                      >
                        <SelectValue placeholder="เลือกหน่วยขาย" />
                      </SelectTrigger>
                      <SelectContent>
                        {payload.units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.name}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel htmlFor="product-package-quantity">
                      จำนวนต่อแพ็ก
                    </FieldLabel>
                    <Input
                      id="product-package-quantity"
                      type="number"
                      min="1"
                      step="1"
                      value={form.packageQuantity}
                      onChange={(event) =>
                        updateForm({ packageQuantity: event.target.value })
                      }
                      className="h-11 rounded-xl font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="product-package-unit">
                      หน่วยแพ็ก
                    </FieldLabel>
                    <Select
                      value={form.packageUnit}
                      onValueChange={(value) =>
                        updateForm({ packageUnit: value })
                      }
                    >
                      <SelectTrigger
                        id="product-package-unit"
                        className="h-11 w-full rounded-xl px-3 font-semibold"
                      >
                        <SelectValue placeholder="เลือกหน่วยแพ็ก" />
                      </SelectTrigger>
                      <SelectContent>
                        {payload.units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.name}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardContent className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-card-foreground">
                    ราคาและการแจ้งเตือน
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    ปรับราคาปัจจุบันโดยไม่แก้ไขข้อมูลในบิลย้อนหลัง
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <FieldLabel htmlFor="product-cost-price">ราคาทุน</FieldLabel>
                    <Input
                      id="product-cost-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.costPrice}
                      onChange={(event) =>
                        updateForm({ costPrice: event.target.value })
                      }
                      className="h-11 rounded-xl font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-retail-price">
                      ราคาขาย
                    </FieldLabel>
                    <Input
                      id="product-retail-price"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.retailPrice}
                      onChange={(event) =>
                        updateForm({ retailPrice: event.target.value })
                      }
                      className="h-11 rounded-xl font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="product-low-stock">
                      แจ้งเตือนเมื่อสต็อกต่ำกว่า
                    </FieldLabel>
                    <Input
                      id="product-low-stock"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.lowStock}
                      onChange={(event) =>
                        updateForm({ lowStock: event.target.value })
                      }
                      className="h-11 rounded-xl font-semibold"
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardContent className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-card-foreground">
                    การวิเคราะห์และรายงาน
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-muted-foreground">
                    เลือกว่าสินค้านี้ควรมีผลต่อตัวเลขเชิงวิเคราะห์หรือไม่
                    โดยไม่กระทบบิลและยอดรับเงินจริง
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <AnalyticsToggle
                    checked={form.includeInBestSeller}
                    icon={Trophy}
                    label="รวมในอันดับสินค้าขายดี"
                    description="แสดงใน Top สินค้าและรายงานสินค้าขายดี"
                    onCheckedChange={(checked) =>
                      updateForm({ includeInBestSeller: checked })
                    }
                  />
                  <AnalyticsToggle
                    checked={form.includeInProfitAnalysis}
                    icon={BarChart3}
                    label="รวมในการคำนวณกำไรและ Margin"
                    description="มีผลต่อ KPI กำไร Margin กราฟกำไร และสินค้าขาดทุน"
                    onCheckedChange={(checked) =>
                      updateForm({ includeInProfitAnalysis: checked })
                    }
                  />
                </div>

                {!form.includeInBestSeller || !form.includeInProfitAnalysis ? (
                  <div>
                    <FieldLabel htmlFor="analytics-exclusion-reason">
                      เหตุผลที่ไม่นำมาวิเคราะห์ (ไม่บังคับ)
                    </FieldLabel>
                    <Input
                      id="analytics-exclusion-reason"
                      value={form.analyticsExclusionReason}
                      onChange={(event) =>
                        updateForm({
                          analyticsExclusionReason: event.target.value,
                        })
                      }
                      className="h-11 rounded-xl font-semibold"
                      maxLength={250}
                      placeholder="เช่น รายการภาษี หรือค่าธรรมเนียม"
                    />
                  </div>
                ) : null}

                <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm font-semibold text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    การตั้งค่านี้อ้างอิงรหัสสินค้าและมีผลกับข้อมูลย้อนหลัง รวมถึงบาร์โค้ดเดิมที่เชื่อมไว้
                  </span>
                </div>
              </CardContent>
            </Card>

            {saveError ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 font-semibold text-main-red dark:border-red-500/20 dark:bg-red-500/10">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {saveError}
              </div>
            ) : null}

            {saveSuccess ? (
              <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 font-semibold text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                {saveSuccess}
              </div>
            ) : null}

            <div className="sticky bottom-4 flex flex-col-reverse gap-3 rounded-2xl border bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:justify-end">
              <Button asChild variant="outline" className="h-11 px-5 font-bold">
                <Link href="/products">ยกเลิก</Link>
              </Button>
              <Button
                type="submit"
                className="h-11 px-5 font-bold"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
              </Button>
            </div>
          </form>
        )}
      </div>

      <BarcodeCameraDialog
        open={isBarcodeScannerOpen}
        onOpenChange={setIsBarcodeScannerOpen}
        onDetected={(detectedBarcode) => {
          setBarcodeDraft(detectedBarcode);
          setBarcodeError(null);
          setBarcodeSuccess(null);
        }}
        title="สแกนบาร์โค้ดใหม่"
        description="เล็งกล้องไปที่บาร์โค้ดใหม่ของสินค้า ระบบจะนำรหัสมาใส่ในช่องให้อัตโนมัติ"
      />
    </div>
  );
}
