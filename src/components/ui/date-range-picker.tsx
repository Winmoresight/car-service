"use client";

import { isSameDay } from "date-fns";
import { th } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatThaiShortDate } from "@/lib/thai-date";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  placeholder = "เลือกช่วงวันที่",
  className,
  triggerClassName,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start overflow-hidden text-left font-normal",
              !dateRange && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="min-w-0 truncate">
              {dateRange?.from
                ? dateRange.to && !isSameDay(dateRange.from, dateRange.to)
                  ? `${formatThaiShortDate(dateRange.from)} – ${formatThaiShortDate(dateRange.to)}`
                  : formatThaiShortDate(dateRange.from)
                : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={onDateRangeChange}
            numberOfMonths={2}
            locale={th}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
