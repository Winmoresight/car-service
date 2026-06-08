"use client";

/**
 * Stock Page - หน้าสต็อก
 * แสดงสถานะสต็อกและการเคลื่อนไหวจากฐานข้อมูลจริง
 */

import {
  AlertCircle,
  Clock,
  Package,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ApiResponse } from "@/types/api";
import { outfit } from "@/components/fonts/fonts";

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
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="สต็อก" href="/stock" />

      <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm">
          <div className="flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold">สต็อก</span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  ติดตามสถานะสต็อกและการเคลื่อนไหวสินค้า
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="สินค้าในสต็อก"
              value={totalItems}
              subtitle="รายการสินค้า"
              icon={Package}
              variant="blue"
            />
            <KPICard
              title="สินค้าเข้า"
              value={stockIn}
              subtitle="ล่าสุด"
              icon={TrendingUp}
              variant="emerald"
            />
            <KPICard
              title="สินค้าออก"
              value={stockOut}
              subtitle="ล่าสุด"
              icon={TrendingDown}
              variant="purple"
            />
            <KPICard
              title="สต็อกต่ำ"
              value={lowStock}
              subtitle="ต้องสั่งเพิ่ม"
              icon={AlertCircle}
              variant="orange"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex w-full flex-col gap-4"
        >
          <TabsList className="w-full justify-start">
            <TabsTrigger value="summary">สรุปสต็อก</TabsTrigger>
            <TabsTrigger value="movements">การเคลื่อนไหว</TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="w-full mt-0">
            <div className="rounded-3xl border bg-white p-4">
              <div className="mb-4 px-2">
                <h3 className="text-charcoal text-lg font-bold min-[500px]:text-xl">สรุปสต็อกสินค้า</h3>
              </div>
              {summaryLoading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <Table className="overflow-hidden rounded-2xl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-charcoal w-[120px] text-base font-bold min-[500px]:text-lg">บาร์โค้ด</TableHead>
                      <TableHead className="text-charcoal text-base font-bold min-[500px]:text-lg">ชื่อสินค้า</TableHead>
                      <TableHead className="text-charcoal text-right text-base font-bold min-[500px]:text-lg">สต็อกปัจจุบัน</TableHead>
                      <TableHead className="text-charcoal hidden text-right text-base font-bold min-[798px]:table-cell min-[500px]:text-lg">การเคลื่อนไหว</TableHead>
                      <TableHead className="text-charcoal hidden text-base font-bold min-[1024px]:table-cell min-[500px]:text-lg">อัปเดตล่าสุด</TableHead>
                      <TableHead className="text-charcoal text-right text-base font-bold min-[500px]:text-lg">สถานะ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <p className="text-muted-foreground font-medium text-base">ไม่พบข้อมูล</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      stockItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className={`${outfit.className} text-charcoal font-semibold text-sm min-[500px]:text-base`}>
                            {item.barCode}
                          </TableCell>
                          <TableCell>
                            <span className="text-charcoal max-w-[120px] truncate text-sm font-semibold min-[400px]:max-w-[150px] min-[500px]:max-w-[200px] min-[500px]:text-base block">
                              {item.name}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`${outfit.className} text-charcoal text-right text-sm font-semibold min-[500px]:text-base`}>
                              {item.currentStock}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-right min-[798px]:table-cell">
                            <span className={`${outfit.className} text-charcoal/80 text-sm font-medium`}>
                              {item.movements} ครั้ง
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-sm text-charcoal/80 font-medium min-[1024px]:table-cell">
                            {formatDate(item.lastUpdate)}
                          </TableCell>
                          <TableCell className="text-right align-middle">
                            {item.currentStock < 5 ? (
                              <>
                                <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600/80 p-1 min-[650px]:hidden">
                                  <AlertCircle size={16} strokeWidth={2.5} className="text-white" />
                                </div>
                                <div className="hidden items-center justify-center rounded-full bg-red-100 px-4 py-1 min-[650px]:inline-flex">
                                  <span className="font-semibold text-red-700">สต็อกต่ำ</span>
                                </div>
                              </>
                            ) : item.currentStock < 20 ? (
                              <>
                                <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/80 p-1 min-[650px]:hidden">
                                  <AlertCircle size={16} strokeWidth={2.5} className="text-white" />
                                </div>
                                <div className="hidden items-center justify-center rounded-full bg-orange-100 px-4 py-1 min-[650px]:inline-flex">
                                  <span className="font-semibold text-orange-700">ใกล้หมด</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-green-600/80 p-1 min-[650px]:hidden">
                                  <Package size={16} strokeWidth={2.5} className="text-white" />
                                </div>
                                <div className="hidden items-center justify-center rounded-full bg-green-100 px-4 py-1 min-[650px]:inline-flex">
                                  <span className="font-semibold text-green-700">ปกติ</span>
                                </div>
                              </>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movements" className="w-full mt-0">
            <div className="rounded-3xl border bg-white p-4">
              <div className="mb-4 px-2">
                <h3 className="text-charcoal text-lg font-bold min-[500px]:text-xl">การเคลื่อนไหวสต็อก</h3>
              </div>
              {movementsLoading ? (
                <div className="space-y-3">
                  {[...Array(10)].map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <Table className="overflow-hidden rounded-2xl">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-charcoal text-base font-bold min-[500px]:text-lg">วันที่</TableHead>
                      <TableHead className="text-charcoal hidden text-base font-bold min-[1024px]:table-cell min-[500px]:text-lg">บาร์โค้ด</TableHead>
                      <TableHead className="text-charcoal text-base font-bold min-[500px]:text-lg">ชื่อสินค้า</TableHead>
                      <TableHead className="text-charcoal hidden text-center text-base font-bold min-[650px]:table-cell min-[500px]:text-lg">ประเภท</TableHead>
                      <TableHead className="text-charcoal text-right text-base font-bold min-[500px]:text-lg">จำนวน</TableHead>
                      <TableHead className="text-charcoal hidden text-right text-base font-bold min-[798px]:table-cell min-[500px]:text-lg">คงเหลือ</TableHead>
                      <TableHead className="text-charcoal hidden text-base font-bold min-[1024px]:table-cell min-[500px]:text-lg">บริษัท</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <p className="text-muted-foreground font-medium text-base">ไม่พบข้อมูล</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      movements.map((movement, index) => (
                        <TableRow key={`${movement.barCode}-${index}`}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-charcoal text-sm font-semibold min-[500px]:text-base">
                                {formatDate(movement.date).split(' ')[0]}
                              </span>
                              <span className="text-charcoal/60 text-xs font-medium">
                                {formatDate(movement.date).split(' ').slice(1).join(' ')}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden font-mono text-sm min-[1024px]:table-cell text-charcoal/80 font-medium">
                            {movement.barCode}
                          </TableCell>
                          <TableCell>
                            <span className="text-charcoal max-w-[100px] truncate text-sm font-semibold min-[400px]:max-w-[150px] min-[500px]:max-w-[200px] min-[500px]:text-base block">
                              {movement.name}
                            </span>
                            <div className="mt-1 flex items-center min-[650px]:hidden">
                               {movement.type === "in" ? (
                                  <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">เข้า</span>
                               ) : (
                                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">ออก</span>
                               )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden text-center align-middle min-[650px]:table-cell">
                            {movement.type === "in" ? (
                              <div className="inline-flex items-center justify-center rounded-full bg-green-100 px-4 py-1">
                                <span className="font-semibold text-green-700">เข้า</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center rounded-full bg-blue-100 px-4 py-1">
                                <span className="font-semibold text-blue-700">ออก</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`${outfit.className} text-sm font-bold min-[500px]:text-base ${
                              movement.type === "in" ? "text-green-600" : "text-blue-600"
                            }`}>
                              {movement.type === "in" ? "+" : "-"}{movement.quantity}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-right min-[798px]:table-cell">
                            <span className={`${outfit.className} text-charcoal text-sm font-semibold min-[500px]:text-base`}>
                              {movement.stock}
                            </span>
                          </TableCell>
                          <TableCell className="hidden text-sm text-charcoal/80 font-medium min-[1024px]:table-cell">
                            {movement.company || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
