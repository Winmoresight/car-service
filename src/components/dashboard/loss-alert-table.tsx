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
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-700 flex items-center gap-2">
            <span>✓</span> ไม่พบรายการขาดทุน
          </CardTitle>
          <CardDescription>ทุกรายการมีกำไรเป็นบวก</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>สินค้า/รายการ</TableHead>
              <TableHead className="text-right">ยอดขาย</TableHead>
              <TableHead className="text-right">ขาดทุน</TableHead>
              <TableHead className="text-right">จำนวน</TableHead>
              <TableHead className="text-right">สถานะ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow key={`${product.name}-${index}`}>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(product.sales)}
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-red-600 font-semibold">
                    {formatCurrency(product.profit)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(product.quantity)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive">ตรวจสอบ</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
