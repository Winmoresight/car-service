"use client";

/**
 * Sale Detail Dialog Component
 * แสดงรายละเอียดบิลขายแบบเต็ม
 */

import { useEffect, useState } from "react";
import { X, User, Phone, MapPin, CreditCard, Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
          throw new Error(data.error || "Failed to fetch sale detail");
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>รายละเอียดบิลขาย</DialogTitle>
        </DialogHeader>

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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">เลขที่บิล</p>
                <p className="text-lg font-bold">{saleDetail.id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">วันที่</p>
                <p className="text-lg">{formatDate(saleDetail.date)}</p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                ข้อมูลลูกค้า
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">ชื่อ</p>
                    <p className="font-medium">{saleDetail.customer.name}</p>
                  </div>
                </div>
                {saleDetail.customer.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">เบอร์โทร</p>
                      <p className="font-medium">{saleDetail.customer.phone}</p>
                    </div>
                  </div>
                )}
                {saleDetail.customer.address && (
                  <div className="flex items-start gap-2 md:col-span-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">ที่อยู่</p>
                      <p className="font-medium">{saleDetail.customer.address}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                การชำระเงิน
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                {saleDetail.cash > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">เงินสด</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(saleDetail.cash)}
                    </p>
                  </div>
                )}
                {saleDetail.transfer > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">เงินโอน</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(saleDetail.transfer)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                รายการสินค้า ({saleDetail.items.length} รายการ)
              </h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>บาร์โค้ด</TableHead>
                      <TableHead>ชื่อสินค้า</TableHead>
                      <TableHead className="text-right">ราคา/หน่วย</TableHead>
                      <TableHead className="text-right">จำนวน</TableHead>
                      <TableHead className="text-right">รวม</TableHead>
                      <TableHead className="text-right">กำไร</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleDetail.items.map((item) => (
                      <TableRow key={item.barCode}>
                        <TableCell className="font-mono text-sm">
                          {item.barCode}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.price)}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              item.profit >= 0
                                ? "text-green-600 font-medium"
                                : "text-red-600 font-medium"
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
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ยอดรวม</span>
                  <span className="font-medium">
                    {formatCurrency(saleDetail.totalPrice)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ต้นทุนรวม</span>
                  <span className="font-medium">
                    {formatCurrency(saleDetail.totalCost)}
                  </span>
                </div>
                <div className="h-px bg-border my-2" />
                <div className="flex justify-between items-center">
                  <span className="font-semibold">กำไรรวม</span>
                  <span
                    className={`text-xl font-bold ${
                      saleDetail.totalProfit >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {formatCurrency(saleDetail.totalProfit)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">% กำไร</span>
                  <span className="font-medium">
                    {((saleDetail.totalProfit / saleDetail.totalPrice) * 100).toFixed(
                      1,
                    )}
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
