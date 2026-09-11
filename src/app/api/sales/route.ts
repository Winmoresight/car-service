/**
 * Sales API
 * GET /api/sales - ดึงรายการบิลขายพร้อมสรุปยอดตามตัวกรอง
 */

import { type NextRequest, NextResponse } from "next/server";
import { ensureBillDepositPaymentTable } from "@/lib/bill-deposit-payment";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface SaleItem {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  totalPrice: number;
  totalProfit: number;
  cash: number;
  transfer: number;
  deposits: number;
  receivableAmount: number;
  status: string;
  itemCount: number;
}

interface SalesSummary {
  totalSales: number;
  totalProfit: number;
  totalCash: number;
  totalTransfer: number;
  totalDeposits: number;
  totalReceivable: number;
}

type SalesStatusFilter = "all" | "cash" | "transfer" | "unpaid";

function getSafeMoneyExpression(valueExpression: string) {
  const textExpression = `CONVERT(nvarchar(100), ${valueExpression})`;

  return `ISNULL(CONVERT(money, CASE WHEN ${valueExpression} IS NULL THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

function buildSalesConditions({
  search,
  startDate,
  endDate,
  status,
}: {
  search: string;
  startDate: string;
  endDate: string;
  status: SalesStatusFilter;
}) {
  const conditions: string[] = [];

  if (search) {
    conditions.push(
      `(m.NumberPrintSalePost LIKE @search OR m.NameCustomer LIKE @search)`,
    );
  }

  if (startDate) {
    conditions.push("CONVERT(date, m.DateSalePost) >= @startDate");
  }

  if (endDate) {
    conditions.push("CONVERT(date, m.DateSalePost) <= @endDate");
  }

  if (status === "cash") {
    conditions.push("ISNULL(m.Cash, 0) > 0");
  } else if (status === "transfer") {
    conditions.push(`(
      ISNULL(m.Transfer, 0) > 0
      OR EXISTS (
        SELECT 1
        FROM dbo.DetailSalePost transferDeposit
        WHERE transferDeposit.NumberPrintSalePost = m.NumberPrintSalePost
          AND transferDeposit.NameProduct LIKE N'%มัดจำ%'
          AND transferDeposit.NameProduct LIKE N'%เงินโอน%'
          AND ISNULL(transferDeposit.SumPrice, 0) < 0
      )
      OR EXISTS (
        SELECT 1
        FROM dbo.WebBillDepositPayments savedDeposit
        WHERE savedDeposit.BillNo = m.NumberPrintSalePost
          AND savedDeposit.PaymentMethod = N'transfer'
          AND savedDeposit.Amount > 0
      )
    )`);
  } else if (status === "unpaid") {
    conditions.push("LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ค้างชำระ'");
  }

  return conditions;
}

export async function GET(request: NextRequest) {
  try {
    await ensureBillDepositPaymentTable();

    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const statusParam = searchParams.get("status") || "all";
    const status: SalesStatusFilter =
      statusParam === "cash" ||
      statusParam === "transfer" ||
      statusParam === "unpaid"
        ? statusParam
        : "all";

    // Build query
    const conditions = buildSalesConditions({
      search,
      startDate,
      endDate,
      status,
    });

    let query = `
      WITH DetailFinancials AS (
        SELECT
          NumberPrintSalePost,
          ISNULL(SUM(CASE WHEN ${getSafeMoneyExpression("SumPrice")} > 0 THEN ${getSafeMoneyExpression("SumPrice")} ELSE 0 END), 0) as grossPositiveTotal,
          ISNULL(SUM(${getSafeMoneyExpression("SumPrice")}), 0) as netDetailTotal,
          ISNULL(SUM(CASE WHEN ${getSafeMoneyExpression("SumPrice")} < 0 AND NameProduct LIKE N'%มัดจำ%' THEN ABS(${getSafeMoneyExpression("SumPrice")}) ELSE 0 END), 0) as legacyDepositAmount,
          ISNULL(SUM(CASE WHEN ${getSafeMoneyExpression("SumPrice")} < 0 AND NameProduct LIKE N'%มัดจำ%' AND NameProduct LIKE N'%เงินสด%' THEN ABS(${getSafeMoneyExpression("SumPrice")}) ELSE 0 END), 0) as legacyCashDepositAmount,
          ISNULL(SUM(CASE WHEN ${getSafeMoneyExpression("SumPrice")} < 0 AND NameProduct LIKE N'%มัดจำ%' AND NameProduct LIKE N'%เงินโอน%' THEN ABS(${getSafeMoneyExpression("SumPrice")}) ELSE 0 END), 0) as legacyTransferDepositAmount
        FROM dbo.DetailSalePost
        GROUP BY NumberPrintSalePost
      ),
      LatestReceivables AS (
        SELECT
          NumberPrintPost,
          ${getSafeMoneyExpression("SubMoney")} as outstandingAmount,
          ROW_NUMBER() OVER (
            PARTITION BY NumberPrintPost
            ORDER BY DatePost DESC
          ) as latestRow
        FROM dbo.MasterRecivePaymentCustomer
      ),
      PaginatedData AS (
        SELECT 
          m.NumberPrintSalePost as id,
          m.DateSalePost as date,
          ISNULL(m.NameCustomer, 'ไม่ระบุ') as customerName,
          ISNULL(c.PhoneCustomer, '') as customerPhone,
          CASE
            WHEN ISNULL(financials.legacyDepositAmount, 0) > 0
              AND ABS(ISNULL(financials.netDetailTotal, 0) - ${getSafeMoneyExpression("m.TotalPrice")}) < 0.01
              THEN ISNULL(financials.grossPositiveTotal, ${getSafeMoneyExpression("m.TotalPrice")})
            ELSE ${getSafeMoneyExpression("m.TotalPrice")}
          END as totalPrice,
          m.TotalProfit as totalProfit,
          ${getSafeMoneyExpression("m.Cash")} + CASE WHEN depositPayment.BillNo IS NULL THEN ISNULL(financials.legacyCashDepositAmount, 0) ELSE 0 END as cash,
          ${getSafeMoneyExpression("m.Transfer")} + CASE WHEN depositPayment.BillNo IS NULL THEN ISNULL(financials.legacyTransferDepositAmount, 0) ELSE 0 END as transfer,
          CASE
            WHEN ${getSafeMoneyExpression("m.Deposits")} > 0
              THEN ${getSafeMoneyExpression("m.Deposits")}
            ELSE ISNULL(financials.legacyDepositAmount, 0)
          END as deposits,
          CASE
            WHEN LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ค้างชำระ'
              THEN CASE
                WHEN receivable.NumberPrintPost IS NOT NULL
                  THEN receivable.outstandingAmount
                WHEN ISNULL(financials.legacyDepositAmount, 0) > 0
                  AND ABS(ISNULL(financials.netDetailTotal, 0) - ${getSafeMoneyExpression("m.TotalPrice")}) < 0.01
                  THEN CASE
                    WHEN ${getSafeMoneyExpression("m.TotalPrice")} - ${getSafeMoneyExpression("m.Cash")} - ${getSafeMoneyExpression("m.Transfer")} > 0
                      THEN ${getSafeMoneyExpression("m.TotalPrice")} - ${getSafeMoneyExpression("m.Cash")} - ${getSafeMoneyExpression("m.Transfer")}
                    ELSE 0
                  END
                WHEN ${getSafeMoneyExpression("m.TotalPrice")} - ${getSafeMoneyExpression("m.Cash")} - ${getSafeMoneyExpression("m.Transfer")} - ${getSafeMoneyExpression("m.Deposits")} > 0
                  THEN ${getSafeMoneyExpression("m.TotalPrice")} - ${getSafeMoneyExpression("m.Cash")} - ${getSafeMoneyExpression("m.Transfer")} - ${getSafeMoneyExpression("m.Deposits")}
                ELSE 0
              END
            ELSE 0
          END as receivableAmount,
          LTRIM(RTRIM(ISNULL(m.Status, ''))) as status,
          (SELECT COUNT(*) FROM dbo.DetailSalePost WHERE NumberPrintSalePost = m.NumberPrintSalePost) as itemCount,
          ROW_NUMBER() OVER (ORDER BY m.DateSalePost DESC) as RowNum
        FROM dbo.MasterSalePost m
        LEFT JOIN dbo.Customer c ON m.CodeCustomer = c.CodeCustomer
        LEFT JOIN dbo.WebBillDepositPayments depositPayment
          ON depositPayment.BillNo = m.NumberPrintSalePost
        LEFT JOIN DetailFinancials financials
          ON financials.NumberPrintSalePost = m.NumberPrintSalePost
        LEFT JOIN LatestReceivables receivable
          ON receivable.NumberPrintPost = m.NumberPrintSalePost
          AND receivable.latestRow = 1
    `;

    // Build WHERE clause
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += `
      )
      SELECT
        id,
        date,
        customerName,
        customerPhone,
        totalPrice,
        totalProfit,
        cash,
        transfer,
        deposits,
        receivableAmount,
        status,
        itemCount
      FROM PaginatedData
      WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
      ORDER BY RowNum
    `;

    const results = await executeQuery<{
      id: string;
      date: Date;
      customerName: string;
      customerPhone: string;
      totalPrice: number;
      totalProfit: number;
      cash: number;
      transfer: number;
      deposits: number;
      receivableAmount: number;
      status: string;
      itemCount: number;
    }>(query, {
      limit,
      offset,
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    // Return data without masking
    const sales: SaleItem[] = results.map((row) => ({
      id: row.id,
      date: new Date(row.date).toISOString(),
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      totalPrice: row.totalPrice,
      totalProfit: row.totalProfit,
      cash: row.cash,
      transfer: row.transfer,
      deposits: row.deposits,
      receivableAmount: row.receivableAmount,
      status: row.status,
      itemCount: row.itemCount,
    }));

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM dbo.MasterSalePost m`;

    if (conditions.length > 0) {
      countQuery += ` WHERE ${conditions.join(" AND ")}`;
    }

    const [countResult] = await executeQuery<{ total: number }>(countQuery, {
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    // Get sales summary with the same filters as the list above
    let summaryQuery = `
      SELECT
        ISNULL(SUM(
          CASE
            WHEN ISNULL(financials.legacyDepositAmount, 0) > 0
              AND ABS(ISNULL(financials.netDetailTotal, 0) - ${getSafeMoneyExpression("m.TotalPrice")}) < 0.01
              THEN ISNULL(financials.grossPositiveTotal, ${getSafeMoneyExpression("m.TotalPrice")})
            ELSE ${getSafeMoneyExpression("m.TotalPrice")}
          END
        ), 0) as totalSales,
        ISNULL(SUM(m.TotalProfit), 0) as totalProfit,
        ISNULL(SUM(
          ${getSafeMoneyExpression("m.Cash")}
          + CASE
              WHEN depositPayment.BillNo IS NULL
                THEN ISNULL(financials.legacyCashDepositAmount, 0)
              ELSE 0
            END
        ), 0) as totalCash,
        ISNULL(SUM(
          ${getSafeMoneyExpression("m.Transfer")}
          + CASE
              WHEN depositPayment.BillNo IS NULL
                THEN ISNULL(financials.legacyTransferDepositAmount, 0)
              ELSE 0
            END
        ), 0) as totalTransfer,
        ISNULL(SUM(CASE WHEN ${getSafeMoneyExpression("m.Deposits")} > 0 THEN ${getSafeMoneyExpression("m.Deposits")} ELSE ISNULL(financials.legacyDepositAmount, 0) END), 0) as totalDeposits,
        ISNULL(
          SUM(
            CASE
              WHEN LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ค้างชำระ'
                THEN CASE
                  WHEN receivable.NumberPrintPost IS NOT NULL
                    THEN receivable.outstandingAmount
                  WHEN ISNULL(financials.legacyDepositAmount, 0) > 0
                    AND ABS(ISNULL(financials.netDetailTotal, 0) - ${getSafeMoneyExpression("m.TotalPrice")}) < 0.01
                    THEN CASE
                      WHEN ${getSafeMoneyExpression("m.TotalPrice")} - ${getSafeMoneyExpression("m.Cash")} - ${getSafeMoneyExpression("m.Transfer")} > 0
                        THEN ${getSafeMoneyExpression("m.TotalPrice")} - ${getSafeMoneyExpression("m.Cash")} - ${getSafeMoneyExpression("m.Transfer")}
                      ELSE 0
                    END
                  WHEN ${getSafeMoneyExpression("m.TotalPrice")} - ${getSafeMoneyExpression("m.Cash")} - ${getSafeMoneyExpression("m.Transfer")} - ${getSafeMoneyExpression("m.Deposits")} > 0
                    THEN ${getSafeMoneyExpression("m.TotalPrice")} - ${getSafeMoneyExpression("m.Cash")} - ${getSafeMoneyExpression("m.Transfer")} - ${getSafeMoneyExpression("m.Deposits")}
                  ELSE 0
                END
              ELSE 0
            END
          ),
          0
        ) as totalReceivable
      FROM dbo.MasterSalePost m
      LEFT JOIN dbo.WebBillDepositPayments depositPayment
        ON depositPayment.BillNo = m.NumberPrintSalePost
      OUTER APPLY (
        SELECT
          ISNULL(SUM(CASE WHEN ${getSafeMoneyExpression("detail.SumPrice")} > 0 THEN ${getSafeMoneyExpression("detail.SumPrice")} ELSE 0 END), 0) as grossPositiveTotal,
          ISNULL(SUM(${getSafeMoneyExpression("detail.SumPrice")}), 0) as netDetailTotal,
          ISNULL(SUM(CASE WHEN ${getSafeMoneyExpression("detail.SumPrice")} < 0 AND detail.NameProduct LIKE N'%มัดจำ%' THEN ABS(${getSafeMoneyExpression("detail.SumPrice")}) ELSE 0 END), 0) as legacyDepositAmount,
          ISNULL(SUM(CASE WHEN ${getSafeMoneyExpression("detail.SumPrice")} < 0 AND detail.NameProduct LIKE N'%มัดจำ%' AND detail.NameProduct LIKE N'%เงินสด%' THEN ABS(${getSafeMoneyExpression("detail.SumPrice")}) ELSE 0 END), 0) as legacyCashDepositAmount,
          ISNULL(SUM(CASE WHEN ${getSafeMoneyExpression("detail.SumPrice")} < 0 AND detail.NameProduct LIKE N'%มัดจำ%' AND detail.NameProduct LIKE N'%เงินโอน%' THEN ABS(${getSafeMoneyExpression("detail.SumPrice")}) ELSE 0 END), 0) as legacyTransferDepositAmount
        FROM dbo.DetailSalePost detail
        WHERE detail.NumberPrintSalePost = m.NumberPrintSalePost
      ) financials
      OUTER APPLY (
        SELECT TOP 1
          r.NumberPrintPost,
          ${getSafeMoneyExpression("r.SubMoney")} as outstandingAmount
        FROM dbo.MasterRecivePaymentCustomer r
        WHERE r.NumberPrintPost = m.NumberPrintSalePost
        ORDER BY r.DatePost DESC
      ) receivable
    `;

    if (conditions.length > 0) {
      summaryQuery += ` WHERE ${conditions.join(" AND ")}`;
    }

    const [summaryResult] = await executeQuery<SalesSummary>(summaryQuery, {
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    const response: ApiResponse<{
      sales: SaleItem[];
      total: number;
      limit: number;
      offset: number;
      summary: SalesSummary;
    }> = {
      success: true,
      data: {
        sales,
        total: countResult.total,
        limit,
        offset,
        summary: {
          totalSales: summaryResult.totalSales,
          totalProfit: summaryResult.totalProfit,
          totalCash: summaryResult.totalCash,
          totalTransfer: summaryResult.totalTransfer,
          totalDeposits: summaryResult.totalDeposits,
          totalReceivable: summaryResult.totalReceivable,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Sales API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sales data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
