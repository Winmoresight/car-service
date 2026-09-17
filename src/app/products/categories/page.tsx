"use client";

import { ArrowLeft, Percent, Save, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiResponse } from "@/types/api";

interface CategoryProfitMargin {
  id: number;
  name: string;
  profitPercent: number | null;
}

const fetcher = (url: string) => fetch(url).then((response) => response.json());

export default function CategoryProfitMarginsPage() {
  const { data, error, isLoading, mutate } = useSWR<
    ApiResponse<CategoryProfitMargin[]>
  >("/api/products/category-profit-margins", fetcher);
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<number, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const categories = data?.success && data.data ? data.data : [];

  useEffect(() => {
    if (!data?.success || !data.data) {
      return;
    }

    setValues(
      Object.fromEntries(
        data.data.map((category) => [
          category.id,
          category.profitPercent === null ? "" : String(category.profitPercent),
        ]),
      ),
    );
  }, [data]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("th");

    return query
      ? categories.filter((category) =>
          category.name.toLocaleLowerCase("th").includes(query),
        )
      : categories;
  }, [categories, search]);

  const handleSave = async () => {
    setMessage(null);

    for (const category of categories) {
      const rawValue = values[category.id]?.trim() ?? "";
      const profitPercent = rawValue === "" ? null : Number(rawValue);

      if (
        profitPercent !== null &&
        (!Number.isFinite(profitPercent) ||
          profitPercent < 0 ||
          profitPercent > 100)
      ) {
        setMessage({
          type: "error",
          text: `เปอร์เซ็นต์กำไรของ “${category.name}” ต้องอยู่ระหว่าง 0 ถึง 100`,
        });
        return;
      }
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/products/category-profit-margins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          margins: categories.map((category) => {
            const rawValue = values[category.id]?.trim() ?? "";

            return {
              categoryId: category.id,
              profitPercent: rawValue === "" ? null : Number(rawValue),
            };
          }),
        }),
      });
      const result = (await response.json()) as ApiResponse<{
        updated: number;
      }>;

      if (!result.success) {
        throw new Error(result.error);
      }

      if (!response.ok) {
        throw new Error("บันทึกเปอร์เซ็นต์กำไรไม่สำเร็จ");
      }

      await mutate();
      setMessage({
        type: "success",
        text: "บันทึกเปอร์เซ็นต์กำไรเรียบร้อยแล้ว",
      });
    } catch (saveError) {
      setMessage({
        type: "error",
        text:
          saveError instanceof Error
            ? saveError.message
            : "บันทึกเปอร์เซ็นต์กำไรไม่สำเร็จ",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb
        label="ตั้งค่า % กำไรตามประเภท"
        href="/products/categories"
      />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="mx-auto mt-2 max-w-5xl space-y-5 md:mt-6">
        <div className="flex flex-col justify-between gap-4 rounded-2xl border bg-card p-5 shadow-sm sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40">
              <Percent className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">เปอร์เซ็นต์กำไรตามประเภท</h1>
              <p className="text-sm text-muted-foreground">
                กำไรโดยประมาณ = ยอดขาย × เปอร์เซ็นต์ที่กำหนด
              </p>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
              กลับหน้าสินค้า
            </Link>
          </Button>
        </div>

        <Card className="rounded-2xl">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>ประเภทสินค้าจากระบบ</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                ช่องที่เว้นว่างจะแสดงกำไรเป็น “–” และไม่นับเป็นศูนย์บาท
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาประเภทสินค้า"
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {["a", "b", "c", "d", "e", "f"].map((key) => (
                  <Skeleton key={key} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : error || data?.success === false ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold text-destructive">
                โหลดรายการประเภทสินค้าไม่สำเร็จ
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border">
                <div className="grid grid-cols-[72px_minmax(0,1fr)_140px] gap-3 border-b bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground">
                  <span>รหัส</span>
                  <span>ประเภทสินค้า</span>
                  <span className="text-right">% กำไร</span>
                </div>
                <div className="max-h-[560px] divide-y overflow-y-auto">
                  {filteredCategories.map((category) => (
                    <div
                      key={category.id}
                      className="grid grid-cols-[72px_minmax(0,1fr)_140px] items-center gap-3 px-4 py-3"
                    >
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {category.id}
                      </span>
                      <span className="truncate text-sm font-semibold">
                        {category.name}
                      </span>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          inputMode="decimal"
                          value={values[category.id] ?? ""}
                          onChange={(event) => {
                            setValues((current) => ({
                              ...current,
                              [category.id]: event.target.value,
                            }));
                            setMessage(null);
                          }}
                          aria-label={`เปอร์เซ็นต์กำไร ${category.name}`}
                          className="pr-8 text-right tabular-nums"
                        />
                        <Percent className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                  {filteredCategories.length === 0 ? (
                    <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                      ไม่พบประเภทสินค้าที่ค้นหา
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {message ? (
              <div
                className={`mt-4 rounded-xl border p-3 text-sm font-semibold ${
                  message.type === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-destructive/30 bg-destructive/5 text-destructive"
                }`}
              >
                {message.text}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isLoading || isSaving || categories.length === 0}
              >
                <Save className="h-4 w-4" />
                {isSaving ? "กำลังบันทึก..." : "บันทึกเปอร์เซ็นต์กำไร"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
