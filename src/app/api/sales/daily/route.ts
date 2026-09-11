/**
 * Sales Trend API
 * GET /api/sales/daily - ดึงข้อมูลยอดขายรายวัน รายสัปดาห์ หรือรายเดือน
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { getProductAnalyticsSqlConfig } from "@/lib/product-analytics-policy";
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
    let customStartDate = normalizeDateParam(searchParams.get("startDate"));
    let customEndDate =
      normalizeDateParam(searchParams.get("endDate")) || customStartDate;

    if (!customStartDate && customEndDate) {
      customStartDate = customEndDate;
    }

    if (customStartDate && customEndDate && customStartDate > customEndDate) {
      [customStartDate, customEndDate] = [customEndDate, customStartDate];
    }
    const requestedDays = Number.parseInt(searchParams.get("days") || "30", 10);
    const { startDateExpression, endDateExpression } = customStartDate
      ? {
          startDateExpression: "CONVERT(date, @startDate)",
          endDateExpression: "DATEADD(day, 1, CONVERT(date, @endDate))",
        }
      : getPeriodConfig(
          period,
          selectedDateExpression,
          Number.isFinite(requestedDays) ? requestedDays : 30,
        );
    const queryParams = customStartDate
      ? { startDate: customStartDate, endDate: customEndDate }
      : selectedDate
        ? { selectedDate }
        : undefined;
    const analyticsSql = await getProductAnalyticsSqlConfig(
      "profitSale",
      "daily",
    );

    const query = `
      WITH TransactionDaily AS (
        SELECT
          CONVERT(date, DateSalePost) as sale_date,
          COUNT(*) as bill_count,
          ISNULL(SUM(TotalPrice), 0) as total_sales,
          ISNULL(SUM(Cash), 0) as total_cash,
          ISNULL(SUM(Transfer), 0) as total_transfer
        FROM dbo.MasterSalePost
        WHERE DateSalePost >= ${startDateExpression}
          AND DateSalePost < ${endDateExpression}
          AND DATEDIFF(day, '19000107', CONVERT(date, DateSalePost)) % 7 <> 0
        GROUP BY CONVERT(date, DateSalePost)
      ),
      ProfitDaily AS (
        SELECT
          CONVERT(date, profitSale.DateSalePost) as sale_date,
          ISNULL(SUM(profitSale.SumProfit), 0) as total_profit
        FROM dbo.DetailSalePost profitSale
        ${analyticsSql.joins}
        WHERE profitSale.DateSalePost >= ${startDateExpression}
          AND profitSale.DateSalePost < ${endDateExpression}
          AND ${analyticsSql.includeInProfitAnalysisExpression} = 1
        GROUP BY CONVERT(date, profitSale.DateSalePost)
      )
      SELECT
        transactions.sale_date,
        transactions.bill_count,
        transactions.total_sales,
        ISNULL(profit.total_profit, 0) as total_profit,
        transactions.total_cash,
        transactions.total_transfer
      FROM TransactionDaily transactions
      LEFT JOIN ProfitDaily profit ON profit.sale_date = transactions.sale_date
      ORDER BY transactions.sale_date ASC
    `;

    const results = await executeQuery<{
      sale_date: Date;
      bill_count: number;
      total_sales: number;
      total_profit: number;
      total_cash: number;
      total_transfer: number;
    }>(query, queryParams);

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
