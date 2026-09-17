import { NextResponse } from "next/server";
import {
  categoryProfitMarginTable,
  ensureCategoryProfitMarginTable,
} from "@/lib/category-profit-margin";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface CategoryProfitMargin {
  id: number;
  name: string;
  profitPercent: number | null;
}

interface UpdateMarginInput {
  categoryId: number;
  profitPercent: number | null;
}

function normalizeUpdates(value: unknown): UpdateMarginInput[] {
  if (!Array.isArray(value)) {
    throw new Error("รูปแบบข้อมูลเปอร์เซ็นต์กำไรไม่ถูกต้อง");
  }

  return value.map((item) => {
    const source = item as Record<string, unknown>;
    const categoryId = Number(source.categoryId);
    const rawProfitPercent = source.profitPercent;
    const profitPercent =
      rawProfitPercent === null || rawProfitPercent === ""
        ? null
        : Number(rawProfitPercent);

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      throw new Error("ไม่พบประเภทสินค้าที่ต้องการบันทึก");
    }

    if (
      profitPercent !== null &&
      (!Number.isFinite(profitPercent) ||
        profitPercent < 0 ||
        profitPercent > 100)
    ) {
      throw new Error("เปอร์เซ็นต์กำไรต้องอยู่ระหว่าง 0 ถึง 100");
    }

    return {
      categoryId,
      profitPercent:
        profitPercent === null ? null : Number(profitPercent.toFixed(2)),
    };
  });
}

export async function GET() {
  try {
    await ensureCategoryProfitMarginTable();

    const rows = await executeQuery<{
      id: number;
      name: string;
      profitPercent: number | null;
    }>(
      `
        SELECT
          category.Code as id,
          ISNULL(category.CaseProduct, '') as name,
          margin.ProfitPercent as profitPercent
        FROM dbo.CaseProduct category
        LEFT JOIN dbo.${categoryProfitMarginTable} margin
          ON margin.CategoryCode = category.Code
        WHERE NULLIF(LTRIM(RTRIM(ISNULL(category.CaseProduct, ''))), '') IS NOT NULL
        ORDER BY category.Code ASC
      `,
    );

    const response: ApiResponse<CategoryProfitMargin[]> = {
      success: true,
      data: rows.map((row) => ({
        id: Number(row.id),
        name: row.name.trim(),
        profitPercent:
          row.profitPercent === null ? null : Number(row.profitPercent),
      })),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Category profit margin API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถดึงเปอร์เซ็นต์กำไรตามประเภทสินค้าได้",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const updates = normalizeUpdates(body.margins);

    await ensureCategoryProfitMarginTable();

    const categoryRows = await executeQuery<{ id: number }>(
      "SELECT Code as id FROM dbo.CaseProduct",
    );
    const validCategoryIds = new Set(categoryRows.map((row) => Number(row.id)));

    if (updates.some((update) => !validCategoryIds.has(update.categoryId))) {
      return NextResponse.json(
        {
          success: false,
          error: "มีประเภทสินค้าบางรายการที่ไม่อยู่ในระบบ",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    for (const update of updates) {
      if (update.profitPercent === null) {
        await executeQuery(
          `DELETE FROM dbo.${categoryProfitMarginTable} WHERE CategoryCode = @categoryId`,
          { categoryId: update.categoryId },
        );
        continue;
      }

      await executeQuery(
        `
          MERGE dbo.${categoryProfitMarginTable} AS target
          USING (
            SELECT
              CONVERT(int, @categoryId) as CategoryCode,
              CONVERT(decimal(5, 2), @profitPercent) as ProfitPercent
          ) AS source
          ON target.CategoryCode = source.CategoryCode
          WHEN MATCHED THEN
            UPDATE SET
              ProfitPercent = source.ProfitPercent,
              UpdatedAt = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (CategoryCode, ProfitPercent, UpdatedAt)
            VALUES (source.CategoryCode, source.ProfitPercent, GETDATE());
        `,
        {
          categoryId: update.categoryId,
          profitPercent: update.profitPercent,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data: { updated: updates.length },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถบันทึกเปอร์เซ็นต์กำไรได้";
    console.error("Update category profit margin API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 400 },
    );
  }
}

export const dynamic = "force-dynamic";
