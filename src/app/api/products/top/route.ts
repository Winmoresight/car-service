/**
 * Top Products API
 * GET /api/products/top - ดึงสินค้าขายดี/กำไรดี
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse, PaginatedPayload, TopProduct } from "@/types/api";

type ProductFilter = "all" | "top" | "profit" | "low-margin";

interface ProductSummary {
  totalProducts: number;
  avgProfitMargin: number;
  highMarginCount: number;
  lowMarginCount: number;
  topSalesCount: number;
  highProfitCount: number;
}

const allowedLimits = [20, 50, 100, 200];

function getLimit(value: string | null, isPaginated: boolean) {
  const requestedLimit = Number.parseInt(
    value || (isPaginated ? "20" : "10"),
    10,
  );

  if (isPaginated) {
    return allowedLimits.includes(requestedLimit) ? requestedLimit : 20;
  }

  return Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 200)
    : 10;
}

function getOffset(value: string | null) {
  const requestedOffset = Number.parseInt(value || "0", 10);

  return Number.isFinite(requestedOffset) && requestedOffset > 0
    ? requestedOffset
    : 0;
}

function getFilter(value: string | null): ProductFilter {
  if (value === "top" || value === "profit" || value === "low-margin") {
    return value;
  }

  return "all";
}

function getFilterCondition(filter: ProductFilter) {
  if (filter === "top") {
    return "WHERE total_sales > 100000";
  }

  if (filter === "profit") {
    return "WHERE total_profit > 10000";
  }

  if (filter === "low-margin") {
    return `
      WHERE total_sales > 0
        AND CASE
        WHEN total_sales > 0 THEN (total_profit / total_sales) * 100
        ELSE 0
      END < 5
    `;
  }

  return "";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isPaginated = searchParams.get("paginated") === "1";
    const limit = getLimit(searchParams.get("limit"), isPaginated);
    const offset = getOffset(searchParams.get("offset"));
    const sortBy = searchParams.get("sortBy") || "sales"; // 'sales' or 'profit'
    const search = (searchParams.get("search") || "").trim();
    const filter = getFilter(searchParams.get("filter"));
    const includeMasterProducts = isPaginated ? 1 : 0;

    const orderByColumn = sortBy === "profit" ? "total_profit" : "total_sales";
    const salesSearchCondition = search
      ? "WHERE ISNULL(BarCode, '') LIKE @search OR ISNULL(NameProduct, '') LIKE @search"
      : "";
    const masterSearchCondition = search
      ? `
        AND (
          ISNULL(d.BarCode, '') LIKE @search
          OR ISNULL(m.NameProduct, '') LIKE @search
        )
      `
      : "";
    const filterCondition = getFilterCondition(filter);
    const productDataCte = `
      WITH SourceData AS (
        SELECT
          ISNULL(NULLIF(NameProduct, ''), 'ไม่ระบุสินค้า') as name,
          ISNULL(NumProduct, 0) as quantity,
          ISNULL(SumPrice, 0) as total_sales,
          ISNULL(SumProfit, 0) as total_profit
        FROM dbo.DetailSalePost
        ${salesSearchCondition}

        UNION ALL

        SELECT
          COALESCE(NULLIF(m.NameProduct, ''), 'ไม่ระบุสินค้า') as name,
          0 as quantity,
          0 as total_sales,
          0 as total_profit
        FROM dbo.MasterProductDetail d
        INNER JOIN dbo.MasterProduct m ON m.CodeProduct = d.CodeProduct
        WHERE @includeMasterProducts = 1
          ${masterSearchCondition}
      ),
      ProductData AS (
        SELECT
          name,
          ISNULL(SUM(quantity), 0) as quantity,
          ISNULL(SUM(total_sales), 0) as total_sales,
          ISNULL(SUM(total_profit), 0) as total_profit
        FROM SourceData
        GROUP BY name
        HAVING @includeMasterProducts = 1
          OR ISNULL(SUM(total_sales), 0) > 0
      )
    `;

    const query = `
      ${productDataCte},
      FilteredData AS (
        SELECT
          name,
          quantity,
          total_sales,
          total_profit
        FROM ProductData
        ${filterCondition}
      ),
      PaginatedData AS (
        SELECT
          name,
          quantity,
          total_sales,
          total_profit,
          ROW_NUMBER() OVER (ORDER BY ${orderByColumn} DESC, name ASC) as RowNum
        FROM FilteredData
      )
      SELECT
        name,
        quantity,
        total_sales,
        total_profit
      FROM PaginatedData
      WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
      ORDER BY RowNum
    `;

    const results = await executeQuery<{
      name: string;
      quantity: number;
      total_sales: number;
      total_profit: number;
    }>(query, {
      limit,
      offset,
      search: `%${search}%`,
      includeMasterProducts,
    });

    const countQuery = `
      ${productDataCte},
      FilteredData AS (
        SELECT
          name,
          total_sales,
          total_profit
        FROM ProductData
        ${filterCondition}
      )
      SELECT COUNT(*) as total
      FROM FilteredData
    `;

    const [countResult] = await executeQuery<{ total: number }>(countQuery, {
      search: `%${search}%`,
      includeMasterProducts,
    });

    const summaryQuery = `
      ${productDataCte},
      ProductMargins AS (
        SELECT
          name,
          total_sales,
          total_profit,
          CASE
            WHEN total_sales > 0 THEN (total_profit / total_sales) * 100
            ELSE 0
          END as profit_margin
        FROM ProductData
      )
      SELECT
        COUNT(*) as totalProducts,
        ISNULL(
          AVG(CASE WHEN total_sales > 0 THEN profit_margin END),
          0
        ) as avgProfitMargin,
        SUM(CASE WHEN total_sales > 0 AND profit_margin >= 10 THEN 1 ELSE 0 END) as highMarginCount,
        SUM(CASE WHEN total_sales > 0 AND profit_margin < 5 THEN 1 ELSE 0 END) as lowMarginCount,
        SUM(CASE WHEN total_sales > 100000 THEN 1 ELSE 0 END) as topSalesCount,
        SUM(CASE WHEN total_profit > 10000 THEN 1 ELSE 0 END) as highProfitCount
      FROM ProductMargins
    `;

    const [summaryResult] = await executeQuery<ProductSummary>(summaryQuery, {
      search: `%${search}%`,
      includeMasterProducts,
    });

    // คำนวณ profit margin
    const topProducts: TopProduct[] = results.map((row) => ({
      name: row.name,
      sales: row.total_sales,
      profit: row.total_profit,
      quantity: row.quantity,
      profitMargin:
        row.total_sales > 0
          ? Number(((row.total_profit / row.total_sales) * 100).toFixed(2))
          : 0,
    }));

    if (!isPaginated) {
      const response: ApiResponse<TopProduct[]> = {
        success: true,
        data: topProducts,
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(response);
    }

    const response: ApiResponse<
      PaginatedPayload<TopProduct> & { summary: ProductSummary }
    > = {
      success: true,
      data: {
        items: topProducts,
        total: countResult?.total || 0,
        limit,
        offset,
        summary: {
          totalProducts: Number(summaryResult?.totalProducts) || 0,
          avgProfitMargin: Number(summaryResult?.avgProfitMargin) || 0,
          highMarginCount: Number(summaryResult?.highMarginCount) || 0,
          lowMarginCount: Number(summaryResult?.lowMarginCount) || 0,
          topSalesCount: Number(summaryResult?.topSalesCount) || 0,
          highProfitCount: Number(summaryResult?.highProfitCount) || 0,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Top products API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch top products",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
