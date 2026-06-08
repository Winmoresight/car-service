"use client";

import {
  Activity,
  ArrowUpDown,
  Banknote,
  CreditCard,
  DollarSign,
  Receipt,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payment {
  OrderNum: number;
  DatePost: string;
  NumberPrintPost: string;
  CodeStaff: number;
  NameSure: string;
  NamePositions: string;
  TotalPrice: number;
  Datepayment: string;
  NameExpensesORIncome: string;
  MoneyCash: number;
  MoneyTransfer: number;
  NameBank: string;
  Remark: string;
  UserName: string;
}

interface Summary {
  totalAmount: number;
  totalCash: number;
  totalTransfer: number;
  salaryCount: number;
  expenseCount: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "salary" | "expense">("all");

  useEffect(() => {
    async function fetchPayments() {
      try {
        setLoading(true);
        const res = await fetch(`/api/payments?limit=50&type=${filter}`);
        const data = await res.json();

        if (data.success) {
          setPayments(data.data);
          setSummary(data.summary);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    }

    fetchPayments();
  }, [filter]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-96">
          <Activity className="h-8 w-8 animate-spin" />
          <span className="ml-2">กำลังโหลดข้อมูล...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">❌ {error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="จ่ายเงิน" href="/payments" />
      <hr className="my-4 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm">
          <div className="flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                รายการจ่ายเงินทั้งหมด
              </h1>
              <p className="text-muted-foreground hidden min-[798px]:block">
                ติดตามการเบิกเงินล่วงหน้า เงินเดือน และค่าใช้จ่ายต่างๆ
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                onClick={() => setFilter("all")}
              >
                ทั้งหมด
              </Button>
              <Button
                variant={filter === "salary" ? "default" : "outline"}
                onClick={() => setFilter("salary")}
              >
                <Users className="h-4 w-4 mr-2" />
                มีพนักงาน
              </Button>
              <Button
                variant={filter === "expense" ? "default" : "outline"}
                onClick={() => setFilter("expense")}
              >
                <Receipt className="h-4 w-4 mr-2" />
                ค่าใช้จ่ายอื่น
              </Button>
            </div>
          </div>
          {summary && (
            <div className="grid gap-4 md:grid-cols-5">
              <KPICard
                title="ยอดรวมทั้งหมด"
                value={summary.totalAmount}
                format="currency"
                icon={DollarSign}
                variant="blue"
              />
              <KPICard
                title="เงินสด"
                value={summary.totalCash}
                format="currency"
                subtitle={`${summary.totalAmount ? ((summary.totalCash / summary.totalAmount) * 100).toFixed(1) : 0}%`}
                icon={Banknote}
                variant="emerald"
              />
              <KPICard
                title="เงินโอน"
                value={summary.totalTransfer}
                format="currency"
                subtitle={`${summary.totalAmount ? ((summary.totalTransfer / summary.totalAmount) * 100).toFixed(1) : 0}%`}
                icon={CreditCard}
                variant="purple"
              />
              <KPICard
                title="รายการมีพนักงาน"
                value={summary.salaryCount}
                subtitle="รายการ"
                icon={Users}
                variant="orange"
              />
              <KPICard
                title="รายการอื่นๆ"
                value={summary.expenseCount}
                subtitle="รายการ"
                icon={Receipt}
                variant="blue"
              />
            </div>
          )}
        </div>

        {/* ตารางรายการจ่าย */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5" />
              รายการล่าสุด ({payments.length} รายการ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่จ่าย</TableHead>
                    <TableHead>เลขที่เอกสาร</TableHead>
                    <TableHead>รายการ</TableHead>
                    <TableHead>พนักงาน/ตำแหน่ง</TableHead>
                    <TableHead className="text-right">เงินสด</TableHead>
                    <TableHead className="text-right">เงินโอน</TableHead>
                    <TableHead className="text-right">รวม</TableHead>
                    <TableHead>ธนาคาร</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const hasEmployee =
                      payment.CodeStaff > 0 &&
                      payment.NameSure &&
                      payment.NameSure !== "";

                    return (
                      <TableRow key={payment.OrderNum}>
                        <TableCell className="whitespace-nowrap">
                          {payment.Datepayment
                            ? new Date(payment.Datepayment).toLocaleDateString(
                                "th-TH",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                },
                              )
                            : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {payment.NumberPrintPost || payment.OrderNum}
                        </TableCell>
                        <TableCell className="font-medium">
                          {payment.NameExpensesORIncome || (
                            <span className="text-muted-foreground">ไม่ระบุ</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasEmployee ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {payment.NameSure}
                              </span>
                              {payment.NamePositions && (
                                <Badge variant="outline" className="text-xs">
                                  {payment.NamePositions}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.MoneyCash > 0 ? (
                            <span className="text-green-600 font-medium">
                              {payment.MoneyCash.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.MoneyTransfer > 0 ? (
                            <span className="text-blue-600 font-medium">
                              {payment.MoneyTransfer.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {payment.TotalPrice
                            ? payment.TotalPrice.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                              })
                            : "0.00"}
                        </TableCell>
                        <TableCell>
                          {payment.NameBank ? (
                            <span className="text-xs">{payment.NameBank}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          {payment.Remark ? (
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {payment.Remark}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
