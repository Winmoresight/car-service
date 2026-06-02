"use client";

/**
 * Loss Alert Table Component
 * ตารางแสดงรายการขาดทุน (Alert)
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import type { LossProduct } from "@/types/api";

interface LossAlertTableProps {
  products: LossProduct[];
  title?: string;
  description?: string;
}

export function LossAlertTable({
  products,
  title = "รายการขาดทุน",
  description = "สินค้าที่ต้องตรวจสอบ",
}: LossAlertTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("th-TH").format(value);
  };

  if (products.length === 0) {
    return (
      <Card className="border-green-100 bg-green-50/30">
        <CardContent className="py-10 text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <span className="text-green-600 font-bold text-xl">✓</span>
          </div>
          <h3 className="text-lg font-medium text-green-900">
            ไม่พบรายการขาดทุน
          </h3>
          <p className="text-sm text-green-700/70 mt-1">ทุกรายการมีกำไรเป็นบวก</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-100 overflow-hidden">
      {(title || description) && (
        <CardHeader className="bg-red-50/50 border-b border-red-100">
          <CardTitle className="text-red-700 flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-red-600/70">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-red-50/30">
            <TableRow className="hover:bg-transparent border-red-100">
              <TableHead className="text-red-900/60">สินค้า/รายการ</TableHead>
              <TableHead className="text-right text-red-900/60">
                ยอดขาย
              </TableHead>
              <TableHead className="text-right text-red-900/60">
                ขาดทุน
              </TableHead>
              <TableHead className="text-right text-red-900/60">
                จำนวน
              </TableHead>
              <TableHead className="text-right text-red-900/60">
                สถานะ
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow
                key={`${product.name}-${index}`}
                className="hover:bg-red-50/20 transition-colors border-red-50"
              >
                <TableCell className="font-medium text-foreground">
                  {product.name}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(product.sales)}
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-destructive font-bold">
                    {formatCurrency(product.profit)}
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatNumber(product.quantity)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="destructive"
                    className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200 shadow-none font-medium"
                  >
                    ตรวจสอบ
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
