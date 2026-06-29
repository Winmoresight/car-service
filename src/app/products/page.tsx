"use client";

/**
 * Products Page - หน้าสินค้า
 * แสดงรายการสินค้าพร้อมสถานะสต็อก
 */

import {
  AlertTriangle,
  Package,
  Search,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { ProductDetailDialog } from "@/components/products/product-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { ApiResponse, PaginatedPayload, TopProduct } from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ProductTab = "all" | "top" | "profit" | "low-margin";

interface ProductSummary {
  totalProducts: number;
  avgProfitMargin: number;
  highMarginCount: number;
  lowMarginCount: number;
  topSalesCount: number;
  highProfitCount: number;
}

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<ProductTab>("all");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [selectedProduct, setSelectedProduct] = useState<TopProduct | null>(
    null,
  );

  const buildApiUrl = () => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: (page * limit).toString(),
      sortBy: activeTab === "profit" ? "profit" : "sales",
      filter: activeTab,
      paginated: "1",
    });

    if (searchTerm.trim()) {
      params.set("search", searchTerm.trim());
    }

    return `/api/products/top?${params.toString()}`;
  };

  // Fetch top products
  const {
    data: topProductsData,
    error,
    isLoading,
  } = useSWR<
    ApiResponse<PaginatedPayload<TopProduct> & { summary: ProductSummary }>
  >(buildApiUrl(), fetcher, { refreshInterval: 60000 });

  const products =
    topProductsData?.success && topProductsData.data?.items
      ? topProductsData.data.items
      : [];
  const total =
    topProductsData?.success && topProductsData.data
      ? topProductsData.data.total
      : 0;
  const summary =
    topProductsData?.success && topProductsData.data
      ? topProductsData.data.summary
      : null;
  const totalPages = Math.ceil(total / limit);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("th-TH").format(value || 0);
  };

  // Calculate stats
  const totalProducts = summary?.totalProducts ?? total;
  const avgProfitMargin = summary?.avgProfitMargin ?? 0;
  const highMarginCount = summary?.highMarginCount ?? 0;
  const lowMarginCount = summary?.lowMarginCount ?? 0;
  const topSalesCount = summary?.topSalesCount ?? 0;
  const highProfitCount = summary?.highProfitCount ?? 0;

  const getProfitMarginMeta = (margin: number) => {
    if (margin >= 10) {
      return {
        label: "กำไรดี",
        description: "margin แข็งแรง",
        className:
          "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
        dotClassName: "bg-main-green",
        barClassName: "bg-main-green",
        rowClassName: "hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5",
      };
    }

    if (margin >= 5) {
      return {
        label: "ปกติ",
        description: "ยังอยู่ในเกณฑ์",
        className:
          "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
        dotClassName: "bg-main-blue",
        barClassName: "bg-main-blue",
        rowClassName: "hover:bg-blue-50/30 dark:hover:bg-blue-500/5",
      };
    }

    if (margin >= 0) {
      return {
        label: "Margin ต่ำ",
        description: "ควรตรวจราคา",
        className:
          "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
        dotClassName: "bg-main-orange",
        barClassName: "bg-main-orange",
        rowClassName: "hover:bg-orange-50/40 dark:hover:bg-orange-500/5",
      };
    }

    return {
      label: "ขาดทุน",
      description: "ต้องตรวจสอบ",
      className:
        "border-red-100 bg-red-50 text-main-red dark:border-red-500/20 dark:bg-red-500/10",
      dotClassName: "bg-main-red",
      barClassName: "bg-main-red",
      rowClassName: "hover:bg-red-50/40 dark:hover:bg-red-500/5",
    };
  };

  const openProductDetail = (product: TopProduct) => {
    setSelectedProduct(product);
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="สินค้า" href="/products" />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm md:mt-6">
          <div className="mb-6 flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold tracking-tight">
                  สินค้า
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  จัดการและติดตามสินค้าทั้งหมด
                </p>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-4">
            <KPICard
              title="สินค้าทั้งหมด"
              value={totalProducts}
              unit="รายการ"
              icon={Package}
              variant="blue"
            />
            <KPICard
              title="กำไรดี"
              value={highMarginCount}
              unit="รายการ"
              subtitle="≥10% margin"
              icon={TrendingUp}
              variant="emerald"
            />
            <KPICard
              title="กำไรต่ำ"
              value={lowMarginCount}
              unit="รายการ"
              subtitle="<5% margin"
              icon={TrendingDown}
              variant="orange"
            />
            <KPICard
              title="เฉลี่ย Margin"
              value={avgProfitMargin}
              format="percent"
              icon={AlertTriangle}
              variant="purple"
            />
          </div>
        </div>

        {/* Filters & Search */}
        <Card className="rounded-3xl border bg-card shadow-sm">
          <CardContent className="pt-2">
            <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-center">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่อหรือบาร์โค้ดสินค้า..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(0);
                  }}
                  className="h-11 rounded-2xl pl-10 font-medium"
                />
              </div>

              {searchTerm ? (
                <Button
                  variant="outline"
                  className="h-11 gap-2 rounded-2xl font-bold"
                  onClick={() => {
                    setSearchTerm("");
                    setPage(0);
                  }}
                >
                  <X className="h-4 w-4" />
                  ล้างคำค้นหา
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Products Table with Tabs */}
        <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
          <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                <Package className="h-6 w-6 text-main-blue" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold text-card-foreground">
                  รายการสินค้า
                </span>
                <p className="text-sm font-medium text-muted-foreground">
                  เรียงจากยอดขายสูงสุด พร้อมดู margin และกำไรของสินค้า
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={limit.toString()}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setPage(0);
                }}
              >
                <SelectTrigger className="h-8 w-full rounded-full px-4 font-bold min-[520px]:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20 รายการ</SelectItem>
                  <SelectItem value="50">50 รายการ</SelectItem>
                  <SelectItem value="100">100 รายการ</SelectItem>
                  <SelectItem value="200">200 รายการ</SelectItem>
                </SelectContent>
              </Select>
              <Badge className="h-8 rounded-full bg-blue-50 px-4 text-sm font-bold text-main-blue dark:bg-blue-500/10">
                {formatNumber(products.length)} รายการ
              </Badge>
              <Badge
                variant="outline"
                className="h-8 rounded-full px-4 text-sm font-bold text-card-foreground shadow-none"
              >
                จากทั้งหมด {formatNumber(total)}
              </Badge>
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value as ProductTab);
              setPage(0);
            }}
            className="flex w-full flex-col gap-4"
          >
            <TabsList className="h-auto w-full justify-start rounded-2xl border bg-white p-1 shadow-sm min-[720px]:w-fit dark:bg-card">
              <TabsTrigger
                value="all"
                className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                ทั้งหมด
              </TabsTrigger>
              <TabsTrigger
                value="top"
                className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                ขายดี
              </TabsTrigger>
              <TabsTrigger
                value="profit"
                className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                กำไรสูง
              </TabsTrigger>
              <TabsTrigger
                value="low-margin"
                className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Margin ต่ำ
              </TabsTrigger>
            </TabsList>

            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="h-7 rounded-full border-blue-100 bg-blue-50 px-3 text-xs font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
              >
                ขายดี {formatNumber(topSalesCount)}
              </Badge>
              <Badge
                variant="outline"
                className="h-7 rounded-full border-emerald-100 bg-emerald-50 px-3 text-xs font-bold text-main-green shadow-none dark:border-emerald-500/20 dark:bg-emerald-500/10"
              >
                กำไรสูง {formatNumber(highProfitCount)}
              </Badge>
              <Badge
                variant="outline"
                className="h-7 rounded-full border-orange-100 bg-orange-50 px-3 text-xs font-bold text-main-orange shadow-none dark:border-orange-500/20 dark:bg-orange-500/10"
              >
                Margin ต่ำ {formatNumber(lowMarginCount)}
              </Badge>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              {isLoading ? (
                <div className="space-y-3 rounded-2xl border bg-white p-4 dark:bg-card">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                    <Skeleton key={row} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : error || (topProductsData && !topProductsData.success) ? (
                <div className="rounded-2xl border border-red-100 bg-red-50/50 px-4 py-12 text-center dark:border-red-500/20 dark:bg-red-500/10">
                  <p className="text-lg font-bold text-main-red">
                    เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
                  </p>
                  <p className="mt-2 text-sm font-medium text-muted-foreground">
                    {error?.message || "Unknown error"}
                  </p>
                </div>
              ) : products.length === 0 ? (
                <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-card-foreground">
                    ไม่พบข้อมูลสินค้า
                  </h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    ลองเปลี่ยนคำค้นหาหรือแท็บตัวกรองใหม่อีกครั้ง
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
                    <Table>
                      <TableHeader className="bg-secondary/70">
                        <TableRow className="border-border/60 hover:bg-transparent">
                          <TableHead className="w-[38%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                            สินค้า
                          </TableHead>
                          <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                            ยอดขาย
                          </TableHead>
                          <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                            กำไร
                          </TableHead>
                          <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[620px]:table-cell">
                            จำนวน
                          </TableHead>
                          <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                            Margin
                          </TableHead>
                          <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[900px]:table-cell">
                            สถานะ
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product, index) => {
                          const marginMeta = getProfitMarginMeta(
                            product.profitMargin,
                          );
                          const marginWidth = Math.max(
                            6,
                            Math.min(Math.abs(product.profitMargin) * 4, 100),
                          );

                          return (
                            <TableRow
                              key={`${product.name}-${index}`}
                              className={cn(
                                "group border-border/60 transition-colors duration-200",
                                marginMeta.rowClassName,
                              )}
                            >
                              <TableCell className="px-4 py-4 font-medium">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      outfit.className,
                                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-sm font-bold text-main-blue select-none min-[550px]:h-12 min-[550px]:w-12 dark:border-blue-500/20 dark:bg-blue-500/10",
                                    )}
                                  >
                                    {page * limit + index + 1}
                                  </div>
                                  <div className="flex min-w-0 flex-col">
                                    <button
                                      type="button"
                                      onClick={() => openProductDetail(product)}
                                      className="max-w-[150px] cursor-pointer truncate text-left text-base font-bold text-card-foreground transition-colors group-hover:text-main-blue hover:text-main-blue focus-visible:text-main-blue focus-visible:outline-none min-[420px]:max-w-[220px] min-[550px]:max-w-[330px] min-[1180px]:max-w-[520px]"
                                    >
                                      {product.name || "ไม่ระบุสินค้า"}
                                    </button>
                                    <span
                                      className={cn(
                                        outfit.className,
                                        "max-w-[180px] truncate text-xs font-semibold text-muted-foreground",
                                      )}
                                    >
                                      {product.barcode
                                        ? `Barcode ${product.barcode}`
                                        : "กดเพื่อดูรายละเอียดสินค้า"}
                                    </span>
                                    <span className="text-xs font-semibold text-muted-foreground min-[620px]:hidden">
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

                              <TableCell
                                className={cn(
                                  outfit.className,
                                  "hidden text-right text-sm font-bold text-muted-foreground min-[620px]:table-cell",
                                )}
                              >
                                {formatNumber(product.quantity)}
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

                              <TableCell className="hidden text-right align-middle min-[900px]:table-cell">
                                <div className="flex flex-col items-end gap-1">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                                      marginMeta.className,
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "h-2 w-2 rounded-full",
                                        marginMeta.dotClassName,
                                      )}
                                    />
                                    {marginMeta.label}
                                  </Badge>
                                  <span className="text-xs font-semibold text-muted-foreground">
                                    {marginMeta.description}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 ? (
                    <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-2xl border bg-white p-4 dark:bg-card sm:flex-row">
                      <p className="text-sm font-medium text-muted-foreground">
                        แสดง{" "}
                        <span className="font-bold text-card-foreground">
                          {page * limit + 1}
                        </span>
                        -
                        <span className="font-bold text-card-foreground">
                          {Math.min((page + 1) * limit, total)}
                        </span>{" "}
                        จาก{" "}
                        <span className="font-bold text-card-foreground">
                          {total.toLocaleString("th-TH")}
                        </span>{" "}
                        รายการ
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.max(0, page - 1))}
                          disabled={page === 0}
                          className="h-8 font-bold"
                        >
                          ก่อนหน้า
                        </Button>
                        <div
                          className={cn(
                            outfit.className,
                            "flex h-8 items-center rounded-full bg-secondary px-4 text-sm font-bold text-card-foreground",
                          )}
                        >
                          {page + 1} / {totalPages}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setPage(Math.min(totalPages - 1, page + 1))
                          }
                          disabled={page >= totalPages - 1}
                          className="h-8 font-bold"
                        >
                          ถัดไป
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ProductDetailDialog
        product={selectedProduct}
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
