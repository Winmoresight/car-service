/**
 * Dashboard API
 * GET /api/dashboard - ดึง KPI หลักสำหรับหน้า Dashboard
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse, DashboardKPI } from "@/types/api";

export async function GET(request: NextRequest) {
  try {
    // Query สำหรับข้อมูลวันนี้
    const todayQuery = `
      SELECT 
        COUNT(*) as bill_count,
        ISNULL(SUM(TotalPrice), 0) as total_sales,
        ISNULL(SUM(TotalProfit), 0) as total_profit,
        ISNULL(SUM(Cash), 0) as total_cash,
        ISNULL(SUM(Transfer), 0) as total_transfer
      FROM dbo.MasterSalePost
      WHERE CONVERT(date, DateSalePost) = CONVERT(date, GETDATE())
    `;

    // Query สำหรับข้อมูลเดือนนี้
    const monthQuery = `
      SELECT 
        COUNT(*) as bill_count,
        ISNULL(SUM(TotalPrice), 0) as total_sales,
        ISNULL(SUM(TotalProfit), 0) as total_profit
      FROM dbo.MasterSalePost
      WHERE YEAR(DateSalePost) = YEAR(GETDATE())
        AND MONTH(DateSalePost) = MONTH(GETDATE())
    `;

    // Execute queries
    const [todayResult] = await executeQuery<{
      bill_count: number;
      total_sales: number;
      total_profit: number;
      total_cash: number;
      total_transfer: number;
    }>(todayQuery);

    const [monthResult] = await executeQuery<{
      bill_count: number;
      total_sales: number;
      total_profit: number;
    }>(monthQuery);

    // คำนวณอัตรากำไรขั้นต้น
    const profitMargin =
      monthResult.total_sales > 0
        ? (monthResult.total_profit / monthResult.total_sales) * 100
        : 0;

    // สร้าง response
    const kpi: DashboardKPI = {
      todaySales: todayResult.total_sales,
      todayProfit: todayResult.total_profit,
      todayBills: todayResult.bill_count,
      todayCash: todayResult.total_cash,
      todayTransfer: todayResult.total_transfer,
      monthSales: monthResult.total_sales,
      monthProfit: monthResult.total_profit,
      monthBills: monthResult.bill_count,
      profitMargin: Number(profitMargin.toFixed(2)),
    };

    const response: ApiResponse<DashboardKPI> = {
      success: true,
      data: kpi,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch dashboard data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
