"use client";

/**
 * Products Page - หน้าสินค้า
 * แสดงรายการสินค้าพร้อมสถานะสต็อก
 */

import {
  AlertTriangle,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ApiResponse, TopProduct } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch top products
  const { data: topProductsData } = useSWR<ApiResponse<TopProduct[]>>(
    "/api/products/top?limit=50&sortBy=sales",
    fetcher,
    { refreshInterval: 60000 },
  );

  const products =
    topProductsData?.success && topProductsData.data
      ? topProductsData.data
      : [];

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

  // Filter products
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculate stats
  const totalProducts = products.length;
  const avgProfitMargin =
    products.reduce((sum, p) => sum + p.profitMargin, 0) / totalProducts || 0;
  const highMarginCount = products.filter((p) => p.profitMargin >= 10).length;
  const lowMarginCount = products.filter((p) => p.profitMargin < 5).length;

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="สินค้า" href="/products" />
      <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm">
          <div className="flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex min-h-12 min-w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Package className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold tracking-tight">
                  สินค้า
                </span>
                <p className="text-foreground font-medium">
                  จัดการและติดตามสินค้าทั้งหมด
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="สินค้าทั้งหมด"
              value={totalProducts}
              icon={Package}
              variant="blue"
            />
            <KPICard
              title="กำไรดี"
              value={highMarginCount}
              subtitle="≥10% margin"
              icon={TrendingUp}
              variant="emerald"
            />
            <KPICard
              title="กำไรต่ำ"
              value={lowMarginCount}
              subtitle="<5% margin"
              icon={TrendingDown}
              variant="orange"
            />
            <KPICard
              title="เฉลี่ย Margin"
              value={avgProfitMargin}
              format="percent"
              icon={AlertTriangle}
              variant="purple"
            />
          </div>
        </div>

        {/* Filters & Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่อสินค้า..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Table with Tabs */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
                <TabsTrigger value="top">ขายดี</TabsTrigger>
                <TabsTrigger value="profit">กำไรสูง</TabsTrigger>
                <TabsTrigger value="low-margin">Margin ต่ำ</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>สินค้า</TableHead>
                  <TableHead className="text-right">ยอดขาย</TableHead>
                  <TableHead className="text-right">กำไร</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right">% กำไร</TableHead>
                  <TableHead className="text-right">สถานะ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">ไม่พบข้อมูล</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts
                    .filter((product) => {
                      if (activeTab === "top") return product.sales > 100000;
                      if (activeTab === "profit") return product.profit > 10000;
                      if (activeTab === "low-margin")
                        return product.profitMargin < 5;
                      return true;
                    })
                    .map((product, index) => (
                      <TableRow key={`${product.name}-${index}`}>
                        <TableCell className="font-medium">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(product.sales)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              product.profit >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {formatCurrency(product.profit)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatNumber(product.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              product.profitMargin >= 10
                                ? "default"
                                : product.profitMargin >= 5
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {product.profitMargin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              product.profitMargin >= 10
                                ? "default"
                                : "secondary"
                            }
                          >
                            {product.profitMargin >= 10 ? "ดีมาก" : "ปกติ"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
