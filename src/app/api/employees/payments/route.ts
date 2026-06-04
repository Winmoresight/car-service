/**
 * API Endpoint: GET /api/employees/payments
 * ดึงข้อมูลการจ่ายเงินเดือนพนักงาน
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

interface Payment {
  OrderNum: number;
  DatePost: string;
  NumberPrintPost: string;
  CodeStaff: number;
  NameSure: string;
  NamePositions: string;
  DateStart: string;
  DateEnd: string;
  AdvancePayment: string;
  PriceToWorkDay: string;
  NumdateWork: string;
  PriceBonus: string;
  TotalPrice: number;
  Datepayment: string;
  UserName: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codeStaff = searchParams.get("codeStaff");
    const excludeZero = searchParams.get("excludeZero") === "true";
    const limit = searchParams.get("limit") || "100";

    let query = `
      SELECT TOP ${limit}
        OrderNum,
        DatePost,
        NumberPrintPost,
        CodeStaff,
        NameSure,
        NamePositions,
        DateStart,
        DateEnd,
        AdvancePayment,
        PriceToWorkDay,
        NumdateWork,
        PriceBonus,
        TotalPrice,
        Datepayment,
        UserName
      FROM dbo.Payment
      WHERE 1=1
    `;

    if (codeStaff) {
      query += ` AND CodeStaff = ${codeStaff}`;
    }

    // กรองข้อมูลที่ CodeStaff = 0 (รายจ่ายอื่นๆ ที่ไม่ใช่เงินเดือน)
    if (excludeZero) {
      query += ` AND CodeStaff > 0 AND NameSure IS NOT NULL AND NameSure != ''`;
    }

    query += ` ORDER BY DatePost DESC, OrderNum DESC`;

    const payments = await executeQuery<Payment>(query);

    return NextResponse.json({
      success: true,
      data: payments,
      total: payments.length,
    });
  } catch (error) {
    console.error("❌ Error fetching payments:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch payments",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
