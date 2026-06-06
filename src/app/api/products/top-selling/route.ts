/**
 * Top Selling Products API (Monthly)
 * GET /api/products/top-selling - ดึงสินค้าขายดี Top 10 รายเดือน
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface TopSellingProduct {
  rank: number;
  productName: string;
  barcode: string;
  salesCount: number;
  totalQuantity: number;
  totalSales: number;
  totalProfit: number;
  profitMargin: number;
}

interface MonthlySummary {
  period: string;
  totalProducts: number;
  totalSales: number;
  totalProfit: number;
  averageProfitMargin: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const month = searchParams.get("month") || new Date().getMonth() + 1;
    const year = searchParams.get("year") || new Date().getFullYear();

    // Query for top selling products
    const query = `
      SELECT TOP (@limit)
        NameProduct as productName,
        BarCode as barcode,
        COUNT(*) as salesCount,
        ISNULL(SUM(NumProduct), 0) as totalQuantity,
        ISNULL(SUM(SumPrice), 0) as totalSales,
        ISNULL(SUM(SumProfit), 0) as totalProfit
      FROM dbo.DetailSalePost
      WHERE YEAR(DateSalePost) = @year
        AND MONTH(DateSalePost) = @month
      GROUP BY NameProduct, BarCode
      HAVING ISNULL(SUM(SumPrice), 0) > 0
      ORDER BY totalSales DESC
    `;

    const results = await executeQuery<{
      productName: string;
      barcode: string;
      salesCount: number;
      totalQuantity: number;
      totalSales: number;
      totalProfit: number;
    }>(query, { limit, month, year });

    // Add ranking and profit margin
    const topProducts: TopSellingProduct[] = results.map((row, index) => ({
      rank: index + 1,
      productName: row.productName,
      barcode: row.barcode || '',
      salesCount: row.salesCount,
      totalQuantity: row.totalQuantity,
      totalSales: row.totalSales,
      totalProfit: row.totalProfit,
      profitMargin:
        row.totalSales > 0
          ? Number(((row.totalProfit / row.totalSales) * 100).toFixed(2))
          : 0,
    }));

    // Get monthly summary
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT NameProduct) as totalProducts,
        ISNULL(SUM(SumPrice), 0) as totalSales,
        ISNULL(SUM(SumProfit), 0) as totalProfit
      FROM dbo.DetailSalePost
      WHERE YEAR(DateSalePost) = @year
        AND MONTH(DateSalePost) = @month
    `;

    const [summaryResult] = await executeQuery<{
      totalProducts: number;
      totalSales: number;
      totalProfit: number;
    }>(summaryQuery, { month, year });

    // Get month name in Thai
    const monthNames = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const monthName = monthNames[Number(month) - 1];

    const summary: MonthlySummary = {
      period: `${monthName} ${year}`,
      totalProducts: summaryResult.totalProducts,
      totalSales: summaryResult.totalSales,
      totalProfit: summaryResult.totalProfit,
      averageProfitMargin:
        summaryResult.totalSales > 0
          ? Number(((summaryResult.totalProfit / summaryResult.totalSales) * 100).toFixed(2))
          : 0,
    };

    const response: ApiResponse<{
      data: TopSellingProduct[];
      summary: MonthlySummary;
    }> = {
      success: true,
      data: {
        data: topProducts,
        summary,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Top Selling Products API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch top selling products",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
