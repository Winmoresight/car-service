"use client";

/**
 * Cash Invoices Page - ใบกำกับภาษีเงินสดหน้าร้าน (PSC)
 * แสดงรายการใบกำกับภาษีเงินสดที่มีรหัสขึ้นต้นด้วย psc จาก DetailSalePost
 */

import { useState } from "react";
import useSWR from "swr";
import { Search, Download, X, FileText, Receipt, ShoppingCart, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { KPICard } from "@/components/dashboard/kpi-card";
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

interface CashInvoice {
  invoiceNo: string;
  dateSalePost: string;
  customerCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalAmount: number;
  userName: string;
  typeSale: string;
}

export default function CashInvoicesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
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

    return `/api/cash-invoices?${params.toString()}`;
  };

  // Fetch cash invoices data
  const { data, error, isLoading } = useSWR<
    ApiResponse<{
      cashInvoices: CashInvoice[];
      total: number;
      limit: number;
      offset: number;
      summary: {
        totalAmount: number;
        totalInvoices: number;
        totalQuantity: number;
      };
    }>
  >(buildApiUrl(), fetcher, {
    refreshInterval: 60000,
  });

  const cashInvoices =
    data?.success && data?.data?.cashInvoices ? data.data.cashInvoices : [];
  const total = data?.success && data?.data?.total ? data.data.total : 0;
  const summary = data?.success && data?.data?.summary ? data.data.summary : {
    totalAmount: 0,
    totalInvoices: 0,
    totalQuantity: 0,
  };
  const totalPages = Math.ceil(total / limit);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
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
    setPage(0);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(0);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDateRange(undefined);
    setPage(0);
  };

  const hasActiveFilters = searchTerm || dateRange?.from || dateRange?.to;

  const getStatusBadge = (typeSale: string) => {
    // TypeSale: '1' = ตรอ, '2' = พรบ, '3' = ภาษี, '4' = บริการ, '25' = อะไหล่
    const typeMap: Record<string, { label: string; color: string }> = {
      '1': { label: 'ตรอ', color: 'bg-blue-100 text-blue-700 border-blue-300' },
      '2': { label: 'พรบ', color: 'bg-purple-100 text-purple-700 border-purple-300' },
      '3': { label: 'ภาษี', color: 'bg-orange-100 text-orange-700 border-orange-300' },
      '4': { label: 'บริการ', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
      '25': { label: 'อะไหล่', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
    };

    const type = typeMap[typeSale];
    if (type) {
      return (
        <Badge className={type.color}>
          {type.label}
        </Badge>
      );
    }
    
    return <Badge variant="outline">{typeSale || '-'}</Badge>;
  };

  // Group by invoice number for better display
  const groupedInvoices = cashInvoices.reduce((acc, invoice) => {
    if (!acc[invoice.invoiceNo]) {
      acc[invoice.invoiceNo] = [];
    }
    acc[invoice.invoiceNo].push(invoice);
    return acc;
  }, {} as Record<string, CashInvoice[]>);

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          ใบกำกับภาษีเงินสดหน้าร้าน (PSC)
        </h1>
        <p className="text-muted-foreground mt-1 font-medium">
          รายการใบกำกับภาษีเงินสดทั้งหมด ({total.toLocaleString()} รายการ)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="ใบกำกับทั้งหมด"
          value={summary.totalInvoices}
          icon={FileText}
          variant="blue"
          subtitle={`${summary.totalInvoices} ใบ`}
        />
        <KPICard
          title="รายการทั้งหมด"
          value={total}
          icon={Receipt}
          variant="purple"
          subtitle={`${total} รายการ`}
        />
        <KPICard
          title="จำนวนสินค้า"
          value={summary.totalQuantity}
          icon={ShoppingCart}
          variant="emerald"
          subtitle={`${summary.totalQuantity.toLocaleString()} ชิ้น`}
        />
        <KPICard
          title="ยอดขายรวม"
          value={summary.totalAmount}
          format="currency"
          icon={TrendingUp}
          variant="orange"
        />
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
                  placeholder="ค้นหาเลขที่บิล, รหัสลูกค้า, ชื่อสินค้า..."
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

              {/* Clear Filters */}
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

              {/* Export */}
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

      {/* Cash Invoices Table */}
      <Card className="border-none shadow-sm ring-1 ring-border/50 overflow-hidden">
        <CardHeader className="bg-muted/5 border-b border-border/40">
          <CardTitle className="text-xl font-bold tracking-tight">
            รายการใบกำกับภาษีเงินสด (PSC)
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
                        วันที่/เวลา
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">
                        รหัสลูกค้า
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">
                        สินค้า/บริการ
                      </TableHead>
                      <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                        จำนวน
                      </TableHead>
                      <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                        ราคา/หน่วย
                      </TableHead>
                      <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                        ส่วนลด
                      </TableHead>
                      <TableHead className="text-right font-bold text-xs uppercase tracking-wider">
                        ยอดรวม
                      </TableHead>
                      <TableHead className="text-center font-bold text-xs uppercase tracking-wider">
                        ประเภท
                      </TableHead>
                      <TableHead className="font-bold text-xs uppercase tracking-wider">
                        ผู้บันทึก
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-16">
                          <p className="text-muted-foreground font-medium">
                            ไม่พบข้อมูลใบกำกับภาษีเงินสด
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      cashInvoices.map((invoice, index) => (
                        <TableRow
                          key={`${invoice.invoiceNo}-${index}`}
                          className="hover:bg-muted/20 transition-all duration-200 border-border/40"
                        >
                          <TableCell className="font-mono font-bold text-primary">
                            {invoice.invoiceNo}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                            {formatDate(invoice.dateSalePost)}
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {invoice.customerCode || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {invoice.productName || "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-foreground">
                            {invoice.quantity.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-medium text-muted-foreground">
                            {formatCurrency(invoice.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-orange-600">
                            {invoice.discount > 0 ? formatCurrency(invoice.discount) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg text-foreground">
                            {formatCurrency(invoice.totalAmount)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getStatusBadge(invoice.typeSale)}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {invoice.userName}
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
                      {Math.min((page + 1) * limit, total)}
                    </span>{" "}
                    จาก{" "}
                    <span className="text-foreground font-bold">
                      {total.toLocaleString()}
                    </span>{" "}
                    รายการ
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
