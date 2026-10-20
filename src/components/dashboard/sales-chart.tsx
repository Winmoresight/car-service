"use client";

/**
 * Sales Chart Component
 * กราฟแสดงแนวโน้มยอดขายรายวัน รายสัปดาห์ และรายเดือน
 */

import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Eye, EyeOff, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
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
import { formatThaiShortDate } from "@/lib/thai-date";
import { cn } from "@/lib/utils";
import type { DailySales } from "@/types/api";

interface SalesChartProps {
  data: DailySales[];
  selectedDate: Date;
  dateRange?: DateRange;
  onDateRangeChange: (range: DateRange | undefined) => void;
}

type SalesChartSeries = "sales" | "profit" | "grossMargin";

const seriesOptions: Array<{
  key: SalesChartSeries;
  label: string;
  color: string;
  dashed?: boolean;
}> = [
  { key: "sales", label: "ยอดขาย", color: "#6EA8FE" },
  { key: "profit", label: "กำไร", color: "#2F9A8F" },
  {
    key: "grossMargin",
    label: "อัตรากำไรขั้นต้น",
    color: "#B88CF4",
    dashed: true,
  },
];

const chartConfig = {
  sales: {
    label: "ยอดขาย",
    color: "#6EA8FE",
  },
  profit: {
    label: "กำไร",
    color: "#2F9A8F",
  },
  grossMargin: {
    label: "อัตรากำไรขั้นต้น",
    color: "#B88CF4",
  },
} satisfies ChartConfig;

export function SalesChart({
  data,
  selectedDate,
  dateRange,
  onDateRangeChange,
}: SalesChartProps) {
  const [visibleSeries, setVisibleSeries] = useState<
    Record<SalesChartSeries, boolean>
  >({
    sales: true,
    profit: true,
    grossMargin: true,
  });
  const [showAxes, setShowAxes] = useState(false);
  const description = dateRange?.from
    ? "ไม่รวมวันอาทิตย์"
    : `30 วันล่าสุดถึง ${formatThaiShortDate(selectedDate)} · ไม่รวมวันอาทิตย์`;
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

  const visibleSeriesCount =
    Object.values(visibleSeries).filter(Boolean).length;

  const toggleSeries = (series: SalesChartSeries) => {
    setVisibleSeries((current) => {
      if (
        current[series] &&
        Object.values(current).filter(Boolean).length === 1
      ) {
        return current;
      }

      return { ...current, [series]: !current[series] };
    });
  };

  return (
    <Card className="rounded-[16px] bg-card py-4">
      <CardHeader className="flex flex-col justify-between gap-4 px-4 pb-4 min-[720px]:flex-row min-[720px]:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-blue-50">
            <TrendingUp className="h-5 w-5 text-main-blue" />
          </div>
          <div className="flex flex-col">
            <CardTitle className="text-xl font-semibold text-card-foreground">
              กราฟยอดขาย
            </CardTitle>
            {description && (
              <CardDescription className="text-sm text-muted-foreground">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
        <div className="flex items-center">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
            placeholder="เลือกช่วงวันที่"
            className="w-full [&_button]:h-10 [&_button]:w-full [&_button]:rounded-[8px] [&_button]:px-3 [&_button]:text-sm min-[520px]:w-auto min-[520px]:[&_button]:w-[260px]"
          />
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0">
        {chartData.length === 0 ? (
          <div className="flex min-h-40 items-center justify-center rounded-[12px] border bg-secondary/30 px-4 text-center">
            <div>
              <p className="font-medium text-primary">ยังไม่มียอดขายในช่วงนี้</p>
              <p className="mt-1 text-sm text-muted-foreground">
                เลือกวันหรือช่วงเวลาอื่นเพื่อดูแนวโน้มยอดขาย
              </p>
            </div>
          </div>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="h-[390px] w-full"
              id="sales-chart"
            >
              <LineChart
                accessibilityLayer
                data={chartData}
                margin={{
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 8,
                }}
              >
                <CartesianGrid
                  vertical={false}
                  horizontal={true}
                  horizontalCoordinatesGenerator={({ height, offset }) => {
                    const plotHeight = height - offset.top - offset.bottom;

                    return Array.from(
                      { length: 5 },
                      (_, index) => offset.top + (plotHeight * index) / 4,
                    );
                  }}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  height={showAxes ? 36 : 0}
                  interval="preserveStartEnd"
                  minTickGap={32}
                  tickMargin={12}
                  tick={
                    showAxes
                      ? {
                          fontSize: 14,
                          fill: "var(--muted-foreground)",
                          fontWeight: 400,
                        }
                      : false
                  }
                />
                <YAxis
                  yAxisId="money"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={12}
                  width={showAxes ? 52 : 0}
                  tick={{
                    fontSize: 14,
                    fill: showAxes ? "var(--muted-foreground)" : "transparent",
                    fontWeight: 400,
                  }}
                  tickFormatter={(value) => {
                    if (!showAxes) return "";
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
                    width={showAxes ? 48 : 0}
                    tick={{
                      fontSize: 14,
                      fill: showAxes
                        ? "var(--muted-foreground)"
                        : "transparent",
                      fontWeight: 400,
                    }}
                    tickFormatter={(value) => (showAxes ? `${value}%` : "")}
                  />
                ) : null}
                <ChartTooltip
                  cursor={{
                    stroke: "var(--border)",
                    strokeWidth: 2,
                  }}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value, name, item) => {
                        const isGrossMargin = item.dataKey === "grossMargin";
                        const label = isGrossMargin
                          ? "อัตรากำไรขั้นต้น"
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
                  <Line
                    yAxisId="money"
                    dataKey="sales"
                    type="monotoneX"
                    stroke="#6EA8FE"
                    strokeLinecap="round"
                    strokeWidth={4}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={1000}
                  />
                ) : null}
                {visibleSeries.profit ? (
                  <Line
                    yAxisId="money"
                    dataKey="profit"
                    type="monotoneX"
                    stroke="#2F9A8F"
                    strokeLinecap="round"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={1000}
                  />
                ) : null}
                {visibleSeries.grossMargin ? (
                  <Line
                    yAxisId="percentage"
                    dataKey="grossMargin"
                    type="monotoneX"
                    stroke="#B88CF4"
                    strokeDasharray="7 8"
                    strokeLinecap="round"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={1000}
                  />
                ) : null}
              </LineChart>
            </ChartContainer>
            <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <fieldset
                aria-label="เลือกเส้นข้อมูลที่แสดง"
                className="flex flex-wrap items-center gap-x-5 gap-y-1"
              >
                {seriesOptions.map((series) => (
                  <button
                    key={series.key}
                    type="button"
                    aria-label={`${visibleSeries[series.key] ? "ซ่อน" : "แสดง"}${series.label}`}
                    aria-pressed={visibleSeries[series.key]}
                    disabled={
                      visibleSeries[series.key] && visibleSeriesCount === 1
                    }
                    onClick={() => toggleSeries(series.key)}
                    className={cn(
                      "inline-flex min-h-8 items-center gap-2 text-sm text-muted-foreground transition-opacity hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed",
                      visibleSeries[series.key] ? "opacity-100" : "opacity-35",
                    )}
                  >
                    <svg
                      aria-hidden="true"
                      className="h-2 w-5 shrink-0 overflow-visible"
                      viewBox="0 0 20 8"
                    >
                      <line
                        x1="1"
                        x2="19"
                        y1="4"
                        y2="4"
                        stroke={series.color}
                        strokeDasharray={series.dashed ? "5 4" : undefined}
                        strokeLinecap="round"
                        strokeWidth="2"
                      />
                    </svg>
                    {series.label}
                  </button>
                ))}
              </fieldset>
              <Button
                type="button"
                aria-controls="sales-chart"
                aria-pressed={showAxes}
                className="self-start gap-1 text-muted-foreground hover:text-primary sm:self-auto"
                onClick={() => setShowAxes((current) => !current)}
                size="xs"
                variant="ghost"
              >
                {showAxes ? (
                  <EyeOff aria-hidden="true" className="size-4" />
                ) : (
                  <Eye aria-hidden="true" className="size-4" />
                )}
                <span>{showAxes ? "ซ่อนแกน" : "แสดงแกน"}</span>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
