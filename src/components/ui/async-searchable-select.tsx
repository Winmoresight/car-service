"use client";

import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface AsyncSearchableSelectProps<Option> {
  selectedLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
  fetchOptions: (search: string, signal: AbortSignal) => Promise<Option[]>;
  getOptionKey: (option: Option) => string;
  getOptionLabel: (option: Option) => string;
  getOptionDescription?: (option: Option) => string;
  isOptionSelected?: (option: Option) => boolean;
  onSelect: (option: Option) => void;
}

export default function AsyncSearchableSelect<Option>({
  selectedLabel,
  placeholder = "เลือก...",
  searchPlaceholder = "ค้นหา...",
  emptyMessage = "ไม่พบข้อมูล",
  className,
  disabled = false,
  fetchOptions,
  getOptionKey,
  getOptionLabel,
  getOptionDescription,
  isOptionSelected,
  onSelect,
}: AsyncSearchableSelectProps<Option>) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.setTimeout(() => searchInputRef.current?.focus(), 0);

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const nextOptions = await fetchOptions(search, controller.signal);
        setOptions(nextOptions);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setOptions([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [fetchOptions, isOpen, search]);

  return (
    <div
      className={cn("relative w-full", isOpen && "z-[9999]", className)}
      ref={containerRef}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "flex h-11 w-full items-center justify-between rounded-xl border bg-background px-3 py-2 text-sm font-semibold outline-none transition-all dark:bg-secondary",
          isOpen
            ? "border-primary shadow-sm ring-3 ring-ring/30"
            : "border-input hover:border-primary/50",
          disabled && "cursor-not-allowed bg-muted opacity-50",
        )}
      >
        <span
          className={cn(
            "truncate text-left",
            !selectedLabel && "text-muted-foreground",
          )}
        >
          {selectedLabel || placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {isOpen ? (
        <div className="absolute top-full left-0 z-[9999] mt-2 w-full overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center border-b bg-muted/30 px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              className="flex h-8 w-full bg-transparent py-3 text-sm font-semibold outline-none placeholder:text-muted-foreground"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin opacity-50" />
            ) : search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-full p-1 hover:bg-muted"
              >
                <X className="h-3 w-3 opacity-50 hover:opacity-100" />
              </button>
            ) : null}
          </div>

          <div
            className="max-h-[300px] overflow-y-auto p-1 overscroll-contain focus:outline-none"
            data-lenis-prevent
          >
            {options.length === 0 && !isLoading ? (
              <div className="py-6 text-center text-sm font-semibold text-muted-foreground italic">
                {emptyMessage}
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {options.map((option) => {
                  const selected = isOptionSelected?.(option) || false;
                  const description = getOptionDescription?.(option);

                  return (
                    <button
                      key={getOptionKey(option)}
                      type="button"
                      onClick={() => {
                        onSelect(option);
                        setIsOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "group relative flex w-full cursor-pointer select-none items-center rounded-lg px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-primary hover:text-primary-foreground",
                        selected && "bg-primary/10 font-bold text-primary",
                      )}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selected
                            ? "opacity-100"
                            : "opacity-0 group-hover:text-primary-foreground",
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-bold">
                          {getOptionLabel(option)}
                        </span>
                        {description ? (
                          <span className="mt-0.5 block truncate text-xs opacity-70">
                            {description}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
