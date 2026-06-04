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
    <Card className="border-red-200 overflow-hidden shadow-sm shadow-red-50">
      {(title || description) && (
        <CardHeader className="bg-red-50/50 border-b border-red-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-800 text-xl font-bold tracking-tight">
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="text-red-600/70 font-medium">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-red-50/20">
              <TableRow className="hover:bg-transparent border-red-100">
                <TableHead className="text-red-900/60 font-bold text-xs uppercase tracking-wider">สินค้า/รายการ</TableHead>
                <TableHead className="text-right text-red-900/60 font-bold text-xs uppercase tracking-wider">
                  ยอดขาย
                </TableHead>
                <TableHead className="text-right text-red-900/60 font-bold text-xs uppercase tracking-wider">
                  ขาดทุน
                </TableHead>
                <TableHead className="text-right text-red-900/60 font-bold text-xs uppercase tracking-wider">
                  จำนวน
                </TableHead>
                <TableHead className="text-right text-red-900/60 font-bold text-xs uppercase tracking-wider">
                  สถานะ
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => (
                <TableRow
                  key={`${product.name}-${index}`}
                  className="hover:bg-red-50/40 transition-colors border-red-50 group"
                >
                  <TableCell className="font-bold text-foreground group-hover:text-red-700 transition-colors">
                    {product.name}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(product.sales)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-red-600 font-bold">
                      {formatCurrency(product.profit)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground font-medium">
                    {formatNumber(product.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="destructive"
                      className="bg-red-600 text-white border-none hover:bg-red-700 shadow-sm font-bold text-[10px] px-2"
                    >
                      URGENT
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
