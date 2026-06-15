/**
 * Cancelled Sale Bills API
 * GET /api/tax-invoices/cancelled - ดึงรายการบิลขายหลักที่ถูกยกเลิก
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface CancelledSaleBill {
  numberPrint: string;
  date: string;
  customerName: string;
  nameCar: string;
  cash: number;
  transfer: number;
  totalPrice: number;
  userName: string;
}

interface CancelledSummary {
  totalCancelled: number;
  totalAmount: number;
  totalCash: number;
  totalTransfer: number;
}

function getSafeMoneyExpression(valueExpression: string) {
  const textExpression = `CONVERT(nvarchar(100), ${valueExpression})`;

  return `ISNULL(CONVERT(money, CASE WHEN ${valueExpression} IS NULL THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const conditions = ["LTRIM(RTRIM(ISNULL(Status, ''))) LIKE N'%ยกเลิก%'"];

    if (startDate) {
      conditions.push("CONVERT(date, DateSalePost) >= @startDate");
    }

    if (endDate) {
      conditions.push("CONVERT(date, DateSalePost) <= @endDate");
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const query = `
      WITH PaginatedData AS (
        SELECT
          NumberPrintSalePost as numberPrint,
          DateSalePost as date,
          ISNULL(NameCustomer, N'ไม่ระบุ') as customerName,
          ISNULL(NameCar, '') as nameCar,
          ${getSafeMoneyExpression("Cash")} as cash,
          ${getSafeMoneyExpression("Transfer")} as transfer,
          ${getSafeMoneyExpression("TotalPrice")} as totalPrice,
          ISNULL(NameSave, '') as userName,
          ROW_NUMBER() OVER (
            ORDER BY DateSalePost DESC, NumberPrintSalePost DESC
          ) as RowNum
        FROM dbo.MasterSalePost
        ${whereClause}
      )
      SELECT
        numberPrint,
        date,
        customerName,
        nameCar,
        cash,
        transfer,
        totalPrice,
        userName
      FROM PaginatedData
      WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
      ORDER BY RowNum
    `;

    const params = {
      limit,
      offset,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    const results = await executeQuery<{
      numberPrint: string;
      date: Date;
      customerName: string;
      nameCar: string;
      cash: number;
      transfer: number;
      totalPrice: number;
      userName: string;
    }>(query, params);

    const cancelledBills: CancelledSaleBill[] = results.map((row) => ({
      numberPrint: row.numberPrint,
      date: new Date(row.date).toISOString(),
      customerName: row.customerName,
      nameCar: row.nameCar,
      cash: Number(row.cash) || 0,
      transfer: Number(row.transfer) || 0,
      totalPrice: Number(row.totalPrice) || 0,
      userName: row.userName,
    }));

    const [summaryResult] = await executeQuery<{
      totalCancelled: number;
      totalAmount: number;
      totalCash: number;
      totalTransfer: number;
    }>(
      `
        SELECT
          COUNT(*) as totalCancelled,
          ISNULL(SUM(${getSafeMoneyExpression("TotalPrice")}), 0) as totalAmount,
          ISNULL(SUM(${getSafeMoneyExpression("Cash")}), 0) as totalCash,
          ISNULL(SUM(${getSafeMoneyExpression("Transfer")}), 0) as totalTransfer
        FROM dbo.MasterSalePost
        ${whereClause}
      `,
      params,
    );

    const summary: CancelledSummary = {
      totalCancelled: summaryResult?.totalCancelled || 0,
      totalAmount: summaryResult?.totalAmount || 0,
      totalCash: summaryResult?.totalCash || 0,
      totalTransfer: summaryResult?.totalTransfer || 0,
    };

    const response: ApiResponse<{
      data: CancelledSaleBill[];
      summary: CancelledSummary;
      limit: number;
      offset: number;
    }> = {
      success: true,
      data: {
        data: cancelledBills,
        summary,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Cancelled Sale Bills API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cancelled sale bill data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
