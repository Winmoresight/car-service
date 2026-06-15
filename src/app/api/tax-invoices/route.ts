/**
 * Receivable Bills API
 * GET /api/tax-invoices - ดึงรายการบิลขายหลักสำหรับหน้าลูกหนี้
 */

import sql from "mssql";
import { type NextRequest, NextResponse } from "next/server";
import { executeQuery, getPool } from "@/lib/db";
import { ensureReceivablePaymentLogTable } from "@/lib/receivable-payment-log";
import type { ApiResponse } from "@/types/api";

interface ReceivableBill {
  numberPrint: string;
  date: string;
  customerCode: string;
  customerName: string;
  nameCar: string;
  province: string;
  totalPrice: number;
  cash: number;
  transfer: number;
  paidAmount: number;
  receivableAmount: number;
  status: string;
  userName: string;
}

interface ReceivableSummary {
  totalAmount: number;
  paidAmount: number;
  totalCash: number;
  totalTransfer: number;
  receivableAmount: number;
  receivableCount: number;
}

type PaymentMethod = "cash" | "transfer";

function getSafeMoneyExpression(valueExpression: string) {
  const textExpression = `CONVERT(nvarchar(100), ${valueExpression})`;

  return `ISNULL(CONVERT(money, CASE WHEN ${valueExpression} IS NULL THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

function buildWhereClause() {
  return ["LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ค้างชำระ'"];
}

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "cash" || value === "transfer";
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);
    const search = searchParams.get("search") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";
    const conditions = buildWhereClause();

    if (search) {
      conditions.push(`(
        m.NumberPrintSalePost LIKE @search
        OR m.NameCustomer LIKE @search
        OR m.CodeCustomer LIKE @search
        OR m.NameCar LIKE @search
        OR m.Province LIKE @search
      )`);
    }

    if (startDate) {
      conditions.push("CONVERT(date, m.DateSalePost) >= @startDate");
    }

    if (endDate) {
      conditions.push("CONVERT(date, m.DateSalePost) <= @endDate");
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const baseCte = `
      WITH latest_receivable AS (
        SELECT
          NumberPrintPost,
          ${getSafeMoneyExpression("SubMoney")} as sub_money,
          ROW_NUMBER() OVER (
            PARTITION BY NumberPrintPost
            ORDER BY DatePost DESC
          ) as row_number
        FROM dbo.MasterRecivePaymentCustomer
      ),
      normalized AS (
        SELECT
          m.NumberPrintSalePost as numberPrint,
          m.DateSalePost as date,
          ISNULL(m.CodeCustomer, '') as customerCode,
          ISNULL(m.NameCustomer, N'ไม่ระบุ') as customerName,
          ISNULL(m.NameCar, '') as nameCar,
          ISNULL(m.Province, '') as province,
          ${getSafeMoneyExpression("m.TotalPrice")} as totalPrice,
          ${getSafeMoneyExpression("m.Cash")} as cash,
          ${getSafeMoneyExpression("m.Transfer")} as transfer,
          LTRIM(RTRIM(ISNULL(m.Status, ''))) as status,
          ISNULL(m.NameSave, '') as userName,
          CASE
            WHEN LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ค้างชำระ'
              THEN CASE
                WHEN latest_receivable.NumberPrintPost IS NOT NULL
                  THEN latest_receivable.sub_money
                ELSE ${getSafeMoneyExpression("m.TotalPrice")}
                  - ${getSafeMoneyExpression("m.Cash")}
                  - ${getSafeMoneyExpression("m.Transfer")}
              END
            ELSE 0
          END as rawReceivableAmount
        FROM dbo.MasterSalePost m
        LEFT JOIN latest_receivable
          ON latest_receivable.NumberPrintPost = m.NumberPrintSalePost
          AND latest_receivable.row_number = 1
        ${whereClause}
      )
    `;

    const query = `
      ${baseCte},
      PaginatedData AS (
        SELECT
          numberPrint,
          date,
          customerCode,
          customerName,
          nameCar,
          province,
          totalPrice,
          cash,
          transfer,
          CASE
            WHEN rawReceivableAmount > 0
              THEN CASE
                WHEN totalPrice - rawReceivableAmount > 0
                  THEN totalPrice - rawReceivableAmount
                ELSE 0
              END
            ELSE cash + transfer
          END as paidAmount,
          CASE
            WHEN rawReceivableAmount > 0 THEN rawReceivableAmount
            ELSE 0
          END as receivableAmount,
          status,
          userName,
          ROW_NUMBER() OVER (ORDER BY date DESC, numberPrint DESC) as RowNum
        FROM normalized
      )
      SELECT
        numberPrint,
        date,
        customerCode,
        customerName,
        nameCar,
        province,
        totalPrice,
        cash,
        transfer,
        paidAmount,
        receivableAmount,
        status,
        userName
      FROM PaginatedData
      WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
      ORDER BY RowNum
    `;

    const params = {
      limit,
      offset,
      search: `%${search}%`,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };

    const results = await executeQuery<{
      numberPrint: string;
      date: Date;
      customerCode: string;
      customerName: string;
      nameCar: string;
      province: string;
      totalPrice: number;
      cash: number;
      transfer: number;
      paidAmount: number;
      receivableAmount: number;
      status: string;
      userName: string;
    }>(query, params);

    const bills: ReceivableBill[] = results.map((row) => ({
      numberPrint: row.numberPrint,
      date: new Date(row.date).toISOString(),
      customerCode: row.customerCode,
      customerName: row.customerName,
      nameCar: row.nameCar,
      province: row.province,
      totalPrice: Number(row.totalPrice) || 0,
      cash: Number(row.cash) || 0,
      transfer: Number(row.transfer) || 0,
      paidAmount: Number(row.paidAmount) || 0,
      receivableAmount: Number(row.receivableAmount) || 0,
      status: row.status,
      userName: row.userName,
    }));

    const [countResult] = await executeQuery<{ total: number }>(
      `
        ${baseCte}
        SELECT COUNT(*) as total
        FROM normalized
      `,
      params,
    );

    const [summaryResult] = await executeQuery<ReceivableSummary>(
      `
        ${baseCte}
        SELECT
          ISNULL(SUM(totalPrice), 0) as totalAmount,
          ISNULL(
            SUM(
              CASE
                WHEN rawReceivableAmount > 0 THEN
                  CASE
                    WHEN totalPrice - rawReceivableAmount > 0
                      THEN totalPrice - rawReceivableAmount
                    ELSE 0
                  END
                ELSE cash + transfer
              END
            ),
            0
          ) as paidAmount,
          ISNULL(SUM(cash), 0) as totalCash,
          ISNULL(SUM(transfer), 0) as totalTransfer,
          ISNULL(
            SUM(
              CASE
                WHEN rawReceivableAmount > 0 THEN rawReceivableAmount
                ELSE 0
              END
            ),
            0
          ) as receivableAmount,
          ISNULL(
            SUM(
              CASE
                WHEN rawReceivableAmount > 0 THEN 1
                ELSE 0
              END
            ),
            0
          ) as receivableCount
        FROM normalized
      `,
      params,
    );

    const response: ApiResponse<{
      taxInvoices: ReceivableBill[];
      summary: ReceivableSummary;
      total: number;
      limit: number;
      offset: number;
    }> = {
      success: true,
      data: {
        taxInvoices: bills,
        summary: summaryResult ?? {
          totalAmount: 0,
          paidAmount: 0,
          totalCash: 0,
          totalTransfer: 0,
          receivableAmount: 0,
          receivableCount: 0,
        },
        total: countResult?.total || 0,
        limit,
        offset,
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Receivable Bills API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch receivable bill data",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  let transaction: sql.Transaction | null = null;
  let transactionStarted = false;
  let transactionCommitted = false;

  try {
    const body = await request.json();
    const billNo = sanitizeText(body?.numberPrint);
    const paymentMethod = sanitizeText(body?.paymentMethod);
    const nameBank = sanitizeText(body?.nameBank);

    if (!billNo) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาระบุเลขที่บิล",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    if (!isPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาเลือกวิธีรับชำระ",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    if (paymentMethod === "transfer" && !nameBank) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาระบุธนาคารสำหรับเงินโอน",
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    await ensureReceivablePaymentLogTable();

    const pool = await getPool();
    transaction = new sql.Transaction(pool);

    await transaction.begin();
    transactionStarted = true;

    const saleRequest = new sql.Request(transaction);
    saleRequest.input("billNo", billNo);

    const saleResult = await saleRequest.query<{
      numberPrint: string;
      codeCustomer: string;
      customerName: string;
      nameCar: string;
      province: string;
      totalPrice: number;
      cash: number;
      transfer: number;
      status: string;
      remainingAmount: number;
    }>(`
      SELECT TOP 1
        m.NumberPrintSalePost as numberPrint,
        ISNULL(m.CodeCustomer, '') as codeCustomer,
        ISNULL(m.NameCustomer, N'ไม่ระบุ') as customerName,
        ISNULL(m.NameCar, '') as nameCar,
        ISNULL(m.Province, '') as province,
        ${getSafeMoneyExpression("m.TotalPrice")} as totalPrice,
        ${getSafeMoneyExpression("m.Cash")} as cash,
        ${getSafeMoneyExpression("m.Transfer")} as transfer,
        LTRIM(RTRIM(ISNULL(m.Status, ''))) as status,
        CASE
          WHEN latest_receivable.sub_money IS NOT NULL
            THEN latest_receivable.sub_money
          ELSE ${getSafeMoneyExpression("m.TotalPrice")}
            - ${getSafeMoneyExpression("m.Cash")}
            - ${getSafeMoneyExpression("m.Transfer")}
        END as remainingAmount
      FROM dbo.MasterSalePost m WITH (UPDLOCK, HOLDLOCK)
      OUTER APPLY (
        SELECT TOP 1
          ${getSafeMoneyExpression("SubMoney")} as sub_money
        FROM dbo.MasterRecivePaymentCustomer
        WHERE NumberPrintPost = m.NumberPrintSalePost
        ORDER BY DatePost DESC
      ) latest_receivable
      WHERE m.NumberPrintSalePost = @billNo
    `);

    const sale = saleResult.recordset[0];

    if (!sale) {
      await transaction.rollback();
      transactionStarted = false;
      return NextResponse.json(
        {
          success: false,
          error: "ไม่พบบิลนี้ในระบบ",
          timestamp: new Date().toISOString(),
        },
        { status: 404 },
      );
    }

    if (sale.status !== "ค้างชำระ") {
      await transaction.rollback();
      transactionStarted = false;
      return NextResponse.json(
        {
          success: false,
          error: "บิลนี้ไม่ได้อยู่ในสถานะค้างชำระแล้ว",
          timestamp: new Date().toISOString(),
        },
        { status: 409 },
      );
    }

    const remainingAmount = Math.max(Number(sale.remainingAmount) || 0, 0);

    const updateRequest = new sql.Request(transaction);
    updateRequest.input("billNo", billNo);
    updateRequest.input("remainingAmount", sql.Money, remainingAmount);
    updateRequest.input("nameBank", nameBank);
    updateRequest.input("isCashPayment", sql.Bit, paymentMethod === "cash");
    updateRequest.input(
      "isTransferPayment",
      sql.Bit,
      paymentMethod === "transfer",
    );

    await updateRequest.query(`
      UPDATE dbo.MasterSalePost
      SET
        Cash = CASE
          WHEN @remainingAmount > 0 AND @isCashPayment = 1
            THEN ${getSafeMoneyExpression("Cash")} + @remainingAmount
          ELSE Cash
        END,
        Transfer = CASE
          WHEN @remainingAmount > 0 AND @isTransferPayment = 1
            THEN ${getSafeMoneyExpression("Transfer")} + @remainingAmount
          ELSE Transfer
        END,
        NameBank = CASE
          WHEN @isTransferPayment = 1
            THEN @nameBank
          ELSE ISNULL(NameBank, '')
        END,
        Status = N'ชำระเงินแล้ว'
      WHERE NumberPrintSalePost = @billNo
    `);

    const paidAt = new Date();
    const receivableRequest = new sql.Request(transaction);
    receivableRequest.input("datePost", sql.DateTime, paidAt);
    receivableRequest.input("billNo", billNo);
    receivableRequest.input("customerCode", sale.codeCustomer);
    receivableRequest.input("customerName", sale.customerName);
    receivableRequest.input(
      "totalPrice",
      sql.Money,
      Number(sale.totalPrice) || 0,
    );
    receivableRequest.input(
      "payMoney",
      sql.Money,
      Number(sale.totalPrice) || 0,
    );
    receivableRequest.input("subMoney", sql.Money, 0);

    await receivableRequest.query(`
      INSERT INTO dbo.MasterRecivePaymentCustomer (
        DatePost,
        NumberPrintPost,
        CodeCustomer,
        NameCustomer,
        TotalPrice,
        PayMoney,
        SubMoney
      )
      VALUES (
        @datePost,
        @billNo,
        @customerCode,
        @customerName,
        @totalPrice,
        @payMoney,
        @subMoney
      )
    `);

    const logRequest = new sql.Request(transaction);
    logRequest.input("paidAt", sql.DateTime, paidAt);
    logRequest.input("billNo", billNo);
    logRequest.input("customerCode", sale.codeCustomer);
    logRequest.input("customerName", sale.customerName);
    logRequest.input("nameCar", sale.nameCar);
    logRequest.input("province", sale.province);
    logRequest.input("paidAmount", sql.Money, remainingAmount);
    logRequest.input("paymentMethod", paymentMethod);
    logRequest.input("nameBank", nameBank);
    logRequest.input("createdBy", "WEB");

    await logRequest.query(`
      INSERT INTO dbo.WebReceivablePayments (
        PaidAt,
        NumberPrintSalePost,
        CodeCustomer,
        NameCustomer,
        NameCar,
        Province,
        PaidAmount,
        PaymentMethod,
        NameBank,
        CreatedBy
      )
      VALUES (
        @paidAt,
        @billNo,
        @customerCode,
        @customerName,
        @nameCar,
        @province,
        @paidAmount,
        @paymentMethod,
        @nameBank,
        @createdBy
      )
    `);

    await transaction.commit();
    transactionCommitted = true;

    return NextResponse.json({
      success: true,
      data: {
        numberPrint: billNo,
        status: "ชำระเงินแล้ว",
        paidAmount: Number(sale.totalPrice) || 0,
        receivableAmount: 0,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (transaction && transactionStarted && !transactionCommitted) {
      try {
        await transaction.rollback();
      } catch {
        // Ignore rollback failures so the original error is returned.
      }
    }

    console.error("Update receivable status API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถปรับสถานะลูกหนี้ได้",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
