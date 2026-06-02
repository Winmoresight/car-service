/**
 * Sale Detail API
 * GET /api/sales/[id] - ดึงรายละเอียดบิลขาย
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import type { ApiResponse } from "@/types/api";
import { maskName, maskPhone, maskIdCard } from "@/lib/privacy";

interface SaleDetail {
  // Header
  id: string;
  date: string;
  totalPrice: number;
  totalCost: number;
  totalProfit: number;
  cash: number;
  transfer: number;

  // Customer (masked)
  customer: {
    name: string;
    phone: string;
    address?: string;
  };

  // Items
  items: Array<{
    barCode: string;
    name: string;
    quantity: number;
    price: number;
    cost: number;
    total: number;
    profit: number;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Get sale header
    const headerQuery = `
      SELECT 
        m.NumberPrintSalePost as id,
        m.DateSalePost as date,
        m.TotalPrice as totalPrice,
        m.TotalCost as totalCost,
        m.TotalProfit as totalProfit,
        m.Cash as cash,
        m.Transfer as transfer,
        ISNULL(m.NameCustomer, 'ไม่ระบุ') as customerName,
        '' as customerPhone,
        '' as customerAddress
      FROM dbo.MasterSalePost m
      WHERE m.NumberPrintSalePost = @id
    `;

    const [header] = await executeQuery<{
      id: string;
      date: Date;
      totalPrice: number;
      totalCost: number;
      totalProfit: number;
      cash: number;
      transfer: number;
      customerName: string;
      customerPhone: string;
      customerAddress: string;
    }>(headerQuery, { id });

    if (!header) {
      return NextResponse.json(
        {
          success: false,
          error: "Sale not found",
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    // Get sale items
    const itemsQuery = `
      SELECT 
        BarCode as barCode,
        NameProduct as name,
        NumProduct as quantity,
        SalePrice as price,
        CASE WHEN NumProduct = 0 THEN 0 ELSE (SumCost / NumProduct) END as cost,
        SumPrice as total,
        SumProfit as profit
      FROM dbo.DetailSalePost
      WHERE NumberPrintSalePost = @id
      ORDER BY BarCode
    `;

    const items = await executeQuery<{
      barCode: string;
      name: string;
      quantity: number;
      price: number;
      cost: number;
      total: number;
      profit: number;
    }>(itemsQuery, { id });

    // Build response with masked data
    const saleDetail: SaleDetail = {
      id: header.id,
      date: new Date(header.date).toISOString(),
      totalPrice: header.totalPrice,
      totalCost: header.totalCost,
      totalProfit: header.totalProfit,
      cash: header.cash,
      transfer: header.transfer,
      customer: {
        name: maskName(header.customerName),
        phone: maskPhone(header.customerPhone),
        address: header.customerAddress
          ? header.customerAddress.substring(0, 20) + "..."
          : undefined,
      },
      items: items,
    };

    const response: ApiResponse<SaleDetail> = {
      success: true,
      data: saleDetail,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Sale detail API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sale detail",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
