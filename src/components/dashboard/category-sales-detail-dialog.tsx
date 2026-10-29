"use client";

import { Activity, CarFront, ChevronDown, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  LargeDialog,
  LargeDialogBody,
  LargeDialogContent,
  LargeDialogDescription,
  LargeDialogHeader,
  LargeDialogTitle,
} from "@/components/ui/large-dialog";
import type {
  ApiResponse,
  CategorySalesDetail,
  CategorySalesDetailItem,
} from "@/types/api";

interface CategorySalesDetailDialogProps {
  categoryName: string;
  requestUrl: string;
  periodLabel: string;
  isOpen: boolean;
  onClose: () => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

interface CategorySalesDetailGroup {
  billNumber: string;
  date: string;
  vehicleRegistration: string;
  items: CategorySalesDetailItem[];
  totalQuantity: number;
  totalAmount: number;
}

function groupItemsByBill(items: CategorySalesDetailItem[]) {
  const groups = new Map<string, CategorySalesDetailGroup>();

  for (const item of items) {
    const group = groups.get(item.billNumber);

    if (group) {
      group.items.push(item);
      group.totalQuantity += item.quantity;
      group.totalAmount += item.amount;
      continue;
    }

    groups.set(item.billNumber, {
      billNumber: item.billNumber,
      date: item.date,
      vehicleRegistration: item.vehicleRegistration,
      items: [item],
      totalQuantity: item.quantity,
      totalAmount: item.amount,
    });
  }

  const groupedItems = Array.from(groups.values());

  if (
    process.env.NODE_ENV !== "production" &&
    groupedItems.reduce((total, group) => total + group.items.length, 0) !==
      items.length
  ) {
    throw new Error("Category sale detail grouping lost an item");
  }

  return groupedItems;
}

export function CategorySalesDetailDialog({
  categoryName,
  requestUrl,
  periodLabel,
  isOpen,
  onClose,
}: CategorySalesDetailDialogProps) {
  const [detail, setDetail] = useState<CategorySalesDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedBillNumbers, setExpandedBillNumbers] = useState<Set<string>>(
    new Set(),
  );
  const groupedItems = useMemo(
    () => groupItemsByBill(detail?.items ?? []),
    [detail?.items],
  );

  useEffect(() => {
    if (!isOpen || !requestUrl) {
      return;
    }

    const controller = new AbortController();
    let didTimeOut = false;
    const timeoutId = window.setTimeout(() => {
      didTimeOut = true;
      controller.abort();
    }, 15000);

    const loadDetail = async () => {
      setIsLoading(true);
      setError(null);
      setDetail(null);

      try {
        const response = await fetch(requestUrl, { signal: controller.signal });
        const result: ApiResponse<CategorySalesDetail> = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            !result.success ? result.error : "โหลดรายละเอียดไม่สำเร็จ",
          );
        }

        setDetail(result.data);
        setExpandedBillNumbers(
          new Set(
            result.data.items[0] ? [result.data.items[0].billNumber] : [],
          ),
        );
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") {
          if (didTimeOut) {
            setError("ใช้เวลาโหลดนานเกินไป กรุณาลองเปิดรายละเอียดอีกครั้ง");
          }
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "โหลดรายละเอียดไม่สำเร็จ",
        );
      } finally {
        window.clearTimeout(timeoutId);
        if (!controller.signal.aborted || didTimeOut) {
          setIsLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [isOpen, requestUrl]);

  return (
    <LargeDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <LargeDialogContent size="xl">
        <LargeDialogHeader>
          <LargeDialogTitle className="pr-12 text-primary">
            รายละเอียด {categoryName}
          </LargeDialogTitle>
          <LargeDialogDescription>
            {periodLabel} · รายการขายและทะเบียนรถที่เกี่ยวข้อง
          </LargeDialogDescription>
        </LargeDialogHeader>

        <LargeDialogBody className="px-4 md:px-6">
          {isLoading ? (
            <div className="flex min-h-64 items-center justify-center gap-2 rounded-2xl border">
              <Activity className="h-5 w-5 animate-spin" />
              <span className="text-sm font-medium">กำลังโหลดรายละเอียด...</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-12 text-center">
              <p className="text-sm font-semibold text-destructive">
                โหลดรายละเอียดไม่สำเร็จ
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          ) : detail?.items.length ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {detail.hasMore ? "มากกว่า " : ""}
                  {formatNumber(detail.totalCount)} รายการ ·{" "}
                  {formatNumber(groupedItems.length)} บิล
                </p>
                {detail.hasMore ? (
                  <p className="text-sm text-muted-foreground">
                    แสดง {formatNumber(detail.limit)} รายการล่าสุด
                  </p>
                ) : null}
              </div>

              <div className="overflow-x-auto rounded-2xl border">
                <div className="min-w-[760px]">
                  <div className="grid grid-cols-[110px_minmax(220px,1fr)_150px_90px_120px] gap-3 border-b bg-muted/35 px-4 py-2 text-sm font-medium text-muted-foreground">
                    <span>วันที่</span>
                    <span>เลขที่บิล / รายการ</span>
                    <span>ทะเบียนรถ</span>
                    <span className="text-right">จำนวน</span>
                    <span className="text-right">ยอดขาย</span>
                  </div>
                  <div className="divide-y">
                    {groupedItems.map((group) => {
                      const isExpanded = expandedBillNumbers.has(
                        group.billNumber,
                      );
                      const detailId = `category-bill-${group.billNumber.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

                      return (
                        <div key={group.billNumber}>
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={detailId}
                            className="group grid w-full grid-cols-[110px_minmax(220px,1fr)_150px_90px_120px] items-center gap-3 px-4 py-4 text-left text-sm transition-colors hover:bg-muted/35 focus-visible:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                            onClick={() =>
                              setExpandedBillNumbers((current) => {
                                const next = new Set(current);

                                if (next.has(group.billNumber)) {
                                  next.delete(group.billNumber);
                                } else {
                                  next.add(group.billNumber);
                                }

                                return next;
                              })
                            }
                          >
                            <span className="text-muted-foreground">
                              {formatDate(group.date)}
                            </span>
                            <span className="flex min-w-0 items-center gap-2">
                              <ChevronDown
                                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold">
                                  บิล {group.billNumber}
                                </span>
                                <span className="mt-1 block text-sm text-muted-foreground">
                                  {formatNumber(group.items.length)} รายการ
                                </span>
                              </span>
                            </span>
                            <span className="flex items-center gap-2 font-medium">
                              <CarFront className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">
                                {group.vehicleRegistration || "ไม่ระบุ"}
                              </span>
                            </span>
                            <span className="text-right tabular-nums">
                              {formatNumber(group.totalQuantity)}
                            </span>
                            <span className="text-right font-semibold tabular-nums">
                              {formatCurrency(group.totalAmount)}
                            </span>
                          </button>

                          {isExpanded ? (
                            <div id={detailId} className="divide-y bg-muted/15">
                              {group.items.map((item, index) => (
                                <div
                                  key={`${item.itemName}-${index}`}
                                  className="grid grid-cols-[110px_minmax(220px,1fr)_150px_90px_120px] items-center gap-3 px-4 py-3 text-sm"
                                >
                                  <span aria-hidden="true" />
                                  <span className="flex min-w-0 items-center gap-2 pl-6 font-medium">
                                    <ReceiptText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="truncate">
                                      {item.itemName}
                                    </span>
                                  </span>
                                  <span aria-hidden="true" />
                                  <span className="text-right tabular-nums">
                                    {formatNumber(item.quantity)}
                                  </span>
                                  <span className="text-right font-medium tabular-nums">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border px-4 py-12 text-center text-sm font-medium text-muted-foreground">
              ไม่พบรายการขายในหมวดนี้สำหรับช่วงเวลาที่เลือก
            </div>
          )}
        </LargeDialogBody>
      </LargeDialogContent>
    </LargeDialog>
  );
}
