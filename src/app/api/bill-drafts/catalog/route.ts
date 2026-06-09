/**
 * Bill Draft Catalog API
 * ค้นหาลูกค้าและสินค้าเดิมเพื่อช่วยเปิดบิลจากมือถือ
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim() || "";
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") || "8", 10),
      20,
    );
    const searchLike = `%${search}%`;

    const customerQuery = `
      SELECT TOP (@limit)
        ISNULL(CodeCustomer, '') as codeCustomer,
        ISNULL(NameCustomer, '') as nameCustomer,
        ISNULL(PhoneCustomer, '') as phoneCustomer,
        ISNULL(NameCar, '') as nameCar,
        ISNULL(Province, '') as province,
        ISNULL(BrandAndGenerate, '') as brandAndGenerate
      FROM dbo.Customer
      WHERE @search = ''
        OR CodeCustomer LIKE @searchLike
        OR NameCustomer LIKE @searchLike
        OR PhoneCustomer LIKE @searchLike
        OR NameCar LIKE @searchLike
      ORDER BY Code DESC
    `;

    const productQuery = `
      SELECT TOP (@limit)
        ISNULL(BarCode, '') as barCode,
        ISNULL(NameProduct, '') as name,
        ISNULL(MAX(SalePrice), 0) as unitPrice,
        ISNULL(
          SUM(SumCost) / NULLIF(SUM(CASE WHEN NumProduct = 0 THEN 0 ELSE NumProduct END), 0),
          0
        ) as cost,
        COUNT(*) as usedCount
      FROM dbo.DetailSalePost
      WHERE @search = ''
        OR BarCode LIKE @searchLike
        OR NameProduct LIKE @searchLike
      GROUP BY BarCode, NameProduct
      ORDER BY usedCount DESC, name ASC
    `;

    const [customers, products] = await Promise.all([
      executeQuery<{
        codeCustomer: string;
        nameCustomer: string;
        phoneCustomer: string;
        nameCar: string;
        province: string;
        brandAndGenerate: string;
      }>(customerQuery, { limit, search, searchLike }, false),
      executeQuery<{
        barCode: string;
        name: string;
        unitPrice: number;
        cost: number;
        usedCount: number;
      }>(productQuery, { limit, search, searchLike }, false),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        customers,
        products,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Bill draft catalog API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bill draft catalog",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
