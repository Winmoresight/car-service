"use client";

/**
 * Sales Chart Component
 * กราฟแสดงแนวโน้มยอดขายรายวัน รายสัปดาห์ และรายเดือน
 */

import { addDays, format, startOfWeek } from "date-fns";
import { th } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { DailySales } from "@/types/api";

export type SalesChartPeriod = "day" | "week" | "month";

interface SalesChartProps {
  data: DailySales[];
  period: SalesChartPeriod;
  selectedDate: Date;
  dateRange?: DateRange;
  onPeriodChange: (period: SalesChartPeriod) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

type SalesChartSeries = "sales" | "profit" | "grossMargin";

const chartConfig = {
  sales: {
    label: "ยอดขาย",
    color: "hsl(var(--chart-1))",
  },
  profit: {
    label: "กำไร",
    color: "hsl(var(--chart-2))",
  },
  grossMargin: {
    label: "%Gross Margin",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

export function SalesChart({
  data,
  period,
  selectedDate,
  dateRange,
  onPeriodChange,
  onDateRangeChange,
}: SalesChartProps) {
  const [visibleSeries, setVisibleSeries] = useState<
    Record<SalesChartSeries, boolean>
  >({
    sales: true,
    profit: true,
    grossMargin: true,
  });
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 5);
  const description = dateRange?.from
    ? `${format(dateRange.from, "d MMM yyyy", { locale: th })}${dateRange.to ? ` - ${format(dateRange.to, "d MMM yyyy", { locale: th })}` : ""} · ไม่รวมวันอาทิตย์`
    : period === "week"
      ? `${format(weekStart, "d MMM", { locale: th })} - ${format(weekEnd, "d MMM yyyy", { locale: th })} · จันทร์–เสาร์`
      : period === "month"
        ? `${format(selectedDate, "MMMM yyyy", { locale: th })} · ไม่รวมวันอาทิตย์`
        : `30 วันล่าสุดถึง ${format(selectedDate, "d MMM yyyy", { locale: th })} · ไม่รวมวันอาทิตย์`;
  const chartData = data.map((item) => {
    const date = new Date(`${item.date}T00:00:00`);

    return {
      date: format(date, "d MMM", { locale: th }),
      sales: item.sales,
      profit: item.profit,
      grossMargin:
        item.sales !== 0
          ? Number(((item.profit / item.sales) * 100).toFixed(2))
          : 0,
    };
  });

  const seriesOptions: Array<{
    key: SalesChartSeries;
    label: string;
    color: string;
  }> = [
    { key: "sales", label: "ยอดขาย", color: "#3b82f6" },
    { key: "profit", label: "กำไร", color: "#10b981" },
    { key: "grossMargin", label: "%Gross Margin", color: "#f59e0b" },
  ];

  const toggleSeries = (series: SalesChartSeries) => {
    setVisibleSeries((current) => ({
      ...current,
      [series]: !current[series],
    }));
  };

  return (
    <Card className="rounded-3xl border bg-card py-4 shadow-sm">
      <CardHeader className="flex flex-col justify-between gap-4 px-4 pb-4 min-[720px]:flex-row min-[720px]:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
            <TrendingUp className="h-6 w-6 text-main-blue" />
          </div>
          <div className="flex flex-col">
            <CardTitle className="text-xl font-bold text-card-foreground">
              กราฟยอดขาย
            </CardTitle>
            {description && (
              <CardDescription className="text-sm font-medium text-muted-foreground">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 min-[520px]:flex-row min-[520px]:items-center">
          <div className="flex items-center rounded-lg border bg-secondary p-1">
            {(
              [
                ["day", "รายวัน"],
                ["week", "รายสัปดาห์"],
                ["month", "รายเดือน"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={
                  !dateRange?.from && period === value ? "default" : "ghost"
                }
                onClick={() => onPeriodChange(value)}
                className="h-8 px-3 text-xs"
              >
                {label}
              </Button>
            ))}
          </div>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            placeholder="เลือกช่วงวันที่"
            className="[&_button]:h-10 [&_button]:w-full [&_button]:rounded-xl [&_button]:px-3 [&_button]:text-xs [&_button]:font-bold min-[520px]:[&_button]:w-[260px]"
          />
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-semibold text-muted-foreground">
            เลือกเส้นที่แสดง
          </span>
          {seriesOptions.map((series) => (
            <Button
              key={series.key}
              type="button"
              size="sm"
              variant={visibleSeries[series.key] ? "secondary" : "outline"}
              aria-pressed={visibleSeries[series.key]}
              onClick={() => toggleSeries(series.key)}
              className="h-8 gap-2 rounded-full px-3 text-xs font-bold"
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: series.color }}
              />
              {series.label}
            </Button>
          ))}
        </div>
        <ChartContainer config={chartConfig} className="h-[450px] w-full">
          <AreaChart
            data={chartData}
            margin={{
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              horizontal={true}
              stroke="hsl(var(--border))"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={16}
              tick={{
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
            />
            <YAxis
              yAxisId="money"
              tickLine={false}
              axisLine={false}
              tickMargin={16}
              tick={{
                fontSize: 11,
                fill: "hsl(var(--muted-foreground))",
                fontWeight: 600,
              }}
              tickFormatter={(value) => {
                if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                return value;
              }}
            />
            {visibleSeries.grossMargin ? (
              <YAxis
                yAxisId="percentage"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                width={48}
                tick={{
                  fontSize: 11,
                  fill: "#f59e0b",
                  fontWeight: 600,
                }}
                tickFormatter={(value) => `${value}%`}
              />
            ) : null}
            <ChartTooltip
              cursor={{
                stroke: "hsl(var(--border))",
                strokeWidth: 2,
              }}
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value, name, item) => {
                    const isGrossMargin = item.dataKey === "grossMargin";
                    const label = isGrossMargin
                      ? "%Gross Margin"
                      : name === "sales"
                        ? "ยอดขาย"
                        : "กำไร";
                    const formattedValue = isGrossMargin
                      ? `${Number(value).toLocaleString("th-TH", { maximumFractionDigits: 2 })}%`
                      : `${Number(value).toLocaleString("th-TH", { maximumFractionDigits: 0 })} บาท`;

                    return (
                      <div className="flex w-full min-w-44 items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="flex-1 text-muted-foreground">
                          {label}
                        </span>
                        <span className="font-mono font-medium tabular-nums">
                          {formattedValue}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            {visibleSeries.sales ? (
              <Area
                yAxisId="money"
                dataKey="sales"
                type="natural"
                fill="url(#fillSales)"
                stroke="#3b82f6"
                strokeWidth={4}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1000}
              />
            ) : null}
            {visibleSeries.profit ? (
              <Area
                yAxisId="money"
                dataKey="profit"
                type="natural"
                fill="url(#fillProfit)"
                stroke="#10b981"
                strokeWidth={4}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1000}
              />
            ) : null}
            {visibleSeries.grossMargin ? (
              <Area
                yAxisId="percentage"
                dataKey="grossMargin"
                type="natural"
                fill="transparent"
                stroke="#f59e0b"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1000}
              />
            ) : null}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
