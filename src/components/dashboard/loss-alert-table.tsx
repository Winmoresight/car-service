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
      <Card className="border-emerald-100 bg-emerald-50/30">
        <CardContent className="py-10 text-center">
          <div className="mx-auto w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
            <span className="text-main-green font-bold text-xl">✓</span>
          </div>
          <h3 className="text-lg font-medium text-card-foreground">
            ไม่พบรายการขาดทุน
          </h3>
          <p className="text-sm text-muted-foreground mt-1">ทุกรายการมีกำไรเป็นบวก</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm bg-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-red-50 rounded-2xl">
            <AlertTriangle className="h-6 w-6 text-main-red" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold text-card-foreground">
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-sm font-medium text-muted-foreground">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-red-50/30">
              <TableRow className="hover:bg-transparent border-red-50">
                <TableHead className="text-muted-foreground font-bold text-[11px] uppercase tracking-wider">สินค้า/รายการ</TableHead>
                <TableHead className="text-right text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
                  ยอดขาย
                </TableHead>
                <TableHead className="text-right text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
                  ขาดทุน
                </TableHead>
                <TableHead className="text-right text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
                  จำนวน
                </TableHead>
                <TableHead className="text-right text-muted-foreground font-bold text-[11px] uppercase tracking-wider">
                  สถานะ
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => (
                <TableRow
                  key={`${product.name}-${index}`}
                  className="hover:bg-red-50/20 transition-colors border-red-50 group"
                >
                  <TableCell className="font-bold text-card-foreground group-hover:text-main-red transition-colors">
                    {product.name}
                  </TableCell>
                  <TableCell className="text-right font-medium text-muted-foreground">
                    {formatCurrency(product.sales)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-main-red font-bold">
                      {formatCurrency(product.profit)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground font-medium">
                    {formatNumber(product.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      className="bg-main-red text-white border-none shadow-sm font-bold text-[10px] px-2 py-0.5 rounded-lg"
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
