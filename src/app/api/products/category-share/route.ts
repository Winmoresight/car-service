/**
 * Product Category Sales Share API
 * GET /api/products/category-share - สัดส่วนยอดขายแยกตามประเภทและช่วงเวลา
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type {
  ApiResponse,
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
    const searchParams = request.nextUrl.searchParams;
    const requestedPeriod = searchParams.get("period");
    const period: CategorySharePeriod =
      requestedPeriod === "week" || requestedPeriod === "month"
        ? requestedPeriod
        : "day";
    const selectedDate = normalizeDateParam(searchParams.get("date"));
    const selectedDateExpression = selectedDate
      ? "CONVERT(date, @selectedDate)"
      : "CONVERT(date, GETDATE())";
    const dateCondition = getDateCondition(period, selectedDateExpression);

    const rows = await executeQuery<{
      name: string;
      quantity: number;
      amount: number;
    }>(
      `
        SELECT
          COALESCE(
            NULLIF(LTRIM(RTRIM(category.category_name)), ''),
            NULLIF(LTRIM(RTRIM(ISNULL(d.TypeSale, ''))), ''),
            N'ไม่ระบุประเภท'
          ) as name,
          ISNULL(SUM(ISNULL(d.NumProduct, 0)), 0) as quantity,
          ISNULL(SUM(${getSafeMoneyExpression("d.SumPrice")}), 0) as amount
        FROM dbo.DetailSalePost d
        OUTER APPLY (
          SELECT TOP 1
            ISNULL(cp.CaseProduct, '') as category_name
          FROM dbo.MasterProductDetail pd
          INNER JOIN dbo.MasterProduct p ON p.CodeProduct = pd.CodeProduct
          LEFT JOIN dbo.CaseProduct cp ON cp.Code = p.CaseProduct
          WHERE pd.BarCode = d.BarCode
        ) category
        WHERE ${dateCondition}
          AND DATEDIFF(day, '19000107', CONVERT(date, d.DateSalePost)) % 7 <> 0
          AND ${getSafeMoneyExpression("d.SumPrice")} > 0
        GROUP BY COALESCE(
          NULLIF(LTRIM(RTRIM(category.category_name)), ''),
          NULLIF(LTRIM(RTRIM(ISNULL(d.TypeSale, ''))), ''),
          N'ไม่ระบุประเภท'
        )
        ORDER BY quantity DESC, name ASC
      `,
      selectedDate ? { selectedDate } : undefined,
    );

    const totalAmount = rows.reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );
    const totalQuantity = rows.reduce(
      (sum, row) => sum + (Number(row.quantity) || 0),
      0,
    );
    const categories: CategorySalesShareItem[] = rows.map((row) => {
      const amount = Number(row.amount) || 0;

      return {
        name: row.name?.trim() || "ไม่ระบุประเภท",
        quantity: Number(row.quantity) || 0,
        amount,
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
