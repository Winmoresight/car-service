import sql from "mssql";
import type { NextRequest } from "next/server";
import {
  errorResponse,
  handleApiError,
  successResponse,
  withTimeout,
} from "@/lib/api-utils";
import { executeQuery, getPool } from "@/lib/db";
import type { ProductBarcodeLinkResult } from "@/types/api";

const productBarcodeAliasTableName = "WebProductBarcodeAliases";

interface ProductBarcodePayload {
  productCode: string;
  oldBarcode: string;
  newBarcode: string;
  source: string;
}

interface ProductBarcodeRow {
  productCode: string | null;
  productName: string | null;
  barcode: string | null;
}

interface ProductBarcodeAliasRow {
  aliasBarcode: string | null;
  canonicalBarcode: string | null;
  productCode: string | null;
}

class ProductBarcodeValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ProductBarcodeValidationError";
    this.status = status;
  }
}

function quoteIdentifier(identifier: string) {
  return `[${identifier.replaceAll("]", "]]")}]`;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBarcode(value: unknown) {
  return normalizeText(value).replace(/\s+/g, "");
}

function parseBarcodePayload(body: unknown): ProductBarcodePayload {
  if (typeof body !== "object" || body === null) {
    throw new ProductBarcodeValidationError("ข้อมูลบาร์โค้ดไม่ถูกต้อง");
  }

  const source = body as Record<string, unknown>;
  const payload = {
    productCode: normalizeText(source.productCode),
    oldBarcode: normalizeBarcode(source.oldBarcode),
    newBarcode: normalizeBarcode(source.newBarcode),
    source: normalizeText(source.source) || "stock",
  };

  if (!payload.productCode && !payload.oldBarcode) {
    throw new ProductBarcodeValidationError("กรุณาระบุสินค้าหรือบาร์โค้ดเดิม");
  }

  if (!payload.newBarcode) {
    throw new ProductBarcodeValidationError("กรุณาระบุบาร์โค้ดใหม่");
  }

  if (payload.newBarcode.length > 30) {
    throw new ProductBarcodeValidationError(
      "บาร์โค้ดใหม่ต้องมีความยาวไม่เกิน 30 ตัวอักษร",
    );
  }

  return payload;
}

async function ensureProductBarcodeAliasTable() {
  await executeQuery(
    `
      IF OBJECT_ID(N'dbo.${productBarcodeAliasTableName}', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.${quoteIdentifier(productBarcodeAliasTableName)} (
          AliasBarcode nvarchar(30) NOT NULL,
          CanonicalBarcode nvarchar(30) NOT NULL,
          ProductCode nvarchar(30) NOT NULL,
          ProductName nvarchar(250) NULL,
          Source nvarchar(50) NULL,
          CreatedAt datetime NOT NULL
            CONSTRAINT DF_${productBarcodeAliasTableName}_CreatedAt DEFAULT GETDATE(),
          UpdatedAt datetime NOT NULL
            CONSTRAINT DF_${productBarcodeAliasTableName}_UpdatedAt DEFAULT GETDATE(),
          CONSTRAINT PK_${productBarcodeAliasTableName}
            PRIMARY KEY (AliasBarcode)
        )
      END
    `,
    undefined,
    false,
  );
}

async function resolveProduct(
  transaction: sql.Transaction,
  payload: ProductBarcodePayload,
) {
  const productRequest = new sql.Request(transaction);
  productRequest.input("productCode", sql.NVarChar(30), payload.productCode);
  productRequest.input("oldBarcode", sql.NVarChar(30), payload.oldBarcode);
  const productRows = await productRequest.query<ProductBarcodeRow>(`
    SELECT TOP 1
      d.CodeProduct as productCode,
      COALESCE(NULLIF(m.NameProduct, ''), '') as productName,
      ISNULL(d.BarCode, '') as barcode
    FROM dbo.MasterProductDetail d WITH (UPDLOCK, HOLDLOCK)
    LEFT JOIN dbo.MasterProduct m WITH (UPDLOCK, HOLDLOCK)
      ON m.CodeProduct = d.CodeProduct
    WHERE
      (
        @productCode <> N''
        AND d.CodeProduct = @productCode
      )
      OR (
        @productCode = N''
        AND @oldBarcode <> N''
        AND d.BarCode = @oldBarcode
      )
    ORDER BY
      CASE WHEN d.BarCode = @oldBarcode THEN 0 ELSE 1 END,
      d.BarCode
  `);
  const directProduct = productRows.recordset[0];

  if (directProduct?.productCode) {
    return {
      productCode: normalizeText(directProduct.productCode),
      productName: normalizeText(directProduct.productName),
      currentBarcode: normalizeBarcode(directProduct.barcode),
    };
  }

  if (!payload.oldBarcode) {
    throw new ProductBarcodeValidationError("ไม่พบสินค้าที่ต้องการอัปเดต");
  }

  const aliasRequest = new sql.Request(transaction);
  aliasRequest.input("oldBarcode", sql.NVarChar(30), payload.oldBarcode);
  const aliasRows = await aliasRequest.query<ProductBarcodeAliasRow>(`
    SELECT TOP 1
      AliasBarcode as aliasBarcode,
      CanonicalBarcode as canonicalBarcode,
      ProductCode as productCode
    FROM dbo.${quoteIdentifier(productBarcodeAliasTableName)} WITH (UPDLOCK, HOLDLOCK)
    WHERE AliasBarcode = @oldBarcode
  `);
  const alias = aliasRows.recordset[0];

  if (!alias?.productCode) {
    throw new ProductBarcodeValidationError("ไม่พบสินค้าที่ต้องการอัปเดต");
  }

  const aliasProductRequest = new sql.Request(transaction);
  aliasProductRequest.input(
    "productCode",
    sql.NVarChar(30),
    normalizeText(alias.productCode),
  );
  aliasProductRequest.input(
    "canonicalBarcode",
    sql.NVarChar(30),
    normalizeBarcode(alias.canonicalBarcode),
  );
  const aliasProductRows = await aliasProductRequest.query<ProductBarcodeRow>(`
      SELECT TOP 1
        d.CodeProduct as productCode,
        COALESCE(NULLIF(m.NameProduct, ''), '') as productName,
        ISNULL(d.BarCode, '') as barcode
      FROM dbo.MasterProductDetail d WITH (UPDLOCK, HOLDLOCK)
      LEFT JOIN dbo.MasterProduct m WITH (UPDLOCK, HOLDLOCK)
        ON m.CodeProduct = d.CodeProduct
      WHERE d.CodeProduct = @productCode
      ORDER BY
        CASE WHEN d.BarCode = @canonicalBarcode THEN 0 ELSE 1 END,
        d.BarCode
    `);
  const aliasProduct = aliasProductRows.recordset[0];

  if (!aliasProduct?.productCode) {
    throw new ProductBarcodeValidationError("ไม่พบสินค้าที่ต้องการอัปเดต");
  }

  return {
    productCode: normalizeText(aliasProduct.productCode),
    productName: normalizeText(aliasProduct.productName),
    currentBarcode: normalizeBarcode(aliasProduct.barcode),
  };
}

async function getBarcodeOwner(transaction: sql.Transaction, barcode: string) {
  const ownerRequest = new sql.Request(transaction);
  ownerRequest.input("barcode", sql.NVarChar(30), barcode);
  const ownerRows = await ownerRequest.query<ProductBarcodeRow>(`
    SELECT TOP 1
      d.CodeProduct as productCode,
      COALESCE(NULLIF(m.NameProduct, ''), '') as productName,
      ISNULL(d.BarCode, '') as barcode
    FROM dbo.MasterProductDetail d WITH (UPDLOCK, HOLDLOCK)
    LEFT JOIN dbo.MasterProduct m WITH (UPDLOCK, HOLDLOCK)
      ON m.CodeProduct = d.CodeProduct
    WHERE d.BarCode = @barcode
  `);

  return ownerRows.recordset[0] ?? null;
}

async function getAliasOwner(transaction: sql.Transaction, barcode: string) {
  const aliasRequest = new sql.Request(transaction);
  aliasRequest.input("barcode", sql.NVarChar(30), barcode);
  const aliasRows = await aliasRequest.query<ProductBarcodeAliasRow>(`
    SELECT TOP 1
      AliasBarcode as aliasBarcode,
      CanonicalBarcode as canonicalBarcode,
      ProductCode as productCode
    FROM dbo.${quoteIdentifier(productBarcodeAliasTableName)} WITH (UPDLOCK, HOLDLOCK)
    WHERE AliasBarcode = @barcode
  `);

  return aliasRows.recordset[0] ?? null;
}

async function upsertBarcodeAlias(
  transaction: sql.Transaction,
  aliasBarcode: string,
  canonicalBarcode: string,
  productCode: string,
  productName: string,
  source: string,
) {
  if (!aliasBarcode || aliasBarcode === canonicalBarcode) {
    return;
  }

  const request = new sql.Request(transaction);
  request.input("aliasBarcode", sql.NVarChar(30), aliasBarcode);
  request.input("canonicalBarcode", sql.NVarChar(30), canonicalBarcode);
  request.input("productCode", sql.NVarChar(30), productCode);
  request.input("productName", sql.NVarChar(250), productName);
  request.input("source", sql.NVarChar(50), source);

  await request.query(`
    IF EXISTS (
      SELECT 1
      FROM dbo.${quoteIdentifier(productBarcodeAliasTableName)} WITH (UPDLOCK, HOLDLOCK)
      WHERE AliasBarcode = @aliasBarcode
    )
    BEGIN
      UPDATE dbo.${quoteIdentifier(productBarcodeAliasTableName)}
      SET
        CanonicalBarcode = @canonicalBarcode,
        ProductCode = @productCode,
        ProductName = @productName,
        Source = @source,
        UpdatedAt = GETDATE()
      WHERE AliasBarcode = @aliasBarcode
    END
    ELSE
    BEGIN
      INSERT INTO dbo.${quoteIdentifier(productBarcodeAliasTableName)} (
        AliasBarcode,
        CanonicalBarcode,
        ProductCode,
        ProductName,
        Source
      )
      VALUES (
        @aliasBarcode,
        @canonicalBarcode,
        @productCode,
        @productName,
        @source
      )
    END
  `);
}

async function updateExistingAliasesToCanonical(
  transaction: sql.Transaction,
  currentBarcode: string,
  canonicalBarcode: string,
  productCode: string,
  productName: string,
  source: string,
) {
  const request = new sql.Request(transaction);
  request.input("currentBarcode", sql.NVarChar(30), currentBarcode);
  request.input("canonicalBarcode", sql.NVarChar(30), canonicalBarcode);
  request.input("productCode", sql.NVarChar(30), productCode);
  request.input("productName", sql.NVarChar(250), productName);
  request.input("source", sql.NVarChar(50), source);

  await request.query(`
    UPDATE dbo.${quoteIdentifier(productBarcodeAliasTableName)}
    SET
      CanonicalBarcode = @canonicalBarcode,
      ProductCode = @productCode,
      ProductName = @productName,
      Source = @source,
      UpdatedAt = GETDATE()
    WHERE ProductCode = @productCode
      AND CanonicalBarcode = @currentBarcode

    DELETE FROM dbo.${quoteIdentifier(productBarcodeAliasTableName)}
    WHERE ProductCode = @productCode
      AND AliasBarcode = @canonicalBarcode
  `);
}

async function getAliasesForProduct(
  transaction: sql.Transaction,
  canonicalBarcode: string,
  productCode: string,
) {
  const request = new sql.Request(transaction);
  request.input("canonicalBarcode", sql.NVarChar(30), canonicalBarcode);
  request.input("productCode", sql.NVarChar(30), productCode);
  const aliasRows = await request.query<{ aliasBarcode: string | null }>(`
    SELECT AliasBarcode as aliasBarcode
    FROM dbo.${quoteIdentifier(productBarcodeAliasTableName)}
    WHERE ProductCode = @productCode
      AND CanonicalBarcode = @canonicalBarcode
    ORDER BY AliasBarcode
  `);

  return aliasRows.recordset
    .map((row) => normalizeBarcode(row.aliasBarcode))
    .filter(Boolean);
}

async function linkProductBarcode(payload: ProductBarcodePayload) {
  await ensureProductBarcodeAliasTable();

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  await transaction.begin();

  try {
    const product = await resolveProduct(transaction, payload);
    const newBarcodeOwner = await getBarcodeOwner(
      transaction,
      payload.newBarcode,
    );

    if (
      newBarcodeOwner?.productCode &&
      normalizeText(newBarcodeOwner.productCode) !== product.productCode
    ) {
      throw new ProductBarcodeValidationError(
        `บาร์โค้ด ${payload.newBarcode} ถูกใช้กับสินค้าอื่นแล้ว`,
        409,
      );
    }

    const aliasOwner = await getAliasOwner(transaction, payload.newBarcode);

    if (
      aliasOwner?.productCode &&
      normalizeText(aliasOwner.productCode) !== product.productCode
    ) {
      throw new ProductBarcodeValidationError(
        `บาร์โค้ด ${payload.newBarcode} ถูกผูกกับสินค้าอื่นแล้ว`,
        409,
      );
    }

    const hasSameProductOwner = Boolean(
      newBarcodeOwner?.productCode &&
        normalizeText(newBarcodeOwner.productCode) === product.productCode,
    );
    const shouldUpdateMaster = Boolean(
      product.currentBarcode &&
        product.currentBarcode !== payload.newBarcode &&
        !hasSameProductOwner,
    );

    if (shouldUpdateMaster) {
      const updateRequest = new sql.Request(transaction);
      updateRequest.input("productCode", sql.NVarChar(30), product.productCode);
      updateRequest.input(
        "currentBarcode",
        sql.NVarChar(30),
        product.currentBarcode,
      );
      updateRequest.input("newBarcode", sql.NVarChar(30), payload.newBarcode);

      const updateResult = await updateRequest.query(`
        UPDATE dbo.MasterProductDetail
        SET BarCode = @newBarcode
        WHERE CodeProduct = @productCode
          AND BarCode = @currentBarcode
      `);

      if ((updateResult.rowsAffected[0] || 0) === 0) {
        throw new ProductBarcodeValidationError("ไม่สามารถอัปเดตบาร์โค้ดสินค้าได้");
      }
    }

    await updateExistingAliasesToCanonical(
      transaction,
      product.currentBarcode,
      payload.newBarcode,
      product.productCode,
      product.productName,
      payload.source,
    );
    await upsertBarcodeAlias(
      transaction,
      product.currentBarcode,
      payload.newBarcode,
      product.productCode,
      product.productName,
      payload.source,
    );
    await upsertBarcodeAlias(
      transaction,
      payload.oldBarcode,
      payload.newBarcode,
      product.productCode,
      product.productName,
      payload.source,
    );

    const aliases = await getAliasesForProduct(
      transaction,
      payload.newBarcode,
      product.productCode,
    );

    await transaction.commit();

    return {
      productCode: product.productCode,
      productName: product.productName,
      oldBarcode: payload.oldBarcode || product.currentBarcode,
      newBarcode: payload.newBarcode,
      canonicalBarcode: payload.newBarcode,
      updated: shouldUpdateMaster,
      aliases,
    } satisfies ProductBarcodeLinkResult;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = parseBarcodePayload(body);
    const data = await withTimeout(() => linkProductBarcode(payload), 60000);

    return successResponse(data);
  } catch (error) {
    if (error instanceof ProductBarcodeValidationError) {
      return errorResponse(error.message, error.status);
    }

    return handleApiError(error, "Product barcode link API error");
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
