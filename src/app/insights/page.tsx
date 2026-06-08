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
import { LossAlertTable } from "@/components/dashboard/loss-alert-table";
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
import type { ApiResponse, LossProduct } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="Insights & Alerts" href="/insights" />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

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
        <LossAlertTable products={lossProducts} />

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
