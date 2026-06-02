/**
 * Stock API
 * GET /api/stock - ดึงข้อมูลสต็อกและการเคลื่อนไหว
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface StockItem {
  barCode: string;
  name: string;
  currentStock: number;
  lastUpdate: string;
  movements: number; // จำนวนครั้งที่เคลื่อนไหว
}

interface StockMovement {
  barCode: string;
  name: string;
  date: string;
  type: "in" | "out";
  quantity: number;
  stock: number;
  company?: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "summary"; // 'summary' or 'movements'
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);

    if (type === "movements") {
      // Get recent stock movements
      const query = `
        SELECT TOP (@limit)
          BarCode as barCode,
          NameProduct as name,
          DateSave as date,
          CASE 
            WHEN Debit > 0 THEN 'in'
            WHEN Credit > 0 THEN 'out'
            ELSE 'in'
          END as type,
          CASE 
            WHEN Debit > 0 THEN Debit
            WHEN Credit > 0 THEN Credit
            ELSE 0
          END as quantity,
          Stock as stock,
          NameCompany as company
        FROM dbo.INOUTStockProduct
        ORDER BY DateSave DESC
      `;

      const movements = await executeQuery<{
        barCode: string;
        name: string;
        date: Date;
        type: "in" | "out";
        quantity: number;
        stock: number;
        company: string;
      }>(query, { limit });

      const stockMovements: StockMovement[] = movements.map((row) => ({
        barCode: row.barCode,
        name: row.name,
        date: new Date(row.date).toISOString(),
        type: row.type,
        quantity: row.quantity,
        stock: row.stock,
        company: row.company,
      }));

      const response: ApiResponse<StockMovement[]> = {
        success: true,
        data: stockMovements,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response);
    }

    // Get stock summary
    const query = `
      SELECT 
        BarCode as barCode,
        NameProduct as name,
        Stock as currentStock,
        MAX(DateSave) as lastUpdate,
        COUNT(*) as movements
      FROM dbo.INOUTStockProduct
      GROUP BY BarCode, NameProduct, Stock
      ORDER BY movements DESC
      OFFSET 0 ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const results = await executeQuery<{
      barCode: string;
      name: string;
      currentStock: number;
      lastUpdate: Date;
      movements: number;
    }>(query, { limit });

    const stockItems: StockItem[] = results.map((row) => ({
      barCode: row.barCode,
      name: row.name,
      currentStock: row.currentStock,
      lastUpdate: new Date(row.lastUpdate).toISOString(),
      movements: row.movements,
    }));

    const response: ApiResponse<StockItem[]> = {
      success: true,
      data: stockItems,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Stock API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stock data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
