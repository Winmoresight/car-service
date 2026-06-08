/**
 * KPI Card Component
 * แสดงตัวเลข KPI พร้อม label และ icon
 */

import type { LucideIcon } from "lucide-react";
import { outfit } from "@/components/fonts/fonts";
import { cn } from "@/lib/utils";

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
  onClick?: () => void;
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  format = "number",
  variant = "default",
  onClick,
}: KPICardProps) {
  const variantStyles = {
    default: "text-main-blue bg-blue-50",
    emerald: "text-main-green bg-emerald-50",
    blue: "text-main-blue bg-blue-50",
    orange: "text-main-orange bg-orange-50",
    purple: "text-purple-600 bg-purple-50",
  };

  const formattedValue = () => {
    if (typeof value === "string") {
      return { amount: value, unit: "" };
    }

    switch (format) {
      case "currency":
        return {
          amount: new Intl.NumberFormat("th-TH").format(value),
          unit: "บาท",
        };
      case "percent":
        return { amount: value.toFixed(2), unit: "%" };
      default:
        return {
          amount: new Intl.NumberFormat("th-TH").format(value),
          unit: "",
        };
    }
  };

  const displayValue = formattedValue();

  const cardClassName = cn(
    "col-span-1 w-full bg-background dark:bg-secondary rounded-[8px] border p-4 min-h-[210px]",
    onClick && "cursor-pointer text-left transition-shadow hover:shadow-md",
  );

  const content = (
    <div className="flex min-[600px]:flex-col justify-between min-[600px]:justify-start gap-3">
      <div
        className={cn(
          "flex items-center justify-center w-[66px] h-[66px] min-[450px]:w-[70px] rounded-[8px] min-[600px]:w-12 min-[600px]:h-12 min-[600px]:rounded-full border dark:bg-background/50 shrink-0",
          variantStyles[variant],
        )}
      >
        {Icon && (
          <Icon
            strokeWidth={2.5}
            className="w-10 h-10 min-[600px]:w-6 min-[600px]:h-6"
          />
        )}
      </div>

      <div className="flex flex-col justify-between items-end min-[600px]:items-start gap-1 flex-1 min-h-[132px]">
        <span className="text-primary text-lg font-semibold">{title}</span>
        <h3 className="text-primary text-[20px] min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:text-4xl font-bold text-left">
          <span className={outfit.className}>{displayValue.amount}</span>
          {displayValue.unit ? ` ${displayValue.unit}` : null}
        </h3>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg mt-1",
              trend.isPositive
                ? "text-main-green bg-emerald-50"
                : "text-main-red bg-red-50",
            )}
          >
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value).toFixed(1)}%
          </span>
        ) : (
          <span className="text-muted-foreground text-xs mt-1 font-medium">
            {subtitle ?? ""}
          </span>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" className={cardClassName} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
