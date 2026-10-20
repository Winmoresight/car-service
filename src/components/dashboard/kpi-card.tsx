/**
 * KPI Card Component
 * แสดงตัวเลข KPI พร้อม label, unit และ icon
 */

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
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
  variant?: "default" | "emerald" | "blue" | "orange" | "purple" | "red";
  href?: string;
  onClick?: () => void;
}

export function KPICard({
  title,
  value,
  subtitle,
  unit,
  icon: Icon,
  format = "number",
  variant = "default",
  href,
  onClick,
}: KPICardProps) {
  const variantStyles = {
    default: "text-primary",
    emerald: "text-main-green",
    blue: "text-main-blue",
    orange: "text-main-orange",
    purple: "text-purple-600",
    red: "text-main-red",
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
    "col-span-1 flex w-full items-start rounded-[12px] border bg-secondary p-3 sm:p-4",
    (href || onClick) &&
      "cursor-pointer text-left transition-colors hover:border-primary/25 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  );

  const content = (
    <div className="flex w-full min-w-0 items-start gap-2.5 sm:gap-3">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border bg-card sm:h-10 sm:w-10",
          variantStyles[variant],
        )}
      >
        {Icon && <Icon strokeWidth={2.25} className="h-5 w-5" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm leading-tight font-medium text-primary sm:text-base">
          {title}
        </span>
        <h3 className="max-w-full text-xl font-semibold leading-tight text-primary sm:text-2xl min-[1280px]:text-[28px]">
          <span className={cn(outfit.className, "break-words tabular-nums")}>
            {displayValue.amount}
          </span>
          {displayUnit ? <> {displayUnit}</> : null}
        </h3>
        {subtitle ? (
          <p className="hidden max-w-full text-sm leading-snug text-muted-foreground sm:block">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className={cardClassName} aria-label={title}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={cardClassName} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={cardClassName}>{content}</div>;
}
