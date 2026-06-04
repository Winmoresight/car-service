"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, DollarSign, Activity, Phone, CreditCard } from "lucide-react";

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
        const payRes = await fetch("/api/employees/payments?limit=20&excludeZero=true");
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
    0
  );

  const averageWage = employees.length > 0
    ? employees.reduce((sum, emp) => sum + (emp.PriceToWorkDay || 0), 0) / employees.length
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">จัดการข้อมูลพนักงาน</h1>
        <p className="text-muted-foreground">
          ข้อมูลพนักงาน ตำแหน่งงาน และการจ่ายเงินเดือน
        </p>
      </div>

      {/* สถิติ */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">พนักงานทั้งหมด</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">คน</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ตำแหน่งงาน</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions.length}</div>
            <p className="text-xs text-muted-foreground">ตำแหน่ง</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ค่าแรงเฉลี่ย/วัน</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageWage.toLocaleString("th-TH", { maximumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground">บาท</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              จ่ายเงินล่าสุด (20 ครั้ง)
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalSalary.toLocaleString("th-TH")}
            </div>
            <p className="text-xs text-muted-foreground">บาท</p>
          </CardContent>
        </Card>
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
                  <TableCell>
                    {emp.Age > 0 ? `${emp.Age} ปี` : "-"}
                  </TableCell>
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
                (e) => e.Positions?.trim() === pos.NamePositions
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
                            }
                          )
                        : "-"}
                    </TableCell>
                    <TableCell className="font-mono">
                      {payment.CodeStaff || "-"}
                    </TableCell>
                    <TableCell>
                      {payment.NameSure || <span className="text-muted-foreground">ไม่ระบุ</span>}
                    </TableCell>
                    <TableCell>
                      {payment.NamePositions ? (
                        <Badge variant="outline">{payment.NamePositions}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
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
  );
}
