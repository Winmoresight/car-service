/**
 * Stock API
 * GET /api/stock - ดึงข้อมูลสต็อกและการเคลื่อนไหว
 */

import sql from "mssql";
import { type NextRequest, NextResponse } from "next/server";
import { executeQuery, getPool } from "@/lib/db";
import type {
  ApiResponse,
  PaginatedPayload,
  StockProductCatalogPayload,
  StockProductCreateResult,
} from "@/types/api";

interface StockItem {
  barCode: string;
  name: string;
  currentStock: number;
  lastUpdate: string;
  movements: number; // จำนวนครั้งที่เคลื่อนไหว
}

interface StockMovement {
  barCode: string;
  name: string;
  date: string;
  type: "in" | "out";
  quantity: number;
  stock: number;
  company?: string;
}

interface StockProductCreatePayload {
  categoryId: number;
  barcode: string;
  name: string;
  unit: string;
  packageQuantity: number;
  packageUnit: string;
  costPrice: number;
  retailPrice: number;
}

class StockValidationError extends Error {
  status = 400;
}

const allowedLimits = [20, 50, 100, 200];

function getLimit(value: string | null) {
  const requestedLimit = Number.parseInt(value || "20", 10);

  return allowedLimits.includes(requestedLimit) ? requestedLimit : 20;
}

function getOffset(value: string | null) {
  const requestedOffset = Number.parseInt(value || "0", 10);

  return Number.isFinite(requestedOffset) && requestedOffset > 0
    ? requestedOffset
    : 0;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function truncateText(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function normalizeMoney(value: unknown) {
  const number = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .trim(),
  );

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return Number(number.toFixed(2));
}

function normalizePositiveInteger(value: unknown) {
  const number = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .trim(),
  );

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return Math.floor(number);
}

function formatProductCode(number: number) {
  return String(number).padStart(5, "0");
}

function formatBarcode(categoryId: number, barcodeSuffix: number) {
  return `${categoryId}${String(barcodeSuffix).padStart(4, "0")}`;
}

function formatLegacyTime(date: Date) {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join(":");
}

function uniqueOptionsByName<T extends { name: string }>(options: T[]) {
  const seenNames = new Set<string>();
  const uniqueOptions: T[] = [];

  for (const option of options) {
    if (seenNames.has(option.name)) {
      continue;
    }

    seenNames.add(option.name);
    uniqueOptions.push(option);
  }

  return uniqueOptions;
}

function parseStockProductPayload(body: unknown): StockProductCreatePayload {
  if (typeof body !== "object" || body === null) {
    throw new StockValidationError("ข้อมูลสินค้าไม่ถูกต้อง");
  }

  const source = body as Record<string, unknown>;
  const categoryId = normalizePositiveInteger(source.categoryId);
  const barcode = normalizeText(source.barcode).replace(/\s+/g, "");
  const name = truncateText(normalizeText(source.name), 250);
  const unit = truncateText(normalizeText(source.unit), 50);
  const packageUnit = truncateText(
    normalizeText(source.packageUnit) || unit,
    50,
  );
  const packageQuantity = normalizePositiveInteger(source.packageQuantity) ?? 1;
  const costPrice = normalizeMoney(source.costPrice);
  const retailPrice = normalizeMoney(source.retailPrice);

  if (!categoryId) {
    throw new StockValidationError("กรุณาเลือกประเภทสินค้า");
  }

  if (barcode.length > 30) {
    throw new StockValidationError("บาร์โค้ดต้องมีความยาวไม่เกิน 30 ตัวอักษร");
  }

  if (!name) {
    throw new StockValidationError("กรุณาระบุชื่อสินค้า");
  }

  if (!unit) {
    throw new StockValidationError("กรุณาเลือกหน่วยสินค้า");
  }

  if (costPrice === null) {
    throw new StockValidationError("กรุณาระบุราคาทุนให้ถูกต้อง");
  }

  if (retailPrice === null) {
    throw new StockValidationError("กรุณาระบุราคาปลีกให้ถูกต้อง");
  }

  return {
    categoryId,
    barcode,
    name,
    unit,
    packageQuantity,
    packageUnit,
    costPrice,
    retailPrice,
  };
}

async function getStockCatalog(categoryId: number) {
  const [categories, units, nextRows] = await Promise.all([
    executeQuery<{ id: number | null; name: string | null }>(
      `
        SELECT
          Code as id,
          ISNULL(CaseProduct, '') as name
        FROM dbo.CaseProduct
        ORDER BY Code
      `,
      undefined,
      false,
    ),
    executeQuery<{ id: number | null; name: string | null }>(
      `
        SELECT
          Code as id,
          ISNULL(MeterProduct, '') as name
        FROM dbo.MeterProduct
        ORDER BY Code
      `,
      undefined,
      false,
    ),
    executeQuery<{
      productNumber: number | null;
      barcodeNumber: number | null;
      maxProductNumber: number | null;
    }>(
      `
        SELECT
          (SELECT TOP 1 ISNULL(Number, 0) FROM dbo.CodeProduct WHERE Code = 1) as productNumber,
          (SELECT TOP 1 ISNULL(Number, 0) FROM dbo.BarcodeProduct WHERE Code = 1) as barcodeNumber,
          (
            SELECT ISNULL(MAX(CAST(CodeProduct AS int)), 0)
            FROM dbo.MasterProduct
            WHERE CodeProduct NOT LIKE '%[^0-9]%'
          ) as maxProductNumber
      `,
      undefined,
      false,
    ),
  ]);

  const catalogCategories = categories
    .map((category) => ({
      id: Number(category.id) || 0,
      name: normalizeText(category.name),
    }))
    .filter((category) => category.id > 0 && category.name);
  const selectedCategoryId = catalogCategories.some(
    (category) => category.id === categoryId,
  )
    ? categoryId
    : (catalogCategories[0]?.id ?? 25);
  const nextProductNumber =
    Math.max(
      Number(nextRows[0]?.productNumber) || 0,
      Number(nextRows[0]?.maxProductNumber) || 0,
    ) + 1;
  const nextBarcodeSuffix = (Number(nextRows[0]?.barcodeNumber) || 0) + 1;
  const payload: StockProductCatalogPayload = {
    categories: catalogCategories,
    units: uniqueOptionsByName(
      units
        .map((unit) => ({
          id: Number(unit.id) || 0,
          name: normalizeText(unit.name),
        }))
        .filter((unit) => unit.id > 0 && unit.name),
    ),
    nextProductCode: formatProductCode(nextProductNumber),
    nextBarcodeSuffix,
    previewBarcode: formatBarcode(selectedCategoryId, nextBarcodeSuffix),
  };

  return payload;
}

async function getProductCode(transaction: sql.Transaction) {
  const codeRequest = new sql.Request(transaction);
  const codeRows = await codeRequest.query<{
    productNumber: number | null;
    maxProductNumber: number | null;
  }>(`
    SELECT
      (SELECT TOP 1 ISNULL(Number, 0) FROM dbo.CodeProduct WITH (UPDLOCK, HOLDLOCK) WHERE Code = 1) as productNumber,
      (
        SELECT ISNULL(MAX(CAST(CodeProduct AS int)), 0)
        FROM dbo.MasterProduct WITH (UPDLOCK, HOLDLOCK)
        WHERE CodeProduct NOT LIKE '%[^0-9]%'
      ) as maxProductNumber
  `);

  let productNumber =
    Math.max(
      Number(codeRows.recordset[0]?.productNumber) || 0,
      Number(codeRows.recordset[0]?.maxProductNumber) || 0,
    ) + 1;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const productCode = formatProductCode(productNumber);
    const existsRequest = new sql.Request(transaction);
    existsRequest.input("productCode", sql.NVarChar(30), productCode);
    const existsRows = await existsRequest.query<{ total: number }>(`
      SELECT COUNT(1) as total
      FROM dbo.MasterProduct WITH (UPDLOCK, HOLDLOCK)
      WHERE CodeProduct = @productCode
    `);

    if ((Number(existsRows.recordset[0]?.total) || 0) === 0) {
      const updateRequest = new sql.Request(transaction);
      updateRequest.input("productNumber", sql.Int, productNumber);
      await updateRequest.query(`
        UPDATE dbo.CodeProduct
        SET Number = @productNumber
        WHERE Code = 1
      `);

      return productCode;
    }

    productNumber += 1;
  }

  throw new Error("ไม่สามารถสร้างรหัสสินค้าใหม่ได้");
}

async function getBarcode(
  transaction: sql.Transaction,
  categoryId: number,
  requestedBarcode: string,
) {
  if (requestedBarcode) {
    const requestedBarcodeCheck = new sql.Request(transaction);
    requestedBarcodeCheck.input("barcode", sql.NVarChar(30), requestedBarcode);
    const existingBarcodeRows = await requestedBarcodeCheck.query<{
      total: number;
    }>(`
      SELECT COUNT(1) as total
      FROM dbo.MasterProductDetail WITH (UPDLOCK, HOLDLOCK)
      WHERE BarCode = @barcode
    `);

    if ((Number(existingBarcodeRows.recordset[0]?.total) || 0) > 0) {
      throw new StockValidationError("บาร์โค้ดนี้มีสินค้าอยู่ในระบบแล้ว");
    }

    return requestedBarcode;
  }

  const barcodeRequest = new sql.Request(transaction);
  const barcodeRows = await barcodeRequest.query<{
    barcodeNumber: number | null;
  }>(`
    SELECT TOP 1 ISNULL(Number, 0) as barcodeNumber
    FROM dbo.BarcodeProduct WITH (UPDLOCK, HOLDLOCK)
    WHERE Code = 1
  `);

  let barcodeNumber =
    (Number(barcodeRows.recordset[0]?.barcodeNumber) || 0) + 1;

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const barcode = formatBarcode(categoryId, barcodeNumber);
    const existsRequest = new sql.Request(transaction);
    existsRequest.input("barcode", sql.NVarChar(30), barcode);
    const existsRows = await existsRequest.query<{ total: number }>(`
      SELECT COUNT(1) as total
      FROM dbo.MasterProductDetail WITH (UPDLOCK, HOLDLOCK)
      WHERE BarCode = @barcode
    `);

    if ((Number(existsRows.recordset[0]?.total) || 0) === 0) {
      const updateRequest = new sql.Request(transaction);
      updateRequest.input("barcodeNumber", sql.Int, barcodeNumber);
      await updateRequest.query(`
        UPDATE dbo.BarcodeProduct
        SET Number = @barcodeNumber
        WHERE Code = 1
      `);

      return barcode;
    }

    barcodeNumber += 1;
  }

  throw new Error("ไม่สามารถสร้างบาร์โค้ดสินค้าใหม่ได้");
}

async function createStockProduct(
  payload: StockProductCreatePayload,
): Promise<StockProductCreateResult> {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const categoryRequest = new sql.Request(transaction);
    categoryRequest.input("categoryId", sql.Int, payload.categoryId);
    const categoryRows = await categoryRequest.query<{
      name: string | null;
    }>(`
      SELECT TOP 1 ISNULL(CaseProduct, '') as name
      FROM dbo.CaseProduct
      WHERE Code = @categoryId
    `);
    const categoryName = normalizeText(categoryRows.recordset[0]?.name);

    if (!categoryName) {
      throw new StockValidationError("ไม่พบประเภทสินค้าที่เลือก");
    }

    const productCode = await getProductCode(transaction);
    const barcode = await getBarcode(
      transaction,
      payload.categoryId,
      payload.barcode,
    );
    const now = new Date();
    const masterRequest = new sql.Request(transaction);

    masterRequest.input("productCode", sql.NVarChar(30), productCode);
    masterRequest.input("name", sql.NVarChar(sql.MAX), payload.name);
    masterRequest.input("categoryId", sql.Int, payload.categoryId);
    masterRequest.input("noCutStock", sql.NVarChar(1), "N");
    masterRequest.input("deadline", sql.NVarChar(1), "N");
    masterRequest.input("vat", sql.NVarChar(1), "N");

    await masterRequest.query(`
      INSERT INTO dbo.MasterProduct (
        CodeProduct,
        NameProduct,
        CaseProduct,
        NoCutStock,
        Deadline,
        Vate
      )
      VALUES (
        @productCode,
        @name,
        @categoryId,
        @noCutStock,
        @deadline,
        @vat
      )
    `);

    const detailRequest = new sql.Request(transaction);
    detailRequest.input("barcode", sql.NVarChar(30), barcode);
    detailRequest.input("productCode", sql.NVarChar(30), productCode);
    detailRequest.input("stock", sql.Real, 0);
    detailRequest.input("unit", sql.NVarChar(50), payload.unit);
    detailRequest.input("contain", sql.Int, payload.packageQuantity);
    detailRequest.input("costPrice", sql.Money, payload.costPrice);
    detailRequest.input("packageUnit", sql.NVarChar(50), payload.packageUnit);
    detailRequest.input("salePrice", sql.Money, payload.retailPrice);
    detailRequest.input("zeroPrice", sql.Money, 0);
    detailRequest.input("emptyText", sql.NVarChar(250), "");
    detailRequest.input("lowStock", sql.Real, 0);

    await detailRequest.query(`
      INSERT INTO dbo.MasterProductDetail (
        BarCode,
        CodeProduct,
        NProduct,
        MeterProduct,
        Contain,
        CostPrice,
        MeterProductS,
        SalePrice,
        A1Price,
        A2Price,
        A3Price,
        A4Price,
        CompanyCreate,
        CompanySale,
        Note,
        LowStock
      )
      VALUES (
        @barcode,
        @productCode,
        @stock,
        @unit,
        @contain,
        @costPrice,
        @packageUnit,
        @salePrice,
        @zeroPrice,
        @zeroPrice,
        @zeroPrice,
        @zeroPrice,
        @emptyText,
        @emptyText,
        @emptyText,
        @lowStock
      )
    `);

    const stockRequest = new sql.Request(transaction);
    stockRequest.input("dateSave", sql.DateTime, now);
    stockRequest.input("times", sql.NVarChar(10), formatLegacyTime(now));
    stockRequest.input("numberPrint", sql.NVarChar(20), `NEW${productCode}`);
    stockRequest.input("barcode", sql.NVarChar(30), barcode);
    stockRequest.input("name", sql.NVarChar(250), payload.name);
    stockRequest.input("unit", sql.NVarChar(50), payload.unit);
    stockRequest.input("zero", sql.NVarChar(30), "0");
    stockRequest.input(
      "costPrice",
      sql.NVarChar(50),
      Number(payload.costPrice.toFixed(2)).toString(),
    );
    stockRequest.input("emptyCompanyCode", sql.NVarChar(30), "");
    stockRequest.input("emptyCompanyName", sql.NVarChar(250), "");

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
        @dateSave,
        @times,
        @numberPrint,
        @barcode,
        @name,
        @unit,
        @zero,
        '',
        @zero,
        @costPrice,
        @emptyCompanyCode,
        @emptyCompanyName
      )
    `);

    await transaction.commit();

    return {
      productCode,
      barcode,
      name: payload.name,
      categoryId: payload.categoryId,
      categoryName,
      unit: payload.unit,
      stock: 0,
      costPrice: payload.costPrice,
      retailPrice: payload.retailPrice,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "summary"; // 'summary' or 'movements'
    const limit = getLimit(searchParams.get("limit"));
    const offset = getOffset(searchParams.get("offset"));

    if (type === "catalog") {
      const categoryId =
        Number.parseInt(searchParams.get("categoryId") || "25", 10) || 25;
      const data = await getStockCatalog(categoryId);
      const response: ApiResponse<StockProductCatalogPayload> = {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response);
    }

    if (type === "movements") {
      // Get recent stock movements
      const query = `
        WITH MovementData AS (
          SELECT
            BarCode as barCode,
            NameProduct as name,
            DateSave as date,
            CASE
              WHEN Debit > 0 THEN 'in'
              WHEN Credit > 0 THEN 'out'
              ELSE 'in'
            END as type,
            CASE
              WHEN Debit > 0 THEN Debit
              WHEN Credit > 0 THEN Credit
              ELSE 0
            END as quantity,
            Stock as stock,
            NameCompany as company,
            ROW_NUMBER() OVER (ORDER BY DateSave DESC, Times DESC, NumberPrint DESC) as RowNum
          FROM dbo.INOUTStockProduct
        )
        SELECT
          barCode,
          name,
          date,
          type,
          quantity,
          stock,
          company
        FROM MovementData
        WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
        ORDER BY RowNum
      `;

      const movements = await executeQuery<{
        barCode: string;
        name: string;
        date: Date;
        type: "in" | "out";
        quantity: number;
        stock: number;
        company: string;
      }>(query, { limit, offset });
      const [countResult] = await executeQuery<{ total: number }>(
        "SELECT COUNT(*) as total FROM dbo.INOUTStockProduct",
      );

      const stockMovements: StockMovement[] = movements.map((row) => ({
        barCode: row.barCode,
        name: row.name,
        date: new Date(row.date).toISOString(),
        type: row.type,
        quantity: row.quantity,
        stock: row.stock,
        company: row.company,
      }));

      const response: ApiResponse<PaginatedPayload<StockMovement>> = {
        success: true,
        data: {
          items: stockMovements,
          total: countResult?.total || 0,
          limit,
          offset,
        },
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response);
    }

    // Get stock summary
    const query = `
      WITH StockData AS (
        SELECT 
          BarCode as barCode,
          NameProduct as name,
          Stock as currentStock,
          MAX(DateSave) as lastUpdate,
          COUNT(*) as movements
        FROM dbo.INOUTStockProduct
        GROUP BY BarCode, NameProduct, Stock
      ),
      PaginatedData AS (
        SELECT
          barCode,
          name,
          currentStock,
          lastUpdate,
          movements,
          ROW_NUMBER() OVER (ORDER BY movements DESC) as RowNum
        FROM StockData
      )
      SELECT
        barCode,
        name,
        currentStock,
        lastUpdate,
        movements
      FROM PaginatedData
      WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
      ORDER BY RowNum
    `;

    const results = await executeQuery<{
      barCode: string;
      name: string;
      currentStock: number;
      lastUpdate: Date;
      movements: number;
    }>(query, { limit, offset });
    const [countResult] = await executeQuery<{ total: number }>(`
      WITH StockData AS (
        SELECT
          BarCode as barCode,
          NameProduct as name,
          Stock as currentStock,
          MAX(DateSave) as lastUpdate,
          COUNT(*) as movements
        FROM dbo.INOUTStockProduct
        GROUP BY BarCode, NameProduct, Stock
      )
      SELECT COUNT(*) as total
      FROM StockData
    `);

    const stockItems: StockItem[] = results.map((row) => ({
      barCode: row.barCode,
      name: row.name,
      currentStock: row.currentStock,
      lastUpdate: new Date(row.lastUpdate).toISOString(),
      movements: row.movements,
    }));

    const response: ApiResponse<PaginatedPayload<StockItem>> = {
      success: true,
      data: {
        items: stockItems,
        total: countResult?.total || 0,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Stock API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch stock data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = parseStockProductPayload(await request.json());
    const data = await createStockProduct(payload);
    const response: ApiResponse<StockProductCreateResult> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Stock product create API error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create product";
    const status = error instanceof StockValidationError ? error.status : 500;

    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
