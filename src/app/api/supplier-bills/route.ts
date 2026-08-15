/**
 * Supplier Bills API
 * GET /api/supplier-bills - รายการบิล/ใบสั่งซื้อจากคู่ค้า
 */

import sql from "mssql";
import type { NextRequest } from "next/server";
import {
  errorResponse,
  handleApiError,
  successResponse,
  withTimeout,
} from "@/lib/api-utils";
import { executeQuery, getPool } from "@/lib/db";
import type {
  SupplierBill,
  SupplierBillLineItem,
  SupplierBillPaymentState,
  SupplierBillsPayload,
  SupplierBillsSummary,
  SupplierBillVatMode,
} from "@/types/api";

const masterTableCandidates = [
  "MasterPrintOrderBuyProduct",
  "MasterPrintOderBuyProduct",
] as const;

const detailTableCandidates = [
  "DetailPrintOrderBuyProduct",
  "DetailPrintOderBuyProduct",
] as const;

const supplierBillNoteColumnCandidates = ["Note", "Remark"] as const;

const editableSupplierStatuses = new Set(["ชำระเงินแล้ว", "ค้างชำระ"]);
const supplierBillVatModes = new Set<SupplierBillVatMode>([
  "none",
  "included",
  "excluded",
]);
const supplierBillVatTableName = "WebSupplierBillVat";
const defaultSupplierBillVatRate = 7;

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
  note: string | null;
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

interface SupplierBillDetailIdentityRow {
  rowNo: number | string | null;
  orderNo: string | null;
}

interface SupplierBillUpdatePayload {
  documentNo?: unknown;
  status?: unknown;
  totalPrice?: unknown;
  vatInputAmount?: unknown;
  vatMode?: unknown;
  vatRate?: unknown;
  note?: unknown;
  items?: unknown;
}

interface SupplierBillUpdateItem {
  rowNo: string;
  orderNo: string;
  barcode: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  total: number;
}

interface SupplierBillCreateItem {
  barcode: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  cost: number;
  caseProduct: number;
}

interface SupplierBillCreatePayload {
  supplierCode?: unknown;
  supplier?: {
    name?: unknown;
    address?: unknown;
    phone?: unknown;
    type?: unknown;
    taxId?: unknown;
    detail?: unknown;
  };
  billDate?: unknown;
  status?: unknown;
  createdBy?: unknown;
  specialDiscount?: unknown;
  vatMode?: unknown;
  vatRate?: unknown;
  note?: unknown;
  items?: unknown;
}

interface SupplierBillTotals {
  subTotal: number;
  productDiscount: number;
  specialDiscount: number;
  vatInputAmount: number;
  vatMode: SupplierBillVatMode;
  vatRate: number;
  vatBaseAmount: number;
  vatAmount: number;
  vatTotalAmount: number;
  totalPrice: number;
}

interface SupplierBillVatRow {
  documentNo: string | null;
  vatMode: string | null;
  vatRate: number | string | null;
  vatBaseAmount: number | string | null;
  vatAmount: number | string | null;
  vatTotalAmount: number | string | null;
}

interface SupplierBillVatInfo {
  vatMode: SupplierBillVatMode;
  vatRate: number;
  vatBaseAmount: number;
  vatAmount: number;
  vatTotalAmount: number;
}

interface SupplierResolution {
  code: string;
  name: string;
  created: boolean;
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
  vatBillCount: 0,
  vatBaseAmount: 0,
  vatAmount: 0,
};

function quoteIdentifier(identifier: string) {
  return `[${identifier.replaceAll("]", "]]")}]`;
}

function quoteStringLiteral(value: string) {
  return `N'${value.replaceAll("'", "''")}'`;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIdentifierText(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return normalizeText(value);
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

function normalizeCreateMoney(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Number(number.toFixed(2));
}

function normalizeCreateQuantity(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return Number(number.toFixed(2));
}

function normalizeCreateStatus(value: unknown) {
  const status = getPaymentLabel(normalizeText(value), normalizeText(value));

  return editableSupplierStatuses.has(status) ? status : "ค้างชำระ";
}

function normalizeVatMode(value: unknown): SupplierBillVatMode {
  const mode = normalizeText(value);

  return supplierBillVatModes.has(mode as SupplierBillVatMode)
    ? (mode as SupplierBillVatMode)
    : "none";
}

function normalizeVatRate(value: unknown, mode: SupplierBillVatMode) {
  if (mode === "none") {
    return 0;
  }

  const rate = Number(value);

  if (!Number.isFinite(rate) || rate <= 0 || rate > 100) {
    return defaultSupplierBillVatRate;
  }

  return Number(rate.toFixed(2));
}

function calculateVatAmounts(
  vatInputAmount: number,
  vatMode: SupplierBillVatMode,
  vatRate: number,
): SupplierBillVatInfo {
  const safeInputAmount = Number(Math.max(vatInputAmount, 0).toFixed(2));

  if (vatMode === "none" || vatRate <= 0) {
    return {
      vatMode: "none",
      vatRate: 0,
      vatBaseAmount: safeInputAmount,
      vatAmount: 0,
      vatTotalAmount: safeInputAmount,
    };
  }

  if (vatMode === "included") {
    const vatBaseAmount = Number(
      (safeInputAmount / (1 + vatRate / 100)).toFixed(2),
    );
    const vatAmount = Number((safeInputAmount - vatBaseAmount).toFixed(2));

    return {
      vatMode,
      vatRate,
      vatBaseAmount,
      vatAmount,
      vatTotalAmount: safeInputAmount,
    };
  }

  const vatAmount = Number((safeInputAmount * (vatRate / 100)).toFixed(2));

  return {
    vatMode,
    vatRate,
    vatBaseAmount: safeInputAmount,
    vatAmount,
    vatTotalAmount: Number((safeInputAmount + vatAmount).toFixed(2)),
  };
}

function getDefaultVatInfo(totalPrice: unknown): SupplierBillVatInfo {
  const safeTotalPrice = normalizeMoney(totalPrice);

  return {
    vatMode: "none",
    vatRate: 0,
    vatBaseAmount: safeTotalPrice,
    vatAmount: 0,
    vatTotalAmount: safeTotalPrice,
  };
}

function parseBillDate(value: unknown) {
  const text = normalizeText(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-").map(Number);

    return new Date(year, month - 1, day);
  }

  const parsedDate = new Date(text);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return new Date();
}

function formatLegacyMoneyText(value: number) {
  return Number(value.toFixed(2)).toFixed(2);
}

function formatLegacyQuantityText(value: number) {
  return Number(value.toFixed(2)).toString();
}

function formatLegacyTime(date: Date) {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join(":");
}

function formatLegacySqlDate(date: Date) {
  return [
    String(date.getFullYear()).padStart(4, "0"),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatLegacySqlDateTime(date: Date) {
  return `${formatLegacySqlDate(date)}T${formatLegacyTime(date)}`;
}

function formatLegacySqlDateStart(date: Date) {
  return `${formatLegacySqlDate(date)}T00:00:00`;
}

function formatStockValue(value: number) {
  return Number(value.toFixed(2)).toString();
}

function parseLegacyNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizeNote(value: unknown) {
  return truncateText(normalizeText(value), 4000);
}

function getSupplierBillNoteColumn(columns: Set<string>) {
  return (
    supplierBillNoteColumnCandidates.find((columnName) =>
      columns.has(columnName),
    ) ?? null
  );
}

async function ensureSupplierBillNoteColumn(tableName: string) {
  const columns = await getTableColumns(tableName);
  const existingColumn = getSupplierBillNoteColumn(columns);

  if (existingColumn) {
    return existingColumn;
  }

  const tableLiteral = quoteStringLiteral(`dbo.${tableName}`);

  await executeQuery(
    `
      IF COL_LENGTH(${tableLiteral}, N'Note') IS NULL
         AND COL_LENGTH(${tableLiteral}, N'Remark') IS NULL
      BEGIN
        ALTER TABLE dbo.${quoteIdentifier(tableName)}
        ADD Note nvarchar(max) NULL
      END
    `,
    undefined,
    false,
  );

  return "Note";
}

function getDetailIdentityKeys(rowNo: unknown, orderNo: unknown) {
  const rowNoText = normalizeIdentifierText(rowNo);
  const orderNoText = normalizeIdentifierText(orderNo);
  const keys: string[] = [];

  if (rowNoText) {
    keys.push(`row:${rowNoText}`);
  }

  if (orderNoText) {
    keys.push(`order:${orderNoText}`);
  }

  return keys;
}

function parseDetailRowNo(rowNo: unknown) {
  const rowNumber = Number.parseInt(normalizeIdentifierText(rowNo), 10);

  return Number.isFinite(rowNumber) ? rowNumber : null;
}

function normalizeCreateItems(items: unknown) {
  if (!Array.isArray(items)) {
    return [];
  }

  const normalizedItems: SupplierBillCreateItem[] = [];

  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const rawItem = item as Record<string, unknown>;
    const name = normalizeText(rawItem.name);
    const quantity = normalizeCreateQuantity(rawItem.quantity);
    const unitPrice = normalizeCreateMoney(rawItem.unitPrice);
    const discount = normalizeCreateMoney(rawItem.discount) ?? 0;
    const cost = normalizeCreateMoney(rawItem.cost) ?? 0;
    const caseProduct = Number(rawItem.caseProduct);

    if (!name || quantity === null || unitPrice === null) {
      continue;
    }

    normalizedItems.push({
      barcode: truncateText(normalizeText(rawItem.barcode), 30),
      name: truncateText(name, 250),
      quantity,
      unit: truncateText(normalizeText(rawItem.unit) || "-", 50),
      unitPrice,
      discount,
      cost,
      caseProduct:
        Number.isFinite(caseProduct) && caseProduct > 0 ? caseProduct : 25,
    });
  }

  return normalizedItems;
}

function normalizeUpdateItems(items: unknown) {
  if (items === undefined) {
    return null;
  }

  if (!Array.isArray(items)) {
    return [];
  }

  const normalizedItems: SupplierBillUpdateItem[] = [];

  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const rawItem = item as Record<string, unknown>;
    const rowNo = normalizeIdentifierText(rawItem.rowNo);
    const orderNo = normalizeIdentifierText(rawItem.orderNo);
    const name = normalizeText(rawItem.name);
    const quantity = normalizeCreateQuantity(rawItem.quantity);
    const unitPrice = normalizeCreateMoney(rawItem.unitPrice);
    const discount = normalizeCreateMoney(rawItem.discount) ?? 0;

    if (
      (!rowNo && !orderNo) ||
      !name ||
      quantity === null ||
      unitPrice === null
    ) {
      continue;
    }

    const lineSubtotal = Number((quantity * unitPrice).toFixed(2));

    if (discount > lineSubtotal) {
      continue;
    }

    normalizedItems.push({
      rowNo,
      orderNo,
      barcode: truncateText(normalizeText(rawItem.barcode), 30),
      name: truncateText(name, 250),
      quantity,
      unit: truncateText(normalizeText(rawItem.unit) || "-", 50),
      unitPrice,
      discount,
      total: Number((lineSubtotal - discount).toFixed(2)),
    });
  }

  return normalizedItems;
}

function calculateCreateTotals(
  items: SupplierBillCreateItem[],
  specialDiscountValue: unknown,
  vatModeValue: unknown,
  vatRateValue: unknown,
): SupplierBillTotals | null {
  const subTotal = Number(
    items
      .reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
      .toFixed(2),
  );
  const productDiscount = Number(
    items.reduce((sum, item) => sum + item.discount, 0).toFixed(2),
  );
  const specialDiscount = normalizeCreateMoney(specialDiscountValue) ?? 0;
  const afterProductDiscount = Number((subTotal - productDiscount).toFixed(2));

  if (productDiscount > subTotal || specialDiscount > afterProductDiscount) {
    return null;
  }

  const vatMode = normalizeVatMode(vatModeValue);
  const vatRate = normalizeVatRate(vatRateValue, vatMode);
  const vatInputAmount = Number(
    (afterProductDiscount - specialDiscount).toFixed(2),
  );
  const vatInfo = calculateVatAmounts(vatInputAmount, vatMode, vatRate);

  return {
    subTotal,
    productDiscount,
    specialDiscount,
    vatInputAmount,
    ...vatInfo,
    totalPrice: vatInfo.vatTotalAmount,
  };
}

function getLineTotal(item: SupplierBillCreateItem) {
  return Number(
    Math.max(item.quantity * item.unitPrice - item.discount, 0).toFixed(2),
  );
}

async function receiveSupplierStock(
  transaction: sql.Transaction,
  params: {
    documentNo: string;
    billDate: Date;
    item: SupplierBillCreateItem;
    supplier: SupplierResolution;
    stockBalanceByBarcode: Map<string, number>;
  },
) {
  const barcode = truncateText(params.item.barcode.trim(), 30);

  if (!barcode) {
    return null;
  }

  const stockDate = new Date(params.billDate);
  const now = new Date();
  stockDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);

  let currentStock = params.stockBalanceByBarcode.get(barcode);

  if (currentStock === undefined) {
    const currentStockRequest = new sql.Request(transaction);
    currentStockRequest.input("barcode", sql.NVarChar(30), barcode);

    const currentStockRows = await currentStockRequest.query<{
      stock: string | number | null;
      productStock: string | number | null;
    }>(`
      SELECT
        (
          SELECT TOP 1 Stock
          FROM dbo.INOUTStockProduct WITH (UPDLOCK, HOLDLOCK)
          WHERE BarCode = @barcode
          ORDER BY DateSave DESC, Times DESC, NumberPrint DESC
        ) as stock,
        (
          SELECT TOP 1 NProduct
          FROM dbo.MasterProductDetail WITH (UPDLOCK, HOLDLOCK)
          WHERE BarCode = @barcode
        ) as productStock
    `);

    const currentRow = currentStockRows.recordset[0];
    currentStock =
      currentRow?.stock !== null && currentRow?.stock !== undefined
        ? parseLegacyNumber(currentRow.stock)
        : parseLegacyNumber(currentRow?.productStock);
  }

  const nextStock = Number((currentStock + params.item.quantity).toFixed(2));
  params.stockBalanceByBarcode.set(barcode, nextStock);

  const masterStockRequest = new sql.Request(transaction);
  masterStockRequest.input("barcode", sql.NVarChar(30), barcode);
  masterStockRequest.input("stock", sql.Real, nextStock);
  masterStockRequest.input("costPrice", sql.Money, params.item.unitPrice);

  await masterStockRequest.query(`
    UPDATE dbo.MasterProductDetail
    SET
      NProduct = @stock,
      CostPrice = CASE
        WHEN @costPrice > 0 THEN @costPrice
        ELSE CostPrice
      END
    WHERE BarCode = @barcode
  `);

  const stockRequest = new sql.Request(transaction);
  // Bind legacy local timestamps as ISO text so the driver cannot shift them
  // to UTC before SQL Server stores them.
  stockRequest.input(
    "dateSave",
    sql.VarChar(19),
    formatLegacySqlDateTime(stockDate),
  );
  stockRequest.input("times", sql.NVarChar(10), formatLegacyTime(stockDate));
  stockRequest.input("documentNo", sql.NVarChar(30), params.documentNo);
  stockRequest.input("barcode", sql.NVarChar(30), barcode);
  stockRequest.input("name", sql.NVarChar(250), params.item.name);
  stockRequest.input("unit", sql.NVarChar(50), params.item.unit);
  stockRequest.input(
    "quantity",
    sql.NVarChar(30),
    formatStockValue(params.item.quantity),
  );
  stockRequest.input("stock", sql.NVarChar(30), formatStockValue(nextStock));
  stockRequest.input(
    "costPrice",
    sql.NVarChar(50),
    formatLegacyMoneyText(params.item.unitPrice),
  );
  stockRequest.input("supplierCode", sql.NVarChar(30), params.supplier.code);
  stockRequest.input("supplierName", sql.NVarChar(250), params.supplier.name);

  await stockRequest.query(`
    INSERT INTO dbo.INOUTStockProduct (
      DateSave,
      Times,
      NumberPrint,
      BarCode,
      NameProduct,
      MeterProduct,
      Debit,
      Credit,
      Stock,
      CostPrice,
      CodeCompany,
      NameCompany
    )
    VALUES (
      CONVERT(datetime, @dateSave, 126),
      @times,
      @documentNo,
      @barcode,
      @name,
      @unit,
      @quantity,
      '',
      @stock,
      @costPrice,
      @supplierCode,
      @supplierName
    )
  `);

  return nextStock;
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

async function tableExists(tableName: string) {
  const rows = await executeQuery<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @tableName
    `,
    { tableName },
    false,
  );

  return Number(rows[0]?.count || 0) > 0;
}

async function ensureSupplierBillVatTable() {
  await executeQuery(
    `
      IF OBJECT_ID(N'dbo.${supplierBillVatTableName}', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.${quoteIdentifier(supplierBillVatTableName)} (
          DocumentNo nvarchar(30) NOT NULL,
          VatMode nvarchar(20) NOT NULL
            CONSTRAINT DF_${supplierBillVatTableName}_VatMode DEFAULT N'none',
          VatRate decimal(5, 2) NOT NULL
            CONSTRAINT DF_${supplierBillVatTableName}_VatRate DEFAULT 0,
          VatBaseAmount money NOT NULL
            CONSTRAINT DF_${supplierBillVatTableName}_VatBaseAmount DEFAULT 0,
          VatAmount money NOT NULL
            CONSTRAINT DF_${supplierBillVatTableName}_VatAmount DEFAULT 0,
          VatTotalAmount money NOT NULL
            CONSTRAINT DF_${supplierBillVatTableName}_VatTotalAmount DEFAULT 0,
          CreatedAt datetime NOT NULL
            CONSTRAINT DF_${supplierBillVatTableName}_CreatedAt DEFAULT GETDATE(),
          UpdatedAt datetime NOT NULL
            CONSTRAINT DF_${supplierBillVatTableName}_UpdatedAt DEFAULT GETDATE(),
          CONSTRAINT PK_${supplierBillVatTableName}
            PRIMARY KEY (DocumentNo)
        )
      END
    `,
    undefined,
    false,
  );
}

async function getSupplierBillVatMap(documentNumbers: string[]) {
  const uniqueDocumentNumbers = Array.from(
    new Set(documentNumbers.map((value) => value.trim()).filter(Boolean)),
  );
  const vatMap = new Map<string, SupplierBillVatInfo>();

  if (
    uniqueDocumentNumbers.length === 0 ||
    !(await tableExists(supplierBillVatTableName))
  ) {
    return vatMap;
  }

  const params = Object.fromEntries(
    uniqueDocumentNumbers.map((documentNo, index) => [
      `documentNo${index}`,
      documentNo,
    ]),
  );
  const documentPlaceholders = uniqueDocumentNumbers
    .map((_, index) => `@documentNo${index}`)
    .join(", ");
  const rows = await executeQuery<SupplierBillVatRow>(
    `
      SELECT
        DocumentNo as documentNo,
        VatMode as vatMode,
        VatRate as vatRate,
        VatBaseAmount as vatBaseAmount,
        VatAmount as vatAmount,
        VatTotalAmount as vatTotalAmount
      FROM dbo.${quoteIdentifier(supplierBillVatTableName)}
      WHERE DocumentNo IN (${documentPlaceholders})
    `,
    params,
    false,
  );

  for (const row of rows) {
    const documentNo = normalizeText(row.documentNo);

    if (!documentNo) {
      continue;
    }

    const vatMode = normalizeVatMode(row.vatMode);
    const vatRate = normalizeVatRate(row.vatRate, vatMode);
    vatMap.set(documentNo, {
      vatMode,
      vatRate,
      vatBaseAmount: normalizeMoney(row.vatBaseAmount),
      vatAmount: normalizeMoney(row.vatAmount),
      vatTotalAmount: normalizeMoney(row.vatTotalAmount),
    });
  }

  return vatMap;
}

async function saveSupplierBillVat(
  transaction: sql.Transaction,
  documentNo: string,
  vatInfo: SupplierBillVatInfo,
) {
  const vatRequest = new sql.Request(transaction);
  vatRequest.input("documentNo", sql.NVarChar(30), documentNo);
  vatRequest.input("vatMode", sql.NVarChar(20), vatInfo.vatMode);
  vatRequest.input("vatRate", sql.Decimal(5, 2), vatInfo.vatRate);
  vatRequest.input("vatBaseAmount", sql.Money, vatInfo.vatBaseAmount);
  vatRequest.input("vatAmount", sql.Money, vatInfo.vatAmount);
  vatRequest.input("vatTotalAmount", sql.Money, vatInfo.vatTotalAmount);

  await vatRequest.query(`
    IF EXISTS (
      SELECT 1
      FROM dbo.${quoteIdentifier(supplierBillVatTableName)}
      WHERE DocumentNo = @documentNo
    )
    BEGIN
      UPDATE dbo.${quoteIdentifier(supplierBillVatTableName)}
      SET
        VatMode = @vatMode,
        VatRate = @vatRate,
        VatBaseAmount = @vatBaseAmount,
        VatAmount = @vatAmount,
        VatTotalAmount = @vatTotalAmount,
        UpdatedAt = GETDATE()
      WHERE DocumentNo = @documentNo
    END
    ELSE
    BEGIN
      INSERT INTO dbo.${quoteIdentifier(supplierBillVatTableName)} (
        DocumentNo,
        VatMode,
        VatRate,
        VatBaseAmount,
        VatAmount,
        VatTotalAmount
      )
      VALUES (
        @documentNo,
        @vatMode,
        @vatRate,
        @vatBaseAmount,
        @vatAmount,
        @vatTotalAmount
      )
    END
  `);
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

function formatSupplierCode(code: number) {
  return String(code).padStart(6, "0");
}

function formatSupplierBillNo(params: {
  shortCode: string;
  date: Date;
  reportNumber: number;
}) {
  const month = String(params.date.getMonth() + 1);
  const shortYear = String(params.date.getFullYear()).slice(-2);
  const paddedReportNumber = String(params.reportNumber).padStart(6, "0");

  return `${params.shortCode}${month}${shortYear}${paddedReportNumber}`;
}

async function createSupplierBillNo(
  transaction: sql.Transaction,
  billDate: Date,
) {
  const yearToday = String(billDate.getFullYear());
  const seedRequest = new sql.Request(transaction);

  seedRequest.input("yearToday", sql.NVarChar(20), yearToday);
  seedRequest.input("shortCode", sql.NVarChar(15), "POB");

  await seedRequest.query(`
    IF NOT EXISTS (
      SELECT 1
      FROM dbo.NumberPrintOderBuyProduct WITH (UPDLOCK, HOLDLOCK)
      WHERE YearToday = @yearToday
    )
    BEGIN
      INSERT INTO dbo.NumberPrintOderBuyProduct (YearToday, ShortCH, NumReport)
      VALUES (@yearToday, @shortCode, 0)
    END
  `);

  const readRequest = new sql.Request(transaction);
  readRequest.input("yearToday", sql.NVarChar(20), yearToday);

  const numberRows = await readRequest.query<{
    ShortCH: string | null;
    NumReport: number | null;
  }>(`
    SELECT TOP 1
      ISNULL(ShortCH, 'POB') AS ShortCH,
      ISNULL(NumReport, 0) AS NumReport
    FROM dbo.NumberPrintOderBuyProduct WITH (UPDLOCK, HOLDLOCK)
    WHERE YearToday = @yearToday
    ORDER BY ShortCH
  `);

  const numberRow = numberRows.recordset[0];

  if (!numberRow) {
    throw new Error("ไม่พบข้อมูลเลขรันบิล NumberPrintOderBuyProduct");
  }

  const shortCode = normalizeText(numberRow.ShortCH) || "POB";
  let reportNumber = Number(numberRow.NumReport || 0) + 1;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const documentNo = formatSupplierBillNo({
      shortCode,
      date: billDate,
      reportNumber,
    });
    const existingRequest = new sql.Request(transaction);
    existingRequest.input("documentNo", sql.NVarChar(30), documentNo);

    const existingRows = await existingRequest.query<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM dbo.MasterPrintOderBuyProduct WITH (UPDLOCK, HOLDLOCK)
      WHERE NumberPrintPost = @documentNo
    `);

    if (!existingRows.recordset[0]?.count) {
      const updateRequest = new sql.Request(transaction);
      updateRequest.input("yearToday", sql.NVarChar(20), yearToday);
      updateRequest.input("shortCode", sql.NVarChar(15), shortCode);
      updateRequest.input("reportNumber", sql.Int, reportNumber);

      await updateRequest.query(`
        UPDATE dbo.NumberPrintOderBuyProduct
        SET NumReport = @reportNumber
        WHERE YearToday = @yearToday
          AND ISNULL(ShortCH, 'POB') = @shortCode
      `);

      return documentNo;
    }

    reportNumber += 1;
  }

  throw new Error("ไม่สามารถสร้างเลขบิลคู่ค้าที่ไม่ซ้ำได้");
}

async function resolveSupplier(
  transaction: sql.Transaction,
  payload: SupplierBillCreatePayload,
): Promise<SupplierResolution> {
  const supplierCode = normalizeText(payload.supplierCode);

  if (supplierCode) {
    const supplierRequest = new sql.Request(transaction);
    supplierRequest.input("supplierCode", sql.NVarChar(30), supplierCode);

    const supplierRows = await supplierRequest.query<{
      CodeCompany: string | null;
      NameCompany: string | null;
    }>(`
      SELECT TOP 1 CodeCompany, NameCompany
      FROM dbo.Creditor WITH (UPDLOCK, HOLDLOCK)
      WHERE CodeCompany = @supplierCode
    `);
    const supplier = supplierRows.recordset[0];

    if (!supplier) {
      throw new Error("ไม่พบคู่ค้าที่เลือก");
    }

    return {
      code: normalizeText(supplier.CodeCompany),
      name: normalizeText(supplier.NameCompany),
      created: false,
    };
  }

  const newSupplier = payload.supplier ?? {};
  const supplierName = truncateText(normalizeText(newSupplier.name), 250);

  if (!supplierName) {
    throw new Error("กรุณาเลือกหรือเพิ่มคู่ค้า");
  }

  const maxRequest = new sql.Request(transaction);
  const maxRows = await maxRequest.query<{ maxCode: number | null }>(`
    SELECT ISNULL(
      MAX(CASE
        WHEN CodeCompany NOT LIKE '%[^0-9]%' THEN CAST(CodeCompany AS int)
        ELSE 0
      END),
      0
    ) AS maxCode
    FROM dbo.Creditor WITH (UPDLOCK, HOLDLOCK)
  `);
  let nextCode = Number(maxRows.recordset[0]?.maxCode || 0) + 1;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const nextSupplierCode = formatSupplierCode(nextCode);
    const existsRequest = new sql.Request(transaction);
    existsRequest.input("supplierCode", sql.NVarChar(30), nextSupplierCode);

    const existsRows = await existsRequest.query<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM dbo.Creditor WITH (UPDLOCK, HOLDLOCK)
      WHERE CodeCompany = @supplierCode
    `);

    if (!existsRows.recordset[0]?.count) {
      const insertRequest = new sql.Request(transaction);
      insertRequest.input("supplierCode", sql.NVarChar(30), nextSupplierCode);
      insertRequest.input("supplierName", sql.NVarChar(250), supplierName);
      insertRequest.input(
        "address",
        sql.NVarChar(sql.MAX),
        normalizeText(newSupplier.address),
      );
      insertRequest.input(
        "phone",
        sql.NVarChar(250),
        normalizeText(newSupplier.phone),
      );
      insertRequest.input(
        "type",
        sql.NVarChar(150),
        normalizeText(newSupplier.type),
      );
      insertRequest.input(
        "taxId",
        sql.NVarChar(100),
        normalizeText(newSupplier.taxId),
      );
      insertRequest.input(
        "detail",
        sql.NVarChar(sql.MAX),
        normalizeText(newSupplier.detail),
      );

      await insertRequest.query(`
        INSERT INTO dbo.Creditor (
          CodeCompany,
          NameCompany,
          AddressCompany,
          PhoneCompany,
          CaseCreditor,
          TaxCompany,
          Detail
        )
        VALUES (
          @supplierCode,
          @supplierName,
          @address,
          @phone,
          @type,
          @taxId,
          @detail
        )
      `);

      return {
        code: nextSupplierCode,
        name: supplierName,
        created: true,
      };
    }

    nextCode += 1;
  }

  throw new Error("ไม่สามารถสร้างรหัสคู่ค้าใหม่ที่ไม่ซ้ำได้");
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
      const rowNo = normalizeIdentifierText(row.rowNo);
      const orderNo = normalizeIdentifierText(row.orderNo);
      const total = normalizeMoney(row.detailTotal);

      existing.itemCount = Number(row.itemCount) || existing.itemCount;
      existing.detailTotal += total;
      existing.lineItems.push({
        id: `${documentNo}-${rowNo || orderNo || index}`,
        rowNo,
        orderNo,
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
      summary.vatBaseAmount += item.vatBaseAmount;
      summary.vatAmount += item.vatAmount;

      if (item.vatMode !== "none" && item.vatAmount > 0) {
        summary.vatBillCount += 1;
      }

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

async function createSupplierBill(params: {
  payload: SupplierBillCreatePayload;
  items: SupplierBillCreateItem[];
  totals: SupplierBillTotals;
  billDate: Date;
  status: string;
  createdBy: string;
}) {
  const { payload, items, totals, billDate, status, createdBy } = params;
  const noteColumn = await ensureSupplierBillNoteColumn(
    "MasterPrintOderBuyProduct",
  );
  await ensureSupplierBillVatTable();
  const note = normalizeNote(payload.note);
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const supplier = await resolveSupplier(transaction, payload);
    const documentNo = await createSupplierBillNo(transaction, billDate);
    const masterRequest = new sql.Request(transaction);

    masterRequest.input(
      "datePost",
      sql.VarChar(19),
      formatLegacySqlDateStart(billDate),
    );
    masterRequest.input("documentNo", sql.NVarChar(30), documentNo);
    masterRequest.input("supplierCode", sql.NVarChar(30), supplier.code);
    masterRequest.input("supplierName", sql.NVarChar(sql.MAX), supplier.name);
    masterRequest.input("specialDiscount", sql.Money, totals.specialDiscount);
    masterRequest.input("result", sql.Money, totals.totalPrice);
    masterRequest.input("productDiscount", sql.Money, totals.productDiscount);
    masterRequest.input("totalPrice", sql.Money, totals.totalPrice);
    masterRequest.input("status", sql.NVarChar(30), status);
    masterRequest.input("createdBy", sql.NVarChar(250), createdBy);
    masterRequest.input("checkIn", sql.NVarChar(1), "Y");
    masterRequest.input("note", sql.NVarChar(sql.MAX), note);

    await masterRequest.query(`
      INSERT INTO dbo.MasterPrintOderBuyProduct (
        DatePost,
        NumberPrintPost,
        CodeCompany,
        NameCompany,
        ReducePrice,
        Result,
        Reduceproduct,
        TotalPrice,
        Status,
        NameUser,
        CheckIn,
        ${quoteIdentifier(noteColumn)}
      )
      VALUES (
        CONVERT(datetime, @datePost, 126),
        @documentNo,
        @supplierCode,
        @supplierName,
        @specialDiscount,
        @result,
        @productDiscount,
        @totalPrice,
        @status,
        @createdBy,
        @checkIn,
        @note
      )
    `);

    let stockReceivedItemCount = 0;
    let stockReceivedQuantity = 0;
    const stockBalanceByBarcode = new Map<string, number>();

    for (const [index, item] of items.entries()) {
      const lineTotal = getLineTotal(item);
      const detailRequest = new sql.Request(transaction);

      detailRequest.input(
        "datePost",
        sql.VarChar(19),
        formatLegacySqlDateStart(billDate),
      );
      detailRequest.input("documentNo", sql.NVarChar(30), documentNo);
      detailRequest.input("rowNo", sql.Int, index + 1);
      detailRequest.input("orderNo", sql.NVarChar(10), String(index + 1));
      detailRequest.input("barcode", sql.NVarChar(30), item.barcode);
      detailRequest.input("name", sql.NVarChar(250), item.name);
      detailRequest.input(
        "quantity",
        sql.NVarChar(30),
        formatLegacyQuantityText(item.quantity),
      );
      detailRequest.input("unit", sql.NVarChar(50), item.unit);
      detailRequest.input(
        "unitPrice",
        sql.NVarChar(30),
        formatLegacyMoneyText(item.unitPrice),
      );
      detailRequest.input(
        "realUnitPrice",
        sql.NVarChar(30),
        formatLegacyMoneyText(item.unitPrice),
      );
      detailRequest.input(
        "discount",
        sql.NVarChar(30),
        formatLegacyMoneyText(item.discount),
      );
      detailRequest.input(
        "lineTotal",
        sql.NVarChar(30),
        formatLegacyMoneyText(lineTotal),
      );
      detailRequest.input(
        "cost",
        sql.NVarChar(30),
        formatLegacyMoneyText(item.cost),
      );
      detailRequest.input("supplierCode", sql.NVarChar(30), supplier.code);
      detailRequest.input("caseProduct", sql.Int, item.caseProduct);
      detailRequest.input("status", sql.NVarChar(30), status);
      detailRequest.input("checkIn", sql.NChar(10), "Y");

      await detailRequest.query(`
        INSERT INTO dbo.DetailPrintOderBuyProduct (
          DatePost,
          NumberPrintPost,
          AddRows,
          AddOder,
          BarCode,
          NameProduct,
          NumProduct,
          MeterProduct,
          SalePrice,
          RealSalePrice,
          ReducePrice,
          SumPrice,
          CostPrice,
          CodeCompany,
          CaseProduct,
          Status,
          CheckIn
        )
        VALUES (
          CONVERT(datetime, @datePost, 126),
          @documentNo,
          @rowNo,
          @orderNo,
          @barcode,
          @name,
          @quantity,
          @unit,
          @unitPrice,
          @realUnitPrice,
          @discount,
          @lineTotal,
          @cost,
          @supplierCode,
          @caseProduct,
          @status,
          @checkIn
        )
      `);

      const receivedStock = await receiveSupplierStock(transaction, {
        documentNo,
        billDate,
        item,
        supplier,
        stockBalanceByBarcode,
      });

      if (receivedStock !== null) {
        stockReceivedItemCount += 1;
        stockReceivedQuantity = Number(
          (stockReceivedQuantity + item.quantity).toFixed(2),
        );
      }
    }

    await saveSupplierBillVat(transaction, documentNo, totals);
    await transaction.commit();

    return {
      documentNo,
      supplierCode: supplier.code,
      supplierName: supplier.name,
      supplierCreated: supplier.created,
      totalPrice: totals.totalPrice,
      vatMode: totals.vatMode,
      vatRate: totals.vatRate,
      vatBaseAmount: totals.vatBaseAmount,
      vatAmount: totals.vatAmount,
      note,
      itemCount: items.length,
      stockReceivedItemCount,
      stockReceivedQuantity,
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.warn("Supplier bill transaction rollback failed:", rollbackError);
    }

    throw error;
  }
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
      const startDate = normalizeText(
        searchParams.get("startDate") || searchParams.get("dateFrom"),
      );
      const endDate = normalizeText(
        searchParams.get("endDate") || searchParams.get("dateTo"),
      );
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

      const sourceColumns = await getTableColumns(sourceTable);
      const noteColumn = getSupplierBillNoteColumn(sourceColumns);
      const noteSelect = noteColumn
        ? `ISNULL(${quoteIdentifier(noteColumn)}, '') as note`
        : "N'' as note";
      const noteSearchClause = noteColumn
        ? `OR ${quoteIdentifier(noteColumn)} LIKE N'%' + @q + N'%'`
        : "";
      const dateConditions: string[] = [];
      const queryParams: Record<string, string | number> = { limit, q };

      if (startDate) {
        dateConditions.push("CONVERT(date, DatePost) >= @startDate");
        queryParams.startDate = startDate;
      }

      if (endDate) {
        dateConditions.push("CONVERT(date, DatePost) <= @endDate");
        queryParams.endDate = endDate;
      }

      const whereClause = [
        `
          (
            @q = N''
            OR NumberPrintPost LIKE N'%' + @q + N'%'
            OR CodeCompany LIKE N'%' + @q + N'%'
            OR NameCompany LIKE N'%' + @q + N'%'
            OR Status LIKE N'%' + @q + N'%'
            ${noteSearchClause}
          )
        `,
        ...dateConditions,
      ].join("\n            AND ");

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
            ISNULL(CheckIn, '') as checkIn,
            ${noteSelect}
          FROM dbo.${quoteIdentifier(sourceTable)}
          WHERE ${whereClause}
          ORDER BY DatePost DESC, NumberPrintPost DESC
        `,
        queryParams,
        false,
      );
      const detailSummary = await getDetailSummary(
        detailTable,
        rows.map((row) => normalizeText(row.documentNo)),
      );
      const vatMap = await getSupplierBillVatMap(
        rows.map((row) => normalizeText(row.documentNo)),
      );

      const items: SupplierBill[] = rows.map((row, index) => {
        const documentNo = normalizeText(row.documentNo);
        const status = normalizeText(row.status);
        const checkIn = normalizeText(row.checkIn);
        const detail = detailSummary.get(documentNo);
        const payment = getPaymentState(status, checkIn);
        const totalPrice = normalizeMoney(row.totalPrice);
        const vatInfo = vatMap.get(documentNo) ?? getDefaultVatInfo(totalPrice);

        return {
          id: documentNo || `${normalizeText(row.supplierCode)}-${index}`,
          date: row.date ? new Date(row.date).toISOString() : null,
          documentNo,
          supplierCode: normalizeText(row.supplierCode),
          supplierName: normalizeText(row.supplierName),
          discount: normalizeMoney(row.discount),
          productDiscount: normalizeMoney(row.productDiscount),
          resultAmount: normalizeMoney(row.resultAmount),
          totalPrice,
          ...vatInfo,
          status,
          checkIn,
          createdBy: normalizeText(row.createdBy),
          note: normalizeText(row.note),
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

export async function POST(request: NextRequest) {
  try {
    const data = await withTimeout(async () => {
      const payload = (await request.json()) as SupplierBillCreatePayload;
      const items = normalizeCreateItems(payload.items);

      if (items.length === 0) {
        return errorResponse("กรุณาเพิ่มรายการสินค้าอย่างน้อย 1 รายการ", 400);
      }

      if (
        items.some((item) => item.discount > item.quantity * item.unitPrice)
      ) {
        return errorResponse("ส่วนลดรายการสินค้าต้องไม่เกินยอดของรายการ", 400);
      }

      const totals = calculateCreateTotals(
        items,
        payload.specialDiscount,
        payload.vatMode,
        payload.vatRate,
      );

      if (!totals) {
        return errorResponse("ส่วนลดรวมต้องไม่เกินยอดรวมสินค้า", 400);
      }

      const billDate = parseBillDate(payload.billDate);
      const status = normalizeCreateStatus(payload.status);
      const createdBy = truncateText(
        normalizeText(payload.createdBy) || "admin",
        250,
      );
      const created = await createSupplierBill({
        payload,
        items,
        totals,
        billDate,
        status,
        createdBy,
      });

      return successResponse(created, 201);
    }, 60000);

    return data;
  } catch (error) {
    if (error instanceof Error && /^(กรุณา|ไม่พบ|ไม่สามารถ)/.test(error.message)) {
      return errorResponse(error.message, 400);
    }

    return handleApiError(error, "Supplier bill create API error");
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
      const vatMode = normalizeVatMode(body.vatMode);
      const vatRate = normalizeVatRate(body.vatRate, vatMode);
      const vatInputAmount = normalizeEditableMoney(
        body.vatInputAmount ?? body.totalPrice,
      );
      const vatInfo =
        vatInputAmount === null
          ? null
          : calculateVatAmounts(vatInputAmount, vatMode, vatRate);
      const updateItems = normalizeUpdateItems(body.items);
      const note = normalizeNote(body.note);
      const shouldUpdateNote = body.note !== undefined;

      if (!documentNo) {
        return errorResponse("กรุณาระบุเลขเอกสารคู่ค้า", 400);
      }

      if (!editableSupplierStatuses.has(status)) {
        return errorResponse("กรุณาเลือกสถานะชำระเงินแล้วหรือค้างชำระ", 400);
      }

      if (vatInfo === null) {
        return errorResponse("กรุณาระบุยอดเงินให้ถูกต้อง", 400);
      }

      const totalPrice = vatInfo.vatTotalAmount;

      if (
        updateItems !== null &&
        (!Array.isArray(body.items) || updateItems.length !== body.items.length)
      ) {
        return errorResponse("กรุณาระบุรายการสินค้าให้ครบถ้วนและถูกต้อง", 400);
      }

      if (updateItems !== null && updateItems.length === 0) {
        return errorResponse("บิลคู่ค้าต้องมีรายการสินค้าอย่างน้อย 1 รายการ", 400);
      }

      const sourceTable = await resolveTable(masterTableCandidates);

      if (!sourceTable) {
        return errorResponse("ยังไม่พบตารางบิลคู่ค้าในฐานข้อมูลเดิม", 404);
      }

      await ensureSupplierBillVatTable();
      const columns = await getTableColumns(sourceTable);
      const noteColumn = shouldUpdateNote
        ? await ensureSupplierBillNoteColumn(sourceTable)
        : null;
      const resultUpdate = columns.has("Result")
        ? ", Result = @totalPrice"
        : "";
      const noteUpdate = noteColumn
        ? `, ${quoteIdentifier(noteColumn)} = @note`
        : "";
      const productDiscountUpdate =
        updateItems !== null && columns.has("Reduceproduct")
          ? ", Reduceproduct = @productDiscount"
          : "";
      const productDiscount =
        updateItems?.reduce((sum, item) => sum + item.discount, 0) ?? 0;
      const pool = await getPool();
      const transaction = new sql.Transaction(pool);

      await transaction.begin();

      try {
        const masterRequest = new sql.Request(transaction);
        masterRequest.input("documentNo", sql.NVarChar(30), documentNo);
        masterRequest.input("status", sql.NVarChar(30), status);
        masterRequest.input("totalPrice", sql.Money, totalPrice);
        masterRequest.input("productDiscount", sql.Money, productDiscount);
        masterRequest.input("note", sql.NVarChar(sql.MAX), note);

        const masterRows = await masterRequest.query<{ documentNo: string }>(`
            UPDATE dbo.${quoteIdentifier(sourceTable)}
            SET
              Status = @status,
              TotalPrice = @totalPrice
              ${resultUpdate}
              ${noteUpdate}
              ${productDiscountUpdate}
            OUTPUT INSERTED.NumberPrintPost as documentNo
            WHERE NumberPrintPost = @documentNo
          `);

        const updatedDocumentNo = normalizeText(
          masterRows.recordset[0]?.documentNo,
        );

        if (!updatedDocumentNo) {
          await transaction.rollback();
          return errorResponse("ไม่พบเอกสารคู่ค้านี้", 404);
        }

        let removedItemCount = 0;

        if (updateItems !== null && updateItems.length > 0) {
          const detailTable = await resolveTable(detailTableCandidates);

          if (!detailTable) {
            await transaction.rollback();
            return errorResponse("ยังไม่พบตารางรายละเอียดบิลคู่ค้า", 404);
          }

          const detailColumns = await getTableColumns(detailTable);
          const realSalePriceUpdate = detailColumns.has("RealSalePrice")
            ? ", RealSalePrice = @unitPrice"
            : "";
          const detailStatusUpdate = detailColumns.has("Status")
            ? ", Status = @status"
            : "";
          const submittedItemKeys = new Set(
            updateItems.flatMap((item) =>
              getDetailIdentityKeys(item.rowNo, item.orderNo),
            ),
          );
          const detailRowsRequest = new sql.Request(transaction);

          detailRowsRequest.input("documentNo", sql.NVarChar(30), documentNo);

          const existingDetailRows =
            await detailRowsRequest.query<SupplierBillDetailIdentityRow>(`
              SELECT
                AddRows as rowNo,
                AddOder as orderNo
              FROM dbo.${quoteIdentifier(detailTable)} WITH (UPDLOCK, HOLDLOCK)
              WHERE NumberPrintPost = @documentNo
            `);

          for (const row of existingDetailRows.recordset) {
            const rowKeys = getDetailIdentityKeys(row.rowNo, row.orderNo);
            const shouldKeepRow = rowKeys.some((key) =>
              submittedItemKeys.has(key),
            );

            if (rowKeys.length === 0 || shouldKeepRow) {
              continue;
            }

            const deleteRequest = new sql.Request(transaction);
            deleteRequest.input("documentNo", sql.NVarChar(30), documentNo);
            deleteRequest.input("rowNo", sql.Int, parseDetailRowNo(row.rowNo));
            deleteRequest.input(
              "orderNo",
              sql.NVarChar(10),
              normalizeIdentifierText(row.orderNo),
            );

            const deleteResult = await deleteRequest.query(`
              DELETE FROM dbo.${quoteIdentifier(detailTable)}
              WHERE NumberPrintPost = @documentNo
                AND (
                  (@rowNo IS NOT NULL AND AddRows = @rowNo)
                  OR (@orderNo <> N'' AND AddOder = @orderNo)
                )
            `);

            removedItemCount += deleteResult.rowsAffected[0] ?? 0;
          }

          for (const item of updateItems) {
            const rowNo = parseDetailRowNo(item.rowNo);
            const detailRequest = new sql.Request(transaction);

            detailRequest.input("documentNo", sql.NVarChar(30), documentNo);
            detailRequest.input("rowNo", sql.Int, rowNo);
            detailRequest.input("orderNo", sql.NVarChar(10), item.orderNo);
            detailRequest.input("barcode", sql.NVarChar(30), item.barcode);
            detailRequest.input("name", sql.NVarChar(250), item.name);
            detailRequest.input(
              "quantity",
              sql.NVarChar(30),
              formatLegacyQuantityText(item.quantity),
            );
            detailRequest.input("unit", sql.NVarChar(50), item.unit);
            detailRequest.input(
              "unitPrice",
              sql.NVarChar(30),
              formatLegacyMoneyText(item.unitPrice),
            );
            detailRequest.input(
              "discount",
              sql.NVarChar(30),
              formatLegacyMoneyText(item.discount),
            );
            detailRequest.input(
              "lineTotal",
              sql.NVarChar(30),
              formatLegacyMoneyText(item.total),
            );
            detailRequest.input("status", sql.NVarChar(30), status);

            const detailResult = await detailRequest.query(`
              UPDATE dbo.${quoteIdentifier(detailTable)}
              SET
                BarCode = @barcode,
                NameProduct = @name,
                NumProduct = @quantity,
                MeterProduct = @unit,
                SalePrice = @unitPrice,
                ReducePrice = @discount,
                SumPrice = @lineTotal
                ${realSalePriceUpdate}
                ${detailStatusUpdate}
              WHERE NumberPrintPost = @documentNo
                AND (
                  (@rowNo IS NOT NULL AND AddRows = @rowNo)
                  OR (@orderNo <> N'' AND AddOder = @orderNo)
                )
            `);

            if ((detailResult.rowsAffected[0] ?? 0) === 0) {
              await transaction.rollback();
              return errorResponse(
                `ไม่พบรายการสินค้า ${item.name} ในเอกสารนี้`,
                404,
              );
            }
          }
        }

        await saveSupplierBillVat(transaction, updatedDocumentNo, vatInfo);
        await transaction.commit();

        return successResponse({
          documentNo: updatedDocumentNo,
          status,
          totalPrice,
          vatMode: vatInfo.vatMode,
          vatRate: vatInfo.vatRate,
          vatBaseAmount: vatInfo.vatBaseAmount,
          vatAmount: vatInfo.vatAmount,
          note,
          itemCount: updateItems?.length,
          removedItemCount,
        });
      } catch (error) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          console.warn("Supplier bill update rollback failed:", rollbackError);
        }

        throw error;
      }
    }, 60000);

    return data;
  } catch (error) {
    return handleApiError(error, "Supplier bill update API error");
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
