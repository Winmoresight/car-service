import { cn } from "@/lib/utils";

export type DashboardTableRowCount = 5 | 10;

interface TableRowCountControlProps {
  value: DashboardTableRowCount;
  onValueChange: (value: DashboardTableRowCount) => void;
  label: string;
}

const rowCountOptions: DashboardTableRowCount[] = [5, 10];

export function TableRowCountControl({
  value,
  onValueChange,
  label,
}: TableRowCountControlProps) {
  return (
    <fieldset
      aria-label={label}
      className="inline-flex h-9 items-stretch overflow-hidden rounded-[8px] border border-input bg-secondary"
    >
      {rowCountOptions.map((option) => {
        const isActive = option === value;

        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            onClick={() => onValueChange(option)}
            className={cn(
              "min-w-[84px] px-3 text-sm font-medium transition-colors",
              option === 10 && "border-l border-input",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-primary",
            )}
          >
            {option} รายการ
          </button>
        );
      })}
    </fieldset>
  );
}
