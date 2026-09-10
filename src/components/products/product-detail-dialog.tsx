"use client";

import { format } from "date-fns";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  Barcode,
  Boxes,
  CalendarClock,
  CarFront,
  FileText,
  type LucideIcon,
  Package,
  Percent,
  ReceiptText,
  RotateCcw,
  ShoppingBasket,
  Store,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { outfit } from "@/components/fonts/fonts";
import { BarcodePreview } from "@/components/products/barcode-preview";
import { SaleDetailDialog } from "@/components/sales/sale-detail-dialog";
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
import { cn } from "@/lib/utils";
import type { ApiResponse, BarcodeScanResult, TopProduct } from "@/types/api";

interface ProductDetailDialogProps {
  product: TopProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

interface SummaryMetricProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "orange" | "violet";
  valueClassName?: string;
}

const metricTones = {
  blue: "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
  green:
    "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
  orange:
    "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
  violet:
    "border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10",
} as const;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value || 0);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMarginTone(margin: number) {
  if (margin >= 20) {
    return "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10";
  }

  if (margin >= 5) {
    return "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10";
  }

  if (margin >= 0) {
    return "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10";
  }

  return "border-red-100 bg-red-50 text-main-red dark:border-red-500/20 dark:bg-red-500/10";
}

function SummaryMetric({
  label,
  value,
  icon: Icon,
  tone,
  valueClassName,
}: SummaryMetricProps) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-sm">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
          metricTones[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            outfit.className,
            "mt-0.5 truncate text-lg font-bold text-card-foreground",
            valueClassName,
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function ProductField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-b border-border/60 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-bold text-card-foreground">
        {value || "-"}
      </dd>
    </div>
  );
}

export function ProductDetailDialog({
  product,
  isOpen,
  onClose,
}: ProductDetailDialogProps) {
  const [detail, setDetail] = useState<BarcodeScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [previewBarcode, setPreviewBarcode] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  useEffect(() => {
    setDateRange(undefined);
    setPreviewBarcode(product?.barcode || "");
    setSelectedSaleId(null);
  }, [product]);

  useEffect(() => {
    if (!isOpen || !product) {
      setDetail(null);
      setError(null);
      setSelectedSaleId(null);
      return;
    }

    if (!product.barcode) {
      setDetail(null);
      setError("สินค้านี้ยังไม่มีบาร์โค้ดอ้างอิงสำหรับเปิดรายละเอียด");
      return;
    }

    let ignore = false;

    const fetchProductDetail = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const searchParams = new URLSearchParams({
          barcode: product.barcode || "",
        });

        if (dateRange?.from) {
          searchParams.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
        }

        if (dateRange?.to) {
          searchParams.set("endDate", format(dateRange.to, "yyyy-MM-dd"));
        }

        const response = await fetch(`/api/products/lookup?${searchParams}`);
        const data: ApiResponse<BarcodeScanResult> = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            !data.success ? data.error : "Failed to fetch product detail",
          );
        }

        if (!ignore) {
          setDetail(data.data);
          setPreviewBarcode((currentBarcode) =>
            data.data.barcodes.includes(currentBarcode)
              ? currentBarcode
              : data.data.barcode,
          );
        }
      } catch (fetchError) {
        if (!ignore) {
          setDetail(null);
          setError(
            fetchError instanceof Error ? fetchError.message : "Unknown error",
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    fetchProductDetail();

    return () => {
      ignore = true;
    };
  }, [dateRange, isOpen, product]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedSaleId(null);
      onClose();
    }
  };

  const barcode = detail?.barcode || product?.barcode || "";
  const productCode = detail?.productCode || product?.productCode || "-";
  const productName = detail?.name || product?.name || "รายละเอียดสินค้า";
  const margin = detail?.profitMargin ?? product?.profitMargin ?? 0;
  const totalProfit = detail?.totalProfit ?? product?.profit ?? 0;
  const totalProfitMargin =
    detail?.totalProfitMargin ??
    ((product?.sales ?? 0) > 0
      ? ((product?.profit ?? 0) / (product?.sales ?? 1)) * 100
      : 0);
  const barcodes = detail?.barcodes?.length
    ? detail.barcodes
    : barcode
      ? [barcode]
      : [];

  return (
    <>
      <LargeDialog
        open={isOpen && !selectedSaleId}
        onOpenChange={handleOpenChange}
      >
        <LargeDialogContent size="xl">
          <LargeDialogHeader className="border-b bg-card">
            <div className="flex flex-col gap-4 pr-7 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <LargeDialogTitle className="truncate text-primary">
                  {productName}
                </LargeDialogTitle>
                <LargeDialogDescription className="mt-1">
                  รหัส {productCode} · บาร์โค้ด {barcode || "-"}
                </LargeDialogDescription>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "h-8 rounded-full px-3 text-sm font-bold shadow-none",
                    getMarginTone(margin),
                  )}
                >
                  Margin ราคา {margin.toFixed(1)}%
                </Badge>
                {detail?.source === "master" &&
                productCode !== "-" &&
                barcode ? (
                  <Button asChild className="h-9 rounded-xl px-3 font-bold">
                    <Link
                      href={`/products/${encodeURIComponent(productCode)}/${encodeURIComponent(barcode)}/edit`}
                    >
                      <Wrench className="h-4 w-4" />
                      จัดการสินค้า
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </LargeDialogHeader>

          <LargeDialogBody className="bg-muted/15 p-4 sm:p-5">
            {isLoading && !detail ? (
              <div className="flex h-72 items-center justify-center rounded-2xl border bg-card">
                <Activity className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 font-semibold text-card-foreground">
                  กำลังโหลดรายละเอียดสินค้า...
                </span>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-100 bg-red-50/70 p-8 text-center dark:border-red-500/20 dark:bg-red-500/10">
                <p className="font-bold text-main-red">เปิดรายละเอียดไม่สำเร็จ</p>
                <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-card-foreground">
                      ช่วงข้อมูลยอดขายและความเคลื่อนไหว
                    </p>
                    <p className="text-xs font-semibold text-muted-foreground">
                      สต็อกคงเหลือแสดงค่าปัจจุบันเสมอ
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isLoading ? (
                      <Activity className="h-4 w-4 animate-spin text-main-blue" />
                    ) : null}
                    <DateRangePicker
                      dateRange={dateRange}
                      onDateRangeChange={setDateRange}
                      placeholder="ดูข้อมูลทุกช่วงเวลา"
                      className="w-full sm:w-auto [&_button]:h-9 [&_button]:w-full [&_button]:rounded-xl sm:[&_button]:w-[280px]"
                    />
                    {dateRange ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-xl"
                        aria-label="ล้างช่วงวันที่"
                        onClick={() => setDateRange(undefined)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <SummaryMetric
                    label="ยอดขายรวม"
                    value={formatCurrency(
                      detail?.totalSales ?? product?.sales ?? 0,
                    )}
                    icon={BadgeDollarSign}
                    tone="blue"
                  />
                  <SummaryMetric
                    label="กำไรรวม"
                    value={formatCurrency(totalProfit)}
                    icon={ReceiptText}
                    tone="green"
                    valueClassName={
                      totalProfit >= 0 ? "text-main-green" : "text-main-red"
                    }
                  />
                  <SummaryMetric
                    label="Margin รวม"
                    value={`${totalProfitMargin.toFixed(1)}%`}
                    icon={Percent}
                    tone="blue"
                    valueClassName={
                      totalProfitMargin >= 0
                        ? "text-main-green"
                        : "text-main-red"
                    }
                  />
                  <SummaryMetric
                    label="สต็อกคงเหลือ"
                    value={`${formatNumber(detail?.stock ?? 0)} ชิ้น`}
                    icon={Boxes}
                    tone="orange"
                    valueClassName={
                      (detail?.stock ?? 0) < 0 ? "text-main-red" : undefined
                    }
                  />
                  <SummaryMetric
                    label="จำนวนขายรวม"
                    value={`${formatNumber(detail?.totalSoldQuantity ?? product?.quantity ?? 0)} ชิ้น`}
                    icon={ShoppingBasket}
                    tone="violet"
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                  <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                    <div className="flex items-center gap-3 border-b pb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-card-foreground">
                          ข้อมูลสินค้า
                        </h3>
                        <p className="text-xs font-semibold text-muted-foreground">
                          ข้อมูลหลักและราคาปัจจุบัน
                        </p>
                      </div>
                    </div>

                    <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                      <ProductField
                        label="ประเภท"
                        value={detail?.categoryName || "-"}
                      />
                      <ProductField
                        label="หน่วย / แพ็ก"
                        value={`${detail?.unit || "-"}${
                          detail?.packageUnit
                            ? ` · ${detail.packageQuantity} ${detail.packageUnit}`
                            : ""
                        }`}
                      />
                      <ProductField
                        label="ราคาทุน"
                        value={formatCurrency(detail?.costPrice ?? 0)}
                      />
                      <ProductField
                        label="ราคาขาย"
                        value={formatCurrency(detail?.retailPrice ?? 0)}
                      />
                      <ProductField
                        label="ขายล่าสุด"
                        value={formatDate(detail?.lastSaleAt ?? null)}
                      />
                      <ProductField
                        label="เคลื่อนไหวล่าสุด"
                        value={formatDate(detail?.lastMovementAt ?? null)}
                      />
                    </dl>
                  </section>

                  <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-200">
                        <Barcode className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-card-foreground">
                          บาร์โค้ด
                        </h3>
                        <p className="text-xs font-semibold text-muted-foreground">
                          ใช้อ้างอิงหน้าร้านและสต็อก
                        </p>
                      </div>
                    </div>
                    <BarcodePreview value={previewBarcode || barcode} />
                    {barcodes.length > 1 ? (
                      <div className="mt-3">
                        <p className="mb-2 text-xs font-semibold text-muted-foreground">
                          บาร์โค้ดทั้งหมด {barcodes.length} รายการ · เลือกเพื่อดูตัวอย่าง
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {barcodes.map((itemBarcode) => (
                            <Button
                              key={itemBarcode}
                              type="button"
                              size="sm"
                              variant={
                                previewBarcode === itemBarcode
                                  ? "default"
                                  : "outline"
                              }
                              className="h-8 rounded-lg font-bold"
                              onClick={() => setPreviewBarcode(itemBarcode)}
                            >
                              <Barcode className="h-3.5 w-3.5" />
                              {itemBarcode}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </section>
                </div>

                <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10">
                        <CalendarClock className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-card-foreground">
                          ประวัติการเคลื่อนไหว
                        </h3>
                        <p className="text-xs font-semibold text-muted-foreground">
                          รายการรับเข้าและตัดสต็อกตามช่วงวันที่
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="rounded-full font-bold">
                      {detail?.recentMovements?.length || 0} รายการ
                    </Badge>
                  </div>

                  {detail?.recentMovements?.length ? (
                    <div className="divide-y overflow-hidden rounded-xl border">
                      {detail.recentMovements.map((movement, index) => {
                        const isIncoming = movement.type === "in";

                        return (
                          <button
                            type="button"
                            key={`${movement.date}-${movement.type}-${index}`}
                            disabled={!movement.saleId}
                            className={cn(
                              "grid w-full gap-3 bg-background px-4 py-3 text-left lg:grid-cols-[minmax(0,1fr)_minmax(190px,auto)_auto] lg:items-center",
                              movement.saleId &&
                                "cursor-pointer transition-colors hover:bg-blue-50/60 focus-visible:bg-blue-50/60 focus-visible:outline-none dark:hover:bg-blue-500/5 dark:focus-visible:bg-blue-500/5",
                            )}
                            onClick={() => {
                              if (movement.saleId) {
                                setSelectedSaleId(movement.saleId);
                              }
                            }}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              {isIncoming ? (
                                <ArrowUpCircle className="h-5 w-5 shrink-0 text-main-green" />
                              ) : (
                                <ArrowDownCircle className="h-5 w-5 shrink-0 text-main-orange" />
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-card-foreground">
                                  {isIncoming ? "รับเข้าสินค้า" : "ตัดสต็อก"}
                                </p>
                                <p className="truncate text-xs font-semibold text-muted-foreground">
                                  {isIncoming
                                    ? movement.company ||
                                      movement.supplierCode ||
                                      "ไม่ระบุร้านค้า"
                                    : movement.vehicleRegistration
                                      ? `ทะเบียน ${movement.vehicleRegistration}`
                                      : "ไม่ระบุทะเบียนรถ"}
                                </p>
                              </div>
                            </div>
                            <div className="space-y-1 text-sm text-card-foreground">
                              <p className="font-bold">
                                {formatNumber(movement.quantity)} ชิ้น
                                <span className="ml-2 text-xs font-semibold text-muted-foreground">
                                  คงเหลือ {formatNumber(movement.stock)}
                                </span>
                              </p>
                              {isIncoming ? (
                                <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <Store className="h-3.5 w-3.5" />
                                    ต้นทุน {formatCurrency(movement.costPrice)}/ชิ้น
                                  </span>
                                  <span>
                                    รวม{" "}
                                    {formatCurrency(
                                      movement.costPrice * movement.quantity,
                                    )}
                                  </span>
                                </p>
                              ) : movement.vehicleRegistration ? (
                                <p className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                                  <CarFront className="h-3.5 w-3.5" />
                                  รถ {movement.vehicleRegistration}
                                </p>
                              ) : null}
                            </div>
                            <div className="space-y-1 text-xs font-semibold text-muted-foreground lg:text-right">
                              <p>{formatDate(movement.date)}</p>
                              {movement.documentNo ? (
                                <p className="inline-flex items-center gap-1 lg:justify-end">
                                  <FileText className="h-3.5 w-3.5" />
                                  {movement.documentNo}
                                </p>
                              ) : null}
                              {movement.saleId ? (
                                <p className="font-bold text-main-blue">
                                  คลิกเพื่อดูรายละเอียดบิล
                                </p>
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm font-semibold text-muted-foreground">
                      ยังไม่มีประวัติการเคลื่อนไหวของสินค้านี้
                    </div>
                  )}
                </section>
              </div>
            )}
          </LargeDialogBody>
        </LargeDialogContent>
      </LargeDialog>

      <SaleDetailDialog
        saleId={selectedSaleId}
        isOpen={isOpen && Boolean(selectedSaleId)}
        onClose={() => setSelectedSaleId(null)}
      />
    </>
  );
}
