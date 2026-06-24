"use client";

/**
 * Stock Page - หน้าสต็อก
 * แสดงสถานะสต็อกและการเคลื่อนไหวจากฐานข้อมูลจริง
 */

import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  type LucideIcon,
  Package,
  Plus,
  Save,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { outfit } from "@/components/fonts/fonts";
import { BarcodeCameraDialog } from "@/components/stock/barcode-camera-dialog";
import AsyncSearchableSelect from "@/components/ui/async-searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LargeDialog,
  LargeDialogBody,
  LargeDialogContent,
  LargeDialogDescription,
  LargeDialogFooter,
  LargeDialogHeader,
  LargeDialogTitle,
} from "@/components/ui/large-dialog";
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
import type {
  ApiResponse,
  PaginatedPayload,
  StockCatalogOption,
  StockProductCatalogPayload,
  StockProductCreateResult,
} from "@/types/api";

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const STOCK_LIST_LIMIT = 50;

interface StockItem {
  barCode: string;
  name: string;
  currentStock: number;
  lastUpdate: string;
  movements: number;
}

interface StockMovement {
  barCode: string;
  name: string;
  date: string;
  type: "in" | "out";
  quantity: number;
  stock: number;
  company?: string;
}

interface ProductDraft {
  categoryId: string;
  barcode: string;
  name: string;
  unit: string;
  packageQuantity: string;
  packageUnit: string;
  costPrice: string;
  retailPrice: string;
}

function createEmptyProductDraft(): ProductDraft {
  return {
    categoryId: "25",
    barcode: "",
    name: "",
    unit: "",
    packageQuantity: "1",
    packageUnit: "",
    costPrice: "",
    retailPrice: "",
  };
}

function getResponseErrorMessage<T>(response: ApiResponse<T>) {
  return response.success ? "" : response.error;
}

function getPreviewBarcode(categoryId: string, barcodeSuffix?: number) {
  if (!barcodeSuffix) {
    return "";
  }

  const normalizedCategoryId = Number.parseInt(categoryId || "25", 10) || 25;

  return `${normalizedCategoryId}${String(barcodeSuffix).padStart(4, "0")}`;
}

function filterCatalogOptions(
  options: StockCatalogOption[],
  search: string,
  signal: AbortSignal,
) {
  if (signal.aborted) {
    return [];
  }

  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return options;
  }

  return options.filter((option) =>
    option.name.toLowerCase().includes(normalizedSearch),
  );
}

export default function StockPage() {
  const [activeTab, setActiveTab] = useState("summary");
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [productDraft, setProductDraft] = useState<ProductDraft>(() =>
    createEmptyProductDraft(),
  );
  const [createProductError, setCreateProductError] = useState<string | null>(
    null,
  );
  const [createProductSuccess, setCreateProductSuccess] = useState<
    string | null
  >(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const selectedCategoryId =
    Number.parseInt(productDraft.categoryId || "25", 10) || 25;

  // Fetch stock summary
  const {
    data: summaryData,
    isLoading: summaryLoading,
    mutate: mutateSummary,
  } = useSWR<ApiResponse<PaginatedPayload<StockItem>>>(
    `/api/stock?type=summary&limit=${STOCK_LIST_LIMIT}`,
    fetcher,
    { refreshInterval: 30000 },
  );

  // Fetch recent movements
  const {
    data: movementsData,
    isLoading: movementsLoading,
    mutate: mutateMovements,
  } = useSWR<ApiResponse<PaginatedPayload<StockMovement>>>(
    `/api/stock?type=movements&limit=${STOCK_LIST_LIMIT}`,
    fetcher,
    {
      refreshInterval: 30000,
    },
  );
  const {
    data: productCatalogData,
    isLoading: productCatalogLoading,
    mutate: mutateProductCatalog,
  } = useSWR<ApiResponse<StockProductCatalogPayload>>(
    isCreateProductOpen
      ? `/api/stock?type=catalog&categoryId=${selectedCategoryId}`
      : null,
    fetcher,
  );

  const stockItems =
    summaryData?.success && summaryData.data?.items
      ? summaryData.data.items
      : [];
  const movements =
    movementsData?.success && movementsData.data?.items
      ? movementsData.data.items
      : [];
  const productCatalog =
    productCatalogData?.success && productCatalogData.data
      ? productCatalogData.data
      : null;
  const previewBarcode = getPreviewBarcode(
    productDraft.categoryId,
    productCatalog?.nextBarcodeSuffix,
  );
  const displayedBarcode = productDraft.barcode || previewBarcode;
  const selectedCategory = productCatalog?.categories.find(
    (category) => String(category.id) === productDraft.categoryId,
  );
  const fetchCategoryOptions = useCallback(
    async (search: string, signal: AbortSignal) =>
      filterCatalogOptions(productCatalog?.categories ?? [], search, signal),
    [productCatalog?.categories],
  );
  const fetchUnitOptions = useCallback(
    async (search: string, signal: AbortSignal) =>
      filterCatalogOptions(productCatalog?.units ?? [], search, signal),
    [productCatalog?.units],
  );

  useEffect(() => {
    if (!isCreateProductOpen || !productCatalog) {
      return;
    }

    setProductDraft((current) => {
      const categoryId =
        current.categoryId ||
        (productCatalog.categories[0]?.id
          ? String(productCatalog.categories[0].id)
          : "");
      const unit = current.unit || productCatalog.units[0]?.name || "";
      const packageUnit = current.packageUnit || unit;

      if (
        current.categoryId === categoryId &&
        current.unit === unit &&
        current.packageUnit === packageUnit
      ) {
        return current;
      }

      return {
        ...current,
        categoryId,
        unit,
        packageUnit,
      };
    });
  }, [isCreateProductOpen, productCatalog]);

  // Calculate stats
  const totalItems = stockItems.length;
  const stockIn = movements.filter((m) => m.type === "in").length;
  const stockOut = movements.filter((m) => m.type === "out").length;
  const lowStock = stockItems.filter((item) => item.currentStock < 5).length;

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("th-TH").format(value || 0);
  };

  const formatDateParts = (dateString: string) => {
    const parsedDate = new Date(dateString);

    if (Number.isNaN(parsedDate.getTime())) {
      return {
        date: "-",
        time: "",
      };
    }

    return {
      date: parsedDate.toLocaleDateString("th-TH", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
      time: parsedDate.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
  };

  const getStockMeta = (currentStock: number) => {
    if (currentStock <= 0) {
      return {
        label: "หมดสต็อก",
        description: "ควรตรวจสอบทันที",
        className:
          "border-red-100 bg-red-50 text-main-red dark:border-red-500/20 dark:bg-red-500/10",
        dotClassName: "bg-main-red",
        barClassName: "bg-main-red",
        rowClassName: "hover:bg-red-50/40 dark:hover:bg-red-500/5",
      };
    }

    if (currentStock < 5) {
      return {
        label: "สต็อกต่ำ",
        description: "ต้องสั่งเพิ่ม",
        className:
          "border-red-100 bg-red-50 text-main-red dark:border-red-500/20 dark:bg-red-500/10",
        dotClassName: "bg-main-red",
        barClassName: "bg-main-red",
        rowClassName: "hover:bg-red-50/40 dark:hover:bg-red-500/5",
      };
    }

    if (currentStock < 20) {
      return {
        label: "ใกล้หมด",
        description: "ควรเฝ้าดู",
        className:
          "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10",
        dotClassName: "bg-main-orange",
        barClassName: "bg-main-orange",
        rowClassName: "hover:bg-orange-50/40 dark:hover:bg-orange-500/5",
      };
    }

    return {
      label: "ปกติ",
      description: "พร้อมใช้งาน",
      className:
        "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
      dotClassName: "bg-main-green",
      barClassName: "bg-main-green",
      rowClassName: "hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5",
    };
  };

  const getMovementMeta = (
    type: StockMovement["type"],
  ): {
    label: string;
    description: string;
    icon: LucideIcon;
    className: string;
    iconClassName: string;
    dotClassName: string;
  } => {
    if (type === "in") {
      return {
        label: "สินค้าเข้า",
        description: "เพิ่มเข้าคลัง",
        icon: TrendingUp,
        className:
          "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
        iconClassName:
          "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10",
        dotClassName: "bg-main-green",
      };
    }

    return {
      label: "สินค้าออก",
      description: "ตัดออกจากคลัง",
      icon: TrendingDown,
      className:
        "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
      iconClassName:
        "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10",
      dotClassName: "bg-main-blue",
    };
  };

  const updateProductDraft = (updates: Partial<ProductDraft>) => {
    setProductDraft((current) => ({ ...current, ...updates }));
  };

  const handleCreateProductOpenChange = (open: boolean) => {
    setIsCreateProductOpen(open);

    if (open) {
      setCreateProductError(null);
      setCreateProductSuccess(null);
      return;
    }

    setIsBarcodeScannerOpen(false);
    setIsCreatingProduct(false);
  };

  const handleCreateProductSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setCreateProductError(null);
    setCreateProductSuccess(null);

    try {
      setIsCreatingProduct(true);

      const response = await fetch("/api/stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          categoryId: Number.parseInt(productDraft.categoryId, 10),
          barcode: productDraft.barcode,
          name: productDraft.name,
          unit: productDraft.unit,
          packageQuantity: productDraft.packageQuantity,
          packageUnit: productDraft.packageUnit || productDraft.unit,
          costPrice: productDraft.costPrice,
          retailPrice: productDraft.retailPrice,
        }),
      });
      const result =
        (await response.json()) as ApiResponse<StockProductCreateResult>;

      if (!response.ok || !result.success) {
        throw new Error(getResponseErrorMessage(result) || "เพิ่มสินค้าไม่สำเร็จ");
      }

      setCreateProductSuccess(
        `เพิ่ม ${result.data.name} แล้ว รหัส ${result.data.productCode} บาร์โค้ด ${result.data.barcode}`,
      );
      setProductDraft((current) => ({
        ...createEmptyProductDraft(),
        categoryId: current.categoryId,
        unit: current.unit,
        packageUnit: current.packageUnit || current.unit,
      }));

      await Promise.all([
        mutateSummary(),
        mutateMovements(),
        mutateProductCatalog(),
      ]);
    } catch (error) {
      setCreateProductError(
        error instanceof Error ? error.message : "เพิ่มสินค้าไม่สำเร็จ",
      );
    } finally {
      setIsCreatingProduct(false);
    }
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="สต็อก" href="/stock" />

      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm md:mt-6">
          <div className="mb-6 flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold">สต็อก</span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  ติดตามสถานะสต็อกและการเคลื่อนไหวสินค้า
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="h-10 w-full rounded-[8px] font-bold min-[520px]:w-fit"
              onClick={() => handleCreateProductOpenChange(true)}
            >
              <Plus className="h-4 w-4" />
              เพิ่มสินค้า
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 min-[600px]:grid-cols-2 min-[1100px]:grid-cols-4">
            <KPICard
              title="สินค้าในสต็อก"
              value={totalItems}
              unit="รายการ"
              subtitle="รายการสินค้า"
              icon={Package}
              variant="blue"
            />
            <KPICard
              title="สินค้าเข้า"
              value={stockIn}
              unit="รายการ"
              subtitle="ล่าสุด"
              icon={TrendingUp}
              variant="emerald"
            />
            <KPICard
              title="สินค้าออก"
              value={stockOut}
              unit="รายการ"
              subtitle="ล่าสุด"
              icon={TrendingDown}
              variant="purple"
            />
            <KPICard
              title="สต็อกต่ำ"
              value={lowStock}
              unit="รายการ"
              subtitle="ต้องสั่งเพิ่ม"
              icon={AlertCircle}
              variant="orange"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex w-full flex-col gap-4"
        >
          <TabsList className="h-auto w-full justify-start rounded-2xl border bg-card p-1 shadow-sm min-[520px]:w-fit">
            <TabsTrigger
              value="summary"
              className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              สรุปสต็อก
            </TabsTrigger>
            <TabsTrigger
              value="movements"
              className="rounded-xl px-4 py-2 font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              การเคลื่อนไหว
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="mt-0 w-full">
            <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
                    <Package className="h-6 w-6 text-main-blue" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-card-foreground">
                      สรุปสต็อกสินค้า
                    </span>
                    <p className="text-sm font-medium text-muted-foreground">
                      ดูจำนวนคงเหลือและรายการที่ต้องเติมสต็อก
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="h-8 rounded-full bg-blue-50 px-4 text-sm font-bold text-main-blue dark:bg-blue-500/10">
                    {formatNumber(stockItems.length)} รายการ
                  </Badge>
                  <Badge
                    variant="outline"
                    className="h-8 rounded-full border-orange-100 bg-orange-50 px-4 text-sm font-bold text-main-orange shadow-none dark:border-orange-500/20 dark:bg-orange-500/10"
                  >
                    {formatNumber(lowStock)} สต็อกต่ำ
                  </Badge>
                </div>
              </div>

              {summaryLoading ? (
                <div className="space-y-3 rounded-2xl border bg-white p-4 dark:bg-card">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                    <Skeleton key={row} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : stockItems.length === 0 ? (
                <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-card-foreground">
                    ไม่พบข้อมูลสต็อก
                  </h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    ยังไม่มีรายการสินค้าให้แสดงในช่วงนี้
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
                  <Table>
                    <TableHeader className="bg-secondary/70">
                      <TableRow className="border-border/60 hover:bg-transparent">
                        <TableHead className="w-[42%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                          สินค้า
                        </TableHead>
                        <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                          สต็อก
                        </TableHead>
                        <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[760px]:table-cell">
                          เคลื่อนไหว
                        </TableHead>
                        <TableHead className="hidden text-base font-bold text-card-foreground min-[1024px]:table-cell">
                          อัปเดตล่าสุด
                        </TableHead>
                        <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                          สถานะ
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockItems.map((item, index) => {
                        const stockMeta = getStockMeta(item.currentStock);
                        const lastUpdate = formatDateParts(item.lastUpdate);
                        const stockWidth = Math.max(
                          6,
                          Math.min((item.currentStock / 50) * 100, 100),
                        );

                        return (
                          <TableRow
                            key={`${item.barCode}-${item.name}-${index}`}
                            className={cn(
                              "group border-border/60 transition-colors duration-200",
                              stockMeta.rowClassName,
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
                                  {index + 1}
                                </div>
                                <div className="flex min-w-0 flex-col">
                                  <span className="max-w-[150px] truncate text-base font-bold text-card-foreground transition-colors group-hover:text-main-blue min-[420px]:max-w-[220px] min-[550px]:max-w-[320px] min-[1180px]:max-w-[520px]">
                                    {item.name || "ไม่ระบุสินค้า"}
                                  </span>
                                  <span
                                    className={cn(
                                      outfit.className,
                                      "text-xs font-semibold text-muted-foreground",
                                    )}
                                  >
                                    {item.barCode || "-"}
                                  </span>
                                  <p className="text-xs font-semibold text-muted-foreground min-[760px]:hidden">
                                    เคลื่อนไหว {formatNumber(item.movements)} ครั้ง
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-right align-middle">
                              <div className="flex flex-col items-end gap-2">
                                <span
                                  className={cn(
                                    outfit.className,
                                    "text-base font-bold text-card-foreground",
                                  )}
                                >
                                  {formatNumber(item.currentStock)}
                                </span>
                                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      stockMeta.barClassName,
                                    )}
                                    style={{ width: `${stockWidth}%` }}
                                  />
                                </div>
                              </div>
                            </TableCell>

                            <TableCell
                              className={cn(
                                outfit.className,
                                "hidden text-right text-sm font-bold text-muted-foreground min-[760px]:table-cell",
                              )}
                            >
                              {formatNumber(item.movements)} ครั้ง
                            </TableCell>

                            <TableCell className="hidden align-middle min-[1024px]:table-cell">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-card-foreground">
                                    {lastUpdate.date}
                                  </span>
                                  <span
                                    className={cn(
                                      outfit.className,
                                      "text-xs font-semibold text-muted-foreground",
                                    )}
                                  >
                                    {lastUpdate.time}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="text-right align-middle">
                              <div className="flex flex-col items-end gap-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                                    stockMeta.className,
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      stockMeta.dotClassName,
                                    )}
                                  />
                                  {stockMeta.label}
                                </Badge>
                                <span className="hidden text-xs font-semibold text-muted-foreground min-[650px]:block">
                                  {stockMeta.description}
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
            </div>
          </TabsContent>

          {/* Movements Tab */}
          <TabsContent value="movements" className="mt-0 w-full">
            <div className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-4 min-[720px]:flex-row min-[720px]:items-center">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                    <TrendingUp className="h-6 w-6 text-main-green" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-card-foreground">
                      การเคลื่อนไหวสต็อก
                    </span>
                    <p className="text-sm font-medium text-muted-foreground">
                      รายการสินค้าเข้าและสินค้าออกล่าสุดจากคลัง
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="h-8 rounded-full bg-emerald-50 px-4 text-sm font-bold text-main-green dark:bg-emerald-500/10">
                    เข้า {formatNumber(stockIn)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="h-8 rounded-full border-blue-100 bg-blue-50 px-4 text-sm font-bold text-main-blue shadow-none dark:border-blue-500/20 dark:bg-blue-500/10"
                  >
                    ออก {formatNumber(stockOut)}
                  </Badge>
                </div>
              </div>

              {movementsLoading ? (
                <div className="space-y-3 rounded-2xl border bg-white p-4 dark:bg-card">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
                    <Skeleton key={row} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : movements.length === 0 ? (
                <div className="rounded-2xl border bg-white px-4 py-12 text-center dark:bg-card">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-bold text-card-foreground">
                    ไม่พบการเคลื่อนไหวสต็อก
                  </h3>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">
                    ยังไม่มีรายการสินค้าเข้าออกล่าสุด
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border bg-white dark:bg-card">
                  <Table>
                    <TableHeader className="bg-secondary/70">
                      <TableRow className="border-border/60 hover:bg-transparent">
                        <TableHead className="w-[40%] px-4 text-base font-bold text-card-foreground min-[500px]:text-lg">
                          สินค้า
                        </TableHead>
                        <TableHead className="hidden text-base font-bold text-card-foreground min-[760px]:table-cell">
                          วันที่
                        </TableHead>
                        <TableHead className="hidden text-center text-base font-bold text-card-foreground min-[650px]:table-cell">
                          ประเภท
                        </TableHead>
                        <TableHead className="text-right text-base font-bold text-card-foreground min-[500px]:text-lg">
                          จำนวน
                        </TableHead>
                        <TableHead className="hidden text-right text-base font-bold text-card-foreground min-[798px]:table-cell">
                          คงเหลือ
                        </TableHead>
                        <TableHead className="hidden text-base font-bold text-card-foreground min-[1120px]:table-cell">
                          บริษัท
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movements.map((movement, index) => {
                        const movementMeta = getMovementMeta(movement.type);
                        const MovementIcon = movementMeta.icon;
                        const movementDate = formatDateParts(movement.date);

                        return (
                          <TableRow
                            key={`${movement.barCode}-${movement.date}-${index}`}
                            className="group border-border/60 transition-colors duration-200 hover:bg-blue-50/30 dark:hover:bg-blue-500/5"
                          >
                            <TableCell className="px-4 py-4 font-medium">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border select-none min-[550px]:h-12 min-[550px]:w-12",
                                    movementMeta.iconClassName,
                                  )}
                                >
                                  <MovementIcon className="h-5 w-5" />
                                </div>
                                <div className="flex min-w-0 flex-col">
                                  <span className="max-w-[150px] truncate text-base font-bold text-card-foreground transition-colors group-hover:text-main-blue min-[420px]:max-w-[220px] min-[550px]:max-w-[320px] min-[1180px]:max-w-[500px]">
                                    {movement.name || "ไม่ระบุสินค้า"}
                                  </span>
                                  <span
                                    className={cn(
                                      outfit.className,
                                      "text-xs font-semibold text-muted-foreground",
                                    )}
                                  >
                                    {movement.barCode || "-"}
                                  </span>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 min-[650px]:hidden">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "h-6 rounded-full px-2 text-[10px] font-bold shadow-none",
                                        movementMeta.className,
                                      )}
                                    >
                                      {movementMeta.label}
                                    </Badge>
                                    <span className="text-xs font-semibold text-muted-foreground min-[760px]:hidden">
                                      {movementDate.date}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden align-middle min-[760px]:table-cell">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-card-foreground">
                                    {movementDate.date}
                                  </span>
                                  <span
                                    className={cn(
                                      outfit.className,
                                      "text-xs font-semibold text-muted-foreground",
                                    )}
                                  >
                                    {movementDate.time}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden text-center align-middle min-[650px]:table-cell">
                              <div className="flex flex-col items-center gap-1">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "h-7 rounded-full px-3 text-xs font-bold shadow-none",
                                    movementMeta.className,
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "h-2 w-2 rounded-full",
                                      movementMeta.dotClassName,
                                    )}
                                  />
                                  {movementMeta.label}
                                </Badge>
                                <span className="text-xs font-semibold text-muted-foreground">
                                  {movementMeta.description}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="text-right align-middle">
                              <div className="flex flex-col items-end">
                                <span
                                  className={cn(
                                    outfit.className,
                                    "text-base font-bold",
                                    movement.type === "in"
                                      ? "text-main-green"
                                      : "text-main-blue",
                                  )}
                                >
                                  {movement.type === "in" ? "+" : "-"}
                                  {formatNumber(movement.quantity)}
                                </span>
                                <span className="text-xs font-semibold text-muted-foreground min-[798px]:hidden">
                                  เหลือ {formatNumber(movement.stock)}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell
                              className={cn(
                                outfit.className,
                                "hidden text-right text-base font-bold text-card-foreground min-[798px]:table-cell",
                              )}
                            >
                              {formatNumber(movement.stock)}
                            </TableCell>

                            <TableCell className="hidden align-middle min-[1120px]:table-cell">
                              <div className="max-w-[220px] truncate text-sm font-semibold text-muted-foreground">
                                {movement.company || "-"}
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
          </TabsContent>
        </Tabs>
      </div>

      <LargeDialog
        open={isCreateProductOpen}
        onOpenChange={handleCreateProductOpenChange}
      >
        <LargeDialogContent size="xl">
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleCreateProductSubmit}
          >
            <LargeDialogHeader className="pr-16">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[8px] border border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10">
                  <Package className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <LargeDialogTitle>เพิ่มสินค้า</LargeDialogTitle>
                  <LargeDialogDescription>
                    รหัสสินค้าและจำนวนคงเหลือเริ่มต้นจะถูกกำหนดโดยระบบ
                    ส่วนบาร์โค้ดสามารถใช้ค่าที่ระบบสร้างหรือสแกนจากสินค้าได้
                  </LargeDialogDescription>
                </div>
              </div>
            </LargeDialogHeader>

            <LargeDialogBody className="space-y-5">
              <div className="grid gap-3 rounded-[8px] border bg-white p-4 min-[760px]:grid-cols-3 dark:bg-card">
                <div className="space-y-2">
                  <span className="block text-sm font-bold text-muted-foreground">
                    รหัสสินค้า
                  </span>
                  <Input
                    value={productCatalog?.nextProductCode ?? ""}
                    readOnly
                    placeholder={productCatalogLoading ? "กำลังเตรียม" : ""}
                    className="h-11 rounded-[8px] bg-muted/30 font-bold text-main-blue shadow-none"
                  />
                </div>

                <div className="space-y-2">
                  <span className="block text-sm font-bold text-muted-foreground">
                    บาร์โค้ด
                  </span>
                  <div className="flex items-center justify-between gap-4">
                    <Input
                      value={displayedBarcode}
                      readOnly
                      placeholder={productCatalogLoading ? "กำลังเตรียม" : ""}
                      className="h-11 flex-1 rounded-[8px] bg-muted/30 font-bold text-main-blue shadow-none"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0 rounded-[8px] border-blue-100 bg-blue-50 text-main-blue hover:bg-blue-100 hover:text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10"
                      onClick={() => setIsBarcodeScannerOpen(true)}
                      aria-label="เปิดกล้องสแกนบาร์โค้ด"
                      title="เปิดกล้องสแกนบาร์โค้ด"
                    >
                      <Camera className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="block text-sm font-bold text-muted-foreground">
                    จำนวนคงเหลือ
                  </span>
                  <Input
                    value="0"
                    readOnly
                    className="h-11 rounded-[8px] bg-muted/30 text-right font-bold shadow-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 rounded-[8px] border bg-card p-4 min-[760px]:grid-cols-2">
                <div className="space-y-2">
                  <span className="block text-sm font-bold text-card-foreground">
                    ประเภทสินค้า
                  </span>
                  <AsyncSearchableSelect<StockCatalogOption>
                    selectedLabel={selectedCategory?.name}
                    placeholder="เลือกประเภทสินค้า"
                    searchPlaceholder="ค้นหาประเภทสินค้า..."
                    emptyMessage="ไม่พบประเภทสินค้า"
                    disabled={productCatalogLoading || !productCatalog}
                    fetchOptions={fetchCategoryOptions}
                    getOptionKey={(category) => String(category.id)}
                    getOptionLabel={(category) => category.name}
                    isOptionSelected={(category) =>
                      String(category.id) === productDraft.categoryId
                    }
                    onSelect={(category) =>
                      updateProductDraft({ categoryId: String(category.id) })
                    }
                    triggerClassName="h-11 rounded-[8px] bg-white font-bold dark:bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="stock-product-name"
                    className="block text-sm font-bold text-card-foreground"
                  >
                    ชื่อสินค้า
                  </label>
                  <Input
                    id="stock-product-name"
                    value={productDraft.name}
                    onChange={(event) =>
                      updateProductDraft({ name: event.target.value })
                    }
                    className="h-11 rounded-[8px] bg-white font-semibold dark:bg-background"
                    placeholder="ชื่อสินค้า"
                  />
                </div>

                <div className="grid gap-3 min-[520px]:grid-cols-[1fr_120px_1fr] min-[760px]:col-span-2">
                  <div className="space-y-2">
                    <span className="block text-sm font-bold text-card-foreground">
                      หน่วย
                    </span>
                    <AsyncSearchableSelect<StockCatalogOption>
                      selectedLabel={productDraft.unit}
                      placeholder="เลือกหน่วย"
                      searchPlaceholder="ค้นหาหน่วย..."
                      emptyMessage="ไม่พบหน่วย"
                      disabled={productCatalogLoading || !productCatalog}
                      fetchOptions={fetchUnitOptions}
                      getOptionKey={(unit) => String(unit.id)}
                      getOptionLabel={(unit) => unit.name}
                      isOptionSelected={(unit) =>
                        unit.name === productDraft.unit
                      }
                      onSelect={(unit) =>
                        updateProductDraft({
                          unit: unit.name,
                          packageUnit: productDraft.packageUnit || unit.name,
                        })
                      }
                      triggerClassName="h-11 rounded-[8px] bg-white font-bold dark:bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="stock-product-package-quantity"
                      className="block text-sm font-bold text-card-foreground"
                    >
                      จำนวนบรรจุ
                    </label>
                    <Input
                      id="stock-product-package-quantity"
                      inputMode="numeric"
                      value={productDraft.packageQuantity}
                      onChange={(event) =>
                        updateProductDraft({
                          packageQuantity: event.target.value,
                        })
                      }
                      className="h-11 rounded-[8px] bg-white text-right font-semibold dark:bg-background"
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-sm font-bold text-card-foreground">
                      หน่วยบรรจุ
                    </span>
                    <AsyncSearchableSelect<StockCatalogOption>
                      selectedLabel={productDraft.packageUnit}
                      placeholder="เลือกหน่วยบรรจุ"
                      searchPlaceholder="ค้นหาหน่วยบรรจุ..."
                      emptyMessage="ไม่พบหน่วยบรรจุ"
                      disabled={productCatalogLoading || !productCatalog}
                      fetchOptions={fetchUnitOptions}
                      getOptionKey={(unit) => String(unit.id)}
                      getOptionLabel={(unit) => unit.name}
                      isOptionSelected={(unit) =>
                        unit.name === productDraft.packageUnit
                      }
                      onSelect={(unit) =>
                        updateProductDraft({ packageUnit: unit.name })
                      }
                      triggerClassName="h-11 rounded-[8px] bg-white font-bold dark:bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="stock-product-cost"
                    className="block text-sm font-bold text-card-foreground"
                  >
                    ราคาทุน
                  </label>
                  <Input
                    id="stock-product-cost"
                    inputMode="decimal"
                    value={productDraft.costPrice}
                    onChange={(event) =>
                      updateProductDraft({ costPrice: event.target.value })
                    }
                    className="h-11 rounded-[8px] bg-white text-right font-semibold dark:bg-background"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="stock-product-retail"
                    className="block text-sm font-bold text-card-foreground"
                  >
                    ราคาปลีก
                  </label>
                  <Input
                    id="stock-product-retail"
                    inputMode="decimal"
                    value={productDraft.retailPrice}
                    onChange={(event) =>
                      updateProductDraft({ retailPrice: event.target.value })
                    }
                    className="h-11 rounded-[8px] bg-white text-right font-semibold dark:bg-background"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {createProductError ? (
                <div className="flex items-start gap-2 rounded-[8px] border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-main-red dark:border-red-500/20 dark:bg-red-500/10">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{createProductError}</span>
                </div>
              ) : null}

              {createProductSuccess ? (
                <div className="flex items-start gap-2 rounded-[8px] border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{createProductSuccess}</span>
                </div>
              ) : null}
            </LargeDialogBody>

            <LargeDialogFooter>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-[8px] font-bold"
                disabled={isCreatingProduct}
                onClick={() => handleCreateProductOpenChange(false)}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="h-10 rounded-[8px] font-bold"
                disabled={
                  isCreatingProduct || productCatalogLoading || !productCatalog
                }
              >
                {isCreatingProduct ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                บันทึกสินค้า
              </Button>
            </LargeDialogFooter>
          </form>
        </LargeDialogContent>
      </LargeDialog>

      <BarcodeCameraDialog
        open={isBarcodeScannerOpen}
        onOpenChange={setIsBarcodeScannerOpen}
        onDetected={(barcode) => updateProductDraft({ barcode })}
      />
    </div>
  );
}
