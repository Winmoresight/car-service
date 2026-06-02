"use client";

/**
 * Customers Page - หน้าลูกค้า
 * แสดงข้อมูลลูกค้าแบบ masked
 */

import { Users, UserPlus, TrendingUp, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CustomersPage() {
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ลูกค้า</h1>
        <p className="text-muted-foreground mt-1">จัดการข้อมูลลูกค้าและประวัติการซื้อ</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              ลูกค้าทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8,775</div>
            <p className="text-xs text-muted-foreground mt-1">ลูกค้าทั้งหมด</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              ลูกค้าใหม่
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">234</div>
            <p className="text-xs text-muted-foreground mt-1">เดือนนี้</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ลูกค้าซื้อซ้ำ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">3,456</div>
            <p className="text-xs text-muted-foreground mt-1">39.4%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              จังหวัดหลัก
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">กรุงเทพฯ</div>
            <p className="text-xs text-muted-foreground mt-1">2,345 ลูกค้า</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🔒 ข้อมูลลูกค้าได้รับการปกป้อง</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            ข้อมูลลูกค้าจะแสดงแบบ masked เพื่อความปลอดภัย
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Badge>Phase 3</Badge>
              <span>ระบบ Authentication และ Authorization</span>
            </li>
            <li className="flex items-center gap-2">
              <Badge>Phase 3</Badge>
              <span>ข้อมูลลูกค้าแบบ masked (ชื่อ, เบอร์โทร)</span>
            </li>
            <li className="flex items-center gap-2">
              <Badge>Phase 3</Badge>
              <span>ประวัติการซื้อของลูกค้า</span>
            </li>
            <li className="flex items-center gap-2">
              <Badge>Phase 3</Badge>
              <span>การจัดกลุ่มลูกค้า (High Value, Regular, New)</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
