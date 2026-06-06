/**
 * Tax Invoices API
 * GET /api/tax-invoices - ดึงรายการใบกำกับภาษีทั้งหมด
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";

interface TaxInvoice {
  numberPrint: string;
  date: string;
  customerCode: string;
  customerName: string;
  nameCar: string;
  province: string;
  subVatePrice: number;
  vatePrice: number;
  totalPrice: number;
  status: string;
  userName: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const status = searchParams.get("status") || ""; // '', 'ค้างชำระ', 'ชำระเงินแล้ว', 'ยกเลิก'

    // Build query
    let query = `
      SELECT 
        NumberPrintPost as numberPrint,
        DatePost as date,
        ISNULL(CodeCustomer, '') as customerCode,
        ISNULL(NameCustomer, 'ไม่ระบุ') as customerName,
        ISNULL(NameCar, '') as nameCar,
        ISNULL(Province, '') as province,
        ISNULL(SubVatePrice, 0) as subVatePrice,
        ISNULL(VatePrice, 0) as vatePrice,
        ISNULL(TotalPrice, 0) as totalPrice,
        ISNULL(Status, '') as status,
        ISNULL(NameUser, '') as userName
      FROM dbo.MasterPrintPostVate
    `;

    // Build WHERE clause
    const conditions: string[] = [];
    
    if (search) {
      conditions.push(`(NumberPrintPost LIKE @search OR NameCustomer LIKE @search OR CodeCustomer LIKE @search)`);
    }
    
    if (startDate) {
      conditions.push(`CONVERT(date, DatePost) >= @startDate`);
    }
    
    if (endDate) {
      conditions.push(`CONVERT(date, DatePost) <= @endDate`);
    }

    if (status) {
      conditions.push(`Status = @status`);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
      ORDER BY DatePost DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    const results = await executeQuery<{
      numberPrint: string;
      date: Date;
      customerCode: string;
      customerName: string;
      nameCar: string;
      province: string;
      subVatePrice: number;
      vatePrice: number;
      totalPrice: number;
      status: string;
      userName: string;
    }>(query, {
      limit,
      offset,
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
    });

    const taxInvoices: TaxInvoice[] = results.map((row) => ({
      numberPrint: row.numberPrint,
      date: new Date(row.date).toISOString(),
      customerCode: row.customerCode,
      customerName: row.customerName,
      nameCar: row.nameCar,
      province: row.province,
      subVatePrice: row.subVatePrice,
      vatePrice: row.vatePrice,
      totalPrice: row.totalPrice,
      status: row.status,
      userName: row.userName,
    }));

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM dbo.MasterPrintPostVate`;
    
    const countConditions: string[] = [];
    
    if (search) {
      countConditions.push(`(NumberPrintPost LIKE @search OR NameCustomer LIKE @search OR CodeCustomer LIKE @search)`);
    }
    
    if (startDate) {
      countConditions.push(`CONVERT(date, DatePost) >= @startDate`);
    }
    
    if (endDate) {
      countConditions.push(`CONVERT(date, DatePost) <= @endDate`);
    }

    if (status) {
      countConditions.push(`Status = @status`);
    }
    
    if (countConditions.length > 0) {
      countQuery += ` WHERE ${countConditions.join(' AND ')}`;
    }

    const [countResult] = await executeQuery<{ total: number }>(countQuery, {
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: status || undefined,
    });

    const response: ApiResponse<{
      taxInvoices: TaxInvoice[];
      total: number;
      limit: number;
      offset: number;
    }> = {
      success: true,
      data: {
        taxInvoices,
        total: countResult.total,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Tax Invoices API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch tax invoices data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
