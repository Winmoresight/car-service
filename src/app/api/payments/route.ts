/**
 * API Endpoint: GET /api/payments
 * ดึงข้อมูลรายรับรายจ่ายทั้งหมด (รายรับ + รายจ่าย + รายการพนักงาน)
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

function getSafeMoneyExpression(valueExpression: string) {
  const textExpression = `LTRIM(RTRIM(CONVERT(nvarchar(100), ${valueExpression})))`;

  return `ISNULL(CONVERT(money, CASE WHEN ${valueExpression} IS NULL THEN '0' WHEN ${textExpression} IN ('', '-', '.', ',', '-.', '-,') THEN '0' WHEN ${textExpression} LIKE '%[^0-9.,-]%' THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedLimit = Number(searchParams.get("limit") || 20);
    const allowedLimits = [20, 50, 100, 200];
    const limit = allowedLimits.includes(requestedLimit) ? requestedLimit : 20;
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const paymentType = searchParams.get("type"); // 'salary' | 'income' | 'expense' | 'all'
    const scope = searchParams.get("scope"); // 'other' excludes employee payments
    const params: Record<string, unknown> = { limit };
    const totalPriceExpression = getSafeMoneyExpression("TotalPrice");
    const debitExpression = getSafeMoneyExpression("Debit");
    const creditExpression = getSafeMoneyExpression("Credit");
    const moneyCashExpression = getSafeMoneyExpression("MoneyCash");
    const moneyTransferExpression = getSafeMoneyExpression("MoneyTransfer");
    const hasEmployeeExpression =
      "CodeStaff > 0 AND NameSure IS NOT NULL AND NameSure != ''";
    const hasMoneyExpression = `(${totalPriceExpression} > 0 OR ${debitExpression} > 0 OR ${creditExpression} > 0)`;

    let query = `
      SELECT TOP (@limit)
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
        ${totalPriceExpression} as TotalPrice,
        TotalCarriedForward,
        Datepayment,
        NameExpensesORIncome,
        CodeTypepayment,
        ${debitExpression} as Debit,
        ${creditExpression} as Credit,
        ${moneyCashExpression} as MoneyCash,
        ${moneyTransferExpression} as MoneyTransfer,
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
      query += ` AND ${hasEmployeeExpression}`;
    } else if (paymentType === "income") {
      query += ` AND ${debitExpression} > 0 AND ${creditExpression} = 0 AND NOT (${hasEmployeeExpression})`;
    } else if (paymentType === "expense") {
      const otherExpenseCondition = `(${creditExpression} > 0 AND ${debitExpression} = 0 AND NOT (${hasEmployeeExpression}))`;
      const employeeExpenseCondition = `(${hasEmployeeExpression} AND ${hasMoneyExpression})`;

      query +=
        scope === "other"
          ? ` AND ${otherExpenseCondition}`
          : ` AND (${otherExpenseCondition} OR ${employeeExpenseCondition})`;
    }

    // กรองตามวันที่
    if (dateFrom) {
      query += ` AND CONVERT(date, Datepayment) >= @dateFrom`;
      params.dateFrom = dateFrom;
    }
    if (dateTo) {
      query += ` AND CONVERT(date, Datepayment) <= @dateTo`;
      params.dateTo = dateTo;
    }

    query += ` ORDER BY Datepayment DESC, OrderNum DESC`;

    const payments = await executeQuery<Payment>(query, params);

    // แปลงค่า Debit และ Credit เป็นตัวเลข และป้องกัน NaN
    const normalizedPayments = payments.map((p) => {
      const totalPrice = Number(p.TotalPrice) || 0;
      const debit = Number(p.Debit) || 0;
      const credit = Number(p.Credit) || 0;
      const hasEmployee =
        p.CodeStaff > 0 && Boolean(p.NameSure && p.NameSure !== "");
      const employeeExpense = Math.abs(totalPrice || debit || credit);

      return {
        ...p,
        Debit: hasEmployee ? 0 : debit,
        Credit: hasEmployee ? employeeExpense : credit,
        TotalPrice: totalPrice || employeeExpense,
        MoneyCash: Number(p.MoneyCash) || 0,
        MoneyTransfer: Number(p.MoneyTransfer) || 0,
      };
    });

    // คำนวณสรุป
    const summary = {
      totalAmount: normalizedPayments.reduce((sum, p) => sum + p.TotalPrice, 0),
      totalCash: normalizedPayments.reduce((sum, p) => sum + p.MoneyCash, 0),
      totalTransfer: normalizedPayments.reduce(
        (sum, p) => sum + p.MoneyTransfer,
        0,
      ),
      totalDebit: normalizedPayments.reduce((sum, p) => sum + p.Debit, 0),
      totalCredit: normalizedPayments.reduce((sum, p) => sum + p.Credit, 0),
      salaryCount: normalizedPayments.filter(
        (p) => p.CodeStaff > 0 && p.NameSure && p.NameSure !== "",
      ).length,
      expenseCount: normalizedPayments.filter(
        (p) =>
          !p.CodeStaff || p.CodeStaff === 0 || !p.NameSure || p.NameSure === "",
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
      { status: 500 },
    );
  }
}
