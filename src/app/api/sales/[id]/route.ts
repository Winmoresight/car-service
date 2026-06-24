/**
 * Sale Detail API
 * GET /api/sales/[id] - ดึงรายละเอียดบิลขาย
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";
import { maskPhone } from "@/lib/privacy";
import type { ApiResponse } from "@/types/api";

function getSafeMoneyExpression(valueExpression: string) {
  const textExpression = `CONVERT(nvarchar(100), ${valueExpression})`;

  return `ISNULL(CONVERT(money, CASE WHEN ${valueExpression} IS NULL THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

interface SaleDetail {
  // Header
  id: string;
  date: string;
  totalPrice: number;
  totalCost: number;
  totalProfit: number;
  cash: number;
  transfer: number;
  deposits: number;
  receivableAmount: number;

  // Customer
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
  _request: NextRequest,
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
        ${getSafeMoneyExpression("m.Deposits")} as deposits,
        CASE
          WHEN LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ค้างชำระ'
            THEN CASE
              WHEN m.TotalPrice - ISNULL(m.Cash, 0) - ISNULL(m.Transfer, 0) - ${getSafeMoneyExpression("m.Deposits")} > 0
                THEN m.TotalPrice - ISNULL(m.Cash, 0) - ISNULL(m.Transfer, 0) - ${getSafeMoneyExpression("m.Deposits")}
              ELSE 0
            END
          ELSE 0
        END as receivableAmount,
        ISNULL(m.NameCustomer, 'ไม่ระบุ') as customerName,
        ISNULL(c.PhoneCustomer, '') as customerPhone,
        ISNULL(c.AddressCustomer, '') as customerAddress
      FROM dbo.MasterSalePost m
      LEFT JOIN dbo.Customer c ON m.CodeCustomer = c.CodeCustomer
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
      deposits: number;
      receivableAmount: number;
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

    // Build response with full customer name for internal sale detail view.
    const saleDetail: SaleDetail = {
      id: header.id,
      date: new Date(header.date).toISOString(),
      totalPrice: header.totalPrice,
      totalCost: header.totalCost,
      totalProfit: header.totalProfit,
      cash: header.cash,
      transfer: header.transfer,
      deposits: header.deposits,
      receivableAmount: header.receivableAmount,
      customer: {
        name: header.customerName,
        phone: maskPhone(header.customerPhone),
        address: header.customerAddress
          ? `${header.customerAddress.substring(0, 20)}...`
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
