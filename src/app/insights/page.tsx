"use client";

/**
 * Insights Page - หน้า Insights/Alerts
 * แสดงการวิเคราะห์และแจ้งเตือนที่สำคัญ
 */

import useSWR from "swr";
import {
  AlertTriangle,
  TrendingDown,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LossAlertTable } from "@/components/dashboard/loss-alert-table";
import type { ApiResponse, LossProduct } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function InsightsPage() {
  // Fetch loss products
  const { data: lossProductsData } = useSWR<ApiResponse<LossProduct[]>>(
    "/api/products/loss?limit=20",
    fetcher,
    { refreshInterval: 60000 },
  );

  const lossProducts = lossProductsData?.data || [];
  const totalLoss = lossProducts.reduce((sum, p) => sum + p.profit, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Insights & Alerts</h1>
        <p className="text-muted-foreground mt-1">การวิเคราะห์และแจ้งเตือนที่สำคัญ</p>
      </div>

      {/* Alert Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              รายการขาดทุน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {lossProducts.length}
            </div>
            <p className="text-xs text-red-600 mt-1">
              {formatCurrency(totalLoss)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              ยอดขายตก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">3</div>
            <p className="text-xs text-yellow-600 mt-1">วันที่ผิดปกติ</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              สต็อกต่ำ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">12</div>
            <p className="text-xs text-orange-600 mt-1">ต้องสั่งเพิ่ม</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              สินค้าดีเด่น
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">45</div>
            <p className="text-xs text-green-600 mt-1">กำไร &gt;15%</p>
          </CardContent>
        </Card>
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
                  <p className="text-sm text-muted-foreground">ต้นทุนสูงกว่าปกติ</p>
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
                  <p className="text-sm text-muted-foreground">11.6% margin</p>
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
  );
}
