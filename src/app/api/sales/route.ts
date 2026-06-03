/**
 * Sales API
 * GET /api/sales - ดึงรายการบิลขาย
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Build query (join with Customer table for phone/address if needed)
    let query = `
      SELECT 
        m.NumberPrintSalePost as id,
        m.DateSalePost as date,
        ISNULL(m.NameCustomer, 'ไม่ระบุ') as customerName,
        '' as customerPhone,
        m.TotalPrice as totalPrice,
        m.TotalProfit as totalProfit,
        m.Cash as cash,
        m.Transfer as transfer,
        (SELECT COUNT(*) FROM dbo.DetailSalePost WHERE NumberPrintSalePost = m.NumberPrintSalePost) as itemCount
      FROM dbo.MasterSalePost m
    `;

    // Build WHERE clause
    const conditions: string[] = [];
    
    if (search) {
      conditions.push(`(NumberPrintSalePost LIKE @search OR NameCustomer LIKE @search)`);
    }
    
    if (startDate) {
      conditions.push(`CONVERT(date, DateSalePost) >= @startDate`);
    }
    
    if (endDate) {
      conditions.push(`CONVERT(date, DateSalePost) <= @endDate`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      ORDER BY DateSalePost DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
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
    let countQuery = `SELECT COUNT(*) as total FROM dbo.MasterSalePost`;
    
    // Build WHERE clause for count query
    const countConditions: string[] = [];
    
    if (search) {
      countConditions.push(`(NumberPrintSalePost LIKE @search OR NameCustomer LIKE @search)`);
    }
    
    if (startDate) {
      countConditions.push(`CONVERT(date, DateSalePost) >= @startDate`);
    }
    
    if (endDate) {
      countConditions.push(`CONVERT(date, DateSalePost) <= @endDate`);
    }
    
    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(' AND ')}`;
    }

    const [countResult] = await executeQuery<{ total: number }>(countQuery, {
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    const response: ApiResponse<{
      sales: SaleItem[];
      total: number;
      limit: number;
      offset: number;
    }> = {
      success: true,
      data: {
        sales,
        total: countResult.total,
        limit,
        offset,
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
