"use client";

/**
 * Top Products Table Component
 * ตารางแสดงสินค้าขายดี/กำไรดี
 */

import { Trophy } from "lucide-react";
import { outfit } from "@/components/fonts/fonts";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
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
    }).format(value || 0);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("th-TH").format(value || 0);
  };

  const getRankTone = (rank: number) => {
    if (rank === 1) {
      return {
        className:
          "border-amber-100 bg-amber-50 text-main-orange dark:border-amber-500/20 dark:bg-amber-500/10",
        rowClassName:
          "hover:bg-amber-50/40 dark:hover:bg-amber-500/5 min-[760px]:bg-amber-50/20",
      };
    }

    if (rank === 2) {
      return {
        className:
          "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-500/20 dark:bg-slate-500/10 dark:text-slate-300",
        rowClassName:
          "hover:bg-slate-50/60 dark:hover:bg-slate-500/5 min-[760px]:bg-slate-50/30",
      };
    }

    if (rank === 3) {
      return {
        className:
          "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
        rowClassName:
          "hover:bg-orange-50/30 dark:hover:bg-orange-500/5 min-[760px]:bg-orange-50/20",
      };
    }

    return {
      className:
        "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
      rowClassName: "hover:bg-blue-50/30 dark:hover:bg-blue-500/5",
    };
  };

  const getProfitMarginMeta = (margin: number) => {
    if (margin >= 20) {
      return {
        className:
          "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
        barClassName: "bg-main-green",
      };
    }

    if (margin >= 10) {
      return {
        className:
          "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
        barClassName: "bg-main-blue",
      };
    }

    if (margin >= 5) {
      return {
        className:
          "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
        barClassName: "bg-main-orange",
      };
    }

    return {
      className:
        "border-red-100 bg-red-50 text-main-red dark:border-red-500/20 dark:bg-red-500/10",
      barClassName: "bg-main-red",
    };
  };

  return (
    <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-100 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10">
            <Trophy className="h-6 w-6 text-main-orange" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-card-foreground">
              {title}
            </span>
            <p className="text-sm font-medium text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge className="h-8 rounded-full bg-amber-50 px-4 text-sm font-bold text-main-orange dark:bg-amber-500/10">
            Top {formatNumber(products.length)}
          </Badge>
          <Badge
            variant="outline"
            className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground shadow-none"
          >
            30 Days
          </Badge>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Trophy className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-bold text-card-foreground">
            ไม่มีข้อมูลสินค้าขายดีในขณะนี้
          </h3>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            ระบบจะแสดงรายการเมื่อมีข้อมูลยอดขาย
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
          <Table>
            <TableHeader className="bg-secondary/70">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="w-[44%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                  สินค้า
                </TableHead>
                <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                  ยอดขาย
                </TableHead>
                <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                  กำไร
                </TableHead>
                <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                  Margin
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product, index) => {
                const rank = index + 1;
                const rankTone = getRankTone(rank);
                const marginMeta = getProfitMarginMeta(product.profitMargin);
                const marginWidth = Math.max(
                  8,
                  Math.min(product.profitMargin * 2, 100),
                );

                return (
                  <TableRow
                    key={`${product.name}-${index}`}
                    className={cn(
                      "group border-border/60 transition-colors duration-200",
                      rankTone.rowClassName,
                    )}
                  >
                    <TableCell className="px-4 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold select-none min-[550px]:h-12 min-[550px]:w-12",
                            rankTone.className,
                          )}
                        >
                          {rank}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="max-w-[130px] truncate text-base font-bold text-card-foreground transition-colors group-hover:text-main-orange min-[420px]:max-w-[200px] min-[1180px]:max-w-[300px]">
                            {product.name || "ไม่ระบุสินค้า"}
                          </span>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {formatNumber(product.quantity)} ชิ้น
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-right align-middle">
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={cn(
                            outfit.className,
                            "text-sm font-bold text-card-foreground min-[500px]:text-base",
                          )}
                        >
                          {formatCurrency(product.sales)}
                        </span>
                        <span
                          className={cn(
                            "text-xs font-semibold min-[760px]:hidden",
                            product.profit >= 0
                              ? "text-main-green"
                              : "text-main-red",
                          )}
                        >
                          กำไร {formatCurrency(product.profit)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                      <span
                        className={cn(
                          outfit.className,
                          "font-bold",
                          product.profit >= 0
                            ? "text-main-green"
                            : "text-main-red",
                        )}
                      >
                        {formatCurrency(product.profit)}
                      </span>
                    </TableCell>

                    <TableCell className="text-right align-middle">
                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                            marginMeta.className,
                          )}
                        >
                          {product.profitMargin.toFixed(1)}%
                        </Badge>
                        <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-secondary min-[900px]:block">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              marginMeta.barClassName,
                            )}
                            style={{ width: `${marginWidth}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
