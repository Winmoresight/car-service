/**
 * Supplier Bills API
 * GET /api/supplier-bills - รายการบิล/ใบสั่งซื้อจากคู่ค้า
 */

import type { NextRequest } from "next/server";
import {
  errorResponse,
  handleApiError,
  successResponse,
  withTimeout,
} from "@/lib/api-utils";
import { executeQuery } from "@/lib/db";
import type {
  SupplierBill,
  SupplierBillLineItem,
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

const editableSupplierStatuses = new Set(["ชำระเงินแล้ว", "ค้างชำระ"]);

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
  rowNo: number | string | null;
  orderNo: string | null;
  barcode: string | null;
  name: string | null;
  quantity: number | string | null;
  unit: string | null;
  unitPrice: number | string | null;
  discount: number | string | null;
  itemCount: number;
  detailTotal: number | string | null;
}

interface SupplierBillUpdatePayload {
  documentNo?: unknown;
  status?: unknown;
  totalPrice?: unknown;
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

function normalizeEditableMoney(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Number(number.toFixed(2));
}

function getPaymentLabel(status: string, fallbackLabel: string) {
  const normalizedStatus = status.trim();

  if (normalizedStatus === "ชำระแล้ว" || normalizedStatus === "จ่ายแล้ว") {
    return "ชำระเงินแล้ว";
  }

  if (normalizedStatus === "ยังไม่จ่าย") {
    return "ค้างชำระ";
  }

  return normalizedStatus || fallbackLabel;
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
  const normalizedStatus = status.toLowerCase();
  const combined = `${status} ${checkIn}`.trim();
  const normalized = combined.toLowerCase();

  if (!combined) {
    return { paymentState: "unknown", paymentLabel: "ไม่ระบุ" };
  }

  if (
    normalizedStatus.includes("ค้าง") ||
    normalizedStatus.includes("ยังไม่") ||
    normalizedStatus.includes("ไม่จ่าย") ||
    normalizedStatus.includes("unpaid") ||
    normalizedStatus.includes("pending")
  ) {
    return {
      paymentState: "unpaid",
      paymentLabel: getPaymentLabel(status, "ค้างชำระ"),
    };
  }

  if (
    normalizedStatus.includes("จ่าย") ||
    normalizedStatus.includes("ชำระ") ||
    normalizedStatus.includes("paid") ||
    normalizedStatus.includes("complete") ||
    normalizedStatus.includes("done")
  ) {
    return {
      paymentState: "paid",
      paymentLabel: getPaymentLabel(status, "ชำระเงินแล้ว"),
    };
  }

  if (
    normalized.includes("ค้าง") ||
    normalized.includes("ยังไม่") ||
    normalized.includes("ไม่จ่าย") ||
    normalized.includes("unpaid") ||
    normalized.includes("pending")
  ) {
    return {
      paymentState: "unpaid",
      paymentLabel: getPaymentLabel(status, "ค้างชำระ"),
    };
  }

  if (
    normalized.includes("จ่าย") ||
    normalized.includes("ชำระ") ||
    normalized.includes("paid") ||
    normalized.includes("complete") ||
    normalized.includes("done")
  ) {
    return {
      paymentState: "paid",
      paymentLabel: getPaymentLabel(status, "ชำระเงินแล้ว"),
    };
  }

  return { paymentState: "unknown", paymentLabel: status || checkIn };
}

async function getTableColumns(tableName: string) {
  const rows = await executeQuery<{ columnName: string }>(
    `
      SELECT COLUMN_NAME as columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @tableName
    `,
    { tableName },
    false,
  );

  return new Set(rows.map((row) => row.columnName));
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

async function getDetailSummary(
  detailTable: string | null,
  documentNumbers: string[],
) {
  const uniqueDocumentNumbers = Array.from(
    new Set(documentNumbers.map((value) => value.trim()).filter(Boolean)),
  );

  if (!detailTable || uniqueDocumentNumbers.length === 0) {
    return new Map<
      string,
      {
        itemCount: number;
        detailTotal: number;
        lineItems: SupplierBillLineItem[];
      }
    >();
  }

  try {
    const params = Object.fromEntries(
      uniqueDocumentNumbers.map((documentNo, index) => [
        `documentNo${index}`,
        documentNo,
      ]),
    );
    const documentPlaceholders = uniqueDocumentNumbers
      .map((_, index) => `@documentNo${index}`)
      .join(", ");
    const rows = await executeQuery<SupplierBillDetailSummaryRow>(
      `
        SELECT
          NumberPrintPost as documentNo,
          AddRows as rowNo,
          AddOder as orderNo,
          ISNULL(BarCode, '') as barcode,
          ISNULL(NameProduct, '') as name,
          ${getSafeMoneyExpression("NumProduct")} as quantity,
          ISNULL(MeterProduct, '') as unit,
          ${getSafeMoneyExpression("SalePrice")} as unitPrice,
          ${getSafeMoneyExpression("ReducePrice")} as discount,
          ${getSafeMoneyExpression("SumPrice")} as detailTotal,
          COUNT(*) OVER (PARTITION BY NumberPrintPost) as itemCount
        FROM dbo.${quoteIdentifier(detailTable)}
        WHERE NumberPrintPost IN (${documentPlaceholders})
        ORDER BY NumberPrintPost, AddRows, AddOder
      `,
      params,
      false,
    );

    const detailMap = new Map<
      string,
      {
        itemCount: number;
        detailTotal: number;
        lineItems: SupplierBillLineItem[];
      }
    >();

    rows.forEach((row, index) => {
      const documentNo = normalizeText(row.documentNo);

      if (!documentNo) {
        return;
      }

      const existing = detailMap.get(documentNo) ?? {
        itemCount: 0,
        detailTotal: 0,
        lineItems: [],
      };
      const rowNo = normalizeText(row.rowNo);
      const orderNo = normalizeText(row.orderNo);
      const total = normalizeMoney(row.detailTotal);

      existing.itemCount = Number(row.itemCount) || existing.itemCount;
      existing.detailTotal += total;
      existing.lineItems.push({
        id: `${documentNo}-${rowNo || orderNo || index}`,
        barcode: normalizeText(row.barcode),
        name: normalizeText(row.name) || "ไม่ระบุสินค้า",
        quantity: normalizeMoney(row.quantity),
        unit: normalizeText(row.unit),
        unitPrice: normalizeMoney(row.unitPrice),
        discount: normalizeMoney(row.discount),
        total,
      });
      detailMap.set(documentNo, existing);
    });

    return detailMap;
  } catch (error) {
    console.warn(`Supplier bill detail summary failed:`, error);
    return new Map<
      string,
      {
        itemCount: number;
        detailTotal: number;
        lineItems: SupplierBillLineItem[];
      }
    >();
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
      const detailSummary = await getDetailSummary(
        detailTable,
        rows.map((row) => normalizeText(row.documentNo)),
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
          lineItems: detail?.lineItems ?? [],
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

export async function PATCH(request: NextRequest) {
  try {
    const data = await withTimeout(async () => {
      const body = (await request.json()) as SupplierBillUpdatePayload;
      const documentNo = normalizeText(body.documentNo);
      const status = getPaymentLabel(
        normalizeText(body.status),
        normalizeText(body.status),
      );
      const totalPrice = normalizeEditableMoney(body.totalPrice);

      if (!documentNo) {
        return errorResponse("กรุณาระบุเลขเอกสารคู่ค้า", 400);
      }

      if (!editableSupplierStatuses.has(status)) {
        return errorResponse("กรุณาเลือกสถานะชำระเงินแล้วหรือค้างชำระ", 400);
      }

      if (totalPrice === null) {
        return errorResponse("กรุณาระบุยอดเงินให้ถูกต้อง", 400);
      }

      const sourceTable = await resolveTable(masterTableCandidates);

      if (!sourceTable) {
        return errorResponse("ยังไม่พบตารางบิลคู่ค้าในฐานข้อมูลเดิม", 404);
      }

      const columns = await getTableColumns(sourceTable);
      const resultUpdate = columns.has("Result")
        ? ", Result = @totalPrice"
        : "";

      const rows = await executeQuery<{ documentNo: string }>(
        `
          UPDATE dbo.${quoteIdentifier(sourceTable)}
          SET
            Status = @status,
            TotalPrice = @totalPrice
            ${resultUpdate}
          OUTPUT INSERTED.NumberPrintPost as documentNo
          WHERE NumberPrintPost = @documentNo
        `,
        {
          documentNo,
          status,
          totalPrice,
        },
        false,
      );

      if (!rows[0]) {
        return errorResponse("ไม่พบเอกสารคู่ค้านี้", 404);
      }

      return successResponse({
        documentNo: rows[0].documentNo,
        status,
        totalPrice,
      });
    }, 60000);

    return data;
  } catch (error) {
    return handleApiError(error, "Supplier bill update API error");
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
