"use client";

/**
 * Sale Detail Dialog Component
 * แสดงรายละเอียดบิลขายแบบเต็ม
 */

import { useEffect, useState } from "react";
import { User, Phone, MapPin, CreditCard, Package } from "lucide-react";
import {
  LargeDialog,
  LargeDialogContent,
  LargeDialogHeader,
  LargeDialogBody,
  LargeDialogTitle,
} from "@/components/ui/large-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
}

export function SaleDetailDialog({
  saleId,
  isOpen,
  onClose,
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
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <LargeDialog open={isOpen} onOpenChange={onClose}>
      <LargeDialogContent size="2xl">
        <LargeDialogHeader>
          <LargeDialogTitle>รายละเอียดบิลขาย</LargeDialogTitle>
        </LargeDialogHeader>

        <LargeDialogBody>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          ) : saleDetail ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid gap-6 md:grid-cols-2 bg-muted/30 p-6 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground mb-1">เลขที่บิล</p>
                <p className="text-xl font-bold">{saleDetail.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">วันที่</p>
                <p className="text-xl">{formatDate(saleDetail.date)}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                ข้อมูลลูกค้า
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">ชื่อ</p>
                    <p className="font-medium text-base">{saleDetail.customer.name}</p>
                  </div>
                </div>
                {saleDetail.customer.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">เบอร์โทร</p>
                      <p className="font-medium text-base">{saleDetail.customer.phone}</p>
                    </div>
                  </div>
                )}
                {saleDetail.customer.address && (
                  <div className="flex items-start gap-3 md:col-span-2">
                    <MapPin className="h-5 w-5 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">ที่อยู่</p>
                      <p className="font-medium text-base">
                        {saleDetail.customer.address}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div className="border rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                การชำระเงิน
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {saleDetail.cash > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">เงินสด</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(saleDetail.cash)}
                    </p>
                  </div>
                )}
                {saleDetail.transfer > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">เงินโอน</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(saleDetail.transfer)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Package className="h-5 w-5" />
                รายการสินค้า ({saleDetail.items.length} รายการ)
              </h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-base">บาร์โค้ด</TableHead>
                      <TableHead className="text-base">ชื่อสินค้า</TableHead>
                      <TableHead className="text-right text-base">ราคา/หน่วย</TableHead>
                      <TableHead className="text-right text-base">จำนวน</TableHead>
                      <TableHead className="text-right text-base">รวม</TableHead>
                      <TableHead className="text-right text-base">กำไร</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleDetail.items.map((item) => (
                      <TableRow key={item.barCode}>
                        <TableCell className="font-mono">
                          {item.barCode}
                        </TableCell>
                        <TableCell className="font-medium text-base">
                          {item.name}
                        </TableCell>
                        <TableCell className="text-right text-base">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-right text-base">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right font-medium text-base">
                          {formatCurrency(item.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              item.profit >= 0
                                ? "text-green-600 font-medium text-base"
                                : "text-red-600 font-medium text-base"
                            }
                          >
                            {formatCurrency(item.profit)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Summary */}
            <div className="border rounded-lg p-6 bg-muted/30">
              <div className="space-y-3">
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">ยอดรวม</span>
                  <span className="font-medium text-lg">
                    {formatCurrency(saleDetail.totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground">ต้นทุนรวม</span>
                  <span className="font-medium text-lg">
                    {formatCurrency(saleDetail.totalCost)}
                  </span>
                </div>
                <div className="h-px bg-border my-3" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">กำไรรวม</span>
                  <span
                    className={`text-3xl font-bold ${
                      saleDetail.totalProfit >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(saleDetail.totalProfit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">% กำไร</span>
                  <span className="font-medium text-lg">
                    {(
                      (saleDetail.totalProfit / saleDetail.totalPrice) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
          ) : null}
        </LargeDialogBody>
      </LargeDialogContent>
    </LargeDialog>
  );
}
