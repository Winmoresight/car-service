/**
 * Loss Products API
 * GET /api/products/loss - ดึงรายการสินค้าที่ขาดทุน
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { getProductAnalyticsSqlConfig } from "@/lib/product-analytics-policy";
import type { ApiResponse, LossProduct } from "@/types/api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const analyticsSql = await getProductAnalyticsSqlConfig("sales", "loss");

    const query = `
      SELECT TOP (@limit)
        sales.NameProduct as name,
        ISNULL(SUM(sales.NumProduct), 0) as quantity,
        ISNULL(SUM(sales.SumPrice), 0) as total_sales,
        ISNULL(SUM(sales.SumProfit), 0) as total_profit
      FROM dbo.DetailSalePost sales
      ${analyticsSql.joins}
      WHERE ${analyticsSql.includeInProfitAnalysisExpression} = 1
      GROUP BY sales.NameProduct
      HAVING ISNULL(SUM(sales.SumProfit), 0) < 0
      ORDER BY total_profit ASC
    `;

    const results = await executeQuery<{
      name: string;
      quantity: number;
      total_sales: number;
      total_profit: number;
    }>(query, { limit });

    const lossProducts: LossProduct[] = results.map((row) => ({
      name: row.name,
      sales: row.total_sales,
      profit: row.total_profit,
      quantity: row.quantity,
    }));

    const response: ApiResponse<LossProduct[]> = {
      success: true,
      data: lossProducts,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Loss products API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch loss products",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
