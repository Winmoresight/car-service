"use client";

import {
  Car,
  FilePlus2,
  Loader2,
  Plus,
  ReceiptText,
  Send,
  Smartphone,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { outfit } from "@/components/fonts/fonts";
import AsyncSearchableSelect from "@/components/ui/async-searchable-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CustomerOption {
  codeCustomer: string;
  nameCustomer: string;
  phoneCustomer: string;
  nameCar: string;
  province: string;
  brandAndGenerate: string;
}

interface ProductOption {
  barCode: string;
  name: string;
  unitPrice: number;
  cost: number;
  usedCount: number;
}

interface DraftItem {
  id: string;
  type: "product" | "service";
  barCode?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  cost?: number;
  discount: number;
  note?: string;
}

interface BillDraft {
  id: number;
  draftNo: string;
  status: string;
  paymentStatus: string;
  customerName: string | null;
  phoneCustomer: string | null;
  nameCar: string | null;
  province: string | null;
  brandAndGenerate: string | null;
  totalPrice: number;
  items: DraftItem[];
  createdAt: string;
}

type DraftItemForm = Omit<DraftItem, "id">;

interface CatalogResponse {
  success: boolean;
  data?: {
    customers?: CustomerOption[];
    products?: ProductOption[];
  };
}

const emptyItem: DraftItemForm = {
  type: "service",
  barCode: "",
  name: "",
  quantity: 1,
  unitPrice: 0,
  cost: 0,
  discount: 0,
  note: "",
};

function createLocalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return Math.random().toString(36).slice(2);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNumberInputValue(value?: number) {
  return value === 0 || value === undefined ? "" : value;
}

function parseNumberInput(value: string) {
  if (value === "") {
    return 0;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getItemTotal(
  item: Pick<DraftItem, "quantity" | "unitPrice" | "discount">,
) {
  return Math.max(item.quantity * item.unitPrice - (item.discount || 0), 0);
}

function getPaymentStatusBadgeClass(status: string) {
  if (status === "ชำระแล้ว") {
    return "border-emerald-100 bg-emerald-50 text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10";
  }

  if (status === "ชำระบางส่วน") {
    return "border-blue-100 bg-blue-50 text-main-blue dark:border-blue-500/20 dark:bg-blue-500/10";
  }

  return "border-orange-100 bg-orange-50 text-main-orange dark:border-orange-500/20 dark:bg-orange-500/10";
}

async function fetchCatalogOptions(search: string, signal: AbortSignal) {
  const response = await fetch(
    `/api/bill-drafts/catalog?search=${encodeURIComponent(search)}&limit=12`,
    { signal },
  );
  const data = (await response.json()) as CatalogResponse;

  return data.success ? data.data : {};
}

async function fetchCustomerOptions(search: string, signal: AbortSignal) {
  const data = await fetchCatalogOptions(search, signal);

  return data?.customers || [];
}

async function fetchProductOptions(search: string, signal: AbortSignal) {
  const data = await fetchCatalogOptions(search, signal);

  return data?.products || [];
}

export default function NewBillPage() {
  const [recentDrafts, setRecentDrafts] = useState<BillDraft[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerCode: "",
    customerName: "",
    phoneCustomer: "",
    nameCar: "",
    province: "",
    brandAndGenerate: "",
    mileCar: "",
    cash: "",
    transfer: "",
    nameBank: "",
    createdBy: "",
    note: "",
  });
  const [draftItem, setDraftItem] = useState<DraftItemForm>(emptyItem);
  const [items, setItems] = useState<DraftItem[]>([]);

  const totals = useMemo(() => {
    const subTotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    const discountTotal = items.reduce(
      (sum, item) => sum + (item.discount || 0),
      0,
    );

    return {
      subTotal,
      discountTotal,
      totalPrice: Math.max(subTotal - discountTotal, 0),
    };
  }, [items]);

  const paymentSummary = useMemo(() => {
    const cash = parseNumberInput(form.cash);
    const transfer = parseNumberInput(form.transfer);
    const paidTotal = cash + transfer;
    const remainingAmount = Math.max(totals.totalPrice - paidTotal, 0);
    const status =
      remainingAmount <= 0 && totals.totalPrice > 0
        ? "ชำระแล้ว"
        : paidTotal > 0
          ? "ชำระบางส่วน"
          : "ยังไม่ชำระ";

    return {
      cash,
      transfer,
      paidTotal,
      remainingAmount,
      status,
    };
  }, [form.cash, form.transfer, totals.totalPrice]);

  useEffect(() => {
    async function fetchRecentDrafts() {
      try {
        setIsRecentLoading(true);
        const response = await fetch("/api/bill-drafts?limit=8");
        const data = await response.json();

        if (data.success) {
          setRecentDrafts(data.data || []);
        }
      } catch {
        setRecentDrafts([]);
      } finally {
        setIsRecentLoading(false);
      }
    }

    fetchRecentDrafts();
  }, []);

  const updateForm = (field: keyof typeof form, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const selectCustomer = (customer: CustomerOption) => {
    setForm((current) => ({
      ...current,
      customerCode: customer.codeCustomer,
      customerName: customer.nameCustomer,
      phoneCustomer: customer.phoneCustomer,
      nameCar: customer.nameCar,
      province: customer.province,
      brandAndGenerate: customer.brandAndGenerate,
    }));
  };

  const selectProduct = (product: ProductOption) => {
    setDraftItem((current) => ({
      ...current,
      type: "product",
      barCode: product.barCode,
      name: product.name,
      unitPrice: product.unitPrice || 0,
      cost: product.cost || 0,
    }));
  };

  const addItem = () => {
    const name = draftItem.name.trim();

    if (!name) {
      setError("กรุณาระบุชื่อรายการก่อนเพิ่มลงบิล");
      return;
    }

    setItems((current) => [
      ...current,
      {
        id: createLocalId(),
        type: draftItem.type,
        barCode: draftItem.barCode?.trim() || "",
        name,
        quantity: Number(draftItem.quantity) || 1,
        unitPrice: Number(draftItem.unitPrice) || 0,
        cost: Number(draftItem.cost) || 0,
        discount: Number(draftItem.discount) || 0,
        note: draftItem.note?.trim() || "",
      },
    ]);
    setDraftItem(emptyItem);
    setError(null);
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const updateItem = <Key extends keyof DraftItem>(
    id: string,
    field: Key,
    value: DraftItem[Key],
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const resetForm = () => {
    setForm({
      customerCode: "",
      customerName: "",
      phoneCustomer: "",
      nameCar: "",
      province: "",
      brandAndGenerate: "",
      mileCar: "",
      cash: "",
      transfer: "",
      nameBank: "",
      createdBy: "",
      note: "",
    });
    setDraftItem(emptyItem);
    setItems([]);
  };

  const submitDraft = async () => {
    try {
      setIsSubmitting(true);
      setMessage(null);
      setError(null);

      if (paymentSummary.paidTotal > totals.totalPrice) {
        setError("ยอดชำระมากกว่ายอดรวมของบิล");
        return;
      }

      const response = await fetch("/api/bill-drafts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          cash: paymentSummary.cash,
          transfer: paymentSummary.transfer,
          createdFrom: "mobile",
          items,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "ไม่สามารถสร้างบิลได้");
      }

      setMessage(`เปิดบิล ${data.data.billNo || data.data.draftNo} ในระบบหลักแล้ว`);
      setRecentDrafts((current) => [data.data, ...current].slice(0, 8));
      resetForm();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "ไม่สามารถสร้างบิลได้",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="เปิดบิล" href="/bills/new" />

      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background mt-2 flex w-full flex-col rounded-2xl border bg-white px-4 py-6 pb-4 shadow-sm md:mt-6">
          <div className="mb-6 flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <FilePlus2 strokeWidth={2.5} className="text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold">เปิดบิล</span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  บันทึกรถเข้าซ่อมและรายการที่ยังไม่ได้ชำระเงิน
                </p>
              </div>
            </div>

            <Badge className="h-9 w-fit rounded-full bg-blue-50 px-4 text-sm font-bold text-main-blue dark:bg-blue-500/10">
              <Smartphone className="mr-2 h-4 w-4" />
              เปิดบิลในระบบหลัก
            </Badge>
          </div>

          <div className="grid gap-4 min-[720px]:grid-cols-3">
            {[
              { label: "ลูกค้า", icon: User },
              { label: "ข้อมูลรถ", icon: Car },
              { label: "รายการซ่อม", icon: Wrench },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-[8px] border bg-background p-4 dark:bg-secondary"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border bg-white text-main-blue dark:bg-background/65">
                  <item.icon className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <span className="text-lg font-bold text-primary">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-background">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border bg-background text-primary dark:bg-secondary">
                  <User className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary">ข้อมูลลูกค้า</h2>
                  <p className="text-sm font-semibold text-muted-foreground">
                    ค้นหาลูกค้าเดิมหรือกรอกใหม่
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <AsyncSearchableSelect<CustomerOption>
                  selectedLabel={
                    form.customerName
                      ? `${form.customerName}${form.nameCar ? ` · ${form.nameCar}` : ""}`
                      : undefined
                  }
                  placeholder="เลือกลูกค้าเดิม"
                  searchPlaceholder="ค้นหาชื่อ เบอร์โทร หรือทะเบียน..."
                  emptyMessage="ไม่พบลูกค้า"
                  fetchOptions={fetchCustomerOptions}
                  getOptionKey={(customer) =>
                    `${customer.codeCustomer}-${customer.nameCustomer}-${customer.nameCar}-${customer.phoneCustomer}`
                  }
                  getOptionLabel={(customer) =>
                    customer.nameCustomer || "ไม่ระบุชื่อลูกค้า"
                  }
                  getOptionDescription={(customer) =>
                    [
                      customer.nameCar,
                      customer.province,
                      customer.phoneCustomer,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "ไม่มีข้อมูลรถ"
                  }
                  isOptionSelected={(customer) =>
                    !!form.customerCode &&
                    customer.codeCustomer === form.customerCode
                  }
                  onSelect={selectCustomer}
                />

                <div className="grid gap-3 min-[640px]:grid-cols-2">
                  <label htmlFor="customerName" className="space-y-1.5">
                    <span className="text-sm font-bold text-primary">
                      ชื่อลูกค้า
                    </span>
                    <Input
                      id="customerName"
                      value={form.customerName}
                      onChange={(event) =>
                        updateForm("customerName", event.target.value)
                      }
                      className="h-11 rounded-xl"
                    />
                  </label>
                  <label htmlFor="phoneCustomer" className="space-y-1.5">
                    <span className="text-sm font-bold text-primary">
                      เบอร์โทร
                    </span>
                    <Input
                      id="phoneCustomer"
                      value={form.phoneCustomer}
                      onChange={(event) =>
                        updateForm("phoneCustomer", event.target.value)
                      }
                      inputMode="tel"
                      className="h-11 rounded-xl"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-background">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border bg-background text-primary dark:bg-secondary">
                  <Car className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary">ข้อมูลรถ</h2>
                  <p className="text-sm font-semibold text-muted-foreground">
                    ทะเบียน รุ่น จังหวัด และเลขไมล์
                  </p>
                </div>
              </div>

              <div className="grid gap-3 min-[640px]:grid-cols-2">
                <label htmlFor="nameCar" className="space-y-1.5">
                  <span className="text-sm font-bold text-primary">
                    ทะเบียน / รถ
                  </span>
                  <Input
                    id="nameCar"
                    value={form.nameCar}
                    onChange={(event) =>
                      updateForm("nameCar", event.target.value)
                    }
                    className="h-11 rounded-xl"
                  />
                </label>
                <label htmlFor="province" className="space-y-1.5">
                  <span className="text-sm font-bold text-primary">จังหวัด</span>
                  <Input
                    id="province"
                    value={form.province}
                    onChange={(event) =>
                      updateForm("province", event.target.value)
                    }
                    className="h-11 rounded-xl"
                  />
                </label>
                <label htmlFor="brandAndGenerate" className="space-y-1.5">
                  <span className="text-sm font-bold text-primary">
                    ยี่ห้อ / รุ่น
                  </span>
                  <Input
                    id="brandAndGenerate"
                    value={form.brandAndGenerate}
                    onChange={(event) =>
                      updateForm("brandAndGenerate", event.target.value)
                    }
                    className="h-11 rounded-xl"
                  />
                </label>
                <label htmlFor="mileCar" className="space-y-1.5">
                  <span className="text-sm font-bold text-primary">เลขไมล์</span>
                  <Input
                    id="mileCar"
                    value={form.mileCar}
                    onChange={(event) =>
                      updateForm("mileCar", event.target.value)
                    }
                    inputMode="numeric"
                    className="h-11 rounded-xl"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-background">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border bg-background text-primary dark:bg-secondary">
                  <Wrench className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary">รายการในบิล</h2>
                  <p className="text-sm font-semibold text-muted-foreground">
                    เพิ่มอะไหล่ บริการ หรือรายการตรวจซ่อม
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <AsyncSearchableSelect<ProductOption>
                  selectedLabel={
                    draftItem.type === "product" && draftItem.name
                      ? draftItem.name
                      : undefined
                  }
                  placeholder="เลือกสินค้าจากประวัติ"
                  searchPlaceholder="ค้นหาชื่อสินค้า หรือบาร์โค้ด..."
                  emptyMessage="ไม่พบสินค้า"
                  fetchOptions={fetchProductOptions}
                  getOptionKey={(product) =>
                    `${product.barCode}-${product.name}`
                  }
                  getOptionLabel={(product) => product.name}
                  getOptionDescription={(product) =>
                    `${formatCurrency(product.unitPrice)} บาท`
                  }
                  isOptionSelected={(product) =>
                    !!draftItem.barCode && product.barCode === draftItem.barCode
                  }
                  onSelect={selectProduct}
                />

                <div className="grid gap-3 min-[640px]:grid-cols-[1fr_120px_140px]">
                  <label htmlFor="itemName" className="space-y-1.5">
                    <span className="text-sm font-bold text-primary">
                      ชื่อรายการ
                    </span>
                    <Input
                      id="itemName"
                      value={draftItem.name}
                      onChange={(event) =>
                        setDraftItem((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="h-11 rounded-xl"
                    />
                  </label>
                  <label htmlFor="itemQuantity" className="space-y-1.5">
                    <span className="text-sm font-bold text-primary">
                      จำนวน
                    </span>
                    <Input
                      id="itemQuantity"
                      value={getNumberInputValue(draftItem.quantity)}
                      onChange={(event) =>
                        setDraftItem((current) => ({
                          ...current,
                          quantity: parseNumberInput(event.target.value),
                        }))
                      }
                      type="number"
                      min="1"
                      inputMode="decimal"
                      className="h-11 rounded-xl"
                    />
                  </label>
                  <label htmlFor="itemPrice" className="space-y-1.5">
                    <span className="text-sm font-bold text-primary">ราคา</span>
                    <Input
                      id="itemPrice"
                      value={getNumberInputValue(draftItem.unitPrice)}
                      onChange={(event) =>
                        setDraftItem((current) => ({
                          ...current,
                          unitPrice: parseNumberInput(event.target.value),
                        }))
                      }
                      type="number"
                      min="0"
                      inputMode="decimal"
                      className="h-11 rounded-xl"
                    />
                  </label>
                </div>

                <Button
                  type="button"
                  onClick={addItem}
                  className="h-11 w-full gap-2 rounded-xl font-bold min-[640px]:w-fit"
                >
                  <Plus className="h-4 w-4" />
                  เพิ่มรายการ
                </Button>

                {items.length > 0 ? (
                  <div className="overflow-x-auto rounded-[8px] border">
                    <table className="w-full min-w-[780px] border-collapse text-sm">
                      <thead className="bg-background dark:bg-secondary">
                        <tr className="border-b text-left text-primary">
                          <th className="w-16 px-3 py-3 font-bold">ลำดับ</th>
                          <th className="px-3 py-3 font-bold">ชื่อรายการ</th>
                          <th className="w-24 px-3 py-3 text-right font-bold">
                            จำนวน
                          </th>
                          <th className="w-36 px-3 py-3 text-right font-bold">
                            ราคา
                          </th>
                          <th className="w-32 px-3 py-3 text-right font-bold">
                            ส่วนลด
                          </th>
                          <th className="w-32 px-3 py-3 text-right font-bold">
                            รวม
                          </th>
                          <th className="w-14 px-3 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, index) => (
                          <tr
                            key={item.id}
                            className="border-b last:border-b-0"
                          >
                            <td className="px-3 py-3 text-center font-semibold text-primary">
                              {index + 1}
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <Input
                                  value={item.name}
                                  onChange={(event) =>
                                    updateItem(
                                      item.id,
                                      "name",
                                      event.target.value,
                                    )
                                  }
                                  className="h-10 rounded-[8px] bg-background font-semibold dark:bg-secondary"
                                />
                                <Badge
                                  variant="outline"
                                  className="shrink-0 rounded-full text-xs font-bold"
                                >
                                  {item.type === "product" ? "สินค้า" : "บริการ"}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                min="1"
                                inputMode="decimal"
                                value={getNumberInputValue(item.quantity)}
                                onChange={(event) =>
                                  updateItem(
                                    item.id,
                                    "quantity",
                                    parseNumberInput(event.target.value),
                                  )
                                }
                                className="h-10 rounded-[8px] bg-background text-right font-semibold dark:bg-secondary"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                value={getNumberInputValue(item.unitPrice)}
                                onChange={(event) =>
                                  updateItem(
                                    item.id,
                                    "unitPrice",
                                    parseNumberInput(event.target.value),
                                  )
                                }
                                className="h-10 rounded-[8px] bg-background text-right font-semibold dark:bg-secondary"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Input
                                type="number"
                                min="0"
                                inputMode="decimal"
                                value={getNumberInputValue(item.discount)}
                                onChange={(event) =>
                                  updateItem(
                                    item.id,
                                    "discount",
                                    parseNumberInput(event.target.value),
                                  )
                                }
                                className="h-10 rounded-[8px] bg-background text-right font-semibold dark:bg-secondary"
                              />
                            </td>
                            <td className="px-3 py-3 text-right">
                              <span
                                className={`${outfit.className} font-bold text-primary`}
                              >
                                {formatCurrency(getItemTotal(item))}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                                className="h-9 w-9 text-main-red"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-background">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[8px] border bg-background text-primary dark:bg-secondary">
                  <ReceiptText className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-primary">สรุปบิล</h2>
                  <p className="text-sm font-semibold text-muted-foreground">
                    สถานะ: {paymentSummary.status}
                  </p>
                </div>
              </div>

              <div className="space-y-3 rounded-[8px] border bg-background p-4 dark:bg-secondary">
                <div className="flex justify-between gap-3 text-sm font-semibold">
                  <span className="text-muted-foreground">จำนวนรายการ</span>
                  <span className="text-primary">{items.length} รายการ</span>
                </div>
                <div className="flex justify-between gap-3 text-sm font-semibold">
                  <span className="text-muted-foreground">ยอดก่อนลด</span>
                  <span className="text-primary">
                    {formatCurrency(totals.subTotal)} บาท
                  </span>
                </div>
                <div className="flex justify-between gap-3 text-sm font-semibold">
                  <span className="text-muted-foreground">ส่วนลด</span>
                  <span className="text-primary">
                    {formatCurrency(totals.discountTotal)} บาท
                  </span>
                </div>
                <div className="border-t pt-3">
                  <span className="text-sm font-bold text-muted-foreground">
                    ยอดรวม
                  </span>
                  <p className="text-3xl font-bold text-primary">
                    <span className={outfit.className}>
                      {formatCurrency(totals.totalPrice)}
                    </span>{" "}
                    บาท
                  </p>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between gap-3 text-sm font-semibold">
                    <span className="text-muted-foreground">รับชำระแล้ว</span>
                    <span className="text-primary">
                      {formatCurrency(paymentSummary.paidTotal)} บาท
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between gap-3 text-sm font-semibold">
                    <span className="text-muted-foreground">คงเหลือ</span>
                    <span className="text-primary">
                      {formatCurrency(paymentSummary.remainingAmount)} บาท
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 min-[520px]:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <label htmlFor="cash" className="space-y-1.5">
                  <span className="text-sm font-bold text-primary">เงินสด</span>
                  <Input
                    id="cash"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={form.cash}
                    onChange={(event) => updateForm("cash", event.target.value)}
                    className="h-11 rounded-xl text-right font-semibold"
                  />
                </label>
                <label htmlFor="transfer" className="space-y-1.5">
                  <span className="text-sm font-bold text-primary">เงินโอน</span>
                  <Input
                    id="transfer"
                    type="number"
                    min="0"
                    inputMode="decimal"
                    value={form.transfer}
                    onChange={(event) =>
                      updateForm("transfer", event.target.value)
                    }
                    className="h-11 rounded-xl text-right font-semibold"
                  />
                </label>
              </div>

              <label htmlFor="nameBank" className="mt-4 block space-y-1.5">
                <span className="text-sm font-bold text-primary">ธนาคาร</span>
                <Input
                  id="nameBank"
                  value={form.nameBank}
                  onChange={(event) =>
                    updateForm("nameBank", event.target.value)
                  }
                  disabled={paymentSummary.transfer <= 0}
                  className="h-11 rounded-xl"
                />
              </label>

              <label htmlFor="createdBy" className="mt-4 block space-y-1.5">
                <span className="text-sm font-bold text-primary">ผู้รับงาน</span>
                <Input
                  id="createdBy"
                  value={form.createdBy}
                  onChange={(event) =>
                    updateForm("createdBy", event.target.value)
                  }
                  className="h-11 rounded-xl"
                />
              </label>

              <label htmlFor="note" className="mt-4 block space-y-1.5">
                <span className="text-sm font-bold text-primary">หมายเหตุ</span>
                <textarea
                  id="note"
                  value={form.note}
                  onChange={(event) => updateForm("note", event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm font-medium outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </label>

              {message ? (
                <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-bold text-main-green dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  {message}
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-bold text-main-red dark:border-red-500/20 dark:bg-red-500/10">
                  {error}
                </div>
              ) : null}

              <Button
                type="button"
                onClick={submitDraft}
                disabled={isSubmitting}
                className="mt-4 h-12 w-full gap-2 rounded-xl text-base font-bold"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                เปิดบิลในระบบหลัก
              </Button>
            </section>

            <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-background">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-primary">บิลเปิดล่าสุด</h2>
                  <p className="text-sm font-semibold text-muted-foreground">
                    รายการที่ถูกเปิดไว้และยังไม่ชำระ
                  </p>
                </div>
                {isRecentLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : null}
              </div>

              <div className="space-y-2">
                {recentDrafts.length === 0 ? (
                  <div className="rounded-[8px] border bg-background px-4 py-8 text-center text-sm font-semibold text-muted-foreground dark:bg-secondary">
                    ยังไม่มีบิลเปิดงาน
                  </div>
                ) : (
                  recentDrafts.map((draft) => (
                    <div
                      key={draft.draftNo}
                      className="rounded-[8px] border bg-background p-3 dark:bg-secondary"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="block truncate font-bold text-primary">
                            {draft.draftNo}
                          </span>
                          <p className="mt-1 truncate text-sm font-semibold text-muted-foreground">
                            {draft.customerName || "ไม่ระบุลูกค้า"} ·{" "}
                            {draft.nameCar || "ไม่ระบุรถ"}
                          </p>
                        </div>
                        <Badge
                          className={`shrink-0 rounded-full shadow-none ${getPaymentStatusBadgeClass(
                            draft.paymentStatus,
                          )}`}
                        >
                          {draft.paymentStatus}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3">
                        <span className="text-xs font-semibold text-muted-foreground">
                          {formatDateTime(draft.createdAt)}
                        </span>
                        <span className="font-bold text-primary">
                          {formatCurrency(draft.totalPrice)} บาท
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
