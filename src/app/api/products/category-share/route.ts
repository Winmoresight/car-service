/**
 * Product Category Sales Share API
 * GET /api/products/category-share - สัดส่วนยอดขายแยกตามประเภทและช่วงเวลา
 * Query param excludeCategoryIds รองรับรหัสประเภทคั่นด้วย comma
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  categoryProfitMarginTable,
  ensureCategoryProfitMarginTable,
} from "@/lib/category-profit-margin";
import { executeQuery } from "@/lib/db";
import type {
  ApiResponse,
  CategorySalesDetail,
  CategorySalesShare,
  CategorySalesShareItem,
} from "@/types/api";

type CategorySharePeriod = "day" | "week" | "month";

function getSafeMoneyExpression(valueExpression: string) {
  const textExpression = `CONVERT(nvarchar(100), ${valueExpression})`;

  return `ISNULL(CONVERT(money, CASE WHEN ${valueExpression} IS NULL THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

function normalizeDateParam(value: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return "";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? value
    : "";
}

function normalizeExcludedCategoryIds(value: string | null) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => Number.parseInt(item, 10))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  ).slice(0, 100);
}

function normalizeDetailCategoryNames(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  ).slice(0, 100);
}

function getDateCondition(
  period: CategorySharePeriod,
  selectedDateExpression: string,
) {
  if (period === "week") {
    const weekStart = `DATEADD(day, -(DATEDIFF(day, 0, ${selectedDateExpression}) % 7), ${selectedDateExpression})`;

    return `d.DateSalePost >= ${weekStart} AND d.DateSalePost < DATEADD(day, 7, ${weekStart})`;
  }

  if (period === "month") {
    const monthStart = `DATEADD(month, DATEDIFF(month, 0, ${selectedDateExpression}), 0)`;

    return `d.DateSalePost >= ${monthStart} AND d.DateSalePost < DATEADD(month, 1, ${monthStart})`;
  }

  return `CONVERT(date, d.DateSalePost) = ${selectedDateExpression}`;
}

export async function GET(request: NextRequest) {
  try {
    await ensureCategoryProfitMarginTable();

    const searchParams = request.nextUrl.searchParams;
    const requestedPeriod = searchParams.get("period");
    const period: CategorySharePeriod =
      requestedPeriod === "week" || requestedPeriod === "month"
        ? requestedPeriod
        : "day";
    const selectedDate = normalizeDateParam(searchParams.get("date"));
    const excludedCategoryIds = normalizeExcludedCategoryIds(
      searchParams.get("excludeCategoryIds"),
    );
    const detailCategoryNames = normalizeDetailCategoryNames(
      searchParams.getAll("categoryName"),
    );
    const selectedDateExpression = selectedDate
      ? "CONVERT(date, @selectedDate)"
      : "CONVERT(date, GETDATE())";
    let customStartDate = normalizeDateParam(searchParams.get("startDate"));
    let customEndDate =
      normalizeDateParam(searchParams.get("endDate")) || customStartDate;

    if (!customStartDate && customEndDate) {
      customStartDate = customEndDate;
    }

    if (customStartDate && customEndDate && customStartDate > customEndDate) {
      [customStartDate, customEndDate] = [customEndDate, customStartDate];
    }

    const dateCondition = customStartDate
      ? "d.DateSalePost >= CONVERT(date, @startDate) AND d.DateSalePost < DATEADD(day, 1, CONVERT(date, @endDate))"
      : getDateCondition(period, selectedDateExpression);
    const queryParams: Record<string, unknown> = customStartDate
      ? { startDate: customStartDate, endDate: customEndDate }
      : selectedDate
        ? { selectedDate }
        : {};
    const excludedCategoryPlaceholders = excludedCategoryIds.map(
      (categoryId, index) => {
        const parameterName = `excludedCategory${index}`;
        queryParams[parameterName] = categoryId;
        return `@${parameterName}`;
      },
    );
    const categoryCodeExpression =
      "COALESCE(category.category_code, fallback_category.category_code)";
    const categoryNameExpression = `COALESCE(
      NULLIF(LTRIM(RTRIM(category.category_name)), ''),
      NULLIF(LTRIM(RTRIM(ISNULL(d.TypeSale, ''))), ''),
      N'ไม่ระบุประเภท'
    )`;
    const excludedCategoryCondition =
      excludedCategoryPlaceholders.length > 0
        ? `AND (${categoryCodeExpression} IS NULL OR ${categoryCodeExpression} NOT IN (${excludedCategoryPlaceholders.join(", ")}))`
        : "";

    if (detailCategoryNames.length > 0) {
      const detailCategoryPlaceholders = detailCategoryNames.map(
        (categoryName, index) => {
          const parameterName = `detailCategory${index}`;
          queryParams[parameterName] = categoryName;
          return `@${parameterName}`;
        },
      );
      const detailCategoryRows = await executeQuery<{ code: number }>(
        `
          SELECT Code as code
          FROM dbo.CaseProduct
          WHERE LTRIM(RTRIM(ISNULL(CaseProduct, ''))) IN (${detailCategoryPlaceholders.join(", ")})
        `,
        queryParams,
      );
      const detailCategoryCodePlaceholders = detailCategoryRows.map(
        (row, index) => {
          const parameterName = `detailCategoryCode${index}`;
          queryParams[parameterName] = Number(row.code);
          return `@${parameterName}`;
        },
      );
      const productCategoryCondition =
        detailCategoryCodePlaceholders.length > 0
          ? `EXISTS (
              SELECT 1
              FROM dbo.MasterProductDetail detail_product
              INNER JOIN dbo.MasterProduct product
                ON product.CodeProduct = detail_product.CodeProduct
              WHERE detail_product.BarCode = d.BarCode
                AND product.CaseProduct IN (${detailCategoryCodePlaceholders.join(", ")})
            )`
          : "1 = 0";
      const fallbackCategoryCondition = `(
        LTRIM(RTRIM(ISNULL(d.TypeSale, ''))) IN (${detailCategoryPlaceholders.join(", ")})
        ${detailCategoryNames.includes("ไม่ระบุประเภท") ? "OR NULLIF(LTRIM(RTRIM(ISNULL(d.TypeSale, ''))), '') IS NULL" : ""}
      )`;
      // shortcut: cap popup detail to 500 rows; add pagination if long custom ranges need every row.
      const detailLimit = 500;
      const detailRows = await executeQuery<{
        billNumber: string;
        date: Date;
        itemName: string;
        vehicleRegistration: string;
        quantity: number;
        amount: number;
      }>(
        `
          SELECT TOP ${detailLimit + 1}
            d.NumberPrintSalePost as billNumber,
            d.DateSalePost as date,
            ISNULL(d.NameProduct, N'ไม่ระบุรายการ') as itemName,
            LTRIM(RTRIM(ISNULL(m.NameCar, ''))) as vehicleRegistration,
            ISNULL(d.NumProduct, 0) as quantity,
            ${getSafeMoneyExpression("d.SumPrice")} as amount
          FROM dbo.DetailSalePost d
          LEFT JOIN dbo.MasterSalePost m
            ON m.NumberPrintSalePost = d.NumberPrintSalePost
          WHERE ${dateCondition}
            AND DATEDIFF(day, '19000107', CONVERT(date, d.DateSalePost)) % 7 <> 0
            AND ${getSafeMoneyExpression("d.SumPrice")} > 0
            AND (
              ${productCategoryCondition}
              OR (
                NOT EXISTS (
                  SELECT 1
                  FROM dbo.MasterProductDetail detail_product
                  INNER JOIN dbo.MasterProduct product
                    ON product.CodeProduct = detail_product.CodeProduct
                  WHERE detail_product.BarCode = d.BarCode
                    AND product.CaseProduct IS NOT NULL
                )
                AND ${fallbackCategoryCondition}
              )
            )
          ORDER BY d.DateSalePost DESC, d.NumberPrintSalePost DESC
        `,
        queryParams,
      );
      const hasMoreDetailRows = detailRows.length > detailLimit;
      const visibleDetailRows = detailRows.slice(0, detailLimit);
      const detailResponse: ApiResponse<CategorySalesDetail> = {
        success: true,
        data: {
          items: visibleDetailRows.map((row) => ({
            billNumber: row.billNumber?.trim() || "-",
            date: new Date(row.date).toISOString(),
            itemName: row.itemName?.trim() || "ไม่ระบุรายการ",
            vehicleRegistration: row.vehicleRegistration?.trim() || "",
            quantity: Number(row.quantity) || 0,
            amount: Number(row.amount) || 0,
          })),
          totalCount: visibleDetailRows.length,
          limit: detailLimit,
          hasMore: hasMoreDetailRows,
        },
        timestamp: new Date().toISOString(),
      };

      return NextResponse.json(detailResponse);
    }

    const rows = await executeQuery<{
      name: string;
      quantity: number;
      amount: number;
      actualProfit: number;
      profitPercent: number | null;
    }>(
      `
        SELECT
          ${categoryNameExpression} as name,
          ISNULL(SUM(ISNULL(d.NumProduct, 0)), 0) as quantity,
          ISNULL(SUM(${getSafeMoneyExpression("d.SumPrice")}), 0) as amount,
          ISNULL(SUM(${getSafeMoneyExpression("d.SumProfit")}), 0) as actualProfit,
          MAX(margin.ProfitPercent) as profitPercent
        FROM dbo.DetailSalePost d
        OUTER APPLY (
          SELECT TOP 1
            p.CaseProduct as category_code,
            ISNULL(cp.CaseProduct, '') as category_name
          FROM dbo.MasterProductDetail pd
          INNER JOIN dbo.MasterProduct p ON p.CodeProduct = pd.CodeProduct
          LEFT JOIN dbo.CaseProduct cp ON cp.Code = p.CaseProduct
          WHERE pd.BarCode = d.BarCode
        ) category
        OUTER APPLY (
          SELECT TOP 1 cp.Code as category_code
          FROM dbo.CaseProduct cp
          WHERE category.category_code IS NULL
            AND LTRIM(RTRIM(ISNULL(cp.CaseProduct, ''))) =
              LTRIM(RTRIM(ISNULL(d.TypeSale, '')))
          ORDER BY cp.Code ASC
        ) fallback_category
        LEFT JOIN dbo.${categoryProfitMarginTable} margin
          ON margin.CategoryCode = COALESCE(
            category.category_code,
            fallback_category.category_code
          )
        WHERE ${dateCondition}
          AND DATEDIFF(day, '19000107', CONVERT(date, d.DateSalePost)) % 7 <> 0
          AND ${getSafeMoneyExpression("d.SumPrice")} > 0
          ${excludedCategoryCondition}
        GROUP BY ${categoryNameExpression}
        ORDER BY quantity DESC, name ASC
      `,
      queryParams,
    );

    const totalAmount = rows.reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );
    const totalQuantity = rows.reduce(
      (sum, row) => sum + (Number(row.quantity) || 0),
      0,
    );
    const totalProfit = rows.reduce(
      (sum, row) => sum + (Number(row.actualProfit) || 0),
      0,
    );
    const categories: CategorySalesShareItem[] = rows.map((row) => {
      const amount = Number(row.amount) || 0;
      const profitPercent =
        row.profitPercent === null ? null : Number(row.profitPercent);

      return {
        name: row.name?.trim() || "ไม่ระบุประเภท",
        quantity: Number(row.quantity) || 0,
        amount,
        profit:
          profitPercent === null
            ? null
            : Number(((amount * profitPercent) / 100).toFixed(2)),
        profitPercent,
        percentage:
          totalQuantity > 0
            ? Number(
                (((Number(row.quantity) || 0) / totalQuantity) * 100).toFixed(
                  2,
                ),
              )
            : 0,
      };
    });

    const response: ApiResponse<CategorySalesShare> = {
      success: true,
      data: {
        categories,
        totalAmount: Number(totalAmount.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
        totalQuantity: Number(totalQuantity.toFixed(2)),
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Product category sales share API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถดึงสัดส่วนยอดขายตามประเภทสินค้าได้",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
