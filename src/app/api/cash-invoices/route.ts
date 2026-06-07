/**
 * Cash Invoices API (PSC - ใบกำกับภาษีเงินสดหน้าร้าน)
 * GET /api/cash-invoices - ดึงรายการใบกำกับภาษีเงินสดที่มีรหัสขึ้นต้นด้วย psc
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface CashInvoice {
  invoiceNo: string;
  dateSalePost: string;
  customerCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalAmount: number;
  userName: string;
  typeSale: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // Build query สำหรับ DetailSalePost ที่มีรหัสขึ้นต้นด้วย psc
    let query = `
      SELECT 
        ISNULL(NumberPrintSalePost, '') as invoiceNo,
        DateSalePost as dateSalePost,
        ISNULL(CodeCustomer, '') as customerCode,
        ISNULL(NameProduct, '') as productName,
        ISNULL(NumProduct, 0) as quantity,
        ISNULL(SalePrice, 0) as unitPrice,
        ISNULL(ReducePrice, 0) as discount,
        ISNULL(SumPrice, 0) as totalAmount,
        ISNULL(NameSave, '') as userName,
        ISNULL(TypeSale, '') as typeSale
      FROM dbo.DetailSalePost
      WHERE NumberPrintSalePost LIKE 'psc%' OR NumberPrintSalePost LIKE 'PSC%'
    `;

    // Build additional WHERE conditions
    const conditions: string[] = [];
    
    if (search) {
      conditions.push(`(NumberPrintSalePost LIKE @search OR CodeCustomer LIKE @search OR NameProduct LIKE @search)`);
    }
    
    if (startDate) {
      conditions.push(`CONVERT(date, DateSalePost) >= @startDate`);
    }
    
    if (endDate) {
      conditions.push(`CONVERT(date, DateSalePost) <= @endDate`);
    }
    
    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }

    query += `
      ORDER BY DateSalePost DESC, NumberPrintSalePost DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const results = await executeQuery<{
      invoiceNo: string;
      dateSalePost: Date;
      customerCode: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      totalAmount: number;
      userName: string;
      typeSale: string;
    }>(query, {
      limit,
      offset,
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    const cashInvoices: CashInvoice[] = results.map((row) => ({
      invoiceNo: row.invoiceNo,
      dateSalePost: new Date(row.dateSalePost).toISOString(),
      customerCode: row.customerCode,
      productName: row.productName,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      discount: row.discount,
      totalAmount: row.totalAmount,
      userName: row.userName,
      typeSale: row.typeSale,
    }));

    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM dbo.DetailSalePost
      WHERE NumberPrintSalePost LIKE 'psc%' OR NumberPrintSalePost LIKE 'PSC%'
    `;
    
    const countConditions: string[] = [];
    
    if (search) {
      countConditions.push(`(NumberPrintSalePost LIKE @search OR CodeCustomer LIKE @search OR NameProduct LIKE @search)`);
    }
    
    if (startDate) {
      countConditions.push(`CONVERT(date, DateSalePost) >= @startDate`);
    }
    
    if (endDate) {
      countConditions.push(`CONVERT(date, DateSalePost) <= @endDate`);
    }
    
    if (countConditions.length > 0) {
      countQuery += ` AND ${countConditions.join(' AND ')}`;
    }

    const [countResult] = await executeQuery<{ total: number }>(countQuery, {
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    // Get summary statistics
    let summaryQuery = `
      SELECT 
        SUM(ISNULL(SumPrice, 0)) as totalAmount,
        COUNT(DISTINCT NumberPrintSalePost) as totalInvoices,
        SUM(ISNULL(NumProduct, 0)) as totalQuantity
      FROM dbo.DetailSalePost
      WHERE NumberPrintSalePost LIKE 'psc%' OR NumberPrintSalePost LIKE 'PSC%'
    `;

    const summaryConditions: string[] = [];
    
    if (search) {
      summaryConditions.push(`(NumberPrintSalePost LIKE @search OR CodeCustomer LIKE @search OR NameProduct LIKE @search)`);
    }
    
    if (startDate) {
      summaryConditions.push(`CONVERT(date, DateSalePost) >= @startDate`);
    }
    
    if (endDate) {
      summaryConditions.push(`CONVERT(date, DateSalePost) <= @endDate`);
    }
    
    if (summaryConditions.length > 0) {
      summaryQuery += ` AND ${summaryConditions.join(' AND ')}`;
    }

    const [summaryResult] = await executeQuery<{ 
      totalAmount: number;
      totalInvoices: number;
      totalQuantity: number;
    }>(summaryQuery, {
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    const response: ApiResponse<{
      cashInvoices: CashInvoice[];
      total: number;
      limit: number;
      offset: number;
      summary: {
        totalAmount: number;
        totalInvoices: number;
        totalQuantity: number;
      };
    }> = {
      success: true,
      data: {
        cashInvoices,
        total: countResult.total,
        limit,
        offset,
        summary: {
          totalAmount: summaryResult.totalAmount || 0,
          totalInvoices: summaryResult.totalInvoices || 0,
          totalQuantity: summaryResult.totalQuantity || 0,
        },
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Cash Invoices API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch cash invoices data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
