/**
 * KPI Card Component
 * แสดงตัวเลข KPI พร้อม label และ icon
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  format?: "currency" | "number" | "percent";
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  format = "number",
}: KPICardProps) {
  // Format value based on type
  const formattedValue = () => {
    if (typeof value === "string") return value;

    switch (format) {
      case "currency":
        return new Intl.NumberFormat("th-TH", {
          style: "currency",
          currency: "THB",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value);
      case "percent":
        return `${value.toFixed(2)}%`;
      case "number":
      default:
        return new Intl.NumberFormat("th-TH").format(value);
    }
  };

  return (
    <Card className="hover:ring-primary/20 transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        {Icon && (
          <div className="p-2 rounded-lg bg-primary/5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight text-foreground">
          {formattedValue()}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1 font-light">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <span
              className={`text-xs font-medium ${
                trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
