"use client";

/**
 * Sales Page - หน้ายอดขาย
 * แสดงรายการบิลขายจากฐานข้อมูลจริง พร้อม filter และค้นหา
 */

import { useState } from "react";
import useSWR from "swr";
import { Search, Download, X } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { SaleDetailDialog } from "@/components/sales/sale-detail-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import type { ApiResponse } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface SaleItem {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  totalProfit: number;
  cash: number;
  transfer: number;
  itemCount: number;
}

export default function SalesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const limit = 20;

  // สร้าง URL สำหรับ API พร้อม query parameters
  const buildApiUrl = () => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: (page * limit).toString(),
    });

    if (searchTerm) {
      params.append("search", searchTerm);
    }

    if (dateRange?.from) {
      params.append("startDate", format(dateRange.from, "yyyy-MM-dd"));
    }

    if (dateRange?.to) {
      params.append("endDate", format(dateRange.to, "yyyy-MM-dd"));
    }

    return `/api/sales?${params.toString()}`;
  };

  // Fetch sales data
  const { data, error, isLoading } = useSWR<
    ApiResponse<{
      sales: SaleItem[];
      total: number;
      limit: number;
      offset: number;
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
    onError: (err) => {
      console.error("SWR Error:", err);
    },
  });

  const sales = data?.success && data?.data?.sales ? data.data.sales : [];
  const total = data?.success && data?.data?.total ? data.data.total : 0;
  const totalPages = Math.ceil(total / limit);

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

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0); // Reset to first page
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(0); // Reset to first page
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDateRange(undefined);
    setPage(0);
  };

  const hasActiveFilters = searchTerm || dateRange?.from || dateRange?.to;

  const handleViewSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedSaleId(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ยอดขาย</h1>
        <p className="text-muted-foreground mt-1">
          รายการบิลขายทั้งหมด ({total.toLocaleString()} บิล)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              บิลทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ตั้งแต่ ก.พ. 2025
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ยอดขายรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿13.8M</div>
            <p className="text-xs text-green-600 mt-1">+12.5% จากเดือนก่อน</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              กำไรรวม
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿1.12M</div>
            <p className="text-xs text-muted-foreground mt-1">8.1% margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* First Row: Search and Date Range */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาเลขที่บิล หรือชื่อลูกค้า..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Date Range Picker */}
              <DateRangePicker
                dateRange={dateRange}
                onDateRangeChange={handleDateRangeChange}
                placeholder="เลือกช่วงวันที่"
              />

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  ล้างตัวกรอง
                </Button>
              )}

              {/* Export Button */}
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>ตัวกรองที่เปิดใช้งาน:</span>
                {searchTerm && (
                  <Badge variant="secondary">ค้นหา: {searchTerm}</Badge>
                )}
                {dateRange?.from && (
                  <Badge variant="secondary">
                    {format(dateRange.from, "d MMM yyyy")}
                    {dateRange.to && ` - ${format(dateRange.to, "d MMM yyyy")}`}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการบิลขาย</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error || (data && !data.success) ? (
            <div className="text-center py-8">
              <p className="text-red-600 font-semibold">
                เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {error?.message || "Unknown error"}
              </p>
              {data && !data.success && (
                <p className="text-sm text-muted-foreground mt-1">
                  API Error: {data.error}
                </p>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่บิล</TableHead>
                    <TableHead>วันที่</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead className="text-right">รายการ</TableHead>
                    <TableHead className="text-right">ยอดขาย</TableHead>
                    <TableHead className="text-right">กำไร</TableHead>
                    <TableHead className="text-center">การชำระ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-muted-foreground">ไม่พบข้อมูล</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sales.map((sale) => (
                      <TableRow
                        key={sale.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleViewSale(sale.id)}
                      >
                        <TableCell className="font-medium">{sale.id}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(sale.date)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sale.customerName}</p>
                            {sale.customerPhone && (
                              <p className="text-xs text-muted-foreground">
                                {sale.customerPhone}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {sale.itemCount}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(sale.totalPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              sale.totalProfit >= 0
                                ? "text-green-600 font-medium"
                                : "text-red-600 font-medium"
                            }
                          >
                            {formatCurrency(sale.totalProfit)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            {sale.cash > 0 && (
                              <Badge variant="default">สด</Badge>
                            )}
                            {sale.transfer > 0 && (
                              <Badge variant="secondary">โอน</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    แสดง {page * limit + 1}-
                    {Math.min((page + 1) * limit, total)} จาก {total} บิล
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={page === 0}
                    >
                      ← ก่อนหน้า
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage(Math.min(totalPages - 1, page + 1))
                      }
                      disabled={page >= totalPages - 1}
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

      {/* Sale Detail Dialog */}
      <SaleDetailDialog
        saleId={selectedSaleId}
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
