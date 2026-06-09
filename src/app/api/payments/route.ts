/**
 * API Endpoint: GET /api/payments
 * ดึงข้อมูลการจ่ายเงินทั้งหมด (เงินเดือน + ค่าใช้จ่ายอื่นๆ)
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

interface Payment {
  OrderNum: number;
  DatePost: string;
  Times: string;
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
  TotalCarriedForward: string;
  Datepayment: string;
  NameExpensesORIncome: string;
  CodeTypepayment: number;
  Debit: number;
  Credit: number;
  MoneyCash: number;
  MoneyTransfer: number;
  Codebank: string;
  NameBank: string;
  Cardbank: string;
  CodePrint: string;
  Remark: string;
  UserName: string;
  TypeDetail: number;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") || "100";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const paymentType = searchParams.get("type"); // 'salary' | 'expense' | 'all'

    let query = `
      SELECT TOP ${limit}
        OrderNum,
        DatePost,
        Times,
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
        TotalCarriedForward,
        Datepayment,
        NameExpensesORIncome,
        CodeTypepayment,
        Debit,
        Credit,
        MoneyCash,
        MoneyTransfer,
        Codebank,
        NameBank,
        Cardbank,
        CodePrint,
        Remark,
        UserName,
        TypeDetail
      FROM dbo.Payment
      WHERE 1=1
    `;

    // กรองตามประเภท
    if (paymentType === "salary") {
      query += ` AND CodeStaff > 0 AND NameSure IS NOT NULL AND NameSure != ''`;
    } else if (paymentType === "expense") {
      query += ` AND (CodeStaff = 0 OR CodeStaff IS NULL OR NameSure = '' OR NameSure IS NULL)`;
    }

    // กรองตามวันที่
    if (dateFrom) {
      query += ` AND Datepayment >= '${dateFrom}'`;
    }
    if (dateTo) {
      query += ` AND Datepayment <= '${dateTo}'`;
    }

    query += ` ORDER BY Datepayment DESC, OrderNum DESC`;

    const payments = await executeQuery<Payment>(query);

    // แปลงค่า Debit และ Credit เป็นตัวเลข และป้องกัน NaN
    const normalizedPayments = payments.map((p) => ({
      ...p,
      Debit: Number(p.Debit) || 0,
      Credit: Number(p.Credit) || 0,
      TotalPrice: Number(p.TotalPrice) || 0,
      MoneyCash: Number(p.MoneyCash) || 0,
      MoneyTransfer: Number(p.MoneyTransfer) || 0,
    }));

    // คำนวณสรุป
    const summary = {
      totalAmount: normalizedPayments.reduce((sum, p) => sum + p.TotalPrice, 0),
      totalCash: normalizedPayments.reduce((sum, p) => sum + p.MoneyCash, 0),
      totalTransfer: normalizedPayments.reduce((sum, p) => sum + p.MoneyTransfer, 0),
      totalDebit: normalizedPayments.reduce((sum, p) => sum + p.Debit, 0),
      totalCredit: normalizedPayments.reduce((sum, p) => sum + p.Credit, 0),
      salaryCount: normalizedPayments.filter(
        (p) => p.CodeStaff > 0 && p.NameSure && p.NameSure !== ""
      ).length,
      expenseCount: normalizedPayments.filter(
        (p) => !p.CodeStaff || p.CodeStaff === 0 || !p.NameSure || p.NameSure === ""
      ).length,
      debitCount: normalizedPayments.filter((p) => p.Debit > 0).length,
      creditCount: normalizedPayments.filter((p) => p.Credit > 0).length,
    };

    return NextResponse.json({
      success: true,
      data: normalizedPayments,
      total: normalizedPayments.length,
      summary,
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
