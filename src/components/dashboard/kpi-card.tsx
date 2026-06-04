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
    default: "text-primary bg-primary/10",
    emerald: "text-emerald-600 bg-emerald-50",
    blue: "text-blue-600 bg-blue-50",
    orange: "text-orange-600 bg-orange-50",
    purple: "text-purple-600 bg-purple-50",
  };

  const borderStyles = {
    default: "hover:border-primary/50",
    emerald: "hover:border-emerald-500/50",
    blue: "hover:border-blue-500/50",
    orange: "hover:border-orange-500/50",
    purple: "hover:border-purple-500/50",
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
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-md",
      borderStyles[variant]
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn("p-2.5 rounded-xl transition-colors", variantStyles[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight text-foreground">
          {formattedValue()}
        </div>
        
        <div className="flex items-center gap-2 mt-1.5">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs font-bold px-1.5 py-0.5 rounded-full",
                trend.isPositive ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
              )}
            >
              {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}%
            </span>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground font-medium">
              {subtitle}
            </p>
          )}
        </div>

        {/* Decorative background element */}
        <div className={cn(
          "absolute -right-4 -bottom-4 h-24 w-24 rounded-full opacity-[0.03]",
          variant === "default" ? "bg-primary" : `bg-${variant}-500`
        )} />
      </CardContent>
    </Card>
  );
}
