"use client";

/**
 * Top Products Table Component
 * ตารางแสดงสินค้าขายดี/กำไรดี
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">#</TableHead>
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
                  className="text-center text-muted-foreground"
                >
                  ไม่มีข้อมูล
                </TableCell>
              </TableRow>
            ) : (
              products.map((product, index) => (
                <TableRow key={`${product.name}-${index}`}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(product.sales)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={
                        product.profit >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      {formatCurrency(product.profit)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(product.quantity)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        product.profitMargin >= 10 ? "default" : "secondary"
                      }
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
