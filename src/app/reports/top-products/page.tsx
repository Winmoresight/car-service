"use client";

/**
 * Top Products Report Page - รายงานสินค้าขายดี
 * แสดงสินค้าขายดี Top 10 รายเดือน พร้อมสถิติ
 */

import { useState } from "react";
import useSWR from "swr";
import { TrendingUp, Trophy, ShoppingCart, DollarSign, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KPICard } from "@/components/dashboard/kpi-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiResponse } from "@/types/api";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface TopSellingProduct {
  rank: number;
  productName: string;
  barcode: string;
  salesCount: number;
  totalQuantity: number;
  totalSales: number;
  totalProfit: number;
  profitMargin: number;
}

interface MonthlySummary {
  period: string;
  totalProducts: number;
  totalSales: number;
  totalProfit: number;
  averageProfitMargin: number;
}

export default function TopProductsReportPage() {
  const currentDate = new Date();
  const [month, setMonth] = useState((currentDate.getMonth() + 1).toString());
  const [year, setYear] = useState(currentDate.getFullYear().toString());
  const [limit, setLimit] = useState(10);

  // สร้าง URL สำหรับ API
  const buildApiUrl = () => {
    const params = new URLSearchParams({
      month: month,
      year: year,
      limit: limit.toString(),
    });

    return `/api/products/top-selling?${params.toString()}`;
  };

  // Fetch top products
  const { data, error, isLoading } = useSWR<
    ApiResponse<{
      data: TopSellingProduct[];
      summary: MonthlySummary;
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
  });

  const products = data?.success && data?.data?.data ? data.data.data : [];
  const summary = data?.success && data?.data?.summary ? data.data.summary : null;

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

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0">
          🥇 อันดับ {rank}
        </Badge>
      );
    } else if (rank === 2) {
      return (
        <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-white border-0">
          🥈 อันดับ {rank}
        </Badge>
      );
    } else if (rank === 3) {
      return (
        <Badge className="bg-gradient-to-r from-orange-400 to-orange-600 text-white border-0">
          🥉 อันดับ {rank}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="font-bold">
        อันดับ {rank}
      </Badge>
    );
  };

  const getProfitMarginColor = (margin: number) => {
    if (margin >= 20) return "text-green-600";
    if (margin >= 10) return "text-emerald-600";
    if (margin >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  // สร้าง options สำหรับเดือน
  const months = [
    { value: "1", label: "มกราคม" },
    { value: "2", label: "กุมภาพันธ์" },
    { value: "3", label: "มีนาคม" },
    { value: "4", label: "เมษายน" },
    { value: "5", label: "พฤษภาคม" },
    { value: "6", label: "มิถุนายน" },
    { value: "7", label: "กรกฎาคม" },
    { value: "8", label: "สิงหาคม" },
    { value: "9", label: "กันยายน" },
    { value: "10", label: "ตุลาคม" },
    { value: "11", label: "พฤศจิกายน" },
    { value: "12", label: "ธันวาคม" },
  ];

  // สร้าง options สำหรับปี
  const years = Array.from({ length: 5 }, (_, i) => {
    const y = currentDate.getFullYear() - i;
    return { value: y.toString(), label: (y + 543).toString() };
  });

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-600" />
          สินค้าขายดี Top 10
        </h1>
        <p className="text-muted-foreground mt-1 font-medium">
          รายงานสินค้าขายดีรายเดือน
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">เดือน</label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">ปี</label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.value} value={y.value}>
                      {y.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">จำนวน</label>
              <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" className="gap-2 w-full md:w-auto">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-4">
          <KPICard
            title="สินค้าทั้งหมด"
            value={summary.totalProducts}
            icon={ShoppingCart}
            variant="blue"
            subtitle={`ในเดือน${summary.period}`}
          />
          <KPICard
            title="ยอดขายรวม"
            value={summary.totalSales}
            format="currency"
            icon={DollarSign}
            variant="purple"
          />
          <KPICard
            title="กำไรรวม"
            value={summary.totalProfit}
            format="currency"
            icon={TrendingUp}
            variant="emerald"
          />
          <KPICard
            title="เฉลี่ย Margin"
            value={summary.averageProfitMargin}
            format="percent"
            icon={TrendingUp}
            variant="orange"
          />
        </div>
      )}

      {/* Top Products Table */}
      <Card className="border-none shadow-sm ring-1 ring-border/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 border-b border-yellow-100">
          <CardTitle className="text-xl font-bold tracking-tight">
            🏆 สินค้าขายดี {summary?.period}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error || (data && !data.success) ? (
            <div className="text-center py-12">
              <p className="text-red-600 font-bold text-lg">
                เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="font-bold text-xs uppercase tracking-wider w-[100px]">
                      อันดับ
                    </TableHead>
                    <TableHead className="font-bold text-xs uppercase tracking-wider">
                      สินค้า
                    </TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                      ขายได้
                    </TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                      จำนวน
                    </TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                      ยอดขาย
                    </TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                      กำไร
                    </TableHead>
                    <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                      % กำไร
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-16">
                        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground font-medium">
                          ไม่พบข้อมูลสินค้าขายดี
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          ในเดือนที่เลือก
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow
                        key={product.rank}
                        className={cn(
                          "transition-all duration-200 border-border/40",
                          product.rank <= 3
                            ? "bg-gradient-to-r from-yellow-50/50 to-transparent hover:from-yellow-100/50"
                            : "hover:bg-muted/20"
                        )}
                      >
                        <TableCell>{getRankBadge(product.rank)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-bold text-foreground">
                              {product.productName}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {product.barcode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-600">
                          {formatNumber(product.salesCount)} ครั้ง
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatNumber(product.totalQuantity)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-lg text-foreground">
                          {formatCurrency(product.totalSales)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">
                          {formatCurrency(product.totalProfit)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-bold text-sm",
                              getProfitMarginColor(product.profitMargin)
                            )}
                          >
                            {product.profitMargin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
