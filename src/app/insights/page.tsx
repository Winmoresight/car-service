"use client";

/**
 * Insights Page - หน้า Insights/Alerts
 * แสดงการวิเคราะห์และแจ้งเตือนที่สำคัญ
 */

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
} from "lucide-react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ApiResponse, LossProduct } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const getProductImage = (product: LossProduct) => {
  return (
    product.imageUrl ||
    product.imageURL ||
    product.thumbnailUrl ||
    product.thumbnailURL ||
    product.productImage ||
    null
  );
};

function LossProductMedia({
  imageUrl,
  name,
  index,
}: {
  imageUrl: string | null;
  name: string;
  index: number;
}) {
  return (
    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-red-100 bg-red-50 text-sm font-bold text-main-red select-none dark:border-red-500/20 dark:bg-red-500/10 min-[550px]:h-12 min-[550px]:w-12">
      {imageUrl ? (
        // biome-ignore lint/performance/noImgElement: Product image URLs can come from arbitrary sources, so keep this independent from next/image remote config.
        <img
          src={imageUrl}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.remove();
          }}
        />
      ) : null}
      <span>{index + 1}</span>
    </div>
  );
}

export default function InsightsPage() {
  // Fetch loss products
  const { data: lossProductsData } = useSWR<ApiResponse<LossProduct[]>>(
    "/api/products/loss?limit=20",
    fetcher,
    { refreshInterval: 60000 },
  );

  const lossProducts =
    lossProductsData?.success && lossProductsData.data
      ? lossProductsData.data
      : [];
  const totalLoss = lossProducts.reduce((sum, p) => sum + p.profit, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("th-TH").format(value);
  };

  const formatLossRate = (product: LossProduct) => {
    if (product.sales <= 0) {
      return "ไม่มีข้อมูลยอดขาย";
    }

    return `${Math.abs((product.profit / product.sales) * 100).toFixed(1)}% ของยอดขาย`;
  };

  const getLossStatus = (profit: number) => {
    const loss = Math.abs(profit);

    if (loss >= 50000) {
      return {
        label: "วิกฤต",
        description: "ต้องดูทันที",
        badgeClass:
          "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
        dotClass: "bg-red-500",
        barClass: "bg-red-500",
      };
    }

    if (loss >= 10000) {
      return {
        label: "สูง",
        description: "ควรตรวจสอบ",
        badgeClass:
          "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300",
        dotClass: "bg-orange-500",
        barClass: "bg-orange-500",
      };
    }

    return {
      label: "เฝ้าดู",
      description: "รอประเมิน",
      badgeClass:
        "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
      dotClass: "bg-amber-500",
      barClass: "bg-amber-500",
    };
  };

  const largestLoss = Math.max(
    ...lossProducts.map((product) => Math.abs(product.profit)),
    1,
  );

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="Insights & Alerts" href="/insights" />
      <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm">
          <div className="flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold">
                  Insights & Alerts
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  การวิเคราะห์และแจ้งเตือนที่สำคัญ
                </p>
              </div>
            </div>
          </div>

          {/* Alert Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="รายการขาดทุน"
              value={lossProducts.length}
              subtitle={formatCurrency(totalLoss)}
              icon={AlertTriangle}
              variant="orange"
            />
            <KPICard
              title="ยอดขายตก"
              value={3}
              subtitle="วันที่ผิดปกติ"
              icon={TrendingDown}
              variant="purple"
            />
            <KPICard
              title="สต็อกต่ำ"
              value={12}
              subtitle="ต้องสั่งเพิ่ม"
              icon={AlertCircle}
              variant="orange"
            />
            <KPICard
              title="สินค้าดีเด่น"
              value={45}
              subtitle="กำไร >15%"
              icon={CheckCircle}
              variant="emerald"
            />
          </div>
        </div>

        {/* Loss Products Table */}
        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10">
                <AlertTriangle className="h-6 w-6 text-main-red" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการขาดทุนที่ต้องตรวจสอบ
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  จัดลำดับตามผลขาดทุน เพื่อให้เห็นรายการที่ควรแก้ก่อน
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-red-50 px-4 text-sm font-bold text-main-red dark:bg-red-500/10">
                {lossProducts.length} รายการ
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  outfit.className,
                  "h-8 rounded-full px-4 text-sm font-bold text-card-foreground",
                )}
              >
                {formatCurrency(totalLoss)}
              </Badge>
            </div>
          </div>

          {lossProducts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-10 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                <CheckCircle className="h-6 w-6 text-main-green" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบรายการขาดทุน
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ตอนนี้ทุกรายการยังมีกำไรเป็นบวก
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
              <Table>
                <TableHeader className="bg-secondary/70">
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="w-[46%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                      สินค้า/รายการ
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                      ยอดขาย
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[620px]:table-cell">
                      จำนวน
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      ขาดทุน
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      สถานะ
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {lossProducts.map((product, index) => {
                    const status = getLossStatus(product.profit);
                    const imageUrl = getProductImage(product);
                    const lossPercent = Math.max(
                      8,
                      Math.min(
                        (Math.abs(product.profit) / largestLoss) * 100,
                        100,
                      ),
                    );

                    return (
                      <TableRow
                        key={`${product.name}-${index}`}
                        className="group border-border/60 transition-colors duration-200 hover:bg-red-50/30 dark:hover:bg-red-500/5"
                      >
                        <TableCell className="px-4 py-4 font-medium">
                          <div className="flex items-center gap-3">
                            <LossProductMedia
                              imageUrl={imageUrl}
                              name={product.name}
                              index={index}
                            />
                            <div className="flex min-w-0 flex-col">
                              <span className="max-w-[120px] truncate text-sm font-bold text-card-foreground transition-colors group-hover:text-main-red min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[550px]:text-base min-[1100px]:max-w-[420px]">
                                {product.name}
                              </span>
                              <p className="hidden text-sm font-medium text-muted-foreground min-[560px]:block">
                                {formatLossRate(product)}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right font-semibold text-muted-foreground min-[760px]:table-cell",
                          )}
                        >
                          {formatCurrency(product.sales)}
                        </TableCell>

                        <TableCell
                          className={cn(
                            outfit.className,
                            "hidden text-right font-semibold text-muted-foreground min-[620px]:table-cell",
                          )}
                        >
                          {formatNumber(product.quantity)}
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={cn(
                                outfit.className,
                                "text-sm font-bold text-main-red min-[500px]:text-base",
                              )}
                            >
                              {formatCurrency(product.profit)}
                            </span>
                            <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-red-100 min-[700px]:block dark:bg-red-500/15">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  status.barClass,
                                )}
                                style={{ width: `${lossPercent}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div
                            className={cn(
                              "inline-flex h-7 w-7 items-center justify-center rounded-full min-[650px]:hidden",
                              status.badgeClass,
                            )}
                          >
                            <span
                              className={cn(
                                "h-2.5 w-2.5 rounded-full",
                                status.dotClass,
                              )}
                            />
                          </div>

                          <div className="hidden flex-col items-end gap-1 min-[650px]:flex">
                            <Badge
                              className={cn(
                                "h-7 rounded-full border-none px-3 font-bold shadow-none",
                                status.badgeClass,
                              )}
                            >
                              {status.label}
                            </Badge>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {status.description}
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

        {/* Insights Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-yellow-600" />
                วันที่ยอดขายตก
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">1 มิ.ย. 2026</p>
                    <p className="text-sm text-muted-foreground">วันจันทร์</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">-35%</p>
                    <p className="text-sm text-muted-foreground">จากเฉลี่ย</p>
                  </div>
                </li>
                <li className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">25 พ.ค. 2026</p>
                    <p className="text-sm text-muted-foreground">วันอาทิตย์</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">-28%</p>
                    <p className="text-sm text-muted-foreground">จากเฉลี่ย</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                สินค้าต้นทุนผิดปกติ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">Castrol น้ำมันเกียร์</p>
                    <p className="text-sm text-muted-foreground">
                      ต้นทุนสูงกว่าปกติ
                    </p>
                  </div>
                  <Badge variant="destructive">ตรวจสอบ</Badge>
                </li>
                <li className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">ประกันชั้น1 วิริยะ</p>
                    <p className="text-sm text-muted-foreground">ขายขาดทุน</p>
                  </div>
                  <Badge variant="destructive">ตรวจสอบ</Badge>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                สินค้ากำไรดีเด่น
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">ภาษี</p>
                    <p className="text-sm text-muted-foreground">ยอดขายสูงสุด</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">+463K</p>
                    <p className="text-sm text-muted-foreground">
                      11.6% margin
                    </p>
                  </div>
                </li>
                <li className="flex items-center justify-between py-2 border-b">
                  <div>
                    <p className="font-medium">Castrol MAG 10W-30</p>
                    <p className="text-sm text-muted-foreground">กำไรสูงสุด</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">+93K</p>
                    <p className="text-sm text-muted-foreground">63% margin</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>💡 คำแนะนำ</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  <span>พิจารณาปรับราคาสินค้าที่ขาดทุน หรือหยุดขายชั่วคราว</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  <span>เพิ่มสต็อกสินค้ากำไรดี เช่น Castrol MAG 10W-30</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  <span>ตรวจสอบต้นทุนสินค้าที่มี margin ต่ำกว่า 5%</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600">•</span>
                  <span>สินค้าบริการ (ภาษี, พรบ, ตรอ) ควรแยกหมวดต่างหาก</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
