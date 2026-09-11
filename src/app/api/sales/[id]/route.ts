/**
 * Sale Detail API
 * GET /api/sales/[id] - ดึงรายละเอียดบิลขาย
 */

import { type NextRequest, NextResponse } from "next/server";
import { ensureBillDepositPaymentTable } from "@/lib/bill-deposit-payment";
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
  depositPaymentMethod: "cash" | "transfer" | null;
  depositBankName: string;
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

function normalizeNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getDepositPaymentInfo(description: string) {
  const normalizedDescription = description.trim();
  const isTransfer =
    normalizedDescription.includes("เงินโอน") ||
    normalizedDescription.toLowerCase().includes("transfer");
  const isCash =
    normalizedDescription.includes("เงินสด") ||
    normalizedDescription.toLowerCase().includes("cash");
  const separatorIndex = Math.max(
    normalizedDescription.lastIndexOf(","),
    normalizedDescription.lastIndexOf("，"),
  );

  return {
    method: isTransfer
      ? ("transfer" as const)
      : isCash
        ? ("cash" as const)
        : null,
    bankName:
      isTransfer && separatorIndex >= 0
        ? normalizedDescription.slice(separatorIndex + 1).trim()
        : "",
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    await ensureBillDepositPaymentTable();

    // Get sale header
    const headerQuery = `
      SELECT 
        m.NumberPrintSalePost as id,
        m.DateSalePost as date,
        ${getSafeMoneyExpression("m.TotalPrice")} as storedTotalPrice,
        m.TotalCost as totalCost,
        m.TotalProfit as totalProfit,
        ${getSafeMoneyExpression("m.Cash")} as cash,
        ${getSafeMoneyExpression("m.Transfer")} as transfer,
        ${getSafeMoneyExpression("m.Deposits")} as storedDeposits,
        LTRIM(RTRIM(ISNULL(m.Status, ''))) as status,
        detailFinancials.grossPositiveTotal,
        detailFinancials.netDetailTotal,
        detailFinancials.legacyDepositAmount,
        detailFinancials.legacyDepositDescription,
        depositPayment.PaymentMethod as savedDepositPaymentMethod,
        ISNULL(depositPayment.Amount, 0) as savedDepositAmount,
        ISNULL(depositPayment.BankName, '') as savedDepositBankName,
        latestReceivable.outstandingAmount,
        latestReceivable.receivableBillNo,
        ISNULL(m.NameCustomer, 'ไม่ระบุ') as customerName,
        ISNULL(c.PhoneCustomer, '') as customerPhone,
        ISNULL(c.AddressCustomer, '') as customerAddress
      FROM dbo.MasterSalePost m
      LEFT JOIN dbo.Customer c ON m.CodeCustomer = c.CodeCustomer
      LEFT JOIN dbo.WebBillDepositPayments depositPayment
        ON depositPayment.BillNo = m.NumberPrintSalePost
      OUTER APPLY (
        SELECT
          ISNULL(SUM(CASE WHEN ${getSafeMoneyExpression("d.SumPrice")} > 0 THEN ${getSafeMoneyExpression("d.SumPrice")} ELSE 0 END), 0) as grossPositiveTotal,
          ISNULL(SUM(${getSafeMoneyExpression("d.SumPrice")}), 0) as netDetailTotal,
          ISNULL(SUM(CASE WHEN ${getSafeMoneyExpression("d.SumPrice")} < 0 AND d.NameProduct LIKE N'%มัดจำ%' THEN ABS(${getSafeMoneyExpression("d.SumPrice")}) ELSE 0 END), 0) as legacyDepositAmount,
          MAX(CASE WHEN ${getSafeMoneyExpression("d.SumPrice")} < 0 AND d.NameProduct LIKE N'%มัดจำ%' THEN ISNULL(d.NameProduct, '') ELSE '' END) as legacyDepositDescription
        FROM dbo.DetailSalePost d
        WHERE d.NumberPrintSalePost = m.NumberPrintSalePost
      ) detailFinancials
      OUTER APPLY (
        SELECT TOP 1
          r.NumberPrintPost as receivableBillNo,
          ${getSafeMoneyExpression("r.SubMoney")} as outstandingAmount
        FROM dbo.MasterRecivePaymentCustomer r
        WHERE r.NumberPrintPost = m.NumberPrintSalePost
        ORDER BY r.DatePost DESC
      ) latestReceivable
      WHERE m.NumberPrintSalePost = @id
    `;

    const [header] = await executeQuery<{
      id: string;
      date: Date;
      storedTotalPrice: number;
      totalCost: number;
      totalProfit: number;
      cash: number;
      transfer: number;
      storedDeposits: number;
      status: string;
      grossPositiveTotal: number;
      netDetailTotal: number;
      legacyDepositAmount: number;
      legacyDepositDescription: string;
      savedDepositPaymentMethod: "cash" | "transfer" | null;
      savedDepositAmount: number;
      savedDepositBankName: string;
      outstandingAmount: number | null;
      receivableBillNo: string | null;
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

    const storedTotalPrice = normalizeNumber(header.storedTotalPrice);
    const storedCash = normalizeNumber(header.cash);
    const storedTransfer = normalizeNumber(header.transfer);
    const storedDeposits = normalizeNumber(header.storedDeposits);
    const legacyDepositAmount = normalizeNumber(header.legacyDepositAmount);
    const isLegacyNetTotal =
      legacyDepositAmount > 0 &&
      Math.abs(normalizeNumber(header.netDetailTotal) - storedTotalPrice) <
        0.01;
    const totalPrice = isLegacyNetTotal
      ? normalizeNumber(header.grossPositiveTotal)
      : storedTotalPrice;
    const deposits = storedDeposits || legacyDepositAmount;
    const depositPayment = getDepositPaymentInfo(
      header.legacyDepositDescription || "",
    );
    const depositPaymentMethod =
      header.savedDepositPaymentMethod || depositPayment.method;
    const depositBankName =
      header.savedDepositBankName || depositPayment.bankName;
    const savedDepositAmount = normalizeNumber(header.savedDepositAmount);
    const cash = Math.max(
      storedCash -
        (header.savedDepositPaymentMethod === "cash" ? savedDepositAmount : 0),
      0,
    );
    const transfer = Math.max(
      storedTransfer -
        (header.savedDepositPaymentMethod === "transfer"
          ? savedDepositAmount
          : 0),
      0,
    );
    const fallbackOutstanding = header.savedDepositPaymentMethod
      ? storedTotalPrice - storedCash - storedTransfer
      : isLegacyNetTotal
        ? storedTotalPrice - storedCash - storedTransfer
        : storedTotalPrice - storedCash - storedTransfer - deposits;
    const receivableAmount = header.receivableBillNo
      ? Math.max(normalizeNumber(header.outstandingAmount), 0)
      : header.status === "ค้างชำระ"
        ? Math.max(fallbackOutstanding, 0)
        : 0;

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
      totalPrice,
      totalCost: header.totalCost,
      totalProfit: header.totalProfit,
      cash,
      transfer,
      deposits,
      depositPaymentMethod,
      depositBankName,
      receivableAmount,
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
