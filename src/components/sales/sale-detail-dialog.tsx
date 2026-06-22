"use client";

/**
 * Sale Detail Dialog Component
 * แสดงรายละเอียดบิลขายแบบเต็ม
 */

import {
  Activity,
  Banknote,
  Calendar,
  CreditCard,
  MapPin,
  Package,
  Phone,
  Receipt,
  User,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { outfit } from "@/components/fonts/fonts";
import { Badge } from "@/components/ui/badge";
import {
  LargeDialog,
  LargeDialogBody,
  LargeDialogContent,
  LargeDialogDescription,
  LargeDialogHeader,
  LargeDialogTitle,
} from "@/components/ui/large-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ApiResponse } from "@/types/api";

interface SaleDetail {
  id: string;
  date: string;
  totalPrice: number;
  totalCost: number;
  totalProfit: number;
  cash: number;
  transfer: number;
  customer: {
    name: string;
    phone: string;
    address?: string;
  };
  items: Array<{
    barCode: string;
    name: string;
    quantity: number;
    price: number;
    cost: number;
    total: number;
    profit: number;
  }>;
}

interface SaleDetailDialogProps {
  saleId: string | null;
  isOpen: boolean;
  onClose: () => void;
  paymentAction?: ReactNode;
}

export function SaleDetailDialog({
  saleId,
  isOpen,
  onClose,
  paymentAction,
}: SaleDetailDialogProps) {
  const [saleDetail, setSaleDetail] = useState<SaleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saleId || !isOpen) {
      setSaleDetail(null);
      setError(null);
      return;
    }

    const fetchSaleDetail = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/sales/${saleId}`);
        const data: ApiResponse<SaleDetail> = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            !data.success ? data.error : "Failed to fetch sale detail",
          );
        }

        setSaleDetail(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSaleDetail();
  }, [saleId, isOpen]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("th-TH").format(value || 0);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) {
      return "-";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatProfitMargin = (sale: SaleDetail) => {
    if (sale.totalPrice <= 0) {
      return "0.0%";
    }

    return `${((sale.totalProfit / sale.totalPrice) * 100).toFixed(1)}%`;
  };

  const getPaymentMethods = (sale: SaleDetail) => {
    const methods = [];

    if (sale.cash > 0) {
      methods.push({
        label: "เงินสด",
        amount: sale.cash,
        icon: Banknote,
        className:
          "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
      });
    }

    if (sale.transfer > 0) {
      methods.push({
        label: "เงินโอน",
        amount: sale.transfer,
        icon: CreditCard,
        className:
          "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
      });
    }

    return methods;
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <LargeDialog open={isOpen} onOpenChange={handleOpenChange}>
      <LargeDialogContent size="2xl">
        <LargeDialogHeader>
          <LargeDialogTitle className="text-primary">
            {saleDetail ? `รายละเอียดบิล ${saleDetail.id}` : "รายละเอียดบิลขาย"}
          </LargeDialogTitle>
          <LargeDialogDescription>
            ข้อมูลลูกค้า การชำระเงิน รายการสินค้า และสรุปกำไรของบิลนี้
          </LargeDialogDescription>
        </LargeDialogHeader>

        <LargeDialogBody>
          {isLoading ? (
            <div className="flex h-72 items-center justify-center rounded-3xl border bg-card">
              <Activity className="h-7 w-7 animate-spin text-primary" />
              <span className="ml-2 text-base font-semibold text-card-foreground">
                กำลังโหลดรายละเอียด...
              </span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <p className="font-bold text-main-red">โหลดรายละเอียดไม่สำเร็จ</p>
              <p className="mt-1 text-sm font-medium text-red-600">{error}</p>
            </div>
          ) : saleDetail ? (
            <div className="space-y-6">
              <div className="rounded-3xl border bg-card p-4 shadow-sm">
                <div className="grid gap-4 min-[860px]:grid-cols-[1.05fr_1.4fr]">
                  <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                        <Receipt className="h-5 w-5 text-main-blue" />
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span
                          className={cn(
                            outfit.className,
                            "truncate text-lg font-bold text-card-foreground",
                          )}
                        >
                          {saleDetail.id}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          เลขที่บิลขาย
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className="ml-auto h-7 rounded-full border-blue-100 bg-blue-50 px-3 text-xs font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
                      >
                        {saleDetail.items.length} รายการ
                      </Badge>
                    </div>

                    <div className="space-y-3 text-sm font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(saleDetail.date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-semibold text-card-foreground">
                          {saleDetail.customer.name || "ไม่ระบุลูกค้า"}
                        </span>
                      </div>
                      {saleDetail.customer.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span
                            className={cn(
                              outfit.className,
                              "font-semibold text-card-foreground",
                            )}
                          >
                            {saleDetail.customer.phone}
                          </span>
                        </div>
                      ) : null}
                      {saleDetail.customer.address ? (
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{saleDetail.customer.address}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {paymentAction ? (
                    <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                      <div className="flex flex-col justify-between gap-4 min-[560px]:flex-row min-[560px]:items-center">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                            <CreditCard className="h-5 w-5 text-main-green" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-lg font-bold text-card-foreground">
                              การชำระเงิน
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              ยอดที่รับแล้วและปิดยอดค้าง
                            </span>
                          </div>
                        </div>

                        <Badge
                          variant="outline"
                          className={cn(
                            outfit.className,
                            "h-8 w-fit rounded-full px-4 text-sm font-bold text-card-foreground",
                          )}
                        >
                          {formatCurrency(
                            saleDetail.cash + saleDetail.transfer,
                          )}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 min-[560px]:grid-cols-2">
                        {getPaymentMethods(saleDetail).length > 0 ? (
                          getPaymentMethods(saleDetail).map((method) => {
                            const Icon = method.icon;

                            return (
                              <div
                                key={method.label}
                                className="rounded-xl border bg-card p-3"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-lg border",
                                        method.className,
                                      )}
                                    >
                                      <Icon className="h-4 w-4" />
                                    </div>
                                    <span className="font-bold text-card-foreground">
                                      {method.label}
                                    </span>
                                  </div>
                                  <span
                                    className={cn(
                                      outfit.className,
                                      "text-base font-bold text-card-foreground",
                                    )}
                                  >
                                    {formatCurrency(method.amount)}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="rounded-xl border bg-card p-3 text-sm font-semibold text-muted-foreground min-[560px]:col-span-2">
                            ยังไม่พบยอดรับชำระ
                          </div>
                        )}
                      </div>

                      <div className="mt-4">{paymentAction}</div>
                    </div>
                  ) : (
                    <div className="grid gap-3 min-[540px]:grid-cols-2">
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <span className="text-sm font-semibold text-muted-foreground">
                          ยอดขายรวม
                        </span>
                        <p
                          className={cn(
                            outfit.className,
                            "mt-2 text-2xl font-bold text-card-foreground",
                          )}
                        >
                          {formatCurrency(saleDetail.totalPrice)}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <span className="text-sm font-semibold text-muted-foreground">
                          ต้นทุนรวม
                        </span>
                        <p
                          className={cn(
                            outfit.className,
                            "mt-2 text-2xl font-bold text-card-foreground",
                          )}
                        >
                          {formatCurrency(saleDetail.totalCost)}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <span className="text-sm font-semibold text-muted-foreground">
                          กำไรรวม
                        </span>
                        <p
                          className={cn(
                            outfit.className,
                            "mt-2 text-2xl font-bold",
                            saleDetail.totalProfit >= 0
                              ? "text-main-green"
                              : "text-main-red",
                          )}
                        >
                          {formatCurrency(saleDetail.totalProfit)}
                        </p>
                      </div>
                      <div className="rounded-2xl border bg-white p-4 dark:bg-card">
                        <span className="text-sm font-semibold text-muted-foreground">
                          Margin
                        </span>
                        <p
                          className={cn(
                            outfit.className,
                            "mt-2 text-2xl font-bold",
                            saleDetail.totalProfit >= 0
                              ? "text-main-green"
                              : "text-main-red",
                          )}
                        >
                          {formatProfitMargin(saleDetail)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!paymentAction ? (
                <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
                  <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                        <CreditCard className="h-6 w-6 text-main-green" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xl font-bold text-card-foreground">
                          การชำระเงิน
                        </span>
                        <p className="text-sm font-medium text-muted-foreground">
                          วิธีชำระและยอดที่รับจากลูกค้า
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        outfit.className,
                        "h-8 w-fit rounded-full px-4 text-sm font-bold text-card-foreground",
                      )}
                    >
                      {formatCurrency(saleDetail.cash + saleDetail.transfer)}
                    </Badge>
                  </div>

                  <div className="grid gap-3 min-[560px]:grid-cols-2">
                    {getPaymentMethods(saleDetail).length > 0 ? (
                      getPaymentMethods(saleDetail).map((method) => {
                        const Icon = method.icon;

                        return (
                          <div
                            key={method.label}
                            className="rounded-2xl border bg-white p-4 dark:bg-card"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex h-11 w-11 items-center justify-center rounded-xl border",
                                    method.className,
                                  )}
                                >
                                  <Icon className="h-5 w-5" />
                                </div>
                                <span className="font-bold text-card-foreground">
                                  {method.label}
                                </span>
                              </div>
                              <span
                                className={cn(
                                  outfit.className,
                                  "text-xl font-bold text-card-foreground",
                                )}
                              >
                                {formatCurrency(method.amount)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border bg-white p-4 text-sm font-semibold text-muted-foreground dark:bg-card min-[560px]:col-span-2">
                        ไม่พบข้อมูลวิธีชำระเงิน
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
                <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-orange-100 bg-orange-50 dark:border-orange-500/20 dark:bg-orange-500/10">
                      <Package className="h-6 w-6 text-main-orange" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xl font-bold text-card-foreground">
                        รายการสินค้า
                      </span>
                      <p className="text-sm font-medium text-muted-foreground">
                        รายละเอียดสินค้า ราคา จำนวน และกำไรต่อรายการ
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="h-8 rounded-full bg-orange-50 px-4 text-sm font-bold text-main-orange dark:bg-orange-500/10">
                      {saleDetail.items.length} รายการ
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        outfit.className,
                        "h-8 rounded-full px-4 text-sm font-bold text-card-foreground",
                      )}
                    >
                      {formatCurrency(saleDetail.totalPrice)}
                    </Badge>
                  </div>
                </div>

                {saleDetail.items.length === 0 ? (
                  <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold text-card-foreground">
                      ไม่พบรายการสินค้า
                    </h3>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">
                      บิลนี้ยังไม่มีรายละเอียดสินค้าในระบบ
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
                    <Table>
                      <TableHeader className="bg-secondary/70">
                        <TableRow className="border-border/60 hover:bg-transparent">
                          <TableHead className="w-[38%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                            สินค้า
                          </TableHead>
                          <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[720px]:table-cell">
                            ราคา/หน่วย
                          </TableHead>
                          <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[620px]:table-cell">
                            จำนวน
                          </TableHead>
                          <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                            รวม
                          </TableHead>
                          <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                            กำไร
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {saleDetail.items.map((item, index) => (
                          <TableRow
                            key={`${item.barCode}-${index}`}
                            className="group border-border/60 transition-colors duration-200 hover:bg-orange-50/30 dark:hover:bg-orange-500/5"
                          >
                            <TableCell className="px-4 py-4 font-medium">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 text-sm font-bold text-main-orange select-none dark:border-orange-500/20 dark:bg-orange-500/10 min-[550px]:h-12 min-[550px]:w-12">
                                  {index + 1}
                                </div>
                                <div className="flex min-w-0 flex-col">
                                  <span className="max-w-[140px] truncate text-base font-bold text-card-foreground transition-colors group-hover:text-main-orange min-[420px]:max-w-[200px] min-[550px]:max-w-[300px] min-[1100px]:max-w-[460px]">
                                    {item.name || "ไม่ระบุสินค้า"}
                                  </span>
                                  <span
                                    className={cn(
                                      outfit.className,
                                      "text-xs font-semibold text-muted-foreground",
                                    )}
                                  >
                                    {item.barCode || "-"}
                                  </span>
                                  <p className="text-xs font-semibold text-muted-foreground min-[620px]:hidden">
                                    {formatNumber(item.quantity)} ชิ้น ·{" "}
                                    {formatCurrency(item.price)}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell
                              className={cn(
                                outfit.className,
                                "hidden text-right text-sm font-semibold text-muted-foreground min-[720px]:table-cell",
                              )}
                            >
                              {formatCurrency(item.price)}
                            </TableCell>

                            <TableCell
                              className={cn(
                                outfit.className,
                                "hidden text-right text-sm font-bold text-muted-foreground min-[620px]:table-cell",
                              )}
                            >
                              {formatNumber(item.quantity)}
                            </TableCell>

                            <TableCell className="text-right align-middle">
                              <span
                                className={cn(
                                  outfit.className,
                                  "text-sm font-bold text-card-foreground min-[500px]:text-base",
                                )}
                              >
                                {formatCurrency(item.total)}
                              </span>
                            </TableCell>

                            <TableCell className="text-right align-middle">
                              <div className="flex flex-col items-end gap-1">
                                <span
                                  className={cn(
                                    outfit.className,
                                    "text-sm font-bold min-[500px]:text-base",
                                    item.profit >= 0
                                      ? "text-main-green"
                                      : "text-main-red",
                                  )}
                                >
                                  {formatCurrency(item.profit)}
                                </span>
                                <span className="hidden text-xs font-semibold text-muted-foreground min-[760px]:block">
                                  ต้นทุน {formatCurrency(item.cost)}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </LargeDialogBody>
      </LargeDialogContent>
    </LargeDialog>
  );
}
