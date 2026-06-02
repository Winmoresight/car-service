"use client";

/**
 * Top Products Table Component
 * ตารางแสดงสินค้าขายดี/กำไรดี
 */

import React from "react";
import { cn } from "@/lib/utils";
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
import type { TopProduct } from "@/types/api";

interface TopProductsTableProps {
  products: TopProduct[];
  title?: string;
  description?: string;
}

export function TopProductsTable({
  products,
  title = "สินค้าขายดี",
  description = "Top 10 ยอดขายสูงสุด",
}: TopProductsTableProps) {
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

  return (
    <Card className="overflow-hidden">
      {(title || description) && (
        <CardHeader className="bg-muted/5 border-b border-border/40">
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-muted/20">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[50px] text-center">#</TableHead>
              <TableHead>สินค้า</TableHead>
              <TableHead className="text-right">ยอดขาย</TableHead>
              <TableHead className="text-right">กำไร</TableHead>
              <TableHead className="text-right">จำนวน</TableHead>
              <TableHead className="text-right">% กำไร</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  ไม่มีข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              products.map((product, index) => (
                <TableRow
                  key={`${product.name}-${index}`}
                  className="hover:bg-muted/5 transition-colors"
                >
                  <TableCell className="text-center text-muted-foreground font-mono text-xs">
                    {(index + 1).toString().padStart(2, "0")}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {product.name}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(product.sales)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        product.profit >= 0
                          ? "text-emerald-600 font-medium"
                          : "text-destructive font-medium"
                      }
                    >
                      {formatCurrency(product.profit)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatNumber(product.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        product.profitMargin >= 20
                          ? "default"
                          : product.profitMargin >= 10
                            ? "secondary"
                            : "outline"
                      }
                      className={cn(
                        "font-medium",
                        product.profitMargin >= 20 &&
                          "bg-emerald-500/10 text-emerald-700 border-emerald-200 shadow-none hover:bg-emerald-500/20",
                        product.profitMargin < 10 &&
                          "text-muted-foreground border-border/60",
                      )}
                    >
                      {product.profitMargin.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
