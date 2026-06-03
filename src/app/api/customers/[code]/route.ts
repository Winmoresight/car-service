/**
 * Customer Detail API - ข้อมูลลูกค้ารายบุคคล
 * GET /api/customers/[code] - ดึงข้อมูลลูกค้าและประวัติการซื้อ
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

interface PurchaseHistory {
  dateSalePost: string;
  numberPrintSalePost: string;
  nameCar: string;
  totalPrice: number;
  totalCost: number;
  totalProfit: number;
  status: string;
  itemCount: number;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    // ดึงข้อมูลลูกค้า
    const customerQuery = `
      SELECT 
        Code as code,
        CodeCustomer as codeCustomer,
        NameCustomer as nameCustomer,
        PhoneCustomer as phoneCustomer,
        AddressCustomer as addressCustomer,
        NameCar as nameCar,
        Province as province,
        BrandAndGenerate as brandAndGenerate,
        MileCar as mileCar,
        DateRegistration as dateRegistration,
        CaseCustomer as caseCustomer,
        GradePrice as gradePrice
      FROM Customer
      WHERE Code = @code
    `;

    const customers = await executeQuery<{
      code: number;
      codeCustomer: string;
      nameCustomer: string;
      phoneCustomer: string;
      addressCustomer: string;
      nameCar: string;
      province: string;
      brandAndGenerate: string;
      mileCar: string;
      dateRegistration: string | null;
      caseCustomer: string;
      gradePrice: string;
    }>(customerQuery, { code });

    if (customers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Customer not found",
        },
        { status: 404 },
      );
    }

    const customer = customers[0];

    // ดึงประวัติการซื้อ
    const purchaseQuery = `
      SELECT 
        m.DateSalePost as dateSalePost,
        m.NumberPrintSalePost as numberPrintSalePost,
        m.NameCar as nameCar,
        m.TotalPrice as totalPrice,
        m.TotalCost as totalCost,
        m.TotalProfit as totalProfit,
        m.Status as status,
        COUNT(d.OderNum) as itemCount
      FROM MasterSalePost m
      LEFT JOIN DetailSalePost d ON m.NumberPrintSalePost = d.NumberPrintSalePost
      WHERE m.CodeCustomer = @codeCustomer
      GROUP BY 
        m.DateSalePost,
        m.NumberPrintSalePost,
        m.NameCar,
        m.TotalPrice,
        m.TotalCost,
        m.TotalProfit,
        m.Status
      ORDER BY m.DateSalePost DESC
    `;

    const purchases = await executeQuery<PurchaseHistory>(purchaseQuery, {
      codeCustomer: customer.codeCustomer,
    });

    // คำนวณสถิติ
    const stats = {
      totalOrders: purchases.length,
      totalSpent: purchases.reduce((sum, p) => sum + p.totalPrice, 0),
      totalProfit: purchases.reduce((sum, p) => sum + p.totalProfit, 0),
      lastOrderDate: purchases.length > 0 ? purchases[0].dateSalePost : null,
      firstOrderDate:
        purchases.length > 0 ? purchases[purchases.length - 1].dateSalePost : null,
      averageOrderValue:
        purchases.length > 0
          ? purchases.reduce((sum, p) => sum + p.totalPrice, 0) / purchases.length
          : 0,
    };

    return NextResponse.json({
      success: true,
      data: {
        customer,
        purchases,
        stats,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching customer detail:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch customer detail",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
