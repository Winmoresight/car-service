import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse, BarcodeScanResult } from "@/types/api";

type LookupQueryStage =
  | "stock_timeline"
  | "sales_summary"
  | "master_match"
  | "sales_fallback"
  | "movement_history";

interface LookupErrorDetails {
  stage: LookupQueryStage | "validation" | "demo" | "unknown";
  message: string;
  cause?: string;
}

class LookupQueryError extends Error {
  stage: LookupQueryStage;
  cause?: unknown;

  constructor(stage: LookupQueryStage, message: string, cause?: unknown) {
    super(message);
    this.name = "LookupQueryError";
    this.stage = stage;
    this.cause = cause;
  }
}

function serializeLookupError(error: unknown): LookupErrorDetails {
  if (error instanceof LookupQueryError) {
    return {
      stage: error.stage,
      message: error.message,
      cause:
        error.cause instanceof Error
          ? error.cause.message
          : typeof error.cause === "string"
            ? error.cause
            : undefined,
    };
  }

  if (error instanceof Error) {
    return {
      stage: "unknown",
      message: error.message,
    };
  }

  return {
    stage: "unknown",
    message: String(error),
  };
}

async function runLookupQuery<T>(
  stage: LookupQueryStage,
  query: string,
  params: Record<string, unknown>,
): Promise<T[]> {
  try {
    return await executeQuery<T>(query, params, false);
  } catch (error) {
    throw new LookupQueryError(stage, `Query failed at ${stage}`, error);
  }
}

function normalizeBarcode(value: string | null) {
  return (value || "").trim().replace(/\s+/g, "");
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getDemoBarcodeSeed(barcode: string) {
  const digits = barcode.replace(/\D/g, "");
  const seed = Number.parseInt(digits.slice(-6) || "0", 10);

  return Number.isFinite(seed) ? seed : 0;
}

function createDemoLookupResult(barcode: string): BarcodeScanResult {
  const seed = getDemoBarcodeSeed(barcode);
  const costPrice = Number(((seed % 1800) + 200).toFixed(2));
  const retailPrice = Number((costPrice + ((seed % 600) + 120)).toFixed(2));
  const stock = (seed % 48) + 2;
  const soldQuantity = (seed % 120) + 5;
  const totalSales = Number((retailPrice * soldQuantity).toFixed(2));
  const totalProfit = Number(
    ((retailPrice - costPrice) * soldQuantity).toFixed(2),
  );
  const lastSaleAt = new Date(Date.now() - (seed % 14) * 86_400_000);
  const lastMovementAt = new Date(Date.now() - (seed % 7) * 43_200_000);

  return {
    barcode,
    productCode: `DEMO${String(seed % 100000).padStart(5, "0")}`,
    name: `สินค้าทดสอบ ${barcode.slice(-4) || "DEMO"}`,
    categoryName: "ข้อมูลจำลอง",
    unit: "ชิ้น",
    packageUnit: "แพ็ก",
    packageQuantity: 1,
    stock,
    costPrice,
    retailPrice,
    profitPerUnit: Number((retailPrice - costPrice).toFixed(2)),
    profitMargin:
      costPrice > 0
        ? Number((((retailPrice - costPrice) / costPrice) * 100).toFixed(2))
        : 0,
    stockValue: Number((stock * costPrice).toFixed(2)),
    retailStockValue: Number((stock * retailPrice).toFixed(2)),
    salesCount: (seed % 18) + 1,
    totalSoldQuantity: soldQuantity,
    totalSales,
    totalProfit,
    lastSaleAt: lastSaleAt.toISOString(),
    lastMovementAt: lastMovementAt.toISOString(),
    source: "demo",
    recentMovements: [
      {
        date: lastMovementAt.toISOString(),
        type: "in",
        quantity: (seed % 10) + 1,
        stock,
        company: "ข้อมูลจำลอง",
      },
      {
        date: new Date(Date.now() - (seed % 9) * 86_400_000).toISOString(),
        type: "out",
        quantity: (seed % 6) + 1,
        stock: Math.max(stock - 2, 0),
        company: "ข้อมูลจำลอง",
      },
    ],
  };
}

export async function GET(request: NextRequest) {
  try {
    const barcode = normalizeBarcode(
      request.nextUrl.searchParams.get("barcode"),
    );
    const forceDemo =
      request.nextUrl.searchParams.get("demo") === "1" ||
      process.env.NEXT_PUBLIC_SCAN_DEMO === "1";

    if (!barcode) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาระบุบาร์โค้ด",
          details: {
            stage: "validation",
            message: "Barcode query parameter is required",
          },
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    if (forceDemo) {
      const response: ApiResponse<BarcodeScanResult> = {
        success: true,
        data: createDemoLookupResult(barcode),
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response);
    }

    const [lookupRows, movementRows] = await Promise.all([
      runLookupQuery<{
        barcode: string;
        productCode: string;
        name: string;
        categoryName: string;
        unit: string;
        packageUnit: string;
        packageQuantity: number;
        costPrice: number;
        retailPrice: number;
        stock: number;
        lastMovementAt: Date | null;
        salesCount: number;
        totalSoldQuantity: number;
        totalSales: number;
        totalProfit: number;
        lastSaleAt: Date | null;
        source: "master" | "sales-history";
      }>(
        "master_match",
        `
          WITH StockTimeline AS (
            SELECT
              BarCode,
              Stock,
              DateSave,
              Times,
              NumberPrint,
              ROW_NUMBER() OVER (
                PARTITION BY BarCode
                ORDER BY DateSave DESC, Times DESC, NumberPrint DESC
              ) as rn
            FROM dbo.INOUTStockProduct
            WHERE BarCode = @barcode
          ),
          StockSummary AS (
            SELECT
              BarCode,
              MAX(CASE WHEN rn = 1 THEN Stock END) as currentStock,
              MAX(DateSave) as lastMovementAt
            FROM StockTimeline
            GROUP BY BarCode
          ),
          SalesSummary AS (
            SELECT
              BarCode,
              COUNT(*) as salesCount,
              ISNULL(SUM(NumProduct), 0) as totalSoldQuantity,
              ISNULL(SUM(SumPrice), 0) as totalSales,
              ISNULL(SUM(SumProfit), 0) as totalProfit,
              MAX(DateSalePost) as lastSaleAt
            FROM dbo.DetailSalePost
            WHERE BarCode = @barcode
            GROUP BY BarCode
          ),
          MasterMatch AS (
            SELECT TOP 1
              d.BarCode as barcode,
              ISNULL(m.CodeProduct, '') as productCode,
              COALESCE(NULLIF(m.NameProduct, ''), 'ไม่ระบุชื่อสินค้า') as name,
              COALESCE(NULLIF(cp.CaseProduct, ''), '') as categoryName,
              ISNULL(d.MeterProduct, '') as unit,
              ISNULL(d.MeterProductS, '') as packageUnit,
              ISNULL(d.Contain, 0) as packageQuantity,
              ISNULL(d.CostPrice, 0) as costPrice,
              ISNULL(d.SalePrice, 0) as retailPrice,
              ISNULL(ss.currentStock, 0) as stock,
              ss.lastMovementAt,
              ISNULL(sales.salesCount, 0) as salesCount,
              ISNULL(sales.totalSoldQuantity, 0) as totalSoldQuantity,
              ISNULL(sales.totalSales, 0) as totalSales,
              ISNULL(sales.totalProfit, 0) as totalProfit,
              sales.lastSaleAt,
              'master' as source
            FROM dbo.MasterProductDetail d
            LEFT JOIN dbo.MasterProduct m ON m.CodeProduct = d.CodeProduct
            LEFT JOIN dbo.CaseProduct cp ON cp.Code = m.CaseProduct
            LEFT JOIN StockSummary ss ON ss.BarCode = d.BarCode
            LEFT JOIN SalesSummary sales ON sales.BarCode = d.BarCode
            WHERE d.BarCode = @barcode
          ),
          SalesFallback AS (
            SELECT TOP 1
              s.BarCode as barcode,
              '' as productCode,
              COALESCE(NULLIF(s.NameProduct, ''), 'ไม่ระบุชื่อสินค้า') as name,
              '' as categoryName,
              '' as unit,
              '' as packageUnit,
              0 as packageQuantity,
              ISNULL(MAX(s.CostPrice), 0) as costPrice,
              ISNULL(MAX(s.SalePrice), 0) as retailPrice,
              ISNULL(ss.currentStock, 0) as stock,
              ss.lastMovementAt,
              COUNT(*) as salesCount,
              ISNULL(SUM(s.NumProduct), 0) as totalSoldQuantity,
              ISNULL(SUM(s.SumPrice), 0) as totalSales,
              ISNULL(SUM(s.SumProfit), 0) as totalProfit,
              MAX(s.DateSalePost) as lastSaleAt,
              'sales-history' as source
            FROM dbo.DetailSalePost s
            LEFT JOIN StockSummary ss ON ss.BarCode = s.BarCode
            WHERE s.BarCode = @barcode
            GROUP BY s.BarCode, s.NameProduct, ss.currentStock, ss.lastMovementAt
          )
          SELECT TOP 1
            barcode,
            productCode,
            name,
            categoryName,
            unit,
            packageUnit,
            packageQuantity,
            costPrice,
            retailPrice,
            stock,
            lastMovementAt,
            salesCount,
            totalSoldQuantity,
            totalSales,
            totalProfit,
            lastSaleAt,
            source
          FROM (
            SELECT * FROM MasterMatch
            UNION ALL
            SELECT * FROM SalesFallback
          ) matches
          ORDER BY CASE WHEN source = 'master' THEN 0 ELSE 1 END
        `,
        { barcode },
      ),
      runLookupQuery<{
        date: Date;
        type: "in" | "out";
        quantity: number;
        stock: number;
        company: string;
      }>(
        "movement_history",
        `
          SELECT TOP 8
            DateSave as date,
            CASE
              WHEN Debit > 0 THEN 'in'
              ELSE 'out'
            END as type,
            CASE
              WHEN Debit > 0 THEN Debit
              ELSE Credit
            END as quantity,
            Stock as stock,
            ISNULL(NameCompany, '') as company
          FROM dbo.INOUTStockProduct
          WHERE BarCode = @barcode
          ORDER BY DateSave DESC, Times DESC, NumberPrint DESC
        `,
        { barcode },
      ),
    ]);

    const row = lookupRows[0];

    if (!row) {
      return NextResponse.json(
        {
          success: false,
          error: "ไม่พบสินค้าตามบาร์โค้ดนี้",
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    const costPrice = Number(row.costPrice) || 0;
    const retailPrice = Number(row.retailPrice) || 0;
    const stock = Number(row.stock) || 0;
    const profitPerUnit = Number((retailPrice - costPrice).toFixed(2));
    const profitMargin =
      costPrice > 0
        ? Number((((retailPrice - costPrice) / costPrice) * 100).toFixed(2))
        : 0;

    const data: BarcodeScanResult = {
      barcode: row.barcode,
      productCode: row.productCode,
      name: row.name,
      categoryName: row.categoryName,
      unit: row.unit,
      packageUnit: row.packageUnit,
      packageQuantity: Number(row.packageQuantity) || 0,
      stock,
      costPrice,
      retailPrice,
      profitPerUnit,
      profitMargin,
      stockValue: Number((stock * costPrice).toFixed(2)),
      retailStockValue: Number((stock * retailPrice).toFixed(2)),
      salesCount: Number(row.salesCount) || 0,
      totalSoldQuantity: Number(row.totalSoldQuantity) || 0,
      totalSales: Number(row.totalSales) || 0,
      totalProfit: Number(row.totalProfit) || 0,
      lastSaleAt: toIsoString(row.lastSaleAt),
      lastMovementAt: toIsoString(row.lastMovementAt),
      source: row.source,
      recentMovements: movementRows.map((movement) => ({
        date: new Date(movement.date).toISOString(),
        type: movement.type,
        quantity: Number(movement.quantity) || 0,
        stock: Number(movement.stock) || 0,
        company: movement.company,
      })),
    };

    const response: ApiResponse<BarcodeScanResult> = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    const details = serializeLookupError(error);
    console.error("Barcode lookup API error:", details, error);

    const barcode = normalizeBarcode(
      request.nextUrl.searchParams.get("barcode"),
    );

    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถค้นหาสินค้าจากบาร์โค้ดได้",
        details: {
          ...details,
          barcode,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
