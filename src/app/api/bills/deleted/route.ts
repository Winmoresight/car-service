/**
 * Deleted Bills API
 * GET /api/bills/deleted - ดึงรายการบิลที่ถูกลบ/ยกเลิก (จาก MasterSalePost)
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface DeletedBill {
  numberPrint: string;
  originalDate: string;
  customerName: string;
  totalPrice: number;
  totalProfit: number;
  cash: number;
  transfer: number;
  status: string;
  userName: string;
}

interface DeletedSummary {
  totalDeleted: number;
  totalAmount: number;
  periodDays: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const days = Number.parseInt(searchParams.get("days") || "30", 10);

    // Query for deleted/cancelled bills
    // Note: ระบบปัจจุบันอาจไม่มี field สำหรับบิลที่ถูกลบโดยตรง
    // เราจะดูจาก Status หรือ CloseAcc field
    const query = `
      WITH PaginatedData AS (
        SELECT 
          NumberPrintSalePost as numberPrint,
          DateSalePost as originalDate,
          ISNULL(NameCustomer, 'ไม่ระบุ') as customerName,
          ISNULL(TotalPrice, 0) as totalPrice,
          ISNULL(TotalProfit, 0) as totalProfit,
          ISNULL(Cash, 0) as cash,
          ISNULL(Transfer, 0) as transfer,
          ISNULL(Status, '') as status,
          ISNULL(NameSave, '') as userName,
          ROW_NUMBER() OVER (ORDER BY DateSalePost DESC) as RowNum
        FROM dbo.MasterSalePost
        WHERE Status LIKE '%ยกเลิก%'
          AND DateSalePost >= DATEADD(day, -@days, GETDATE())
      )
      SELECT
        numberPrint,
        originalDate,
        customerName,
        totalPrice,
        totalProfit,
        cash,
        transfer,
        status,
        userName
      FROM PaginatedData
      WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
      ORDER BY RowNum
    `;

    const results = await executeQuery<{
      numberPrint: string;
      originalDate: Date;
      customerName: string;
      totalPrice: number;
      totalProfit: number;
      cash: number;
      transfer: number;
      status: string;
      userName: string;
    }>(query, {
      limit,
      offset,
      days,
    });

    const deletedBills: DeletedBill[] = results.map((row) => ({
      numberPrint: row.numberPrint,
      originalDate: new Date(row.originalDate).toISOString(),
      customerName: row.customerName,
      totalPrice: row.totalPrice,
      totalProfit: row.totalProfit,
      cash: row.cash,
      transfer: row.transfer,
      status: row.status,
      userName: row.userName,
    }));

    // Get summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as totalDeleted,
        ISNULL(SUM(TotalPrice), 0) as totalAmount
      FROM dbo.MasterSalePost
      WHERE Status LIKE '%ยกเลิก%'
        AND DateSalePost >= DATEADD(day, -@days, GETDATE())
    `;

    const [summaryResult] = await executeQuery<{
      totalDeleted: number;
      totalAmount: number;
    }>(summaryQuery, { days });

    const summary: DeletedSummary = {
      totalDeleted: summaryResult.totalDeleted,
      totalAmount: summaryResult.totalAmount,
      periodDays: days,
    };

    const response: ApiResponse<{
      data: DeletedBill[];
      summary: DeletedSummary;
      limit: number;
      offset: number;
    }> = {
      success: true,
      data: {
        data: deletedBills,
        summary,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Deleted Bills API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch deleted bills",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
