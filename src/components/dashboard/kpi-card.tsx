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
  unit?: string;
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
  unit,
  icon: Icon,
  trend,
  format = "number",
  variant = "default",
  onClick,
}: KPICardProps) {
  const variantStyles = {
    default: "text-primary",
    emerald: "text-main-green",
    blue: "text-main-blue",
    orange: "text-main-orange",
    purple: "text-purple-600",
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
  const displayUnit = unit ?? displayValue.unit;

  const cardClassName = cn(
    "col-span-1 w-full rounded-[8px] border bg-background p-4 dark:bg-secondary",
    onClick && "cursor-pointer text-left transition-shadow hover:shadow-md",
  );

  const content = (
    <div className="flex justify-between gap-3 min-[600px]:flex-col min-[600px]:justify-start">
      <div
        className={cn(
          "flex h-[66px] w-[66px] shrink-0 items-center justify-center rounded-[8px] border bg-white min-[450px]:w-[70px] min-[600px]:h-12 min-[600px]:w-12 min-[600px]:rounded-full dark:bg-background/65",
          variantStyles[variant],
        )}
      >
        {Icon && (
          <Icon
            strokeWidth={2.5}
            className="h-10 w-10 min-[600px]:h-6 min-[600px]:w-6"
          />
        )}
      </div>

      <div className="flex flex-col items-end gap-1 min-[600px]:items-start">
        <span className="text-lg font-semibold text-primary">{title}</span>
        <h3 className="flex items-baseline justify-end gap-1.5 whitespace-nowrap text-left text-[20px] font-bold text-primary min-[350px]:text-2xl min-[450px]:text-3xl min-[600px]:justify-start min-[600px]:text-4xl">
          <span className={outfit.className}>{displayValue.amount}</span>
          {displayUnit ? (
            <span className="font-bold text-primary">{displayUnit}</span>
          ) : null}
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
        ) : null}
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
