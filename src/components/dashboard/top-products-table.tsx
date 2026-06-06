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
    <Card className="border-none shadow-sm bg-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6">
        <div className="space-y-1">
          {title && <CardTitle className="text-xl font-bold text-card-foreground">{title}</CardTitle>}
          {description && <CardDescription className="text-sm font-medium text-muted-foreground">{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-secondary rounded-xl text-[11px] font-bold text-muted-foreground border border-border uppercase tracking-wider">
            30 Days
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-secondary/50">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="w-[60px] text-center font-bold text-muted-foreground text-[11px] uppercase tracking-wider">#</TableHead>
                <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">สินค้า</TableHead>
                <TableHead className="text-right font-bold text-muted-foreground text-[11px] uppercase tracking-wider">ยอดขาย</TableHead>
                <TableHead className="text-right font-bold text-muted-foreground text-[11px] uppercase tracking-wider">กำไร</TableHead>
                <TableHead className="text-right font-bold text-muted-foreground text-[11px] uppercase tracking-wider">จำนวน</TableHead>
                <TableHead className="text-right font-bold text-muted-foreground text-[11px] uppercase tracking-wider">% กำไร</TableHead>
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
                    className="hover:bg-secondary/50 transition-all duration-200 group border-border/50"
                  >
                    <TableCell className="text-center">
                      <div className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold mx-auto",
                        index < 3 ? "bg-main-blue text-white shadow-sm" : "bg-secondary text-muted-foreground"
                      )}>
                        {index + 1}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-card-foreground group-hover:text-main-blue transition-colors">
                        {product.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-bold text-card-foreground">
                        {formatCurrency(product.sales)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className={cn(
                          "font-bold",
                          product.profit >= 0
                            ? "text-main-green"
                            : "text-main-red"
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
                      <div className="flex items-center justify-end gap-3">
                        <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              product.profitMargin >= 20 ? "bg-main-green" : 
                              product.profitMargin >= 10 ? "bg-main-blue" : "bg-main-orange"
                            )}
                            style={{ width: `${Math.min(product.profitMargin * 2, 100)}%` }}
                          />
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-bold text-[10px] px-2 py-0.5 min-w-[50px] justify-center shadow-none border-none rounded-lg",
                            product.profitMargin >= 20
                              ? "bg-emerald-50 text-main-green"
                              : product.profitMargin >= 10
                                ? "bg-blue-50 text-main-blue"
                                : "bg-orange-50 text-main-orange",
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
