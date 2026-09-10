/**
 * Top Selling Products API (Monthly)
 * GET /api/products/top-selling - ดึงสินค้าขายดี Top 10 รายเดือน
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { getProductAnalyticsSqlConfig } from "@/lib/product-analytics-policy";
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
    const analyticsSql = await getProductAnalyticsSqlConfig(
      "sales",
      "topSelling",
    );

    // Query for top selling products
    const query = `
      SELECT TOP (@limit)
        sales.NameProduct as productName,
        ${analyticsSql.resolvedBarcodeExpression} as barcode,
        COUNT(*) as salesCount,
        ISNULL(SUM(sales.NumProduct), 0) as totalQuantity,
        ISNULL(SUM(sales.SumPrice), 0) as totalSales,
        ISNULL(SUM(CASE
          WHEN ${analyticsSql.includeInProfitAnalysisExpression} = 1
            THEN sales.SumProfit
          ELSE 0
        END), 0) as totalProfit,
        ISNULL(SUM(CASE
          WHEN ${analyticsSql.includeInProfitAnalysisExpression} = 1
            THEN sales.SumPrice
          ELSE 0
        END), 0) as profitAnalysisSales
      FROM dbo.DetailSalePost sales
      ${analyticsSql.joins}
      WHERE YEAR(sales.DateSalePost) = @year
        AND MONTH(sales.DateSalePost) = @month
        AND ${analyticsSql.includeInBestSellerExpression} = 1
      GROUP BY sales.NameProduct, ${analyticsSql.resolvedBarcodeExpression}
      HAVING ISNULL(SUM(sales.SumPrice), 0) > 0
      ORDER BY totalSales DESC
    `;

    const results = await executeQuery<{
      productName: string;
      barcode: string;
      salesCount: number;
      totalQuantity: number;
      totalSales: number;
      totalProfit: number;
      profitAnalysisSales: number;
    }>(query, { limit, month, year });

    // Add ranking and profit margin
    const topProducts: TopSellingProduct[] = results.map((row, index) => ({
      rank: index + 1,
      productName: row.productName,
      barcode: row.barcode || "",
      salesCount: row.salesCount,
      totalQuantity: row.totalQuantity,
      totalSales: row.totalSales,
      totalProfit: row.totalProfit,
      profitMargin:
        row.profitAnalysisSales > 0
          ? Number(
              ((row.totalProfit / row.profitAnalysisSales) * 100).toFixed(2),
            )
          : 0,
    }));

    // Get monthly summary
    const summaryQuery = `
      SELECT 
        COUNT(DISTINCT sales.NameProduct) as totalProducts,
        ISNULL(SUM(sales.SumPrice), 0) as totalSales,
        ISNULL(SUM(CASE
          WHEN ${analyticsSql.includeInProfitAnalysisExpression} = 1
            THEN sales.SumProfit
          ELSE 0
        END), 0) as totalProfit,
        ISNULL(SUM(CASE
          WHEN ${analyticsSql.includeInProfitAnalysisExpression} = 1
            THEN sales.SumPrice
          ELSE 0
        END), 0) as profitAnalysisSales
      FROM dbo.DetailSalePost sales
      ${analyticsSql.joins}
      WHERE YEAR(sales.DateSalePost) = @year
        AND MONTH(sales.DateSalePost) = @month
        AND ${analyticsSql.includeInBestSellerExpression} = 1
    `;

    const [summaryResult] = await executeQuery<{
      totalProducts: number;
      totalSales: number;
      totalProfit: number;
      profitAnalysisSales: number;
    }>(summaryQuery, { month, year });

    // Get month name in Thai
    const monthNames = [
      "มกราคม",
      "กุมภาพันธ์",
      "มีนาคม",
      "เมษายน",
      "พฤษภาคม",
      "มิถุนายน",
      "กรกฎาคม",
      "สิงหาคม",
      "กันยายน",
      "ตุลาคม",
      "พฤศจิกายน",
      "ธันวาคม",
    ];
    const monthName = monthNames[Number(month) - 1];

    const summary: MonthlySummary = {
      period: `${monthName} ${year}`,
      totalProducts: summaryResult.totalProducts,
      totalSales: summaryResult.totalSales,
      totalProfit: summaryResult.totalProfit,
      averageProfitMargin:
        summaryResult.profitAnalysisSales > 0
          ? Number(
              (
                (summaryResult.totalProfit /
                  summaryResult.profitAnalysisSales) *
                100
              ).toFixed(2),
            )
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
