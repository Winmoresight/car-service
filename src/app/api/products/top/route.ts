/**
 * Top Products API
 * GET /api/products/top - ดึงสินค้าขายดี/กำไรดี
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse, TopProduct } from "@/types/api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);
    const sortBy = searchParams.get("sortBy") || "sales"; // 'sales' or 'profit'

    const orderByColumn = sortBy === "profit" ? "total_profit" : "total_sales";

    const query = `
      SELECT TOP (@limit)
        NameProduct as name,
        ISNULL(SUM(NumProduct), 0) as quantity,
        ISNULL(SUM(SumPrice), 0) as total_sales,
        ISNULL(SUM(SumProfit), 0) as total_profit
      FROM dbo.DetailSalePost
      GROUP BY NameProduct
      HAVING ISNULL(SUM(SumPrice), 0) > 0
      ORDER BY ${orderByColumn} DESC
    `;

    const results = await executeQuery<{
      name: string;
      quantity: number;
      total_sales: number;
      total_profit: number;
    }>(query, { limit });

    // คำนวณ profit margin
    const topProducts: TopProduct[] = results.map((row) => ({
      name: row.name,
      sales: row.total_sales,
      profit: row.total_profit,
      quantity: row.quantity,
      profitMargin:
        row.total_sales > 0
          ? Number(((row.total_profit / row.total_sales) * 100).toFixed(2))
          : 0,
    }));

    const response: ApiResponse<TopProduct[]> = {
      success: true,
      data: topProducts,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Top products API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch top products",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
