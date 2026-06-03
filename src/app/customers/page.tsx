"use client";

/**
 * Customers Page - หน้าลูกค้า
 * แสดงรายชื่อลูกค้าทั้งหมด พร้อมการจัดกลุ่มและประวัติการซื้อ
 */

import { useState } from "react";
import useSWR from "swr";
import { Users, UserPlus, TrendingUp, Award, Search, Phone, Car, MapPin, Calendar, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LargeDialog,
  LargeDialogContent,
  LargeDialogHeader,
  LargeDialogBody,
  LargeDialogTitle,
  LargeDialogDescription,
} from "@/components/ui/large-dialog";

type CustomerSegment = "VIP" | "Regular" | "New" | "Inactive";

interface Customer {
  code: number;
  codeCustomer: string;
  nameCustomer: string;
  phoneCustomer: string;
  nameCar: string;
  province: string;
  brandAndGenerate: string;
  caseCustomer: string;
  totalSpent: number;
  totalOrders: number;
  lastOrderDate: string | null;
  firstOrderDate: string | null;
  segment: CustomerSegment;
  daysSinceLastOrder: number | null;
}

interface CustomerSummary {
  total: number;
  vip: number;
  regular: number;
  new: number;
  inactive: number;
}

interface PurchaseHistory {
  dateSalePost: string;
  numberPrintSalePost: string;
  nameCar: string;
  totalPrice: number;
  totalCost: number;
  totalProfit: number;
  status: string;
  itemCount: number;
}

interface CustomerDetail {
  customer: Customer;
  purchases: PurchaseHistory[];
  stats: {
    totalOrders: number;
    totalSpent: number;
    totalProfit: number;
    lastOrderDate: string | null;
    firstOrderDate: string | null;
    averageOrderValue: number;
  };
}

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [filterSegment, setFilterSegment] = useState<CustomerSegment | "all">("all");
  const limit = 50;

  // Modal state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Build API URL with query params
  const apiUrl = `/api/customers?limit=${limit}&offset=${page * limit}&search=${searchTerm}${filterSegment !== "all" ? `&segment=${filterSegment}` : ""}`;

  // Fetch customers using SWR
  const { data, error, isLoading } = useSWR(apiUrl, async (url) => {
    const response = await fetch(url);
    return response.json();
  }, {
    refreshInterval: 60000,
  });

  const customers = data?.success && data?.data?.customers ? data.data.customers : [];
  const total = data?.success && data?.data?.total ? data.data.total : 0;
  const summary = data?.summary || null;
  const totalPages = Math.ceil(total / limit);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(0); // Reset to first page
  };

  const handleFilterSegment = (segment: CustomerSegment | "all") => {
    setFilterSegment(segment);
    setPage(0); // Reset to first page
  };

  const fetchCustomerDetail = async (code: number) => {
    try {
      setModalLoading(true);
      const response = await fetch(`/api/customers/${code}`);
      const result = await response.json();

      if (result.success) {
        setSelectedCustomer(result.data);
        setModalOpen(true);
      }
    } catch (error) {
      console.error("Failed to fetch customer detail:", error);
    } finally {
      setModalLoading(false);
    }
  };

  // Filter customers (client-side filter removed, now done on API)
  const filteredCustomers = customers;

  const getSegmentBadge = (segment: CustomerSegment) => {
    const variants = {
      VIP: "default",
      Regular: "secondary",
      New: "outline",
      Inactive: "destructive",
    } as const;

    const colors = {
      VIP: "bg-yellow-500 text-white hover:bg-yellow-600",
      Regular: "bg-blue-500 text-white hover:bg-blue-600",
      New: "bg-green-500 text-white hover:bg-green-600",
      Inactive: "bg-gray-400 text-white hover:bg-gray-500",
    };

    return (
      <Badge className={colors[segment]}>
        {segment === "VIP" && "⭐ VIP"}
        {segment === "Regular" && "👤 ปกติ"}
        {segment === "New" && "🆕 ใหม่"}
        {segment === "Inactive" && "😴 ไม่ active"}
      </Badge>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error || (data && !data.success)) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="text-center py-12">
          <p className="text-red-600 font-semibold">เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error?.message || data?.error || "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ลูกค้า</h1>
        <p className="text-muted-foreground mt-1">
          จัดการข้อมูลลูกค้าและประวัติการซื้อ
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleFilterSegment("all")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              ลูกค้าทั้งหมด
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">คน</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleFilterSegment("VIP")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" />
              ลูกค้า VIP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary?.vip.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.total ? ((summary.vip / summary.total) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleFilterSegment("Regular")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              ลูกค้าปกติ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary?.regular.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.total ? ((summary.regular / summary.total) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleFilterSegment("New")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              ลูกค้าใหม่
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary?.new.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">ยังไม่มีประวัติซื้อ</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => handleFilterSegment("Inactive")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              ไม่ active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {summary?.inactive.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">&gt;6 เดือน</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>รายชื่อลูกค้า ({filteredCustomers.length} คน)</span>
            {filterSegment !== "all" && (
              <button
                onClick={() => handleFilterSegment("all")}
                className="text-sm font-normal text-blue-600 hover:underline"
              >
                ล้างตัวกรอง
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาชื่อ, รหัส, เบอร์โทร, ทะเบียนรถ..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>รหัส</TableHead>
                  <TableHead>ชื่อลูกค้า</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>ทะเบียนรถ</TableHead>
                  <TableHead>รุ่นรถ</TableHead>
                  <TableHead className="text-right">ยอดซื้อรวม</TableHead>
                  <TableHead className="text-center">ครั้ง</TableHead>
                  <TableHead>ซื้อล่าสุด</TableHead>
                  <TableHead className="text-center">กลุ่ม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      ไม่พบข้อมูลลูกค้า
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow
                      key={customer.code}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => fetchCustomerDetail(customer.code)}
                    >
                      <TableCell className="font-mono text-xs">
                        {customer.codeCustomer}
                      </TableCell>
                      <TableCell className="font-medium">
                        {customer.nameCustomer}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {customer.phoneCustomer}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {customer.nameCar}
                      </TableCell>
                      <TableCell className="text-sm">
                        {customer.brandAndGenerate}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell className="text-center">
                        {customer.totalOrders}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(customer.lastOrderDate)}
                        {customer.daysSinceLastOrder !== null && (
                          <span className="block text-xs">
                            ({customer.daysSinceLastOrder} วัน)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {getSegmentBadge(customer.segment)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                แสดง {page * limit + 1}-
                {Math.min((page + 1) * limit, total)} จาก {total.toLocaleString()} คน
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  ← ก่อนหน้า
                </Button>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-sm text-muted-foreground">
                    หน้า {page + 1} / {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                >
                  ถัดไป →
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Detail Modal */}
      <LargeDialog open={modalOpen} onOpenChange={setModalOpen}>
        <LargeDialogContent size="2xl">
          <LargeDialogHeader>
            <LargeDialogTitle>ข้อมูลลูกค้า</LargeDialogTitle>
            <LargeDialogDescription>
              ประวัติการซื้อและข้อมูลรายละเอียดทั้งหมด
            </LargeDialogDescription>
          </LargeDialogHeader>

          <LargeDialogBody>

          {modalLoading ? (
            <div className="py-12 text-center text-muted-foreground text-base">
              กำลังโหลด...
            </div>
          ) : selectedCustomer ? (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-6 p-6 bg-muted/30 rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold text-lg">
                      {selectedCustomer.customer.nameCustomer}
                    </span>
                    {getSegmentBadge(selectedCustomer.customer.segment)}
                  </div>
                  <div className="flex items-center gap-2 text-base text-muted-foreground">
                    <Phone className="h-5 w-5" />
                    {selectedCustomer.customer.phoneCustomer}
                  </div>
                  <div className="flex items-center gap-2 text-base text-muted-foreground">
                    <Car className="h-5 w-5" />
                    {selectedCustomer.customer.nameCar} - {selectedCustomer.customer.brandAndGenerate}
                  </div>
                  <div className="flex items-center gap-2 text-base text-muted-foreground">
                    <MapPin className="h-5 w-5" />
                    {selectedCustomer.customer.province}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-base">
                    <span className="text-muted-foreground">ยอดซื้อรวม:</span>
                    <span className="font-bold text-2xl ml-2">
                      {formatCurrency(selectedCustomer.stats.totalSpent)}
                    </span>
                  </div>
                  <div className="text-base">
                    <span className="text-muted-foreground">จำนวนครั้ง:</span>
                    <span className="font-semibold text-lg ml-2">
                      {selectedCustomer.stats.totalOrders} ครั้ง
                    </span>
                  </div>
                  <div className="text-base">
                    <span className="text-muted-foreground">เฉลี่ย/ครั้ง:</span>
                    <span className="font-semibold text-lg ml-2">
                      {formatCurrency(selectedCustomer.stats.averageOrderValue)}
                    </span>
                  </div>
                  <div className="text-base">
                    <span className="text-muted-foreground">ซื้อล่าสุด:</span>
                    <span className="font-semibold text-lg ml-2">
                      {formatDate(selectedCustomer.stats.lastOrderDate)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Purchase History */}
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  ประวัติการซื้อ ({selectedCustomer.purchases.length} รายการ)
                </h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-base">วันที่</TableHead>
                        <TableHead className="text-base">เลขที่บิล</TableHead>
                        <TableHead className="text-base">ทะเบียนรถ</TableHead>
                        <TableHead className="text-right text-base">ยอดขาย</TableHead>
                        <TableHead className="text-right text-base">กำไร</TableHead>
                        <TableHead className="text-center text-base">สินค้า</TableHead>
                        <TableHead className="text-base">สถานะ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCustomer.purchases.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-base">
                            ยังไม่มีประวัติการซื้อ
                          </TableCell>
                        </TableRow>
                      ) : (
                        selectedCustomer.purchases.map((purchase, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-base">
                              {formatDate(purchase.dateSalePost)}
                            </TableCell>
                            <TableCell className="font-mono">
                              {purchase.numberPrintSalePost}
                            </TableCell>
                            <TableCell className="font-mono text-base">
                              {purchase.nameCar}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-base">
                              {formatCurrency(purchase.totalPrice)}
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-semibold text-base">
                              {formatCurrency(purchase.totalProfit)}
                            </TableCell>
                            <TableCell className="text-center text-base">
                              {purchase.itemCount}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{purchase.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : null}
          </LargeDialogBody>
        </LargeDialogContent>
      </LargeDialog>
    </div>
  );
}
