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
    <Card className="overflow-hidden border-none shadow-sm ring-1 ring-border/50">
      {(title || description) && (
        <CardHeader className="bg-muted/10 border-b border-border/40 pb-4">
          <div className="flex items-center justify-between">
            <div>
              {title && <CardTitle className="text-xl font-bold tracking-tight">{title}</CardTitle>}
              {description && <CardDescription className="font-medium">{description}</CardDescription>}
            </div>
            <Badge variant="outline" className="bg-background/50 font-bold">
              30 Days
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[60px] text-center font-bold text-xs uppercase tracking-wider">#</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider">สินค้า</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">ยอดขาย</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">กำไร</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">จำนวน</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider">% กำไร</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="font-medium">ไม่มีข้อมูลสินค้าขายดีในขณะนี้</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product, index) => (
                  <TableRow
                    key={`${product.name}-${index}`}
                    className="hover:bg-muted/20 transition-all duration-200 group border-border/40"
                  >
                    <TableCell className="text-center">
                      <span className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold font-mono",
                        index < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {index + 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {product.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-bold text-foreground">
                        {formatCurrency(product.sales)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className={cn(
                          "font-bold",
                          product.profit >= 0
                            ? "text-emerald-600"
                            : "text-destructive"
                        )}
                      >
                        {formatCurrency(product.profit)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-sm font-medium text-muted-foreground">
                        {formatNumber(product.quantity)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className={cn(
                              "h-full rounded-full",
                              product.profitMargin >= 20 ? "bg-emerald-500" : 
                              product.profitMargin >= 10 ? "bg-blue-500" : "bg-orange-500"
                            )}
                            style={{ width: `${Math.min(product.profitMargin * 2, 100)}%` }}
                          />
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[10px] px-1.5 py-0 min-w-[45px] justify-center shadow-none border-none",
                            product.profitMargin >= 20
                              ? "bg-emerald-50 text-emerald-700"
                              : product.profitMargin >= 10
                                ? "bg-blue-50 text-blue-700"
                                : "bg-orange-50 text-orange-700",
                          )}
                        >
                          {product.profitMargin.toFixed(1)}%
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
