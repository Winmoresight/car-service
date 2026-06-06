"use client";

/**
 * Deleted Bills Page - บิลที่ถูกลบ/ยกเลิก
 * แสดงรายการบิลที่ถูกลบ/ยกเลิกล่าสุด
 */

import { useState } from "react";
import useSWR from "swr";
import { Trash2, AlertTriangle, TrendingDown, FileX } from "lucide-react";
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

interface DeletedBill {
  numberPrint: string;
  originalDate: string;
  customerName: string;
  totalPrice: number;
  totalProfit: number;
  cash: number;
  transfer: number;
  status: string;
  userName: string;
}

interface DeletedSummary {
  totalDeleted: number;
  totalAmount: number;
  periodDays: number;
}

export default function DeletedBillsPage() {
  const [page, setPage] = useState(0);
  const [days, setDays] = useState(30);
  const limit = 20;

  // สร้าง URL สำหรับ API
  const buildApiUrl = () => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: (page * limit).toString(),
      days: days.toString(),
    });

    return `/api/bills/deleted?${params.toString()}`;
  };

  // Fetch deleted bills
  const { data, error, isLoading } = useSWR<
    ApiResponse<{
      data: DeletedBill[];
      summary: DeletedSummary;
      limit: number;
      offset: number;
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
  });

  const bills = data?.success && data?.data?.data ? data.data.data : [];
  const summary = data?.success && data?.data?.summary ? data.data.summary : null;
  const totalPages = summary ? Math.ceil(summary.totalDeleted / limit) : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDaysChange = (value: string) => {
    setDays(Number(value));
    setPage(0);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <Trash2 className="h-8 w-8 text-red-600" />
          บิลที่ถูกลบ/ยกเลิก
        </h1>
        <p className="text-muted-foreground mt-1 font-medium">
          รายการบิลที่ถูกลบหรือยกเลิก
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <KPICard
            title={`ลบ/ยกเลิกทั้งหมด (${summary.periodDays} วัน)`}
            value={summary.totalDeleted}
            icon={Trash2}
            variant="red"
            subtitle={`${summary.totalDeleted} บิล`}
          />
          <KPICard
            title="มูลค่าที่สูญเสีย"
            value={summary.totalAmount}
            format="currency"
            icon={TrendingDown}
            variant="orange"
          />
          <KPICard
            title="เฉลี่ยต่อบิล"
            value={summary.totalDeleted > 0 ? summary.totalAmount / summary.totalDeleted : 0}
            format="currency"
            icon={FileX}
            variant="purple"
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">
                ช่วงเวลาย้อนหลัง
              </label>
              <Select value={days.toString()} onValueChange={handleDaysChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 วันล่าสุด</SelectItem>
                  <SelectItem value="30">30 วันล่าสุด</SelectItem>
                  <SelectItem value="60">60 วันล่าสุด</SelectItem>
                  <SelectItem value="90">90 วันล่าสุด</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Warning */}
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-bold">คำเตือน</p>
              <p className="mt-1">
                บิลที่ถูกลบ/ยกเลิกจะไม่นับรวมในยอดขายและกำไร แต่จะบันทึกไว้เพื่อการตรวจสอบ
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deleted Bills Table */}
      <Card className="border-none shadow-sm ring-1 ring-border/50 overflow-hidden">
        <CardHeader className="bg-red-50 border-b border-red-100">
          <CardTitle className="text-xl font-bold tracking-tight text-red-900">
            รายการบิลที่ลบ/ยกเลิก
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error || (data && !data.success) ? (
            <div className="text-center py-12">
              <p className="text-red-600 font-bold text-lg">
                เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="font-bold text-xs uppercase tracking-wider">
                        เลขที่บิล
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">
                        วันที่ออกบิล
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">
                        ลูกค้า
                      </TableHead>
                      <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                        ยอดขาย
                      </TableHead>
                      <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                        กำไร
                      </TableHead>
                      <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                        การชำระ
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">
                        ผู้ทำรายการ
                      </TableHead>
                      <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                        สถานะ
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <Trash2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground font-medium">
                            ไม่พบบิลที่ถูกลบ/ยกเลิก
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            ใน {days} วันล่าสุด
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      bills.map((bill) => (
                        <TableRow
                          key={bill.numberPrint}
                          className="hover:bg-red-50/50 transition-all duration-200 border-border/40"
                        >
                          <TableCell className="font-mono font-bold text-red-600">
                            {bill.numberPrint}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {formatDate(bill.originalDate)}
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-foreground text-sm">
                              {bill.customerName}
                            </p>
                          </TableCell>
                          <TableCell className="text-right font-bold text-muted-foreground line-through">
                            {formatCurrency(bill.totalPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "font-bold line-through",
                                bill.totalProfit >= 0
                                  ? "text-emerald-600"
                                  : "text-red-600"
                              )}
                            >
                              {formatCurrency(bill.totalProfit)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1.5 justify-center">
                              {bill.cash > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-gray-100 text-gray-500 border-gray-300 text-[10px] line-through"
                                >
                                  สด {formatCurrency(bill.cash)}
                                </Badge>
                              )}
                              {bill.transfer > 0 && (
                                <Badge
                                  variant="outline"
                                  className="bg-gray-100 text-gray-500 border-gray-300 text-[10px] line-through"
                                >
                                  โอน {formatCurrency(bill.transfer)}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {bill.userName}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-red-100 text-red-700 border-red-300">
                              {bill.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-muted/5 border-t border-border/40">
                  <p className="text-sm text-muted-foreground font-medium">
                    แสดง{" "}
                    <span className="text-foreground font-bold">
                      {page * limit + 1}
                    </span>
                    -
                    <span className="text-foreground font-bold">
                      {Math.min((page + 1) * limit, summary?.totalDeleted || 0)}
                    </span>{" "}
                    จาก{" "}
                    <span className="text-foreground font-bold">
                      {summary?.totalDeleted.toLocaleString()}
                    </span>{" "}
                    บิล
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                      className="font-bold h-8"
                    >
                      ← ก่อนหน้า
                    </Button>
                    <div className="flex items-center gap-1 px-4 text-sm font-bold">
                      Page {page + 1} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage(Math.min(totalPages - 1, page + 1))
                      }
                      disabled={page >= totalPages - 1}
                      className="font-bold h-8"
                    >
                      ถัดไป →
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
