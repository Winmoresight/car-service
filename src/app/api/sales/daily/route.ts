/**
 * Sales Trend API
 * GET /api/sales/daily - ดึงข้อมูลยอดขายรายวัน รายสัปดาห์ หรือรายเดือน
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse, DailySales } from "@/types/api";

type SalesPeriod = "day" | "week" | "month";

function normalizeDateParam(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? value
    : "";
}

function getPeriodConfig(
  period: SalesPeriod,
  selectedDateExpression: string,
  requestedDays: number,
) {
  const weekStart = `DATEADD(day, -(DATEDIFF(day, 0, ${selectedDateExpression}) % 7), ${selectedDateExpression})`;
  const monthStart = `DATEADD(month, DATEDIFF(month, 0, ${selectedDateExpression}), 0)`;

  if (period === "week") {
    return {
      startDateExpression: weekStart,
      endDateExpression: `DATEADD(day, 7, ${weekStart})`,
    };
  }

  if (period === "month") {
    return {
      startDateExpression: monthStart,
      endDateExpression: `DATEADD(month, 1, ${monthStart})`,
    };
  }

  const days = Math.min(Math.max(requestedDays, 1), 90);

  return {
    startDateExpression: `DATEADD(day, -${days - 1}, ${selectedDateExpression})`,
    endDateExpression: `DATEADD(day, 1, ${selectedDateExpression})`,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestedPeriod = searchParams.get("period");
    const period: SalesPeriod =
      requestedPeriod === "week" || requestedPeriod === "month"
        ? requestedPeriod
        : "day";
    const selectedDate = normalizeDateParam(searchParams.get("date"));
    const selectedDateExpression = selectedDate
      ? "CONVERT(date, @selectedDate)"
      : "CONVERT(date, GETDATE())";
    const requestedDays = Number.parseInt(searchParams.get("days") || "30", 10);
    const { startDateExpression, endDateExpression } = getPeriodConfig(
      period,
      selectedDateExpression,
      Number.isFinite(requestedDays) ? requestedDays : 30,
    );

    const query = `
      SELECT 
        CONVERT(date, DateSalePost) as sale_date,
        COUNT(*) as bill_count,
        ISNULL(SUM(TotalPrice), 0) as total_sales,
        ISNULL(SUM(TotalProfit), 0) as total_profit,
        ISNULL(SUM(Cash), 0) as total_cash,
        ISNULL(SUM(Transfer), 0) as total_transfer
      FROM dbo.MasterSalePost
      WHERE DateSalePost >= ${startDateExpression}
        AND DateSalePost < ${endDateExpression}
        AND DATEDIFF(day, '19000107', CONVERT(date, DateSalePost)) % 7 <> 0
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
    }>(query, selectedDate ? { selectedDate } : undefined);

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
