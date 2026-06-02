"use client";

/**
 * Stock Page - หน้าสต็อก
 * แสดงสถานะสต็อกและการเคลื่อนไหวจากฐานข้อมูลจริง
 */

import { useState } from "react";
import useSWR from "swr";
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiResponse } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface StockItem {
  barCode: string;
  name: string;
  currentStock: number;
  lastUpdate: string;
  movements: number;
}

interface StockMovement {
  barCode: string;
  name: string;
  date: string;
  type: "in" | "out";
  quantity: number;
  stock: number;
  company?: string;
}

export default function StockPage() {
  const [activeTab, setActiveTab] = useState("summary");

  // Fetch stock summary
  const { data: summaryData, isLoading: summaryLoading } = useSWR<
    ApiResponse<StockItem[]>
  >("/api/stock?type=summary&limit=50", fetcher, { refreshInterval: 30000 });

  // Fetch recent movements
  const { data: movementsData, isLoading: movementsLoading } = useSWR<
    ApiResponse<StockMovement[]>
  >("/api/stock?type=movements&limit=100", fetcher, { refreshInterval: 30000 });

  const stockItems =
    summaryData?.success && summaryData.data ? summaryData.data : [];
  const movements =
    movementsData?.success && movementsData.data ? movementsData.data : [];

  // Calculate stats
  const totalItems = stockItems.length;
  const stockIn = movements.filter((m) => m.type === "in").length;
  const stockOut = movements.filter((m) => m.type === "out").length;
  const lowStock = stockItems.filter((item) => item.currentStock < 5).length;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">สต็อก</h1>
        <p className="text-muted-foreground mt-1">
          ติดตามสถานะสต็อกและการเคลื่อนไหวสินค้า
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              สินค้าในสต็อก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground mt-1">รายการสินค้า</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              สินค้าเข้า
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stockIn}</div>
            <p className="text-xs text-muted-foreground mt-1">ล่าสุด</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              สินค้าออก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stockOut}</div>
            <p className="text-xs text-muted-foreground mt-1">ล่าสุด</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              สต็อกต่ำ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStock}</div>
            <p className="text-xs text-muted-foreground mt-1">ต้องสั่งเพิ่ม</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="summary">สรุปสต็อก</TabsTrigger>
          <TabsTrigger value="movements">การเคลื่อนไหว</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>สรุปสต็อกสินค้า</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>บาร์โค้ด</TableHead>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead className="text-right">
                        สต็อกปัจจุบัน
                      </TableHead>
                      <TableHead className="text-right">
                        การเคลื่อนไหว
                      </TableHead>
                      <TableHead>อัปเดตล่าสุด</TableHead>
                      <TableHead>สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <p className="text-muted-foreground">ไม่พบข้อมูล</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">
                            {item.barCode}
                          </TableCell>
                          <TableCell className="font-medium">
                            {item.name}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {item.currentStock}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {item.movements} ครั้ง
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(item.lastUpdate)}
                          </TableCell>
                          <TableCell>
                            {item.currentStock < 5 ? (
                              <Badge variant="destructive">สต็อกต่ำ</Badge>
                            ) : item.currentStock < 20 ? (
                              <Badge variant="secondary">ใกล้หมด</Badge>
                            ) : (
                              <Badge variant="default">ปกติ</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>การเคลื่อนไหวสต็อก</CardTitle>
            </CardHeader>
            <CardContent>
              {movementsLoading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>วันที่</TableHead>
                      <TableHead>บาร์โค้ด</TableHead>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead>ประเภท</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead className="text-right">สต็อกคงเหลือ</TableHead>
                      <TableHead>บริษัท</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-muted-foreground">ไม่พบข้อมูล</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map((movement, index) => (
                        <TableRow key={`${movement.barCode}-${index}`}>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-muted-foreground" />
                              {formatDate(movement.date)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {movement.barCode}
                          </TableCell>
                          <TableCell className="font-medium">
                            {movement.name}
                          </TableCell>
                          <TableCell>
                            {movement.type === "in" ? (
                              <Badge variant="default" className="bg-green-600">
                                เข้า
                              </Badge>
                            ) : (
                              <Badge variant="secondary">ออก</Badge>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-medium ${
                              movement.type === "in"
                                ? "text-green-600"
                                : "text-blue-600"
                            }`}
                          >
                            {movement.type === "in" ? "+" : "-"}
                            {movement.quantity}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {movement.stock}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {movement.company || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
