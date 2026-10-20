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
import {
  type DashboardTableRowCount,
  TableRowCountControl,
} from "./table-row-count-control";

interface TopProductsTableProps {
  products: TopProduct[];
  title?: string;
  description?: string;
  rowCount: DashboardTableRowCount;
  onRowCountChange: (value: DashboardTableRowCount) => void;
}

export function TopProductsTable({
  products,
  title = "สินค้าขายดี",
  description = "สินค้าที่มียอดขายสูงสุด",
  rowCount,
  onRowCountChange,
}: TopProductsTableProps) {
  const formatAmount = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("th-TH").format(value || 0);
  };

  const visibleProducts = products.slice(0, rowCount);

  return (
    <section className="overflow-hidden rounded-[16px] border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#E1F6FE]">
            <Trophy className="h-5 w-5 text-[#378CEA]" />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-semibold text-card-foreground">
              {title}
            </h2>
            <p className="text-sm font-medium text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TableRowCountControl
            value={rowCount}
            onValueChange={onRowCountChange}
            label="เลือกจำนวนรายการที่แสดงในทั้งสองตาราง"
          />
          <Badge variant="outline" className="h-8 px-4 text-card-foreground">
            30 วัน
          </Badge>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-[12px] border bg-white px-4 py-12 text-center">
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
        <div className="overflow-hidden rounded-[12px] border bg-white">
          <Table>
            <TableHeader className="bg-secondary/70">
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="w-[44%] px-4 text-sm font-medium text-muted-foreground min-[500px]:text-base">
                  สินค้า
                </TableHead>
                <TableHead className="text-right text-sm font-medium text-muted-foreground min-[500px]:text-base">
                  ยอดขาย
                </TableHead>
                <TableHead className="hidden text-right text-sm font-medium text-muted-foreground min-[760px]:table-cell min-[500px]:text-base">
                  กำไร
                </TableHead>
                <TableHead className="text-right text-sm font-medium text-muted-foreground min-[500px]:text-base">
                  อัตรากำไร
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleProducts.map((product, index) => {
                const rank = index + 1;

                return (
                  <TableRow
                    key={`${product.name}-${index}`}
                    className="group border-border/60 transition-colors hover:bg-secondary/35"
                  >
                    <TableCell className="px-4 py-4 font-medium">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            outfit.className,
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold select-none min-[550px]:h-12 min-[550px]:w-12",
                            "bg-secondary text-primary",
                          )}
                        >
                          {rank}
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="max-w-[130px] truncate text-base font-semibold text-card-foreground min-[420px]:max-w-[200px] min-[1180px]:max-w-[300px]">
                            {product.name || "ไม่ระบุสินค้า"}
                          </span>
                          <span className="text-sm text-muted-foreground">
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
                            "text-sm font-semibold text-card-foreground min-[500px]:text-base",
                          )}
                        >
                          {formatAmount(product.sales)}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-medium min-[760px]:hidden",
                            product.profit >= 0
                              ? "text-[#2E9B57]"
                              : "text-[#E17658]",
                          )}
                        >
                          กำไร {formatAmount(product.profit)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="hidden text-right align-middle min-[760px]:table-cell">
                      <span
                        className={cn(
                          outfit.className,
                          "text-sm font-semibold min-[500px]:text-base",
                          product.profit >= 0
                            ? "text-[#2E9B57]"
                            : "text-[#E17658]",
                        )}
                      >
                        {formatAmount(product.profit)}
                      </span>
                    </TableCell>

                    <TableCell className="text-right align-middle">
                      <div className="flex items-center justify-end">
                        <span
                          className={cn(
                            outfit.className,
                            "text-sm font-semibold min-[500px]:text-base",
                            product.profitMargin < 0
                              ? "text-[#E17658]"
                              : "text-[#2E9B57]",
                          )}
                        >
                          {product.profitMargin.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
