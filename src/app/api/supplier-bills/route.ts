/**
 * Supplier Bills API
 * GET /api/supplier-bills - รายการบิล/ใบสั่งซื้อจากคู่ค้า
 */

import type { NextRequest } from "next/server";
import { handleApiError, successResponse, withTimeout } from "@/lib/api-utils";
import { executeQuery } from "@/lib/db";
import type {
  SupplierBill,
  SupplierBillPaymentState,
  SupplierBillsPayload,
  SupplierBillsSummary,
} from "@/types/api";

const masterTableCandidates = [
  "MasterPrintOrderBuyProduct",
  "MasterPrintOderBuyProduct",
] as const;

const detailTableCandidates = [
  "DetailPrintOrderBuyProduct",
  "DetailPrintOderBuyProduct",
] as const;

interface SupplierBillRow {
  date: Date | null;
  documentNo: string | null;
  supplierCode: string | null;
  supplierName: string | null;
  discount: number | string | null;
  resultAmount: number | string | null;
  productDiscount: number | string | null;
  totalPrice: number | string | null;
  status: string | null;
  createdBy: string | null;
  checkIn: string | null;
}

interface SupplierBillDetailSummaryRow {
  documentNo: string | null;
  itemCount: number;
  detailTotal: number | string | null;
}

const zeroSummary: SupplierBillsSummary = {
  billCount: 0,
  supplierCount: 0,
  totalAmount: 0,
  paidCount: 0,
  paidAmount: 0,
  unpaidCount: 0,
  unpaidAmount: 0,
  unknownStatusCount: 0,
  detailItemCount: 0,
};

function quoteIdentifier(identifier: string) {
  return `[${identifier.replaceAll("]", "]]")}]`;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMoney(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Number(number.toFixed(2));
}

function getSafeMoneyExpression(columnName: string) {
  const quotedColumn = quoteIdentifier(columnName);
  const textExpression = `CONVERT(nvarchar(100), ${quotedColumn})`;

  return `ISNULL(CONVERT(money, CASE WHEN ${quotedColumn} IS NULL THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

function getPaymentState(
  status: string,
  checkIn: string,
): {
  paymentState: SupplierBillPaymentState;
  paymentLabel: string;
} {
  const combined = `${status} ${checkIn}`.trim();
  const normalized = combined.toLowerCase();

  if (!combined) {
    return { paymentState: "unknown", paymentLabel: "ไม่ระบุ" };
  }

  if (
    normalized.includes("ค้าง") ||
    normalized.includes("ยังไม่") ||
    normalized.includes("ไม่จ่าย") ||
    normalized.includes("unpaid") ||
    normalized.includes("pending")
  ) {
    return { paymentState: "unpaid", paymentLabel: status || "ยังไม่จ่าย" };
  }

  if (
    normalized.includes("จ่าย") ||
    normalized.includes("ชำระ") ||
    normalized.includes("paid") ||
    normalized.includes("complete") ||
    normalized.includes("done")
  ) {
    return { paymentState: "paid", paymentLabel: status || "จ่ายแล้ว" };
  }

  return { paymentState: "unknown", paymentLabel: status || checkIn };
}

async function resolveTable(candidates: readonly string[]) {
  const rows = await executeQuery<{ tableName: string }>(
    `
      SELECT TABLE_NAME as tableName
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
        AND (TABLE_NAME = @firstTable OR TABLE_NAME = @secondTable)
      ORDER BY
        CASE
          WHEN TABLE_NAME = @firstTable THEN 0
          WHEN TABLE_NAME = @secondTable THEN 1
          ELSE 2
        END
    `,
    {
      firstTable: candidates[0],
      secondTable: candidates[1],
    },
    false,
  );

  return rows[0]?.tableName ?? null;
}

async function getDetailSummary(detailTable: string | null) {
  if (!detailTable) {
    return new Map<string, { itemCount: number; detailTotal: number }>();
  }

  try {
    const rows = await executeQuery<SupplierBillDetailSummaryRow>(
      `
        SELECT
          NumberPrintPost as documentNo,
          COUNT(*) as itemCount,
          ISNULL(SUM(${getSafeMoneyExpression("SumPrice")}), 0) as detailTotal
        FROM dbo.${quoteIdentifier(detailTable)}
        GROUP BY NumberPrintPost
      `,
      undefined,
      false,
    );

    return new Map(
      rows
        .filter((row) => normalizeText(row.documentNo))
        .map((row) => [
          normalizeText(row.documentNo),
          {
            itemCount: Number(row.itemCount) || 0,
            detailTotal: normalizeMoney(row.detailTotal),
          },
        ]),
    );
  } catch (error) {
    console.warn(`Supplier bill detail summary failed:`, error);
    return new Map<string, { itemCount: number; detailTotal: number }>();
  }
}

function buildSummary(items: SupplierBill[]): SupplierBillsSummary {
  const supplierKeys = new Set<string>();

  return items.reduce<SupplierBillsSummary>(
    (summary, item) => {
      const supplierKey = item.supplierCode || item.supplierName;

      if (supplierKey) {
        supplierKeys.add(supplierKey);
      }

      summary.billCount += 1;
      summary.totalAmount += item.totalPrice;
      summary.detailItemCount += item.itemCount;

      if (item.paymentState === "paid") {
        summary.paidCount += 1;
        summary.paidAmount += item.totalPrice;
      } else if (item.paymentState === "unpaid") {
        summary.unpaidCount += 1;
        summary.unpaidAmount += item.totalPrice;
      } else {
        summary.unknownStatusCount += 1;
      }

      summary.supplierCount = supplierKeys.size;

      return summary;
    },
    { ...zeroSummary },
  );
}

export async function GET(request: NextRequest) {
  try {
    const data = await withTimeout(async (): Promise<SupplierBillsPayload> => {
      const searchParams = request.nextUrl.searchParams;
      const rawLimit = Number.parseInt(searchParams.get("limit") || "500", 10);
      const limit = Number.isFinite(rawLimit)
        ? Math.min(Math.max(rawLimit, 1), 1000)
        : 500;
      const q = normalizeText(searchParams.get("q"));
      const sourceTable = await resolveTable(masterTableCandidates);
      const detailTable = await resolveTable(detailTableCandidates);

      if (!sourceTable) {
        return {
          sourceTable: null,
          detailTable,
          items: [],
          summary: zeroSummary,
        };
      }

      const detailSummary = await getDetailSummary(detailTable);
      const rows = await executeQuery<SupplierBillRow>(
        `
          SELECT TOP (@limit)
            DatePost as date,
            NumberPrintPost as documentNo,
            CodeCompany as supplierCode,
            NameCompany as supplierName,
            ISNULL(ReducePrice, 0) as discount,
            ISNULL(Result, 0) as resultAmount,
            ISNULL(Reduceproduct, 0) as productDiscount,
            ISNULL(TotalPrice, 0) as totalPrice,
            ISNULL(Status, '') as status,
            ISNULL(NameUser, '') as createdBy,
            ISNULL(CheckIn, '') as checkIn
          FROM dbo.${quoteIdentifier(sourceTable)}
          WHERE
            @q = N''
            OR NumberPrintPost LIKE N'%' + @q + N'%'
            OR CodeCompany LIKE N'%' + @q + N'%'
            OR NameCompany LIKE N'%' + @q + N'%'
            OR Status LIKE N'%' + @q + N'%'
          ORDER BY DatePost DESC, NumberPrintPost DESC
        `,
        { limit, q },
        false,
      );

      const items: SupplierBill[] = rows.map((row, index) => {
        const documentNo = normalizeText(row.documentNo);
        const status = normalizeText(row.status);
        const checkIn = normalizeText(row.checkIn);
        const detail = detailSummary.get(documentNo);
        const payment = getPaymentState(status, checkIn);

        return {
          id: documentNo || `${normalizeText(row.supplierCode)}-${index}`,
          date: row.date ? new Date(row.date).toISOString() : null,
          documentNo,
          supplierCode: normalizeText(row.supplierCode),
          supplierName: normalizeText(row.supplierName),
          discount: normalizeMoney(row.discount),
          productDiscount: normalizeMoney(row.productDiscount),
          resultAmount: normalizeMoney(row.resultAmount),
          totalPrice: normalizeMoney(row.totalPrice),
          status,
          checkIn,
          createdBy: normalizeText(row.createdBy),
          itemCount: detail?.itemCount ?? 0,
          detailTotal: detail?.detailTotal ?? 0,
          ...payment,
        };
      });

      return {
        sourceTable,
        detailTable,
        items,
        summary: buildSummary(items),
      };
    }, 60000);

    return successResponse(data);
  } catch (error) {
    return handleApiError(error, "Supplier bills API error");
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
