/**
 * Cancelled Tax Invoices API
 * GET /api/tax-invoices/cancelled - ดึงรายการใบกำกับภาษีที่ถูกยกเลิก
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface CancelledTaxInvoice {
  numberPrint: string;
  date: string;
  customerName: string;
  nameCar: string;
  subVatePrice: number;
  vatePrice: number;
  totalPrice: number;
  userName: string;
}

interface CancelledSummary {
  totalCancelled: number;
  totalAmount: number;
  totalVat: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Build query for cancelled invoices
    let query = `
      WITH PaginatedData AS (
        SELECT 
          NumberPrintPost as numberPrint,
          DatePost as date,
          ISNULL(NameCustomer, 'ไม่ระบุ') as customerName,
          ISNULL(NameCar, '') as nameCar,
          ISNULL(SubVatePrice, 0) as subVatePrice,
          ISNULL(VatePrice, 0) as vatePrice,
          ISNULL(TotalPrice, 0) as totalPrice,
          ISNULL(NameUser, '') as userName,
          ROW_NUMBER() OVER (ORDER BY DatePost DESC) as RowNum
        FROM dbo.MasterPrintPostVate
        WHERE Status = 'ยกเลิก'
    `;

    // Add date filters
    if (startDate) {
      query += ` AND CONVERT(date, DatePost) >= @startDate`;
    }
    
    if (endDate) {
      query += ` AND CONVERT(date, DatePost) <= @endDate`;
    }

    query += `
      )
      SELECT
        numberPrint,
        date,
        customerName,
        nameCar,
        subVatePrice,
        vatePrice,
        totalPrice,
        userName
      FROM PaginatedData
      WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
      ORDER BY RowNum
    `;

    const results = await executeQuery<{
      numberPrint: string;
      date: Date;
      customerName: string;
      nameCar: string;
      subVatePrice: number;
      vatePrice: number;
      totalPrice: number;
      userName: string;
    }>(query, {
      limit,
      offset,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    const cancelledInvoices: CancelledTaxInvoice[] = results.map((row) => ({
      numberPrint: row.numberPrint,
      date: new Date(row.date).toISOString(),
      customerName: row.customerName,
      nameCar: row.nameCar,
      subVatePrice: row.subVatePrice,
      vatePrice: row.vatePrice,
      totalPrice: row.totalPrice,
      userName: row.userName,
    }));

    // Get summary
    let summaryQuery = `
      SELECT 
        COUNT(*) as totalCancelled,
        ISNULL(SUM(TotalPrice), 0) as totalAmount,
        ISNULL(SUM(VatePrice), 0) as totalVat
      FROM dbo.MasterPrintPostVate
      WHERE Status = 'ยกเลิก'
    `;

    if (startDate) {
      summaryQuery += ` AND CONVERT(date, DatePost) >= @startDate`;
    }
    
    if (endDate) {
      summaryQuery += ` AND CONVERT(date, DatePost) <= @endDate`;
    }

    const [summaryResult] = await executeQuery<{
      totalCancelled: number;
      totalAmount: number;
      totalVat: number;
    }>(summaryQuery, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    const summary: CancelledSummary = {
      totalCancelled: summaryResult.totalCancelled,
      totalAmount: summaryResult.totalAmount,
      totalVat: summaryResult.totalVat,
    };

    const response: ApiResponse<{
      data: CancelledTaxInvoice[];
      summary: CancelledSummary;
      limit: number;
      offset: number;
    }> = {
      success: true,
      data: {
        data: cancelledInvoices,
        summary,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Cancelled Tax Invoices API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cancelled tax invoices",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
