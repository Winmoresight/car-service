/**
 * KPI Card Component
 * แสดงตัวเลข KPI พร้อม label และ icon
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  variant?: "default" | "emerald" | "blue" | "orange" | "purple";
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  format = "number",
  variant = "default",
}: KPICardProps) {
  const variantStyles = {
    default: "text-main-blue bg-blue-50",
    emerald: "text-main-green bg-emerald-50",
    blue: "text-main-blue bg-blue-50",
    orange: "text-main-orange bg-orange-50",
    purple: "text-purple-600 bg-purple-50",
  };

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
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 bg-card overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className={cn("p-2.5 rounded-2xl transition-transform group-hover:scale-110 duration-300", variantStyles[variant])}>
              {Icon && <Icon className="h-6 w-6" />}
            </div>
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
                  trend.isPositive ? "text-main-green bg-emerald-50" : "text-main-red bg-red-50"
                )}
              >
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}%
              </span>
            )}
          </div>
          
          <div className="space-y-1">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <div className="text-3xl font-extrabold text-card-foreground tracking-tight">
              {formattedValue()}
            </div>
          </div>

          {subtitle && (
            <p className="text-xs text-muted-foreground font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
