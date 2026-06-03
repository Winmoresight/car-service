/**
 * Dashboard API
 * GET /api/dashboard - ดึง KPI หลักสำหรับหน้า Dashboard
 * Query params:
 *   - date: วันที่ต้องการดูข้อมูล (YYYY-MM-DD) ถ้าไม่ระบุจะใช้วันนี้
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { withTimeout, handleApiError, successResponse } from "@/lib/api-utils";
import type { ApiResponse, DashboardKPI } from "@/types/api";

export async function GET(request: NextRequest) {
  try {
    // อ่าน query parameter สำหรับวันที่
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");
    
    // Wrap ด้วย timeout (60 วินาที)
    const data = await withTimeout(async () => {
      // ถ้ามีการระบุวันที่ ให้ใช้วันที่นั้น ถ้าไม่มีใช้วันนี้
      const dateCondition = dateParam
        ? `CONVERT(date, DateSalePost) = '${dateParam}'`
        : `CONVERT(date, DateSalePost) = CONVERT(date, GETDATE())`;
      
      // Query สำหรับข้อมูลวันที่เลือก
      const todayQuery = `
        SELECT 
          COUNT(*) as bill_count,
          ISNULL(SUM(TotalPrice), 0) as total_sales,
          ISNULL(SUM(TotalProfit), 0) as total_profit,
          ISNULL(SUM(Cash), 0) as total_cash,
          ISNULL(SUM(Transfer), 0) as total_transfer
        FROM dbo.MasterSalePost
        WHERE ${dateCondition}
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

      // Execute queries (with automatic retry)
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

      return kpi;
    }, 60000);

    return successResponse(data);
    
  } catch (error) {
    return handleApiError(error, "Dashboard API error");
  }
}

// Disable caching for real-time data
export const dynamic = "force-dynamic";
export const revalidate = 0;
