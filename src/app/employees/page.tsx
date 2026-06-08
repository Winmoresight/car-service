"use client";

import {
  Activity,
  Briefcase,
  CreditCard,
  DollarSign,
  Phone,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import DashboardBreadcrumb from "@/components/dashboard/dashboard-breadcrumb";
import { KPICard } from "@/components/dashboard/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Employee {
  Code: number;
  NameSure: string;
  Address: string;
  Phone: string;
  IDCard: string;
  DateBirthDay: string;
  Age: number;
  Positions: string;
  PriceToWorkDay: number;
}

interface Position {
  Code: number;
  NamePositions: string;
}

interface Payment {
  OrderNum: number;
  DatePost: string;
  CodeStaff: number;
  NameSure: string;
  NamePositions: string;
  TotalPrice: number;
  Datepayment: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch employees
        const empRes = await fetch("/api/employees");
        const empData = await empRes.json();

        // Fetch positions
        const posRes = await fetch("/api/employees/positions");
        const posData = await posRes.json();

        // Fetch recent payments (เฉพาะที่มีพนักงาน)
        const payRes = await fetch(
          "/api/employees/payments?limit=20&excludeZero=true",
        );
        const payData = await payRes.json();

        if (empData.success) setEmployees(empData.data);
        if (posData.success) setPositions(posData.data);
        if (payData.success) setRecentPayments(payData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

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

  const totalSalary = recentPayments.reduce(
    (sum, payment) => sum + (payment.TotalPrice || 0),
    0,
  );

  const averageWage =
    employees.length > 0
      ? employees.reduce((sum, emp) => sum + (emp.PriceToWorkDay || 0), 0) /
        employees.length
      : 0;

  return (
    <div className="p-6 pb-16">
      <DashboardBreadcrumb label="พนักงาน" href="/employees" />
      <hr className="my-4 mb-6 hidden w-full min-[1025px]:block" />

      <div className="space-y-6">
        <div className="dark:bg-background flex w-full flex-col rounded-2xl border bg-white px-4 py-6 shadow-sm">
          <div className="flex flex-col justify-between gap-6 min-[798px]:flex-row min-[798px]:items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-background dark:bg-secondary flex h-12 w-12 items-center justify-center rounded-[8px] border min-[798px]:h-14 min-[798px]:w-14">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-primary text-2xl font-bold">
                  จัดการข้อมูลพนักงาน
                </span>
                <p className="text-foreground hidden font-medium min-[798px]:block">
                  ข้อมูลพนักงาน ตำแหน่งงาน และการจ่ายเงินเดือน
                </p>
              </div>
            </div>
          </div>

          {/* สถิติ */}
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard
              title="พนักงานทั้งหมด"
              value={employees.length}
              subtitle="คน"
              icon={Users}
              variant="blue"
            />
            <KPICard
              title="ตำแหน่งงาน"
              value={positions.length}
              subtitle="ตำแหน่ง"
              icon={Briefcase}
              variant="purple"
            />
            <KPICard
              title="ค่าแรงเฉลี่ย/วัน"
              value={averageWage}
              format="currency"
              icon={DollarSign}
              variant="emerald"
            />
            <KPICard
              title="จ่ายเงินล่าสุด"
              value={totalSalary}
              format="currency"
              subtitle="20 ครั้งล่าสุด"
              icon={DollarSign}
              variant="orange"
            />
          </div>
        </div>

        {/* รายชื่อพนักงาน */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              รายชื่อพนักงานทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัส</TableHead>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>ตำแหน่ง</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>อายุ</TableHead>
                  <TableHead className="text-right">ค่าแรง/วัน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.Code}>
                    <TableCell className="font-mono">{emp.Code}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{emp.NameSure}</span>
                        {emp.Address && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {emp.Address}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{emp.Positions || "-"}</Badge>
                    </TableCell>
                    <TableCell>
                      {emp.Phone ? (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{emp.Phone}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{emp.Age > 0 ? `${emp.Age} ปี` : "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      {emp.PriceToWorkDay
                        ? emp.PriceToWorkDay.toLocaleString("th-TH")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* ตำแหน่งงาน */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              ตำแหน่งงาน
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {positions.map((pos) => {
                const empCount = employees.filter(
                  (e) => e.Positions?.trim() === pos.NamePositions,
                ).length;
                return (
                  <Card key={pos.Code} className="border-2">
                    <CardContent className="pt-6 text-center">
                      <div className="text-2xl font-bold mb-2">{empCount}</div>
                      <div className="font-medium">{pos.NamePositions}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        รหัส {pos.Code}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* การจ่ายเงินล่าสุด */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              การจ่ายเงินเดือนล่าสุด (20 รายการ)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                ไม่มีข้อมูลการจ่ายเงิน
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>วันที่จ่าย</TableHead>
                    <TableHead>รหัสพนักงาน</TableHead>
                    <TableHead>ชื่อ</TableHead>
                    <TableHead>ตำแหน่ง</TableHead>
                    <TableHead className="text-right">จำนวนเงิน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayments.map((payment) => (
                    <TableRow key={payment.OrderNum}>
                      <TableCell>
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
                      <TableCell className="font-mono">
                        {payment.CodeStaff || "-"}
                      </TableCell>
                      <TableCell>
                        {payment.NameSure || (
                          <span className="text-muted-foreground">ไม่ระบุ</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.NamePositions ? (
                          <Badge variant="outline">
                            {payment.NamePositions}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {payment.TotalPrice
                          ? payment.TotalPrice.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })
                          : "0.00"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
