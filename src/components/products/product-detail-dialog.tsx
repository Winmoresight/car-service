"use client";

import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeDollarSign,
  Barcode,
  Boxes,
  Calendar,
  Package,
  ReceiptText,
  ScanBarcode,
  ShoppingBasket,
  Tag,
} from "lucide-react";
import { useEffect, useState } from "react";
import { outfit } from "@/components/fonts/fonts";
import { BarcodePreview } from "@/components/products/barcode-preview";
import { Badge } from "@/components/ui/badge";
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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
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
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMarginTone(margin: number) {
  if (margin >= 10) {
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

export function ProductDetailDialog({
  product,
  isOpen,
  onClose,
}: ProductDetailDialogProps) {
  const [detail, setDetail] = useState<BarcodeScanResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !product) {
      setDetail(null);
      setError(null);
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
        const response = await fetch(
          `/api/products/lookup?barcode=${encodeURIComponent(product.barcode || "")}`,
        );
        const data: ApiResponse<BarcodeScanResult> = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            !data.success ? data.error : "Failed to fetch product detail",
          );
        }

        if (!ignore) {
          setDetail(data.data);
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
  }, [isOpen, product]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const barcode = detail?.barcode || product?.barcode || "";
  const productCode = detail?.productCode || product?.productCode || "-";
  const productName = detail?.name || product?.name || "รายละเอียดสินค้า";
  const margin = detail?.profitMargin ?? product?.profitMargin ?? 0;

  return (
    <LargeDialog open={isOpen} onOpenChange={handleOpenChange}>
      <LargeDialogContent size="xl">
        <LargeDialogHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <LargeDialogTitle className="text-primary">
                {productName}
              </LargeDialogTitle>
              <LargeDialogDescription>
                ดูภาพรวมยอดขาย สต็อก ราคา และพรีวิวบาร์โค้ดของสินค้าแบบเร็ว
              </LargeDialogDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "h-8 rounded-full px-3 text-sm font-bold shadow-none",
                  getMarginTone(margin),
                )}
              >
                Margin {margin.toFixed(1)}%
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full border-blue-100 bg-blue-50 px-3 text-sm font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
              >
                {formatNumber(
                  product?.quantity ?? detail?.totalSoldQuantity ?? 0,
                )}{" "}
                ชิ้น
              </Badge>
            </div>
          </div>
        </LargeDialogHeader>

        <LargeDialogBody className="bg-muted/10">
          {isLoading ? (
            <div className="flex h-80 items-center justify-center rounded-3xl border bg-card">
              <Activity className="h-7 w-7 animate-spin text-primary" />
              <span className="ml-2 text-base font-semibold text-card-foreground">
                กำลังโหลดรายละเอียดสินค้า...
              </span>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-100 bg-red-50/70 p-6 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <p className="font-bold text-main-red">เปิดรายละเอียดไม่สำเร็จ</p>
              <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.95fr]">
                <div className="space-y-6">
                  <div className="rounded-3xl border bg-card p-4 shadow-sm">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                          <BadgeDollarSign className="h-5 w-5 text-main-blue" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground">
                          ยอดขายรวม
                        </p>
                        <p
                          className={cn(
                            outfit.className,
                            "mt-2 text-xl font-bold text-card-foreground",
                          )}
                        >
                          {formatCurrency(
                            detail?.totalSales ?? product?.sales ?? 0,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                          <ReceiptText className="h-5 w-5 text-main-green" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground">
                          กำไรรวม
                        </p>
                        <p
                          className={cn(
                            outfit.className,
                            "mt-2 text-xl font-bold",
                            (detail?.totalProfit ?? product?.profit ?? 0) >= 0
                              ? "text-main-green"
                              : "text-main-red",
                          )}
                        >
                          {formatCurrency(
                            detail?.totalProfit ?? product?.profit ?? 0,
                          )}
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10">
                          <Boxes className="h-5 w-5 text-main-orange" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground">
                          สต็อกคงเหลือ
                        </p>
                        <p
                          className={cn(
                            outfit.className,
                            "mt-2 text-xl font-bold text-card-foreground",
                          )}
                        >
                          {formatNumber(detail?.stock ?? 0)}
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 dark:border-violet-500/20 dark:bg-violet-500/10">
                          <ShoppingBasket className="h-5 w-5 text-violet-600" />
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground">
                          จำนวนขายสะสม
                        </p>
                        <p
                          className={cn(
                            outfit.className,
                            "mt-2 text-xl font-bold text-card-foreground",
                          )}
                        >
                          {formatNumber(
                            detail?.totalSoldQuantity ?? product?.quantity ?? 0,
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border bg-card p-4 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                        <Package className="h-5 w-5 text-main-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-card-foreground">
                          ข้อมูลสินค้า
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground">
                          ข้อมูลอ้างอิงสำหรับขายและเช็กสต็อก
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                          <Tag className="h-4 w-4" />
                          รหัสสินค้า
                        </div>
                        <p
                          className={cn(
                            outfit.className,
                            "text-base font-bold text-card-foreground",
                          )}
                        >
                          {productCode}
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                          <Barcode className="h-4 w-4" />
                          บาร์โค้ด
                        </div>
                        <p
                          className={cn(
                            outfit.className,
                            "text-base font-bold text-card-foreground",
                          )}
                        >
                          {barcode || "-"}
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                          <BadgeDollarSign className="h-4 w-4" />
                          ต้นทุน / ราคาขาย
                        </div>
                        <p className="text-base font-bold text-card-foreground">
                          {formatCurrency(detail?.costPrice ?? 0)} /{" "}
                          {formatCurrency(detail?.retailPrice ?? 0)}
                        </p>
                      </div>

                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                          <ScanBarcode className="h-4 w-4" />
                          หน่วย / แพ็ก
                        </div>
                        <p className="text-base font-bold text-card-foreground">
                          {detail?.unit || "-"}
                          {detail?.packageUnit
                            ? ` • ${detail.packageQuantity} ${detail.packageUnit}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border bg-card p-4 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-500/20 dark:bg-slate-500/10">
                        <Barcode className="h-5 w-5 text-slate-700 dark:text-slate-200" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-card-foreground">
                          Barcode Preview
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground">
                          ใช้ดูอ้างอิงได้ทันทีว่ารายการนี้ผูกกับบาร์โค้ดไหน
                        </p>
                      </div>
                    </div>

                    <BarcodePreview value={barcode} />
                  </div>

                  <div className="rounded-3xl border bg-card p-4 shadow-sm">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                        <Calendar className="h-5 w-5 text-main-blue" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-card-foreground">
                          เวลาล่าสุด
                        </h3>
                        <p className="text-sm font-medium text-muted-foreground">
                          ดูจังหวะการขายและการเคลื่อนไหวของสินค้า
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <p className="text-sm font-semibold text-muted-foreground">
                          ขายล่าสุด
                        </p>
                        <p className="mt-2 text-base font-bold text-card-foreground">
                          {formatDate(detail?.lastSaleAt ?? null)}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <p className="text-sm font-semibold text-muted-foreground">
                          เคลื่อนไหวล่าสุด
                        </p>
                        <p className="mt-2 text-base font-bold text-card-foreground">
                          {formatDate(detail?.lastMovementAt ?? null)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border bg-card p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <Activity className="h-5 w-5 text-main-blue" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-card-foreground">
                      ความเคลื่อนไหวล่าสุด
                    </h3>
                    <p className="text-sm font-medium text-muted-foreground">
                      สรุปการรับเข้าและตัดออกจากสต็อกล่าสุด
                    </p>
                  </div>
                </div>

                {detail?.recentMovements?.length ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {detail.recentMovements.map((movement, index) => {
                      const isIncoming = movement.type === "in";

                      return (
                        <div
                          key={`${movement.date}-${movement.type}-${index}`}
                          className="rounded-2xl border bg-white p-4 dark:bg-card"
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                                isIncoming
                                  ? "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10"
                                  : "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
                              )}
                            >
                              {isIncoming ? (
                                <ArrowUpCircle className="h-5 w-5" />
                              ) : (
                                <ArrowDownCircle className="h-5 w-5" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-card-foreground">
                                  {isIncoming ? "รับเข้าสินค้า" : "ตัดสต็อก"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                                    isIncoming
                                      ? "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10"
                                      : "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
                                  )}
                                >
                                  {formatNumber(movement.quantity)} ชิ้น
                                </Badge>
                              </div>

                              <p className="mt-2 text-sm font-medium text-muted-foreground">
                                {formatDate(movement.date)}
                              </p>
                              <p className="mt-1 text-sm font-medium text-muted-foreground">
                                คงเหลือ {formatNumber(movement.stock)} ชิ้น
                              </p>
                              <p className="mt-1 text-sm font-semibold text-card-foreground">
                                {movement.company || "ไม่ระบุแหล่งที่มา"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border bg-white px-4 py-10 text-center dark:bg-card">
                    <p className="font-bold text-card-foreground">
                      ยังไม่มีประวัติการเคลื่อนไหวล่าสุด
                    </p>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      แต่ยังดูยอดขายและบาร์โค้ดอ้างอิงของสินค้าได้ตามปกติ
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </LargeDialogBody>
      </LargeDialogContent>
    </LargeDialog>
  );
}
