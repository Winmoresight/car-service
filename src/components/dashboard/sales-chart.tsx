"use client";

/**
 * Sales Chart Component
 * กราฟแสดงยอดขายรายวัน
 */

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
import { format } from "date-fns";
import { th } from "date-fns/locale";

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

  return (
    <Card>
      {(title || description) && (
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="pt-6">
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 12,
            }}
          >
            <defs>
              <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-sales)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-sales)"
                  stopOpacity={0.01}
                />
              </linearGradient>
              <linearGradient id="fillProfit" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-profit)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-profit)"
                  stopOpacity={0.01}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              strokeOpacity={0.1}
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => value}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <ChartTooltip
              cursor={{
                stroke: "hsl(var(--muted-foreground))",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="sales"
              type="monotone"
              fill="url(#fillSales)"
              fillOpacity={1}
              stroke="var(--color-sales)"
              strokeWidth={2}
              stackId="sales"
            />
            <Area
              dataKey="profit"
              type="monotone"
              fill="url(#fillProfit)"
              fillOpacity={1}
              stroke="var(--color-profit)"
              strokeWidth={2}
              stackId="profit"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
