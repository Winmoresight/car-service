/**
 * Loss Products API
 * GET /api/products/loss - ดึงรายการสินค้าที่ขาดทุน
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse, LossProduct } from "@/types/api";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "10", 10);

    const query = `
      SELECT TOP (@limit)
        NameProduct as name,
        ISNULL(SUM(NumProduct), 0) as quantity,
        ISNULL(SUM(SumPrice), 0) as total_sales,
        ISNULL(SUM(SumProfit), 0) as total_profit
      FROM dbo.DetailSalePost
      GROUP BY NameProduct
      HAVING ISNULL(SUM(SumProfit), 0) < 0
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
