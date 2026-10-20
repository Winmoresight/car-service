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
import {
  type DashboardTableRowCount,
  TableRowCountControl,
} from "./table-row-count-control";

interface LossAlertTableProps {
  products: LossProduct[];
  title?: string;
  description?: string;
  rowCount: DashboardTableRowCount;
  onRowCountChange: (value: DashboardTableRowCount) => void;
}

export function LossAlertTable({
  products,
  title = "รายการขาดทุน",
  description = "สินค้าที่ต้องตรวจสอบ",
  rowCount,
  onRowCountChange,
}: LossAlertTableProps) {
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
  const totalLoss = visibleProducts.reduce((sum, product) => {
    return sum + Math.abs(Math.min(product.profit, 0));
  }, 0);

  if (products.length === 0) {
    return (
      <section className="overflow-hidden rounded-[16px] border border-[#D9EDDE] bg-[#ECF7EF] p-4">
        <div className="rounded-[12px] border bg-white px-4 py-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#ECF7EF]">
            <CircleCheck className="h-6 w-6 text-[#2E9B57]" />
          </div>
          <h3 className="text-lg font-bold text-card-foreground">
            ไม่พบรายการขาดทุน
          </h3>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            ทุกรายการมีกำไรเป็นบวก
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[16px] border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[#FDEFEE]">
            <AlertTriangle className="h-5 w-5 text-[#E17658]" />
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
          <Badge
            variant="outline"
            className="h-8 border-[#F5D6D2] bg-[#FDEFEE] px-4 font-semibold text-[#E17658]"
          >
            {formatAmount(-totalLoss)}
          </Badge>
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border bg-white">
        <Table>
          <TableHeader className="bg-secondary/70">
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="w-[42%] px-4 text-sm font-medium text-muted-foreground min-[500px]:text-base">
                สินค้า/รายการ
              </TableHead>
              <TableHead className="text-right text-sm font-medium text-muted-foreground min-[500px]:text-base">
                ยอดขาย
              </TableHead>
              <TableHead className="text-right text-sm font-medium text-muted-foreground min-[500px]:text-base">
                ขาดทุน
              </TableHead>
              <TableHead className="hidden text-right text-sm font-medium text-muted-foreground min-[760px]:table-cell min-[500px]:text-base">
                จำนวน
              </TableHead>
              <TableHead className="hidden text-right text-sm font-medium text-muted-foreground min-[900px]:table-cell min-[500px]:text-base">
                สถานะ
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleProducts.map((product, index) => (
              <TableRow
                key={`${product.name}-${index}`}
                className="group border-border/60 transition-colors duration-200 hover:bg-secondary/35"
              >
                <TableCell className="px-4 py-4 font-medium">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        outfit.className,
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-secondary text-sm font-bold text-primary select-none min-[550px]:h-12 min-[550px]:w-12",
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className="flex min-w-0 flex-col">
                      <span className="max-w-[130px] truncate text-base font-medium text-card-foreground min-[420px]:max-w-[200px] min-[1180px]:max-w-[300px]">
                        {product.name || "ไม่ระบุสินค้า"}
                      </span>
                      <span className="text-sm text-muted-foreground min-[760px]:hidden">
                        {formatNumber(product.quantity)} ชิ้น
                      </span>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="text-right align-middle">
                  <span
                    className={cn(
                      outfit.className,
                      "text-sm font-semibold text-card-foreground min-[500px]:text-base",
                    )}
                  >
                    {formatAmount(product.sales)}
                  </span>
                </TableCell>

                <TableCell className="text-right align-middle">
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={cn(
                        outfit.className,
                        "text-sm font-semibold text-[#E17658] min-[500px]:text-base",
                      )}
                    >
                      {formatAmount(product.profit)}
                    </span>
                    <span className="text-sm text-muted-foreground min-[900px]:hidden">
                      ควรตรวจสอบ
                    </span>
                  </div>
                </TableCell>

                <TableCell
                  className={cn(
                    outfit.className,
                    "hidden text-right text-sm font-semibold text-card-foreground min-[760px]:table-cell",
                  )}
                >
                  {formatNumber(product.quantity)}
                </TableCell>

                <TableCell className="hidden text-right align-middle min-[900px]:table-cell">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-[#E17658]">
                    <span className="h-2 w-2 rounded-full bg-[#E17658]" />
                    ควรตรวจสอบ
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
