/**
 * Sales API
 * GET /api/sales - ดึงรายการบิลขายที่ชำระเงินแล้ว
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
  itemCount: number;
}

interface SalesSummary {
  totalSales: number;
  totalProfit: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Build query
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
          (SELECT COUNT(*) FROM dbo.DetailSalePost WHERE NumberPrintSalePost = m.NumberPrintSalePost) as itemCount,
          ROW_NUMBER() OVER (ORDER BY m.DateSalePost DESC) as RowNum
        FROM dbo.MasterSalePost m
        LEFT JOIN dbo.Customer c ON m.CodeCustomer = c.CodeCustomer
    `;

    // Build WHERE clause
    const conditions: string[] = [
      "LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ชำระเงินแล้ว'",
    ];

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

    query += ` WHERE ${conditions.join(" AND ")}`;

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
      itemCount: row.itemCount,
    }));

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM dbo.MasterSalePost m`;

    // Build WHERE clause for count query
    const countConditions: string[] = [
      "LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ชำระเงินแล้ว'",
    ];

    if (search) {
      countConditions.push(
        `(m.NumberPrintSalePost LIKE @search OR m.NameCustomer LIKE @search)`,
      );
    }

    if (startDate) {
      countConditions.push("CONVERT(date, m.DateSalePost) >= @startDate");
    }

    if (endDate) {
      countConditions.push("CONVERT(date, m.DateSalePost) <= @endDate");
    }

    countQuery += ` WHERE ${countConditions.join(" AND ")}`;

    const [countResult] = await executeQuery<{ total: number }>(countQuery, {
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    // Get sales summary with the same filters as the list above
    let summaryQuery = `
      SELECT
        ISNULL(SUM(m.TotalPrice), 0) as totalSales,
        ISNULL(SUM(m.TotalProfit), 0) as totalProfit
      FROM dbo.MasterSalePost m
    `;

    summaryQuery += ` WHERE ${conditions.join(" AND ")}`;

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
