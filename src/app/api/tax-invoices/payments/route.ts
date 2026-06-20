/**
 * Receivable Payments API
 * GET /api/tax-invoices/payments - รายการลูกหนี้ที่รับชำระในแต่ละวัน
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { receivablePaymentLogTableExists } from "@/lib/receivable-payment-log";
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

function buildBaseCte(hasWebLog: boolean, dateCondition: string) {
  const webPayments = hasWebLog
    ? `
      web_payments AS (
        SELECT
          CAST(p.ID AS nvarchar(50)) as id,
          p.PaidAt as paidAt,
          p.NumberPrintSalePost as numberPrint,
          ISNULL(p.CodeCustomer, ISNULL(m.CodeCustomer, '')) as customerCode,
          ISNULL(p.NameCustomer, ISNULL(m.NameCustomer, N'ไม่ระบุ')) as customerName,
          ISNULL(p.NameCar, ISNULL(m.NameCar, '')) as nameCar,
          ISNULL(p.Province, ISNULL(m.Province, '')) as province,
          ${getSafeMoneyExpression("p.PaidAmount")} as paidAmount,
          ${getSafeMoneyExpression("m.TotalPrice")} as totalPrice,
          CASE
            WHEN LTRIM(RTRIM(ISNULL(p.PaymentMethod, ''))) = 'transfer'
              THEN 'transfer'
            ELSE 'cash'
          END as paymentMethod,
          ISNULL(p.NameBank, ISNULL(m.NameBank, '')) as nameBank,
          ISNULL(p.CreatedBy, '') as createdBy,
          'web' as source
        FROM dbo.WebReceivablePayments p
        INNER JOIN dbo.MasterSalePost m
          ON m.NumberPrintSalePost = p.NumberPrintSalePost
        WHERE CONVERT(date, p.PaidAt) = ${dateCondition}
          AND m.DateSalePost IS NOT NULL
          AND CONVERT(date, m.DateSalePost) < CONVERT(date, p.PaidAt)
      ),
    `
    : `
      web_payments AS (
        SELECT
          CAST(NULL AS nvarchar(50)) as id,
          CAST(NULL AS datetime) as paidAt,
          CAST(NULL AS nvarchar(30)) as numberPrint,
          CAST(NULL AS nvarchar(30)) as customerCode,
          CAST(NULL AS nvarchar(200)) as customerName,
          CAST(NULL AS nvarchar(100)) as nameCar,
          CAST(NULL AS nvarchar(100)) as province,
          CAST(0 AS money) as paidAmount,
          CAST(0 AS money) as totalPrice,
          CAST('cash' AS nvarchar(20)) as paymentMethod,
          CAST(NULL AS nvarchar(250)) as nameBank,
          CAST(NULL AS nvarchar(100)) as createdBy,
          CAST('web' AS nvarchar(20)) as source
        WHERE 1 = 0
      ),
    `;

  const legacyDedupe = hasWebLog
    ? `
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.WebReceivablePayments wp
            WHERE wp.NumberPrintSalePost = r.NumberPrintPost
              AND CONVERT(date, wp.PaidAt) = CONVERT(date, r.DatePost)
          )
    `
    : "";

  return `
    WITH
    ${webPayments}
    legacy_payments AS (
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
        ${legacyDedupe}
    ),
    combined AS (
      SELECT * FROM web_payments
      UNION ALL
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
    const hasWebLog = await receivablePaymentLogTableExists();
    const dateCondition = getDateCondition(selectedDate);
    const baseCte = buildBaseCte(hasWebLog, dateCondition);
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
