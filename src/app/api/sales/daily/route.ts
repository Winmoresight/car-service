/**
 * Daily Sales API
 * GET /api/sales/daily - ดึงข้อมูลยอดขายรายวัน (30 วันล่าสุด)
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse, DailySales } from "@/types/api";

export async function GET(request: NextRequest) {
  try {
    // ดึง query parameter สำหรับจำนวนวัน (default = 30)
    const searchParams = request.nextUrl.searchParams;
    const days = Number.parseInt(searchParams.get("days") || "30", 10);

    const query = `
      SELECT 
        CONVERT(date, DateSalePost) as sale_date,
        COUNT(*) as bill_count,
        ISNULL(SUM(TotalPrice), 0) as total_sales,
        ISNULL(SUM(TotalProfit), 0) as total_profit,
        ISNULL(SUM(Cash), 0) as total_cash,
        ISNULL(SUM(Transfer), 0) as total_transfer
      FROM dbo.MasterSalePost
      WHERE DateSalePost >= DATEADD(day, -@days, GETDATE())
      GROUP BY CONVERT(date, DateSalePost)
      ORDER BY sale_date ASC
    `;

    const results = await executeQuery<{
      sale_date: Date;
      bill_count: number;
      total_sales: number;
      total_profit: number;
      total_cash: number;
      total_transfer: number;
    }>(query, { days });

    // แปลงเป็น format ที่ต้องการ
    const dailySales: DailySales[] = results.map((row) => ({
      date: new Date(row.sale_date).toISOString().split("T")[0],
      sales: row.total_sales,
      profit: row.total_profit,
      bills: row.bill_count,
      cash: row.total_cash,
      transfer: row.total_transfer,
    }));

    const response: ApiResponse<DailySales[]> = {
      success: true,
      data: dailySales,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Daily sales API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch daily sales data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
