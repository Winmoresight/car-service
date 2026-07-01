/**
 * Receivable Payments API
 * GET /api/tax-invoices/payments - รายการลูกหนี้ที่รับชำระในแต่ละวัน
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import {
  buildReceivablePaymentCte,
  getReceivablePaymentSourceConfig,
} from "@/lib/receivable-payment-source";
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

function getDateCondition(date: string) {
  return date ? "@selectedDate" : "CONVERT(date, GETDATE())";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "30", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const selectedDate = searchParams.get("date") || "";
    const dateCondition = getDateCondition(selectedDate);
    const sourceConfig = await getReceivablePaymentSourceConfig();
    const baseCte = buildReceivablePaymentCte(
      sourceConfig,
      (dateExpression) => `CONVERT(date, ${dateExpression}) = ${dateCondition}`,
    );
    const filters: string[] = ["amount > 0"];

    if (search) {
      filters.push(`(
        document_no LIKE @search
        OR customer_name LIKE @search
        OR customer_code LIKE @search
        OR name_car LIKE @search
        OR province LIKE @search
        OR bank_name LIKE @search
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
      paid_at: Date;
      number_print: string;
      customer_code: string;
      customer_name: string;
      name_car: string;
      province: string;
      paid_amount: number;
      total_price: number;
      payment_method: "cash" | "transfer";
      bank_name: string;
      created_by: string;
      source: "web" | "legacy";
    }>(
      `
        ${baseCte},
        paginated AS (
          SELECT
            *,
            ROW_NUMBER() OVER (ORDER BY occurred_at DESC, document_no DESC) as row_number
          FROM combined
          ${whereClause}
        )
        SELECT
          id,
          occurred_at as paid_at,
          document_no as number_print,
          customer_code,
          customer_name,
          name_car,
          province,
          amount as paid_amount,
          total_price,
          payment_method,
          bank_name,
          created_by,
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
          ISNULL(SUM(amount), 0) as total,
          ISNULL(
            SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END),
            0
          ) as cash,
          ISNULL(
            SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END),
            0
          ) as transfer
        FROM combined
        ${whereClause}
      `,
      params,
    );

    const payments: ReceivablePayment[] = rows.map((row) => ({
      id: row.id,
      paidAt: new Date(row.paid_at).toISOString(),
      numberPrint: row.number_print,
      customerCode: row.customer_code,
      customerName: row.customer_name,
      nameCar: row.name_car,
      province: row.province,
      paidAmount: Number(row.paid_amount) || 0,
      totalPrice: Number(row.total_price) || 0,
      paymentMethod: row.payment_method === "transfer" ? "transfer" : "cash",
      nameBank: row.bank_name,
      createdBy: row.created_by,
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
