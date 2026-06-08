"use client";

/**
 * Sales Chart Component
 * กราฟแสดงยอดขายรายวัน
 */

import { format } from "date-fns";
import { th } from "date-fns/locale";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import type { DailySales } from "@/types/api";

interface SalesChartProps {
  data: DailySales[];
  title?: string;
  description?: string;
}

const chartConfig = {
  sales: {
    label: "ยอดขาย",
    color: "hsl(var(--chart-1))",
  },
  profit: {
    label: "กำไร",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function SalesChart({
  data,
  title = "ยอดขายรายวัน",
  description = "30 วันล่าสุด",
}: SalesChartProps) {
  // Format data for chart
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), "d MMM", { locale: th }),
    sales: item.sales,
    profit: item.profit,
  }));

  const today = format(new Date(), "d MMMM yyyy", { locale: th });

  return (
    <Card className="rounded-3xl border bg-card py-4 shadow-sm">
      <CardHeader className="flex flex-col justify-between gap-4 px-4 pb-4 min-[720px]:flex-row min-[720px]:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/10">
            <TrendingUp className="h-6 w-6 text-main-blue" />
          </div>
          <div className="flex flex-col">
            {title && (
              <CardTitle className="text-xl font-bold text-card-foreground">
                {title}
              </CardTitle>
            )}
            {description && (
              <CardDescription className="text-sm font-medium text-muted-foreground">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
        <div className="flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2">
          <div className="h-2 w-2 rounded-full bg-main-blue" />
          <span className="text-xs font-bold text-muted-foreground">
            {today}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-0">
        <ChartContainer config={chartConfig} className="h-[600px] w-full">
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
            <ChartTooltip
              cursor={{
                stroke: "hsl(var(--border))",
                strokeWidth: 2,
              }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="sales"
              type="natural"
              fill="url(#fillSales)"
              stroke="#3b82f6"
              strokeWidth={4}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={1000}
            />
            <Area
              dataKey="profit"
              type="natural"
              fill="url(#fillProfit)"
              stroke="#10b981"
              strokeWidth={4}
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={1000}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
