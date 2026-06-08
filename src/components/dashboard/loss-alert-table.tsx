"use client";

/**
 * Loss Alert Table Component
 * ตารางแสดงรายการขาดทุน (Alert)
 */

import { AlertTriangle, CircleCheck } from "lucide-react";
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
    }).format(value || 0);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("th-TH").format(value || 0);
  };

  const totalLoss = products.reduce((sum, product) => {
    return sum + Math.abs(Math.min(product.profit, 0));
  }, 0);

  if (products.length === 0) {
    return (
      <div className="overflow-hidden rounded-3xl border border-emerald-100 bg-emerald-50/30 p-4 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-500/10">
        <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <CircleCheck className="h-6 w-6 text-main-green" />
          </div>
          <h3 className="text-lg font-bold text-card-foreground">
            ไม่พบรายการขาดทุน
          </h3>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            ทุกรายการมีกำไรเป็นบวก
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10">
            <AlertTriangle className="h-6 w-6 text-main-red" />
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
          <Badge className="h-8 rounded-full bg-red-50 px-4 text-sm font-bold text-main-red dark:bg-red-500/10">
            {formatNumber(products.length)} รายการ
          </Badge>
          <Badge
            variant="outline"
            className="h-8 rounded-full border-red-100 bg-red-50 px-4 text-sm font-bold text-main-red shadow-none dark:border-red-500/20 dark:bg-red-500/10"
          >
            {formatCurrency(-totalLoss)}
          </Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
        <Table>
          <TableHeader className="bg-red-50/50 dark:bg-red-500/10">
            <TableRow className="border-red-100/70 hover:bg-transparent dark:border-red-500/20">
              <TableHead className="w-[42%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                สินค้า/รายการ
              </TableHead>
              <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                ยอดขาย
              </TableHead>
              <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                ขาดทุน
              </TableHead>
              <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                จำนวน
              </TableHead>
              <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[900px]:table-cell">
                สถานะ
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product, index) => (
              <TableRow
                key={`${product.name}-${index}`}
                className="group border-red-100/70 transition-colors duration-200 hover:bg-red-50/30 dark:border-red-500/20 dark:hover:bg-red-500/5"
              >
                <TableCell className="px-4 py-4 font-medium">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        outfit.className,
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-sm font-bold text-main-red select-none min-[550px]:h-12 min-[550px]:w-12 dark:border-red-500/20 dark:bg-red-500/10",
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="max-w-[130px] truncate text-base font-bold text-card-foreground transition-colors group-hover:text-main-red min-[420px]:max-w-[200px] min-[1180px]:max-w-[300px]">
                        {product.name || "ไม่ระบุสินค้า"}
                      </span>
                      <span className="text-xs font-semibold text-muted-foreground min-[760px]:hidden">
                        {formatNumber(product.quantity)} ชิ้น
                      </span>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-right align-middle">
                  <span
                    className={cn(
                      outfit.className,
                      "text-sm font-bold text-muted-foreground min-[500px]:text-base",
                    )}
                  >
                    {formatCurrency(product.sales)}
                  </span>
                </TableCell>

                <TableCell className="text-right align-middle">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        outfit.className,
                        "text-sm font-bold text-main-red min-[500px]:text-base",
                      )}
                    >
                      {formatCurrency(product.profit)}
                    </span>
                    <span className="text-xs font-semibold text-muted-foreground min-[900px]:hidden">
                      ควรตรวจสอบ
                    </span>
                  </div>
                </TableCell>

                <TableCell
                  className={cn(
                    outfit.className,
                    "hidden text-right text-sm font-bold text-muted-foreground min-[760px]:table-cell",
                  )}
                >
                  {formatNumber(product.quantity)}
                </TableCell>

                <TableCell className="hidden text-right align-middle min-[900px]:table-cell">
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant="outline"
                      className="h-7 rounded-full border-red-100 bg-red-50 px-3 text-xs font-bold text-main-red shadow-none dark:border-red-500/20 dark:bg-red-500/10"
                    >
                      <span className="h-2 w-2 rounded-full bg-main-red" />
                      ควรตรวจสอบ
                    </Badge>
                    <span className="text-xs font-semibold text-muted-foreground">
                      ขาดทุนจากรายการนี้
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
