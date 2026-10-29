"use client";

import { addDays, format, startOfWeek } from "date-fns";
import {
  ChartPie,
  Check,
  ChevronRight,
  ListFilter,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Cell, Pie, PieChart } from "recharts";
import { CategorySalesDetailDialog } from "@/components/dashboard/category-sales-detail-dialog";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { formatThaiDate, formatThaiShortDate } from "@/lib/thai-date";
import { cn } from "@/lib/utils";
import type { CategorySalesShare, CategorySalesShareItem } from "@/types/api";

export type CategorySharePeriod = "day" | "week" | "month";

interface CategorySalesShareProps {
  data?: CategorySalesShare;
  isLoading?: boolean;
  hasError?: boolean;
  period: CategorySharePeriod;
  selectedDate: Date;
  dateRange?: DateRange;
  categoryOptions: Array<{ id: number; name: string }>;
  excludedCategoryIds: number[];
  onPeriodChange: (period: CategorySharePeriod) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onExcludedCategoryIdsChange: (categoryIds: number[]) => void;
}

const periodOptions: Array<{
  value: CategorySharePeriod;
  label: string;
}> = [
  { value: "day", label: "รายวัน" },
  { value: "week", label: "รายสัปดาห์" },
  { value: "month", label: "รายเดือน" },
];

const segmentColors = [
  "#6EA8FE",
  "#B88CF4",
  "#F2C94C",
  "#9BC53D",
  "#2F9A8F",
  "#24596D",
] as const;

const chartConfig = {
  quantity: {
    label: "จำนวนที่ขาย",
  },
} satisfies ChartConfig;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function getPeriodLabel(period: CategorySharePeriod, selectedDate: Date) {
  if (period === "week") {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 5);

    return `${formatThaiDate(weekStart, { day: "numeric", month: "short" })} – ${formatThaiShortDate(weekEnd)}`;
  }

  if (period === "month") {
    return formatThaiDate(selectedDate, { month: "long", year: "numeric" });
  }

  return formatThaiDate(selectedDate, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function CategorySalesShareCard({
  data,
  isLoading = false,
  hasError = false,
  period,
  selectedDate,
  dateRange,
  categoryOptions,
  excludedCategoryIds,
  onPeriodChange,
  onDateRangeChange,
  onExcludedCategoryIdsChange,
}: CategorySalesShareProps) {
  const patternIdPrefix = useId().replace(/:/g, "");
  const [selectedCategory, setSelectedCategory] = useState<{
    name: string;
    detailNames: string[];
  } | null>(null);
  const categories = data?.categories ?? [];
  const topCategories = categories.slice(0, 5);
  const remainingCategories = categories.slice(5);
  const remainingQuantity = remainingCategories.reduce(
    (total, category) => total + category.quantity,
    0,
  );
  const remainingAmount = remainingCategories.reduce(
    (total, category) => total + category.amount,
    0,
  );
  const hasCompleteRemainingProfit = remainingCategories.every(
    (category) => category.profit !== null,
  );
  const remainingProfit = hasCompleteRemainingProfit
    ? remainingCategories.reduce(
        (total, category) => total + (category.profit ?? 0),
        0,
      )
    : null;
  const displayCategories: CategorySalesShareItem[] = [
    ...topCategories,
    ...(remainingCategories.length > 0
      ? [
          {
            name: `อื่น ๆ (${remainingCategories.length} ประเภท)`,
            quantity: remainingQuantity,
            amount: remainingAmount,
            profit: remainingProfit,
            profitPercent:
              remainingProfit === null || remainingAmount === 0
                ? null
                : (remainingProfit / remainingAmount) * 100,
            percentage:
              (remainingQuantity / Math.max(data?.totalQuantity ?? 0, 1)) * 100,
          },
        ]
      : []),
  ];
  const allVisibleProfitsUnavailable = displayCategories.every(
    (category) => category.profit === null,
  );
  const excludedCategoryIdSet = new Set(excludedCategoryIds);
  const includedCategoryCount = Math.max(
    categoryOptions.length - excludedCategoryIds.length,
    0,
  );

  const toggleCategory = (categoryId: number) => {
    onExcludedCategoryIdsChange(
      excludedCategoryIdSet.has(categoryId)
        ? excludedCategoryIds.filter((id) => id !== categoryId)
        : [...excludedCategoryIds, categoryId],
    );
  };

  const detailPeriodLabel = dateRange?.from
    ? dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()
      ? `${formatThaiShortDate(dateRange.from)} – ${formatThaiShortDate(dateRange.to)}`
      : formatThaiShortDate(dateRange.from)
    : getPeriodLabel(period, selectedDate);
  const detailRequestUrl = selectedCategory
    ? (() => {
        const params = new URLSearchParams({
          period,
          date: format(selectedDate, "yyyy-MM-dd"),
        });

        if (dateRange?.from) {
          params.set("startDate", format(dateRange.from, "yyyy-MM-dd"));
          params.set(
            "endDate",
            format(dateRange.to ?? dateRange.from, "yyyy-MM-dd"),
          );
        }

        for (const categoryName of selectedCategory.detailNames) {
          params.append("categoryName", categoryName);
        }

        return `/api/products/category-share?${params.toString()}`;
      })()
    : "";

  return (
    <section className="overflow-hidden rounded-[16px] border bg-card p-4 sm:p-5">
      <div className="mb-5 flex flex-col justify-between gap-4 min-[760px]:flex-row min-[760px]:items-start">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-muted">
            <ChartPie className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-card-foreground sm:text-xl">
              สัดส่วนสินค้าที่ขายตามประเภท
            </h2>
            <p className="text-sm text-muted-foreground">
              {dateRange?.from
                ? "เรียงตามจำนวนที่ขาย"
                : `${getPeriodLabel(period, selectedDate)} · เรียงตามจำนวนที่ขาย`}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-2 min-[520px]:flex-row min-[520px]:items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2 px-3 text-sm"
              >
                <ListFilter className="h-4 w-4" />
                {excludedCategoryIds.length === 0
                  ? "ทุกประเภท"
                  : `เลือก ${includedCategoryCount} ประเภท`}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-3">
              <PopoverHeader className="px-1 pb-2">
                <PopoverTitle className="font-bold">
                  ประเภทที่นำมาวิเคราะห์
                </PopoverTitle>
                <PopoverDescription>
                  เอาเครื่องหมายออกจากประเภทที่ไม่ต้องการรวมในกราฟนี้
                </PopoverDescription>
              </PopoverHeader>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start font-bold"
                onClick={() => onExcludedCategoryIdsChange([])}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded border">
                  {excludedCategoryIds.length === 0 ? (
                    <Check className="h-3 w-3" />
                  ) : null}
                </span>
                เลือกทุกประเภท
              </Button>

              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {categoryOptions.map((category) => {
                  const isIncluded = !excludedCategoryIdSet.has(category.id);

                  return (
                    <button
                      key={category.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold hover:bg-muted"
                      aria-pressed={isIncluded}
                      onClick={() => toggleCategory(category.id)}
                    >
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border">
                        {isIncluded ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="truncate">{category.name}</span>
                    </button>
                  );
                })}
              </div>

              <p className="border-t px-1 pt-2 text-sm text-muted-foreground">
                แสดง {includedCategoryCount} จาก {categoryOptions.length} ประเภท
              </p>
            </PopoverContent>
          </Popover>

          <fieldset
            aria-label="เลือกระยะเวลาสัดส่วนสินค้า"
            className="inline-flex h-10 items-stretch overflow-hidden rounded-[8px] border border-input bg-secondary"
          >
            {periodOptions.map((option, index) => {
              const isActive = !dateRange?.from && period === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  className={cn(
                    "min-w-[84px] px-3 text-sm font-medium transition-colors",
                    index > 0 && "border-l border-input",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-primary",
                  )}
                  onClick={() => onPeriodChange(option.value)}
                >
                  {option.label}
                </button>
              );
            })}
          </fieldset>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            placeholder="เลือกช่วงวันที่"
            className="[&_button]:h-10 [&_button]:w-full [&_button]:rounded-[8px] [&_button]:px-3 [&_button]:text-sm min-[520px]:[&_button]:w-[260px]"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
          <Skeleton className="h-[330px] rounded-2xl" />
          <Skeleton className="h-[330px] rounded-2xl" />
        </div>
      ) : hasError ? (
        <div className="rounded-2xl border px-4 py-12 text-center text-sm font-semibold text-destructive">
          โหลดสัดส่วนประเภทสินค้าไม่สำเร็จ
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-2xl border px-4 py-12 text-center text-sm font-semibold text-muted-foreground">
          ยังไม่มีข้อมูลประเภทสินค้าที่ขายในช่วงนี้
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.2fr)]">
          <div className="relative flex min-h-[330px] items-center justify-center rounded-2xl border bg-muted/15">
            <ChartContainer config={chartConfig} className="h-[330px] w-full">
              <PieChart>
                <defs>
                  {segmentColors.map((color, index) => (
                    <pattern
                      height="8"
                      id={`${patternIdPrefix}-category-hatch-${index}`}
                      key={color}
                      patternTransform="rotate(35)"
                      patternUnits="userSpaceOnUse"
                      width="8"
                    >
                      <rect fill={color} height="8" width="8" />
                      <line
                        stroke="white"
                        strokeOpacity="0.24"
                        strokeWidth="4"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="8"
                      />
                    </pattern>
                  ))}
                </defs>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, _name, item) => (
                        <div className="flex min-w-44 items-center justify-between gap-4">
                          <span className="truncate text-muted-foreground">
                            {item.payload.name}
                          </span>
                          <span className="font-mono font-semibold tabular-nums text-foreground">
                            {formatNumber(Number(value))} ชิ้น ·{" "}
                            {Number(item.payload.percentage).toFixed(2)}%
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={displayCategories}
                  dataKey="quantity"
                  nameKey="name"
                  innerRadius={82}
                  outerRadius={125}
                  cornerRadius={8}
                  paddingAngle={1}
                  stroke="var(--card)"
                  strokeWidth={4}
                >
                  {displayCategories.map((category, index) => (
                    <Cell
                      key={category.name}
                      fill={`url(#${patternIdPrefix}-category-hatch-${index % segmentColors.length})`}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">
                {formatNumber(data?.totalQuantity ?? 0)}
              </span>
              <span className="text-sm text-muted-foreground">ชิ้นที่ขายทั้งหมด</span>
            </div>
          </div>

          <div className="self-start overflow-hidden rounded-2xl border">
            <div className="grid grid-cols-2 divide-x border-b bg-muted/15">
              <div className="px-3 py-3">
                <p className="text-sm font-medium text-muted-foreground">
                  ยอดขายรวม
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatCurrency(data?.totalAmount ?? 0)}
                </p>
              </div>
              <div className="px-3 py-3">
                <p className="text-sm font-medium text-muted-foreground">
                  กำไรรวม
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatCurrency(data?.totalProfit ?? 0)}
                </p>
              </div>
            </div>
            <div
              className={cn(
                "grid gap-2 border-b bg-muted/35 px-3 py-2 text-sm font-medium text-muted-foreground max-[560px]:grid-cols-[32px_minmax(0,1fr)_72px]",
                allVisibleProfitsUnavailable
                  ? "grid-cols-[36px_minmax(0,1fr)_82px_110px]"
                  : "grid-cols-[36px_minmax(0,1fr)_82px_110px_110px]",
              )}
            >
              <span>#</span>
              <span>ประเภทสินค้า</span>
              <span className="text-right">สัดส่วน</span>
              <span className="text-right max-[560px]:hidden">ยอดขาย</span>
              {!allVisibleProfitsUnavailable ? (
                <span className="text-right max-[560px]:hidden">กำไร</span>
              ) : null}
            </div>
            <div className="divide-y">
              {displayCategories.map((category, index) => {
                const detailNames =
                  index < topCategories.length
                    ? [category.name]
                    : remainingCategories.map((item) => item.name);

                return (
                  <button
                    key={category.name}
                    type="button"
                    aria-label={`ดูรายละเอียด ${category.name}`}
                    className={cn(
                      "group grid w-full items-center gap-2 px-3 py-3 text-left text-sm transition-colors hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset max-[560px]:grid-cols-[32px_minmax(0,1fr)_72px]",
                      allVisibleProfitsUnavailable
                        ? "grid-cols-[36px_minmax(0,1fr)_82px_110px]"
                        : "grid-cols-[36px_minmax(0,1fr)_82px_110px_110px]",
                    )}
                    onClick={() =>
                      setSelectedCategory({ name: category.name, detailNames })
                    }
                  >
                    <span className="text-sm font-medium tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                        style={{
                          backgroundColor:
                            index < segmentColors.length
                              ? segmentColors[index]
                              : "var(--muted-foreground)",
                        }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 font-semibold">
                          <span className="truncate">{category.name}</span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                        </span>
                        <span className="block text-sm tabular-nums text-muted-foreground">
                          {formatNumber(category.quantity)} ชิ้น
                        </span>
                      </span>
                    </span>
                    <span className="text-right font-semibold tabular-nums">
                      {category.percentage.toFixed(2)}%
                    </span>
                    <span className="truncate text-right text-sm font-medium tabular-nums text-muted-foreground max-[560px]:hidden">
                      {formatCurrency(category.amount)}
                    </span>
                    {!allVisibleProfitsUnavailable ? (
                      <span className="min-w-0 text-right max-[560px]:hidden">
                        <span className="block truncate text-sm font-medium tabular-nums">
                          {category.profit === null
                            ? "–"
                            : formatCurrency(category.profit)}
                        </span>
                        <span className="block text-sm tabular-nums text-muted-foreground">
                          {category.profitPercent === null
                            ? "ยังไม่กำหนด"
                            : `${category.profitPercent.toFixed(2)}%`}
                        </span>
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            {allVisibleProfitsUnavailable ? (
              <div className="flex flex-col gap-3 border-t bg-muted/25 px-3 py-3 min-[560px]:flex-row min-[560px]:items-center min-[560px]:justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  ยังไม่ได้ตั้งค่าเปอร์เซ็นต์กำไรตามประเภทสินค้า
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link href="/products/categories">
                    <Settings2 className="h-4 w-4" />
                    ตั้งค่า % กำไร
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      <CategorySalesDetailDialog
        categoryName={selectedCategory?.name ?? ""}
        requestUrl={detailRequestUrl}
        periodLabel={detailPeriodLabel}
        isOpen={selectedCategory !== null}
        onClose={() => setSelectedCategory(null)}
      />
    </section>
  );
}
