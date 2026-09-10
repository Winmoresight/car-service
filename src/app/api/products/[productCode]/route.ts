import sql from "mssql";
import { type NextRequest, NextResponse } from "next/server";
import { executeQuery, getPool } from "@/lib/db";
import {
  ensureProductAnalyticsPolicyTable,
  productAnalyticsPolicyTable,
} from "@/lib/product-analytics-policy";
import type {
  ApiResponse,
  ProductManagementDetail,
  ProductManagementPayload,
  StockCatalogOption,
} from "@/types/api";

interface ProductUpdatePayload {
  barcode: string;
  name: string;
  categoryId: number;
  unit: string;
  packageUnit: string;
  packageQuantity: number;
  costPrice: number;
  retailPrice: number;
  lowStock: number;
  includeInBestSeller: boolean;
  includeInProfitAnalysis: boolean;
  analyticsExclusionReason: string;
}

class ProductManagementError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ProductManagementError";
    this.status = status;
  }
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMoney(value: unknown) {
  const number = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .trim(),
  );

  return Number.isFinite(number) && number >= 0
    ? Number(number.toFixed(2))
    : null;
}

function normalizeNonNegativeNumber(value: unknown) {
  const number = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .trim(),
  );

  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizePositiveInteger(value: unknown) {
  const number = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .trim(),
  );

  return Number.isFinite(number) && number > 0 ? Math.floor(number) : null;
}

function normalizeBoolean(value: unknown, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

function parseUpdatePayload(body: unknown): ProductUpdatePayload {
  if (typeof body !== "object" || body === null) {
    throw new ProductManagementError("ข้อมูลสินค้าไม่ถูกต้อง");
  }

  const source = body as Record<string, unknown>;
  const barcode = normalizeText(source.barcode).replace(/\s+/g, "");
  const name = normalizeText(source.name).slice(0, 250);
  const categoryId = normalizePositiveInteger(source.categoryId);
  const unit = normalizeText(source.unit).slice(0, 50);
  const packageUnit = (normalizeText(source.packageUnit) || unit).slice(0, 50);
  const packageQuantity = normalizePositiveInteger(source.packageQuantity);
  const costPrice = normalizeMoney(source.costPrice);
  const retailPrice = normalizeMoney(source.retailPrice);
  const lowStock = normalizeNonNegativeNumber(source.lowStock);
  const includeInBestSeller = normalizeBoolean(source.includeInBestSeller);
  const includeInProfitAnalysis = normalizeBoolean(
    source.includeInProfitAnalysis,
  );
  const analyticsExclusionReason = normalizeText(
    source.analyticsExclusionReason,
  ).slice(0, 250);

  if (!barcode) {
    throw new ProductManagementError("ไม่พบบาร์โค้ดอ้างอิงของสินค้า");
  }

  if (!name) {
    throw new ProductManagementError("กรุณาระบุชื่อสินค้า");
  }

  if (!categoryId) {
    throw new ProductManagementError("กรุณาเลือกประเภทสินค้า");
  }

  if (!unit) {
    throw new ProductManagementError("กรุณาเลือกหน่วยสินค้า");
  }

  if (!packageQuantity) {
    throw new ProductManagementError("จำนวนต่อแพ็กต้องมากกว่า 0");
  }

  if (costPrice === null || retailPrice === null || lowStock === null) {
    throw new ProductManagementError("ราคาและจุดเตือนสต็อกต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
  }

  return {
    barcode,
    name,
    categoryId,
    unit,
    packageUnit,
    packageQuantity,
    costPrice,
    retailPrice,
    lowStock,
    includeInBestSeller,
    includeInProfitAnalysis,
    analyticsExclusionReason,
  };
}

async function getProduct(productCode: string, requestedBarcode: string) {
  const barcodeCondition = requestedBarcode ? "AND d.BarCode = @barcode" : "";
  const [product] = await executeQuery<{
    productCode: string | null;
    barcode: string | null;
    name: string | null;
    categoryId: number | null;
    categoryName: string | null;
    unit: string | null;
    packageUnit: string | null;
    packageQuantity: number | null;
    stock: number | null;
    costPrice: number | null;
    retailPrice: number | null;
    lowStock: number | null;
    includeInBestSeller: boolean | number | null;
    includeInProfitAnalysis: boolean | number | null;
    analyticsExclusionReason: string | null;
  }>(
    `
      SELECT TOP 1
        m.CodeProduct as productCode,
        d.BarCode as barcode,
        m.NameProduct as name,
        m.CaseProduct as categoryId,
        cp.CaseProduct as categoryName,
        d.MeterProduct as unit,
        d.MeterProductS as packageUnit,
        d.Contain as packageQuantity,
        d.NProduct as stock,
        d.CostPrice as costPrice,
        d.SalePrice as retailPrice,
        d.LowStock as lowStock,
        ISNULL(policy.IncludeInBestSeller, 1) as includeInBestSeller,
        ISNULL(policy.IncludeInProfitAnalysis, 1) as includeInProfitAnalysis,
        ISNULL(policy.ExclusionReason, '') as analyticsExclusionReason
      FROM dbo.MasterProduct m
      INNER JOIN dbo.MasterProductDetail d ON d.CodeProduct = m.CodeProduct
      LEFT JOIN dbo.CaseProduct cp ON cp.Code = m.CaseProduct
      LEFT JOIN dbo.${productAnalyticsPolicyTable} policy
        ON policy.ProductCode = m.CodeProduct
      WHERE m.CodeProduct = @productCode
        ${barcodeCondition}
      ORDER BY d.BarCode
    `,
    { productCode, barcode: requestedBarcode },
    false,
  );

  if (!product?.productCode || !product.barcode) {
    throw new ProductManagementError("ไม่พบสินค้าที่ต้องการจัดการ", 404);
  }

  return {
    productCode: normalizeText(product.productCode),
    barcode: normalizeText(product.barcode),
    name: normalizeText(product.name),
    categoryId: Number(product.categoryId) || 0,
    categoryName: normalizeText(product.categoryName),
    unit: normalizeText(product.unit),
    packageUnit: normalizeText(product.packageUnit),
    packageQuantity: Number(product.packageQuantity) || 1,
    stock: Number(product.stock) || 0,
    costPrice: Number(product.costPrice) || 0,
    retailPrice: Number(product.retailPrice) || 0,
    lowStock: Number(product.lowStock) || 0,
    includeInBestSeller: Boolean(product.includeInBestSeller),
    includeInProfitAnalysis: Boolean(product.includeInProfitAnalysis),
    analyticsExclusionReason: normalizeText(product.analyticsExclusionReason),
  } satisfies ProductManagementDetail;
}

async function getCatalogOptions() {
  const [categoryRows, unitRows] = await Promise.all([
    executeQuery<{ id: number | null; name: string | null }>(
      `
        SELECT Code as id, ISNULL(CaseProduct, '') as name
        FROM dbo.CaseProduct
        ORDER BY Code
      `,
      undefined,
      false,
    ),
    executeQuery<{ id: number | null; name: string | null }>(
      `
        SELECT Code as id, ISNULL(MeterProduct, '') as name
        FROM dbo.MeterProduct
        ORDER BY Code
      `,
      undefined,
      false,
    ),
  ]);

  const toOptions = (rows: Array<{ id: number | null; name: string | null }>) =>
    rows
      .map((row) => ({
        id: Number(row.id) || 0,
        name: normalizeText(row.name),
      }))
      .filter((option) => option.id > 0 && option.name);

  const categories = toOptions(categoryRows);
  const seenUnits = new Set<string>();
  const units = toOptions(unitRows).filter((unit) => {
    if (seenUnits.has(unit.name)) {
      return false;
    }

    seenUnits.add(unit.name);
    return true;
  });

  return { categories, units } satisfies {
    categories: StockCatalogOption[];
    units: StockCatalogOption[];
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productCode: string }> },
) {
  try {
    const { productCode: rawProductCode } = await context.params;
    const productCode = normalizeText(rawProductCode);
    const barcode = normalizeText(request.nextUrl.searchParams.get("barcode"));

    if (!productCode) {
      throw new ProductManagementError("กรุณาระบุรหัสสินค้า");
    }

    await ensureProductAnalyticsPolicyTable();

    const [product, catalog] = await Promise.all([
      getProduct(productCode, barcode),
      getCatalogOptions(),
    ]);
    const response: ApiResponse<ProductManagementPayload> = {
      success: true,
      data: { product, ...catalog },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    const status = error instanceof ProductManagementError ? error.status : 500;
    const message =
      error instanceof ProductManagementError
        ? error.message
        : "ไม่สามารถโหลดข้อมูลสินค้าได้";

    console.error("Product management GET API error:", error);
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ productCode: string }> },
) {
  let transaction: sql.Transaction | null = null;
  let transactionStarted = false;

  try {
    const { productCode: rawProductCode } = await context.params;
    const productCode = normalizeText(rawProductCode);
    const payload = parseUpdatePayload(await request.json());

    if (!productCode) {
      throw new ProductManagementError("กรุณาระบุรหัสสินค้า");
    }

    await ensureProductAnalyticsPolicyTable();

    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();
    transactionStarted = true;

    const categoryRequest = new sql.Request(transaction);
    categoryRequest.input("categoryId", sql.Int, payload.categoryId);
    const categoryResult = await categoryRequest.query<{ total: number }>(`
      SELECT COUNT(*) as total
      FROM dbo.CaseProduct
      WHERE Code = @categoryId
    `);

    if (Number(categoryResult.recordset[0]?.total) === 0) {
      throw new ProductManagementError("ไม่พบประเภทสินค้าที่เลือก");
    }

    const masterRequest = new sql.Request(transaction);
    masterRequest.input("productCode", sql.NVarChar(30), productCode);
    masterRequest.input("name", sql.NVarChar(sql.MAX), payload.name);
    masterRequest.input("categoryId", sql.Int, payload.categoryId);
    const masterResult = await masterRequest.query(`
      UPDATE dbo.MasterProduct
      SET NameProduct = @name, CaseProduct = @categoryId
      WHERE CodeProduct = @productCode
    `);

    if ((masterResult.rowsAffected[0] || 0) === 0) {
      throw new ProductManagementError("ไม่พบสินค้าที่ต้องการจัดการ", 404);
    }

    const detailRequest = new sql.Request(transaction);
    detailRequest.input("productCode", sql.NVarChar(30), productCode);
    detailRequest.input("barcode", sql.NVarChar(30), payload.barcode);
    detailRequest.input("unit", sql.NVarChar(50), payload.unit);
    detailRequest.input("packageUnit", sql.NVarChar(50), payload.packageUnit);
    detailRequest.input("packageQuantity", sql.Int, payload.packageQuantity);
    detailRequest.input("costPrice", sql.Money, payload.costPrice);
    detailRequest.input("retailPrice", sql.Money, payload.retailPrice);
    detailRequest.input("lowStock", sql.Real, payload.lowStock);
    const detailResult = await detailRequest.query(`
      UPDATE dbo.MasterProductDetail
      SET
        MeterProduct = @unit,
        MeterProductS = @packageUnit,
        Contain = @packageQuantity,
        CostPrice = @costPrice,
        SalePrice = @retailPrice,
        LowStock = @lowStock
      WHERE CodeProduct = @productCode
        AND BarCode = @barcode
    `);

    if ((detailResult.rowsAffected[0] || 0) === 0) {
      throw new ProductManagementError("ไม่พบรายละเอียดสินค้าที่ต้องการแก้ไข", 404);
    }

    const analyticsRequest = new sql.Request(transaction);
    analyticsRequest.input("productCode", sql.NVarChar(30), productCode);
    analyticsRequest.input(
      "includeInBestSeller",
      sql.Bit,
      payload.includeInBestSeller,
    );
    analyticsRequest.input(
      "includeInProfitAnalysis",
      sql.Bit,
      payload.includeInProfitAnalysis,
    );
    analyticsRequest.input(
      "analyticsExclusionReason",
      sql.NVarChar(250),
      payload.analyticsExclusionReason || null,
    );
    await analyticsRequest.query(`
      UPDATE dbo.${productAnalyticsPolicyTable}
      SET
        IncludeInBestSeller = @includeInBestSeller,
        IncludeInProfitAnalysis = @includeInProfitAnalysis,
        ExclusionReason = @analyticsExclusionReason,
        UpdatedAt = GETDATE()
      WHERE ProductCode = @productCode;

      IF @@ROWCOUNT = 0
      BEGIN
        INSERT INTO dbo.${productAnalyticsPolicyTable} (
          ProductCode,
          IncludeInBestSeller,
          IncludeInProfitAnalysis,
          ExclusionReason,
          UpdatedAt
        )
        VALUES (
          @productCode,
          @includeInBestSeller,
          @includeInProfitAnalysis,
          @analyticsExclusionReason,
          GETDATE()
        );
      END
    `);

    await transaction.commit();
    transactionStarted = false;
    const product = await getProduct(productCode, payload.barcode);
    const response: ApiResponse<ProductManagementDetail> = {
      success: true,
      data: product,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    if (transactionStarted && transaction) {
      await transaction.rollback().catch(() => undefined);
    }

    const status = error instanceof ProductManagementError ? error.status : 500;
    const message =
      error instanceof ProductManagementError
        ? error.message
        : "ไม่สามารถบันทึกข้อมูลสินค้าได้";

    console.error("Product management PATCH API error:", error);
    return NextResponse.json(
      { success: false, error: message, timestamp: new Date().toISOString() },
      { status },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
