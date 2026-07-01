/**
 * Receivable Payments API
 * GET /api/tax-invoices/payments - รายการลูกหนี้ที่รับชำระในแต่ละวัน
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface ReceivablePayment {
  id: string;
  paidAt: string;
  numberPrint: string;
  customerCode: string;
  customerName: string;
  nameCar: string;
  province: string;
  paidAmount: number;
  totalPrice: number;
  paymentMethod: "cash" | "transfer";
  nameBank: string;
  createdBy: string;
  source: "web" | "legacy";
}

interface ReceivablePaymentSummary {
  count: number;
  total: number;
  cash: number;
  transfer: number;
}

function getSafeMoneyExpression(valueExpression: string) {
  const textExpression = `CONVERT(nvarchar(100), ${valueExpression})`;

  return `ISNULL(CONVERT(money, CASE WHEN ${valueExpression} IS NULL THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

function getDateCondition(date: string) {
  return date ? "@selectedDate" : "CONVERT(date, GETDATE())";
}

function buildBaseCte(dateCondition: string) {
  return `
    WITH legacy_payments AS (
      SELECT
        CAST('legacy-' + ISNULL(r.NumberPrintPost, '') + '-' + CONVERT(nvarchar(30), r.DatePost, 121) AS nvarchar(100)) as id,
        r.DatePost as paidAt,
        r.NumberPrintPost as numberPrint,
        ISNULL(r.CodeCustomer, ISNULL(m.CodeCustomer, '')) as customerCode,
        ISNULL(r.NameCustomer, ISNULL(m.NameCustomer, N'ไม่ระบุ')) as customerName,
        ISNULL(m.NameCar, '') as nameCar,
        ISNULL(m.Province, '') as province,
        CASE
          WHEN ${getSafeMoneyExpression("r.PayMoney")} - ISNULL(previous_payment.previousPayMoney, 0) > 0
            THEN ${getSafeMoneyExpression("r.PayMoney")} - ISNULL(previous_payment.previousPayMoney, 0)
          ELSE ${getSafeMoneyExpression("r.PayMoney")}
        END as paidAmount,
        ${getSafeMoneyExpression("r.TotalPrice")} as totalPrice,
        CASE
          WHEN ${getSafeMoneyExpression("m.Transfer")} > 0
            AND (
              LTRIM(RTRIM(ISNULL(m.NameBank, ''))) <> ''
              OR ${getSafeMoneyExpression("m.Cash")} <= 0
            )
            THEN 'transfer'
          ELSE 'cash'
        END as paymentMethod,
        ISNULL(m.NameBank, '') as nameBank,
        '' as createdBy,
        'legacy' as source
      FROM dbo.MasterRecivePaymentCustomer r
      LEFT JOIN dbo.MasterSalePost m
        ON m.NumberPrintSalePost = r.NumberPrintPost
      OUTER APPLY (
        SELECT TOP 1
          ${getSafeMoneyExpression("previous.PayMoney")} as previousPayMoney
        FROM dbo.MasterRecivePaymentCustomer previous
        WHERE previous.NumberPrintPost = r.NumberPrintPost
          AND previous.DatePost < r.DatePost
        ORDER BY previous.DatePost DESC
      ) previous_payment
      WHERE CONVERT(date, r.DatePost) = ${dateCondition}
        AND m.DateSalePost IS NOT NULL
        AND CONVERT(date, m.DateSalePost) < CONVERT(date, r.DatePost)
        AND ${getSafeMoneyExpression("r.SubMoney")} = 0
        AND ${getSafeMoneyExpression("r.PayMoney")} > 0
    ),
    combined AS (
      SELECT * FROM legacy_payments
    )
  `;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "30", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const selectedDate = searchParams.get("date") || "";
    const dateCondition = getDateCondition(selectedDate);
    const baseCte = buildBaseCte(dateCondition);
    const filters: string[] = ["paidAmount > 0"];

    if (search) {
      filters.push(`(
        numberPrint LIKE @search
        OR customerName LIKE @search
        OR customerCode LIKE @search
        OR nameCar LIKE @search
        OR province LIKE @search
        OR nameBank LIKE @search
      )`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const params = {
      limit,
      offset,
      selectedDate: selectedDate || undefined,
      search: `%${search}%`,
    };

    const rows = await executeQuery<{
      id: string;
      paidAt: Date;
      numberPrint: string;
      customerCode: string;
      customerName: string;
      nameCar: string;
      province: string;
      paidAmount: number;
      totalPrice: number;
      paymentMethod: "cash" | "transfer";
      nameBank: string;
      createdBy: string;
      source: "web" | "legacy";
    }>(
      `
        ${baseCte},
        paginated AS (
          SELECT
            *,
            ROW_NUMBER() OVER (ORDER BY paidAt DESC, numberPrint DESC) as row_number
          FROM combined
          ${whereClause}
        )
        SELECT
          id,
          paidAt,
          numberPrint,
          customerCode,
          customerName,
          nameCar,
          province,
          paidAmount,
          totalPrice,
          paymentMethod,
          nameBank,
          createdBy,
          source
        FROM paginated
        WHERE row_number > @offset AND row_number <= (@offset + @limit)
        ORDER BY row_number
      `,
      params,
    );

    const [countResult] = await executeQuery<{ total: number }>(
      `
        ${baseCte}
        SELECT COUNT(*) as total
        FROM combined
        ${whereClause}
      `,
      params,
    );

    const [summaryResult] = await executeQuery<ReceivablePaymentSummary>(
      `
        ${baseCte}
        SELECT
          COUNT(*) as count,
          ISNULL(SUM(paidAmount), 0) as total,
          ISNULL(
            SUM(CASE WHEN paymentMethod = 'cash' THEN paidAmount ELSE 0 END),
            0
          ) as cash,
          ISNULL(
            SUM(CASE WHEN paymentMethod = 'transfer' THEN paidAmount ELSE 0 END),
            0
          ) as transfer
        FROM combined
        ${whereClause}
      `,
      params,
    );

    const payments: ReceivablePayment[] = rows.map((row) => ({
      id: row.id,
      paidAt: new Date(row.paidAt).toISOString(),
      numberPrint: row.numberPrint,
      customerCode: row.customerCode,
      customerName: row.customerName,
      nameCar: row.nameCar,
      province: row.province,
      paidAmount: Number(row.paidAmount) || 0,
      totalPrice: Number(row.totalPrice) || 0,
      paymentMethod: row.paymentMethod === "transfer" ? "transfer" : "cash",
      nameBank: row.nameBank,
      createdBy: row.createdBy,
      source: row.source === "web" ? "web" : "legacy",
    }));

    const response: ApiResponse<{
      payments: ReceivablePayment[];
      summary: ReceivablePaymentSummary;
      total: number;
      limit: number;
      offset: number;
    }> = {
      success: true,
      data: {
        payments,
        summary: summaryResult ?? {
          count: 0,
          total: 0,
          cash: 0,
          transfer: 0,
        },
        total: countResult?.total || 0,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Receivable payments API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถดึงรายการรับชำระลูกหนี้ได้",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
