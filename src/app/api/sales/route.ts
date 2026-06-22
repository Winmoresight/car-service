/**
 * Sales API
 * GET /api/sales - ดึงรายการบิลขายพร้อมสรุปยอดตามตัวกรอง
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface SaleItem {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  totalProfit: number;
  cash: number;
  transfer: number;
  deposits: number;
  receivableAmount: number;
  status: string;
  itemCount: number;
}

interface SalesSummary {
  totalSales: number;
  totalProfit: number;
  totalCash: number;
  totalTransfer: number;
  totalDeposits: number;
  totalReceivable: number;
}

type SalesStatusFilter = "all" | "cash" | "transfer" | "unpaid";

function getSafeMoneyExpression(valueExpression: string) {
  const textExpression = `CONVERT(nvarchar(100), ${valueExpression})`;

  return `ISNULL(CONVERT(money, CASE WHEN ${valueExpression} IS NULL THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

function buildSalesConditions({
  search,
  startDate,
  endDate,
  status,
}: {
  search: string;
  startDate: string;
  endDate: string;
  status: SalesStatusFilter;
}) {
  const conditions: string[] = [];

  if (search) {
    conditions.push(
      `(m.NumberPrintSalePost LIKE @search OR m.NameCustomer LIKE @search)`,
    );
  }

  if (startDate) {
    conditions.push("CONVERT(date, m.DateSalePost) >= @startDate");
  }

  if (endDate) {
    conditions.push("CONVERT(date, m.DateSalePost) <= @endDate");
  }

  if (status === "cash") {
    conditions.push("ISNULL(m.Cash, 0) > 0");
  } else if (status === "transfer") {
    conditions.push("ISNULL(m.Transfer, 0) > 0");
  } else if (status === "unpaid") {
    conditions.push("LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ค้างชำระ'");
  }

  return conditions;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const statusParam = searchParams.get("status") || "all";
    const status: SalesStatusFilter =
      statusParam === "cash" ||
      statusParam === "transfer" ||
      statusParam === "unpaid"
        ? statusParam
        : "all";

    // Build query
    const conditions = buildSalesConditions({
      search,
      startDate,
      endDate,
      status,
    });

    let query = `
      WITH PaginatedData AS (
        SELECT 
          m.NumberPrintSalePost as id,
          m.DateSalePost as date,
          ISNULL(m.NameCustomer, 'ไม่ระบุ') as customerName,
          ISNULL(c.PhoneCustomer, '') as customerPhone,
          m.TotalPrice as totalPrice,
          m.TotalProfit as totalProfit,
          m.Cash as cash,
          m.Transfer as transfer,
          ${getSafeMoneyExpression("m.Deposits")} as deposits,
          CASE
            WHEN LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ค้างชำระ'
              THEN CASE
                WHEN m.TotalPrice - ISNULL(m.Cash, 0) - ISNULL(m.Transfer, 0) - ${getSafeMoneyExpression("m.Deposits")} > 0
                  THEN m.TotalPrice - ISNULL(m.Cash, 0) - ISNULL(m.Transfer, 0) - ${getSafeMoneyExpression("m.Deposits")}
                ELSE 0
              END
            ELSE 0
          END as receivableAmount,
          LTRIM(RTRIM(ISNULL(m.Status, ''))) as status,
          (SELECT COUNT(*) FROM dbo.DetailSalePost WHERE NumberPrintSalePost = m.NumberPrintSalePost) as itemCount,
          ROW_NUMBER() OVER (ORDER BY m.DateSalePost DESC) as RowNum
        FROM dbo.MasterSalePost m
        LEFT JOIN dbo.Customer c ON m.CodeCustomer = c.CodeCustomer
    `;

    // Build WHERE clause
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += `
      )
      SELECT
        id,
        date,
        customerName,
        customerPhone,
        totalPrice,
        totalProfit,
        cash,
        transfer,
        deposits,
        receivableAmount,
        status,
        itemCount
      FROM PaginatedData
      WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
      ORDER BY RowNum
    `;

    const results = await executeQuery<{
      id: string;
      date: Date;
      customerName: string;
      customerPhone: string;
      totalPrice: number;
      totalProfit: number;
      cash: number;
      transfer: number;
      deposits: number;
      receivableAmount: number;
      status: string;
      itemCount: number;
    }>(query, {
      limit,
      offset,
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    // Return data without masking
    const sales: SaleItem[] = results.map((row) => ({
      id: row.id,
      date: new Date(row.date).toISOString(),
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      totalPrice: row.totalPrice,
      totalProfit: row.totalProfit,
      cash: row.cash,
      transfer: row.transfer,
      deposits: row.deposits,
      receivableAmount: row.receivableAmount,
      status: row.status,
      itemCount: row.itemCount,
    }));

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM dbo.MasterSalePost m`;

    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(" AND ")}`;
    }

    const [countResult] = await executeQuery<{ total: number }>(countQuery, {
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    // Get sales summary with the same filters as the list above
    let summaryQuery = `
      SELECT
        ISNULL(SUM(m.TotalPrice), 0) as totalSales,
        ISNULL(SUM(m.TotalProfit), 0) as totalProfit,
        ISNULL(SUM(m.Cash), 0) as totalCash,
        ISNULL(SUM(m.Transfer), 0) as totalTransfer,
        ISNULL(SUM(${getSafeMoneyExpression("m.Deposits")}), 0) as totalDeposits,
        ISNULL(
          SUM(
            CASE
              WHEN LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ค้างชำระ'
                THEN CASE
                  WHEN m.TotalPrice - ISNULL(m.Cash, 0) - ISNULL(m.Transfer, 0) - ${getSafeMoneyExpression("m.Deposits")} > 0
                    THEN m.TotalPrice - ISNULL(m.Cash, 0) - ISNULL(m.Transfer, 0) - ${getSafeMoneyExpression("m.Deposits")}
                  ELSE 0
                END
              ELSE 0
            END
          ),
          0
        ) as totalReceivable
      FROM dbo.MasterSalePost m
    `;

    if (conditions.length > 0) {
      summaryQuery += ` WHERE ${conditions.join(" AND ")}`;
    }

    const [summaryResult] = await executeQuery<SalesSummary>(summaryQuery, {
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    const response: ApiResponse<{
      sales: SaleItem[];
      total: number;
      limit: number;
      offset: number;
      summary: SalesSummary;
    }> = {
      success: true,
      data: {
        sales,
        total: countResult.total,
        limit,
        offset,
        summary: {
          totalSales: summaryResult.totalSales,
          totalProfit: summaryResult.totalProfit,
          totalCash: summaryResult.totalCash,
          totalTransfer: summaryResult.totalTransfer,
          totalDeposits: summaryResult.totalDeposits,
          totalReceivable: summaryResult.totalReceivable,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Sales API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sales data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
