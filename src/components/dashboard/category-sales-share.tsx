"use client";

import { addDays, format, startOfWeek } from "date-fns";
import { th } from "date-fns/locale";
import { ChartPie } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import { Button } from "@/components/ui/button";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategorySalesShare } from "@/types/api";

export type CategorySharePeriod = "day" | "week" | "month";

interface CategorySalesShareProps {
  data?: CategorySalesShare;
  isLoading?: boolean;
  hasError?: boolean;
  period: CategorySharePeriod;
  selectedDate: Date;
  onPeriodChange: (period: CategorySharePeriod) => void;
  onDateChange: (date: Date) => void;
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
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
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

    return `${format(weekStart, "d MMM", { locale: th })} – ${format(weekEnd, "d MMM yyyy", { locale: th })}`;
  }

  if (period === "month") {
    return format(selectedDate, "MMMM yyyy", { locale: th });
  }

  return format(selectedDate, "d MMMM yyyy", { locale: th });
}

export function CategorySalesShareCard({
  data,
  isLoading = false,
  hasError = false,
  period,
  selectedDate,
  onPeriodChange,
  onDateChange,
}: CategorySalesShareProps) {
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
  const pieData = [
    ...topCategories,
    ...(remainingCategories.length > 0
      ? [
          {
            name: `อื่น ๆ (${remainingCategories.length} ประเภท)`,
            quantity: remainingQuantity,
            amount: remainingAmount,
            percentage:
              (remainingQuantity / Math.max(data?.totalQuantity ?? 0, 1)) * 100,
          },
        ]
      : []),
  ];

  return (
    <section className="overflow-hidden rounded-3xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-col justify-between gap-4 min-[760px]:flex-row min-[760px]:items-start">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40">
            <ChartPie className="h-5 w-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-card-foreground sm:text-xl">
              สัดส่วนสินค้าที่ขายตามประเภท
            </h2>
            <p className="text-sm text-muted-foreground">
              {getPeriodLabel(period, selectedDate)} · เรียงตามจำนวนที่ขาย
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <DatePicker
            date={selectedDate}
            onDateChange={(date) => {
              if (date) {
                onDateChange(date);
              }
            }}
            className="h-10 w-full rounded-xl sm:w-[190px]"
          />
          <div className="flex w-fit rounded-xl border bg-muted/50 p-1">
            {periodOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={period === option.value ? "default" : "ghost"}
                className="h-8 rounded-lg px-3 text-xs sm:text-sm"
                onClick={() => onPeriodChange(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
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
                  data={pieData}
                  dataKey="quantity"
                  nameKey="name"
                  innerRadius={82}
                  outerRadius={125}
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {pieData.map((category, index) => (
                    <Cell
                      key={category.name}
                      fill={
                        index < segmentColors.length
                          ? segmentColors[index]
                          : "var(--muted-foreground)"
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">
                {formatNumber(data?.totalQuantity ?? 0)}
              </span>
              <span className="text-xs text-muted-foreground">ชิ้นที่ขายทั้งหมด</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border">
            <div className="grid grid-cols-[36px_minmax(0,1fr)_82px_110px] gap-2 border-b bg-muted/35 px-3 py-2 text-xs font-semibold text-muted-foreground max-[560px]:grid-cols-[32px_minmax(0,1fr)_72px]">
              <span>#</span>
              <span>ประเภทสินค้า</span>
              <span className="text-right">สัดส่วน</span>
              <span className="text-right max-[560px]:hidden">ยอดขาย</span>
            </div>
            <div className="max-h-[292px] divide-y overflow-y-auto">
              {categories.map((category, index) => (
                <div
                  key={category.name}
                  className="grid grid-cols-[36px_minmax(0,1fr)_82px_110px] items-center gap-2 px-3 py-3 text-sm max-[560px]:grid-cols-[32px_minmax(0,1fr)_72px]"
                >
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                      style={{
                        backgroundColor:
                          index < segmentColors.length
                            ? segmentColors[index]
                            : "var(--muted-foreground)",
                      }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{category.name}</p>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {formatNumber(category.quantity)} ชิ้น
                      </p>
                    </div>
                  </div>
                  <span className="text-right font-semibold tabular-nums">
                    {category.percentage.toFixed(2)}%
                  </span>
                  <span className="truncate text-right text-xs font-medium tabular-nums text-muted-foreground max-[560px]:hidden">
                    {formatCurrency(category.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
