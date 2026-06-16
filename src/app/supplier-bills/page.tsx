"use client";

/**
 * Supplier Bills Page - รายการบิลคู่ค้า / ซื้อเข้า
 */

import {
  Building2,
  CheckCircle2,
  CircleHelp,
  ClipboardList,
  Clock3,
  ReceiptText,
  Search,
  Truck,
  X,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  ApiResponse,
  SupplierBill,
  SupplierBillPaymentState,
  SupplierBillsPayload,
} from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const zeroPayload: SupplierBillsPayload = {
  sourceTable: null,
  detailTable: null,
  items: [],
  summary: {
    billCount: 0,
    supplierCount: 0,
    totalAmount: 0,
    paidCount: 0,
    paidAmount: 0,
    unpaidCount: 0,
    unpaidAmount: 0,
    unknownStatusCount: 0,
    detailItemCount: 0,
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH").format(value || 0);
}

function formatDateParts(dateString: string | null) {
  if (!dateString) {
    return { date: "-", time: "" };
  }

  const parsedDate = new Date(dateString);

  if (Number.isNaN(parsedDate.getTime())) {
    return { date: "-", time: "" };
  }

  return {
    date: parsedDate.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    time: parsedDate.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function getPaymentMeta(paymentState: SupplierBillPaymentState) {
  if (paymentState === "paid") {
    return {
      icon: CheckCircle2,
      className:
        "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
      rowClassName: "hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5",
    };
  }

  if (paymentState === "unpaid") {
    return {
      icon: Clock3,
      className:
        "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
      rowClassName: "hover:bg-orange-50/40 dark:hover:bg-orange-500/5",
    };
  }

  return {
    icon: CircleHelp,
    className:
      "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
    rowClassName: "hover:bg-blue-50/30 dark:hover:bg-blue-500/5",
  };
}

function matchesSearch(bill: SupplierBill, searchTerm: string) {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  if (!normalizedSearch) {
    return true;
  }

  return [
    bill.documentNo,
    bill.supplierCode,
    bill.supplierName,
    bill.status,
    bill.paymentLabel,
    bill.createdBy,
  ].some((value) => value.toLowerCase().includes(normalizedSearch));
}

export default function SupplierBillsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const {
    data: supplierBillsData,
    error,
    isLoading,
  } = useSWR<ApiResponse<SupplierBillsPayload>>(
    "/api/supplier-bills?limit=1000",
    fetcher,
    { refreshInterval: 60000 },
  );

  const payload =
    supplierBillsData?.success && supplierBillsData.data
      ? supplierBillsData.data
      : zeroPayload;
  const { summary } = payload;
  const displayedBills = payload.items.filter((bill) =>
    matchesSearch(bill, searchTerm),
  );
  const needsReviewCount = summary.unpaidCount + summary.unknownStatusCount;

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="บิลคู่ค้า" href="/supplier-bills" />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm md:mt-6">
          <div className="mb-6 flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold tracking-tight">
                  บิลคู่ค้า
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  ติดตามยอดซื้อเข้าและสถานะจ่ายของคู่ค้า
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-4">
            <KPICard
              title="เอกสารทั้งหมด"
              value={summary.billCount}
              unit="ใบ"
              icon={ReceiptText}
              variant="blue"
            />
            <KPICard
              title="ยอดรวม"
              value={summary.totalAmount}
              icon={ClipboardList}
              variant="orange"
              format="currency"
            />
            <KPICard
              title="คู่ค้า"
              value={summary.supplierCount}
              unit="เจ้า"
              icon={Building2}
              variant="purple"
            />
            <KPICard
              title="ต้องตรวจสถานะ"
              value={needsReviewCount}
              unit="ใบ"
              icon={Clock3}
              variant={needsReviewCount > 0 ? "orange" : "emerald"}
            />
          </div>
        </div>

        <Card className="rounded-3xl border bg-card shadow-sm">
          <CardContent className="pt-2">
            <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-center">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาเลขเอกสาร คู่ค้า หรือสถานะ..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 rounded-2xl pl-10 font-medium"
                />
              </div>

              {searchTerm ? (
                <Button
                  variant="outline"
                  className="h-11 gap-2 rounded-2xl font-bold"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                  ล้างคำค้นหา
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10">
                <ReceiptText className="h-6 w-6 text-main-orange" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการบิลคู่ค้า
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  {payload.sourceTable
                    ? "รายการซื้อเข้าและสถานะจ่ายจากฐานข้อมูลเดิม"
                    : "ยังไม่พบข้อมูลบิลคู่ค้าในฐานข้อมูลเดิม"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge className="h-8 rounded-full bg-blue-50 px-4 text-sm font-bold text-main-blue dark:bg-blue-500/10">
                {formatNumber(displayedBills.length)} รายการ
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground shadow-none"
              >
                รวม {formatCurrency(summary.totalAmount)}
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3 rounded-2xl border bg-white p-4 dark:bg-card">
              {[1, 2, 3, 4, 5].map((row) => (
                <Skeleton key={row} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : error || (supplierBillsData && !supplierBillsData.success) ? (
            <div className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-12 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <p className="text-lg font-bold text-main-red">
                เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {error?.message || "Unknown error"}
              </p>
            </div>
          ) : displayedBills.length === 0 ? (
            <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <ReceiptText className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-bold text-card-foreground">
                ไม่พบรายการบิลคู่ค้า
              </h3>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                ลองเปลี่ยนคำค้นหาหรือตรวจสอบข้อมูลจากฐานเดิมอีกครั้ง
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
              <Table>
                <TableHeader className="bg-secondary/70">
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="w-[28%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                      เอกสาร
                    </TableHead>
                    <TableHead className="w-[30%] text-base font-bold text-card-foreground min-[500px]:text-lg">
                      คู่ค้า
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[780px]:table-cell">
                      รายการ
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      ยอดรวม
                    </TableHead>
                    <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[960px]:table-cell">
                      ส่วนลด
                    </TableHead>
                    <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                      สถานะ
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedBills.map((bill, index) => {
                    const paymentMeta = getPaymentMeta(bill.paymentState);
                    const PaymentIcon = paymentMeta.icon;
                    const dateParts = formatDateParts(bill.date);
                    const totalDiscount = bill.discount + bill.productDiscount;

                    return (
                      <TableRow
                        key={bill.id}
                        className={cn(
                          "group border-border/60 transition-colors duration-200",
                          paymentMeta.rowClassName,
                        )}
                      >
                        <TableCell className="px-4 py-4 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-sm font-bold text-main-orange select-none dark:border-orange-500/20 dark:bg-orange-500/10 min-[550px]:h-12 min-[550px]:w-12">
                              {index + 1}
                            </div>
                            <div className="flex min-w-0 flex-col gap-1">
                              <span
                                className={cn(
                                  outfit.className,
                                  "max-w-[120px] truncate text-sm font-bold text-card-foreground transition-colors group-hover:text-main-orange min-[420px]:max-w-[180px] min-[550px]:max-w-[260px] min-[550px]:text-base min-[1100px]:max-w-[420px]",
                                )}
                              >
                                {bill.documentNo || "ไม่ระบุเลขเอกสาร"}
                              </span>
                              <span className="text-xs font-semibold text-muted-foreground">
                                {dateParts.date}
                                {dateParts.time ? ` · ${dateParts.time}` : ""}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="flex min-w-0 flex-col gap-1">
                            <span className="max-w-[160px] truncate text-sm font-bold text-card-foreground min-[520px]:max-w-[260px] min-[1180px]:max-w-[420px]">
                              {bill.supplierName || "ไม่ระบุคู่ค้า"}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {bill.supplierCode || "ไม่มีรหัสคู่ค้า"}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[780px]:table-cell">
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                outfit.className,
                                "font-bold text-card-foreground",
                              )}
                            >
                              {formatNumber(bill.itemCount)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              รายการสินค้า
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                outfit.className,
                                "text-sm font-bold text-card-foreground min-[500px]:text-base",
                              )}
                            >
                              {formatCurrency(bill.totalPrice)}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground min-[780px]:hidden">
                              {formatNumber(bill.itemCount)} รายการ
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="hidden text-right align-middle min-[960px]:table-cell">
                          <span
                            className={cn(
                              outfit.className,
                              "font-bold text-muted-foreground",
                            )}
                          >
                            {formatCurrency(totalDiscount)}
                          </span>
                        </TableCell>

                        <TableCell className="text-right align-middle">
                          <div className="flex flex-col items-end gap-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                                paymentMeta.className,
                              )}
                            >
                              <PaymentIcon className="h-3.5 w-3.5" />
                              {bill.paymentLabel}
                            </Badge>
                            {bill.createdBy ? (
                              <span className="hidden text-xs font-semibold text-muted-foreground min-[720px]:inline">
                                โดย {bill.createdBy}
                              </span>
                            ) : null}
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
      </div>
    </div>
  );
}
