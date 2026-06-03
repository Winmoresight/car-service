/**
 * Customers API - รายชื่อลูกค้าทั้งหมด
 * GET /api/customers - ดึงข้อมูลลูกค้าทั้งหมดพร้อมจัดกลุ่ม
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

// ประเภทการจัดกลุ่มลูกค้า
type CustomerSegment = "VIP" | "Regular" | "New" | "Inactive";

interface CustomerStats {
  totalSpent: number;
  totalOrders: number;
  lastOrderDate: string | null;
  firstOrderDate: string | null;
}

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

/**
 * จัดกลุ่มลูกค้าตาม RFM (Recency, Frequency, Monetary)
 */
function segmentCustomer(stats: CustomerStats): CustomerSegment {
  const { totalSpent, totalOrders, lastOrderDate } = stats;

  // ถ้าไม่มีประวัติซื้อเลย = New
  if (totalOrders === 0) {
    return "New";
  }

  // คำนวณจำนวนวันนับจากการซื้อครั้งล่าสุด
  const daysSinceLastOrder = lastOrderDate
    ? Math.floor(
        (new Date().getTime() - new Date(lastOrderDate).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  // Inactive: ไม่ซื้อมากกว่า 180 วัน (6 เดือน)
  if (daysSinceLastOrder !== null && daysSinceLastOrder > 180) {
    return "Inactive";
  }

  // VIP: ซื้อมากกว่า 50,000 บาท หรือ ซื้อมากกว่า 10 ครั้ง
  if (totalSpent >= 50000 || totalOrders >= 10) {
    return "VIP";
  }

  // Regular: ลูกค้าปกติ
  return "Regular";
}

export async function GET(request: Request) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const segment = searchParams.get("segment") || ""; // VIP, Regular, New, Inactive

    // สร้าง WHERE clause สำหรับการค้นหา
    let searchCondition = "";
    if (search) {
      searchCondition = `
        WHERE (
          c.NameCustomer LIKE @search OR
          c.CodeCustomer LIKE @search OR
          c.PhoneCustomer LIKE @search OR
          c.NameCar LIKE @search OR
          c.Province LIKE @search
        )
      `;
    }

    // Count total customers (for pagination)
    const countQuery = `
      SELECT COUNT(DISTINCT c.Code) as total
      FROM Customer c
      ${searchCondition}
    `;

    const countResult = await executeQuery<{ total: number }>(
      countQuery,
      search ? { search: `%${search}%` } : undefined,
    );
    const total = countResult[0]?.total || 0;

    // Get summary statistics (all customers, not paginated)
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT c.Code) as totalCustomers,
        SUM(CASE WHEN ISNULL(m.totalSpent, 0) >= 50000 OR ISNULL(m.totalOrders, 0) >= 10 THEN 1 ELSE 0 END) as vipCount,
        SUM(CASE WHEN ISNULL(m.totalOrders, 0) = 0 THEN 1 ELSE 0 END) as newCount,
        SUM(CASE 
          WHEN m.lastOrderDate IS NOT NULL 
          AND DATEDIFF(DAY, m.lastOrderDate, GETDATE()) > 180 
          THEN 1 ELSE 0 
        END) as inactiveCount
      FROM Customer c
      LEFT JOIN (
        SELECT 
          CodeCustomer,
          SUM(TotalPrice) as totalSpent,
          COUNT(NumberPrintSalePost) as totalOrders,
          MAX(DateSalePost) as lastOrderDate
        FROM MasterSalePost
        GROUP BY CodeCustomer
      ) m ON c.CodeCustomer = m.CodeCustomer
      ${searchCondition}
    `;

    const summaryResult = await executeQuery<{
      totalCustomers: number;
      vipCount: number;
      newCount: number;
      inactiveCount: number;
    }>(
      summaryQuery,
      search ? { search: `%${search}%` } : undefined,
    );

    const summaryData = summaryResult[0] || {
      totalCustomers: 0,
      vipCount: 0,
      newCount: 0,
      inactiveCount: 0,
    };

    const regularCount = summaryData.totalCustomers - summaryData.vipCount - summaryData.newCount - summaryData.inactiveCount;

    // ดึงข้อมูลลูกค้าพร้อมสถิติการซื้อ
    const query = `
      SELECT 
        c.Code as code,
        c.CodeCustomer as codeCustomer,
        c.NameCustomer as nameCustomer,
        c.PhoneCustomer as phoneCustomer,
        c.NameCar as nameCar,
        c.Province as province,
        c.BrandAndGenerate as brandAndGenerate,
        c.CaseCustomer as caseCustomer,
        ISNULL(SUM(m.TotalPrice), 0) as totalSpent,
        COUNT(m.NumberPrintSalePost) as totalOrders,
        MAX(m.DateSalePost) as lastOrderDate,
        MIN(m.DateSalePost) as firstOrderDate
      FROM Customer c
      LEFT JOIN MasterSalePost m ON c.CodeCustomer = m.CodeCustomer
      ${searchCondition}
      GROUP BY 
        c.Code,
        c.CodeCustomer,
        c.NameCustomer,
        c.PhoneCustomer,
        c.NameCar,
        c.Province,
        c.BrandAndGenerate,
        c.CaseCustomer
      ORDER BY totalSpent DESC, c.Code ASC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const rawCustomers = await executeQuery<{
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
    }>(
      query,
      search
        ? { search: `%${search}%`, limit, offset }
        : { limit, offset },
    );

    // จัดกลุ่มลูกค้า
    const customers: Customer[] = rawCustomers.map((customer) => {
      const stats: CustomerStats = {
        totalSpent: customer.totalSpent,
        totalOrders: customer.totalOrders,
        lastOrderDate: customer.lastOrderDate,
        firstOrderDate: customer.firstOrderDate,
      };

      const segment = segmentCustomer(stats);

      const daysSinceLastOrder = customer.lastOrderDate
        ? Math.floor(
            (new Date().getTime() - new Date(customer.lastOrderDate).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      return {
        ...customer,
        segment,
        daysSinceLastOrder,
      };
    });

    // Filter by segment if specified (client-side filter for now)
    let filteredCustomers = customers;
    if (segment && segment !== "all") {
      filteredCustomers = customers.filter((c) => c.segment === segment);
    }

    // สรุปสถิติแยกตามกลุ่ม (from database query)
    const summary = {
      total: summaryData.totalCustomers,
      vip: summaryData.vipCount,
      regular: regularCount,
      new: summaryData.newCount,
      inactive: summaryData.inactiveCount,
    };

    return NextResponse.json({
      success: true,
      data: {
        customers: filteredCustomers,
        total,
        limit,
        offset,
      },
      summary,
    });
  } catch (error) {
    console.error("❌ Error fetching customers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customers",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
