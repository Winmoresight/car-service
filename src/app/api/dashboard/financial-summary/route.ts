/**
 * Financial Summary API
 * GET /api/dashboard/financial-summary?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD
 */

import type { NextRequest } from "next/server";
import { handleApiError, successResponse, withTimeout } from "@/lib/api-utils";
import { executeQuery } from "@/lib/db";
import { receivablePaymentLogTableExists } from "@/lib/receivable-payment-log";
import type { FinancialSummary, FinancialSummaryListItem } from "@/types/api";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LIST_LIMIT = 500;

interface CategoryRow {
  name: string;
  quantity: number;
  amount: number;
}

interface SaleSummaryRow {
  bill_count: number;
  total: number;
  cash: number;
  transfer: number;
  deposits: number;
  transfer_count: number;
}

interface PaymentSummaryRow {
  income_total: number;
  income_cash: number;
  income_transfer: number;
  income_unclassified: number;
  expense_total: number;
  expense_cash: number;
  expense_transfer: number;
  expense_unclassified: number;
  employee_total: number;
  income_count: number;
  expense_count: number;
  employee_count: number;
}

interface PaymentRow {
  order_num: number;
  occurred_at: Date | null;
  document_no: string;
  payment_name: string;
  employee_name: string;
  position_name: string;
  bank_name: string;
  remark: string;
  effective_total: number;
  money_cash: number;
  money_transfer: number;
  is_income: number;
  has_employee: number;
}

interface ReceivablePaymentSummaryRow {
  count: number;
  total: number;
  cash: number;
  transfer: number;
}

interface ReceivablePaymentRow {
  id: string;
  occurred_at: Date | null;
  document_no: string;
  customer_name: string;
  name_car: string;
  province: string;
  amount: number;
  payment_method: "cash" | "transfer";
  bank_name: string;
}

interface TransferRow {
  document_no: string;
  occurred_at: Date | null;
  customer_name: string;
  name_car: string;
  province: string;
  amount: number;
  bank_name: string;
}

interface PaidSaleSummaryRow {
  count: number;
  total: number;
}

interface PaidSaleRow {
  document_no: string;
  occurred_at: Date | null;
  customer_name: string;
  name_car: string;
  province: string;
  amount: number;
  cash: number;
  transfer: number;
  deposits: number;
}

interface OutstandingSummaryRow {
  count: number;
  total: number;
}

interface OutstandingRow {
  document_no: string;
  occurred_at: Date | null;
  customer_name: string;
  name_car: string;
  province: string;
  amount: number;
}

const zeroPaymentSummary: PaymentSummaryRow = {
  income_total: 0,
  income_cash: 0,
  income_transfer: 0,
  income_unclassified: 0,
  expense_total: 0,
  expense_cash: 0,
  expense_transfer: 0,
  expense_unclassified: 0,
  employee_total: 0,
  income_count: 0,
  expense_count: 0,
  employee_count: 0,
};

function getSafeMoneyExpression(valueExpression: string) {
  const textExpression = `LTRIM(RTRIM(CONVERT(nvarchar(100), ${valueExpression})))`;

  return `ISNULL(CONVERT(money, CASE WHEN ${valueExpression} IS NULL THEN '0' WHEN ${textExpression} IN ('', '-', '.', ',', '-.', '-,') THEN '0' WHEN ${textExpression} LIKE '%[^0-9.,-]%' THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

function normalizeMoney(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? Number(number.toFixed(2)) : 0;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toISOStringOrNull(value: Date | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function compactDescription(parts: string[]) {
  return parts.map(normalizeText).filter(Boolean).join(" · ");
}

function getPaymentMethod(cash: number, transfer: number) {
  if (cash > 0 && transfer > 0) {
    return "mixed" as const;
  }

  if (transfer > 0) {
    return "transfer" as const;
  }

  if (cash > 0) {
    return "cash" as const;
  }

  return "unspecified" as const;
}

function getDateRange(searchParams: URLSearchParams) {
  const today = new Date().toISOString().slice(0, 10);
  const requestedFrom = searchParams.get("dateFrom") || today;
  const requestedTo = searchParams.get("dateTo") || requestedFrom;
  const dateFrom = DATE_PATTERN.test(requestedFrom) ? requestedFrom : today;
  const dateTo = DATE_PATTERN.test(requestedTo) ? requestedTo : dateFrom;

  return dateFrom <= dateTo
    ? { dateFrom, dateTo }
    : { dateFrom: dateTo, dateTo: dateFrom };
}

function buildPaymentCte() {
  const totalPrice = `ABS(${getSafeMoneyExpression("TotalPrice")})`;
  const debit = `ABS(${getSafeMoneyExpression("Debit")})`;
  const credit = `ABS(${getSafeMoneyExpression("Credit")})`;
  const cash = `ABS(${getSafeMoneyExpression("MoneyCash")})`;
  const transfer = `ABS(${getSafeMoneyExpression("MoneyTransfer")})`;

  return `
    WITH normalized AS (
      SELECT
        OrderNum as order_num,
        Datepayment as occurred_at,
        ISNULL(NumberPrintPost, '') as document_no,
        ISNULL(NameExpensesORIncome, '') as payment_name,
        ISNULL(NameSure, '') as employee_name,
        ISNULL(NamePositions, '') as position_name,
        ISNULL(NameBank, '') as bank_name,
        ISNULL(Remark, '') as remark,
        ${totalPrice} as total_price,
        ${debit} as debit_value,
        ${credit} as credit_value,
        ${cash} as money_cash,
        ${transfer} as money_transfer,
        CASE
          WHEN CodeStaff > 0
            AND LTRIM(RTRIM(ISNULL(NameSure, ''))) <> ''
            THEN 1
          ELSE 0
        END as has_employee
      FROM dbo.Payment
      WHERE CONVERT(date, Datepayment) BETWEEN @dateFrom AND @dateTo
    ),
    classified AS (
      SELECT
        *,
        CASE
          WHEN has_employee = 1 THEN 0
          WHEN debit_value > 0 AND credit_value <= 0 THEN 1
          WHEN payment_name LIKE N'%รายรับ%' THEN 1
          ELSE 0
        END as is_income,
        CASE
          WHEN total_price > 0 THEN total_price
          WHEN debit_value > 0 THEN debit_value
          ELSE credit_value
        END as effective_total
      FROM normalized
    )
  `;
}

function buildReceivablePaymentCte(hasWebLog: boolean) {
  const webPayments = hasWebLog
    ? `
      web_payments AS (
        SELECT
          CAST(p.ID AS nvarchar(100)) as id,
          p.PaidAt as occurred_at,
          ISNULL(p.NumberPrintSalePost, '') as document_no,
          ISNULL(p.NameCustomer, ISNULL(m.NameCustomer, N'ไม่ระบุลูกค้า')) as customer_name,
          ISNULL(p.NameCar, ISNULL(m.NameCar, '')) as name_car,
          ISNULL(p.Province, ISNULL(m.Province, '')) as province,
          ${getSafeMoneyExpression("p.PaidAmount")} as amount,
          CASE
            WHEN LTRIM(RTRIM(ISNULL(p.PaymentMethod, ''))) = 'transfer'
              THEN 'transfer'
            ELSE 'cash'
          END as payment_method,
          ISNULL(p.NameBank, ISNULL(m.NameBank, '')) as bank_name
        FROM dbo.WebReceivablePayments p
        INNER JOIN dbo.MasterSalePost m
          ON m.NumberPrintSalePost = p.NumberPrintSalePost
        WHERE CONVERT(date, p.PaidAt) BETWEEN @dateFrom AND @dateTo
          AND m.DateSalePost IS NOT NULL
          AND CONVERT(date, m.DateSalePost) < CONVERT(date, p.PaidAt)
      ),
    `
    : `
      web_payments AS (
        SELECT
          CAST(NULL AS nvarchar(100)) as id,
          CAST(NULL AS datetime) as occurred_at,
          CAST(NULL AS nvarchar(30)) as document_no,
          CAST(NULL AS nvarchar(200)) as customer_name,
          CAST(NULL AS nvarchar(100)) as name_car,
          CAST(NULL AS nvarchar(100)) as province,
          CAST(0 AS money) as amount,
          CAST('cash' AS nvarchar(20)) as payment_method,
          CAST(NULL AS nvarchar(250)) as bank_name
        WHERE 1 = 0
      ),
    `;
  const legacyDedupe = hasWebLog
    ? `
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.WebReceivablePayments wp
          WHERE wp.NumberPrintSalePost = r.NumberPrintPost
            AND CONVERT(date, wp.PaidAt) = CONVERT(date, r.DatePost)
        )
    `
    : "";

  return `
    WITH
    ${webPayments}
    legacy_payments AS (
      SELECT
        CAST('legacy-' + ISNULL(r.NumberPrintPost, '') + '-' + CONVERT(nvarchar(30), r.DatePost, 121) AS nvarchar(100)) as id,
        r.DatePost as occurred_at,
        ISNULL(r.NumberPrintPost, '') as document_no,
        ISNULL(r.NameCustomer, ISNULL(m.NameCustomer, N'ไม่ระบุลูกค้า')) as customer_name,
        ISNULL(m.NameCar, '') as name_car,
        ISNULL(m.Province, '') as province,
        CASE
          WHEN ${getSafeMoneyExpression("r.PayMoney")} - ISNULL(previous_payment.previous_pay_money, 0) > 0
            THEN ${getSafeMoneyExpression("r.PayMoney")} - ISNULL(previous_payment.previous_pay_money, 0)
          ELSE ${getSafeMoneyExpression("r.PayMoney")}
        END as amount,
        CASE
          WHEN ${getSafeMoneyExpression("m.Transfer")} > 0
            AND (
              LTRIM(RTRIM(ISNULL(m.NameBank, ''))) <> ''
              OR ${getSafeMoneyExpression("m.Cash")} <= 0
            )
            THEN 'transfer'
          ELSE 'cash'
        END as payment_method,
        ISNULL(m.NameBank, '') as bank_name
      FROM dbo.MasterRecivePaymentCustomer r
      LEFT JOIN dbo.MasterSalePost m
        ON m.NumberPrintSalePost = r.NumberPrintPost
      OUTER APPLY (
        SELECT TOP 1
          ${getSafeMoneyExpression("previous.PayMoney")} as previous_pay_money
        FROM dbo.MasterRecivePaymentCustomer previous
        WHERE previous.NumberPrintPost = r.NumberPrintPost
          AND previous.DatePost < r.DatePost
        ORDER BY previous.DatePost DESC
      ) previous_payment
      WHERE CONVERT(date, r.DatePost) BETWEEN @dateFrom AND @dateTo
        AND m.DateSalePost IS NOT NULL
        AND CONVERT(date, m.DateSalePost) < CONVERT(date, r.DatePost)
        AND ${getSafeMoneyExpression("r.SubMoney")} = 0
        AND ${getSafeMoneyExpression("r.PayMoney")} > 0
        ${legacyDedupe}
    ),
    combined AS (
      SELECT * FROM web_payments
      UNION ALL
      SELECT * FROM legacy_payments
    )
  `;
}

function buildOutstandingCte() {
  const total = getSafeMoneyExpression("m.TotalPrice");
  const cash = getSafeMoneyExpression("m.Cash");
  const transfer = getSafeMoneyExpression("m.Transfer");
  const deposits = getSafeMoneyExpression("m.Deposits");

  return `
    WITH outstanding AS (
      SELECT
        ISNULL(m.NumberPrintSalePost, '') as document_no,
        m.DateSalePost as occurred_at,
        ISNULL(m.NameCustomer, N'ไม่ระบุลูกค้า') as customer_name,
        ISNULL(m.NameCar, '') as name_car,
        ISNULL(m.Province, '') as province,
        CASE
          WHEN latest_receivable.sub_money IS NOT NULL
            THEN latest_receivable.sub_money
          WHEN ${total} - ${cash} - ${transfer} - ${deposits} > 0
            THEN ${total} - ${cash} - ${transfer} - ${deposits}
          ELSE 0
        END as amount
      FROM dbo.MasterSalePost m
      OUTER APPLY (
        SELECT TOP 1
          ${getSafeMoneyExpression("r.SubMoney")} as sub_money
        FROM dbo.MasterRecivePaymentCustomer r
        WHERE r.NumberPrintPost = m.NumberPrintSalePost
        ORDER BY r.DatePost DESC
      ) latest_receivable
      WHERE CONVERT(date, m.DateSalePost) BETWEEN @dateFrom AND @dateTo
        AND LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ค้างชำระ'
    )
  `;
}

function buildPaidSalesCte() {
  const total = getSafeMoneyExpression("m.TotalPrice");
  const cash = getSafeMoneyExpression("m.Cash");
  const transfer = getSafeMoneyExpression("m.Transfer");
  const deposits = getSafeMoneyExpression("m.Deposits");

  return `
    WITH paid_sales AS (
      SELECT
        ISNULL(m.NumberPrintSalePost, '') as document_no,
        m.DateSalePost as occurred_at,
        ISNULL(m.NameCustomer, N'ไม่ระบุลูกค้า') as customer_name,
        ISNULL(m.NameCar, '') as name_car,
        ISNULL(m.Province, '') as province,
        ${total} as amount,
        ${cash} as cash,
        ${transfer} as transfer,
        ${deposits} as deposits,
        CASE
          WHEN latest_receivable.sub_money IS NOT NULL
            THEN latest_receivable.sub_money
          ELSE ${total} - ${cash} - ${transfer} - ${deposits}
        END as remaining_amount
      FROM dbo.MasterSalePost m
      OUTER APPLY (
        SELECT TOP 1
          ${getSafeMoneyExpression("r.SubMoney")} as sub_money
        FROM dbo.MasterRecivePaymentCustomer r
        WHERE r.NumberPrintPost = m.NumberPrintSalePost
        ORDER BY r.DatePost DESC
      ) latest_receivable
      WHERE CONVERT(date, m.DateSalePost) BETWEEN @dateFrom AND @dateTo
        AND ${total} > 0
    )
  `;
}

async function getCategories(params: Record<string, unknown>) {
  const rows = await executeQuery<CategoryRow>(
    `
      SELECT
        COALESCE(
          NULLIF(LTRIM(RTRIM(category.category_name)), ''),
          NULLIF(LTRIM(RTRIM(ISNULL(d.TypeSale, ''))), ''),
          N'ไม่ระบุประเภท'
        ) as name,
        ISNULL(SUM(ISNULL(d.NumProduct, 0)), 0) as quantity,
        ISNULL(SUM(${getSafeMoneyExpression("d.SumPrice")}), 0) as amount
      FROM dbo.DetailSalePost d
      OUTER APPLY (
        SELECT TOP 1
          ISNULL(cp.CaseProduct, '') as category_name
        FROM dbo.MasterProductDetail pd
        INNER JOIN dbo.MasterProduct p ON p.CodeProduct = pd.CodeProduct
        LEFT JOIN dbo.CaseProduct cp ON cp.Code = p.CaseProduct
        WHERE pd.BarCode = d.BarCode
      ) category
      WHERE CONVERT(date, d.DateSalePost) BETWEEN @dateFrom AND @dateTo
      GROUP BY COALESCE(
        NULLIF(LTRIM(RTRIM(category.category_name)), ''),
        NULLIF(LTRIM(RTRIM(ISNULL(d.TypeSale, ''))), ''),
        N'ไม่ระบุประเภท'
      )
      ORDER BY amount DESC, name ASC
    `,
    params,
  );

  return rows.map((row) => ({
    name: normalizeText(row.name) || "ไม่ระบุประเภท",
    quantity: normalizeMoney(row.quantity),
    amount: normalizeMoney(row.amount),
  }));
}

async function getSaleSummary(params: Record<string, unknown>) {
  const [row] = await executeQuery<SaleSummaryRow>(
    `
      SELECT
        COUNT(*) as bill_count,
        ISNULL(SUM(${getSafeMoneyExpression("TotalPrice")}), 0) as total,
        ISNULL(SUM(${getSafeMoneyExpression("Cash")}), 0) as cash,
        ISNULL(SUM(${getSafeMoneyExpression("Transfer")}), 0) as transfer,
        ISNULL(SUM(${getSafeMoneyExpression("Deposits")}), 0) as deposits,
        ISNULL(
          SUM(
            CASE
              WHEN ${getSafeMoneyExpression("Transfer")} > 0 THEN 1
              ELSE 0
            END
          ),
          0
        ) as transfer_count
      FROM dbo.MasterSalePost
      WHERE CONVERT(date, DateSalePost) BETWEEN @dateFrom AND @dateTo
    `,
    params,
  );

  return {
    billCount: Number(row?.bill_count) || 0,
    total: normalizeMoney(row?.total),
    cash: normalizeMoney(row?.cash),
    transfer: normalizeMoney(row?.transfer),
    deposits: normalizeMoney(row?.deposits),
    transferCount: Number(row?.transfer_count) || 0,
  };
}

async function getPaymentData(params: Record<string, unknown>) {
  const paymentCte = buildPaymentCte();
  const [summaryRow, rows] = await Promise.all([
    executeQuery<PaymentSummaryRow>(
      `
        ${paymentCte}
        SELECT
          ISNULL(SUM(CASE WHEN is_income = 1 THEN effective_total ELSE 0 END), 0) as income_total,
          ISNULL(SUM(CASE WHEN is_income = 1 THEN money_cash ELSE 0 END), 0) as income_cash,
          ISNULL(SUM(CASE WHEN is_income = 1 THEN money_transfer ELSE 0 END), 0) as income_transfer,
          ISNULL(SUM(CASE WHEN is_income = 1 THEN
            CASE WHEN effective_total - money_cash - money_transfer > 0
              THEN effective_total - money_cash - money_transfer ELSE 0 END
            ELSE 0 END), 0) as income_unclassified,
          ISNULL(SUM(CASE WHEN is_income = 0 THEN effective_total ELSE 0 END), 0) as expense_total,
          ISNULL(SUM(CASE WHEN is_income = 0 THEN money_cash ELSE 0 END), 0) as expense_cash,
          ISNULL(SUM(CASE WHEN is_income = 0 THEN money_transfer ELSE 0 END), 0) as expense_transfer,
          ISNULL(SUM(CASE WHEN is_income = 0 THEN
            CASE WHEN effective_total - money_cash - money_transfer > 0
              THEN effective_total - money_cash - money_transfer ELSE 0 END
            ELSE 0 END), 0) as expense_unclassified,
          ISNULL(SUM(CASE WHEN has_employee = 1 THEN effective_total ELSE 0 END), 0) as employee_total,
          ISNULL(SUM(CASE WHEN is_income = 1 THEN 1 ELSE 0 END), 0) as income_count,
          ISNULL(SUM(CASE WHEN is_income = 0 AND has_employee = 0 THEN 1 ELSE 0 END), 0) as expense_count,
          ISNULL(SUM(CASE WHEN has_employee = 1 THEN 1 ELSE 0 END), 0) as employee_count
        FROM classified
        WHERE effective_total > 0
      `,
      params,
      false,
    ),
    executeQuery<PaymentRow>(
      `
        ${paymentCte}
        SELECT TOP (@listLimit)
          order_num,
          occurred_at,
          document_no,
          payment_name,
          employee_name,
          position_name,
          bank_name,
          remark,
          effective_total,
          money_cash,
          money_transfer,
          is_income,
          has_employee
        FROM classified
        WHERE effective_total > 0
        ORDER BY occurred_at DESC, order_num DESC
      `,
      { ...params, listLimit: LIST_LIMIT },
      false,
    ),
  ]);
  const summary = summaryRow[0] ?? zeroPaymentSummary;

  const toItem = (row: PaymentRow): FinancialSummaryListItem => {
    const cash = normalizeMoney(row.money_cash);
    const transfer = normalizeMoney(row.money_transfer);
    const isEmployee = Number(row.has_employee) === 1;

    return {
      id: `payment-${row.order_num}`,
      label:
        (isEmployee
          ? normalizeText(row.employee_name)
          : normalizeText(row.payment_name)) ||
        normalizeText(row.document_no) ||
        `รายการ #${row.order_num}`,
      description:
        compactDescription([
          normalizeText(row.document_no),
          isEmployee ? normalizeText(row.position_name) : "",
          normalizeText(row.bank_name),
          normalizeText(row.remark),
        ]) || "ไม่ระบุรายละเอียด",
      occurredAt: toISOStringOrNull(row.occurred_at),
      amount: normalizeMoney(row.effective_total),
      cash,
      transfer,
      method: getPaymentMethod(cash, transfer),
    };
  };

  return {
    summary: {
      incomeTotal: normalizeMoney(summary.income_total),
      incomeCash: normalizeMoney(summary.income_cash),
      incomeTransfer: normalizeMoney(summary.income_transfer),
      incomeUnclassified: normalizeMoney(summary.income_unclassified),
      expenseTotal: normalizeMoney(summary.expense_total),
      expenseCash: normalizeMoney(summary.expense_cash),
      expenseTransfer: normalizeMoney(summary.expense_transfer),
      expenseUnclassified: normalizeMoney(summary.expense_unclassified),
      employeeTotal: normalizeMoney(summary.employee_total),
      incomeCount: Number(summary.income_count) || 0,
      expenseCount: Number(summary.expense_count) || 0,
      employeeCount: Number(summary.employee_count) || 0,
    },
    income: rows.filter((row) => Number(row.is_income) === 1).map(toItem),
    expenses: rows
      .filter(
        (row) => Number(row.is_income) === 0 && Number(row.has_employee) === 0,
      )
      .map(toItem),
    employees: rows.filter((row) => Number(row.has_employee) === 1).map(toItem),
  };
}

async function getReceivablePayments(
  params: Record<string, unknown>,
  hasWebLog: boolean,
) {
  const cte = buildReceivablePaymentCte(hasWebLog);
  const [summaryRows, rows] = await Promise.all([
    executeQuery<ReceivablePaymentSummaryRow>(
      `
        ${cte}
        SELECT
          COUNT(*) as count,
          ISNULL(SUM(amount), 0) as total,
          ISNULL(SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END), 0) as cash,
          ISNULL(SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END), 0) as transfer
        FROM combined
        WHERE amount > 0
      `,
      params,
      false,
    ),
    executeQuery<ReceivablePaymentRow>(
      `
        ${cte}
        SELECT TOP (@listLimit)
          id,
          occurred_at,
          document_no,
          customer_name,
          name_car,
          province,
          amount,
          payment_method,
          bank_name
        FROM combined
        WHERE amount > 0
        ORDER BY occurred_at DESC, document_no DESC
      `,
      { ...params, listLimit: LIST_LIMIT },
      false,
    ),
  ]);
  const summary = summaryRows[0];

  return {
    summary: {
      count: Number(summary?.count) || 0,
      total: normalizeMoney(summary?.total),
      cash: normalizeMoney(summary?.cash),
      transfer: normalizeMoney(summary?.transfer),
    },
    items: rows.map((row) => {
      const isTransfer = row.payment_method === "transfer";

      return {
        id: `receivable-${row.id}`,
        label: normalizeText(row.document_no)
          ? `บิล ${normalizeText(row.document_no)}`
          : "รับชำระลูกหนี้",
        description:
          compactDescription([
            row.customer_name,
            row.name_car,
            row.province,
            row.bank_name,
          ]) || "ไม่ระบุรายละเอียด",
        occurredAt: toISOStringOrNull(row.occurred_at),
        amount: normalizeMoney(row.amount),
        cash: isTransfer ? 0 : normalizeMoney(row.amount),
        transfer: isTransfer ? normalizeMoney(row.amount) : 0,
        method: isTransfer ? ("transfer" as const) : ("cash" as const),
      };
    }),
  };
}

async function getTransfers(params: Record<string, unknown>) {
  const transferExpression = getSafeMoneyExpression("Transfer");
  const rows = await executeQuery<TransferRow>(
    `
      SELECT TOP (@listLimit)
        ISNULL(NumberPrintSalePost, '') as document_no,
        DateSalePost as occurred_at,
        ISNULL(NameCustomer, N'ไม่ระบุลูกค้า') as customer_name,
        ISNULL(NameCar, '') as name_car,
        ISNULL(Province, '') as province,
        ${transferExpression} as amount,
        ISNULL(NameBank, '') as bank_name
      FROM dbo.MasterSalePost
      WHERE CONVERT(date, DateSalePost) BETWEEN @dateFrom AND @dateTo
        AND ${transferExpression} > 0
      ORDER BY DateSalePost DESC, NumberPrintSalePost DESC
    `,
    { ...params, listLimit: LIST_LIMIT },
    false,
  );

  return rows.map((row) => ({
    id: `transfer-${normalizeText(row.document_no)}-${toISOStringOrNull(row.occurred_at)}`,
    label: normalizeText(row.document_no)
      ? `บิล ${normalizeText(row.document_no)}`
      : "ยอดขายเงินโอน",
    description:
      compactDescription([
        row.customer_name,
        row.name_car,
        row.province,
        row.bank_name,
      ]) || "ไม่ระบุรายละเอียด",
    occurredAt: toISOStringOrNull(row.occurred_at),
    amount: normalizeMoney(row.amount),
    cash: 0,
    transfer: normalizeMoney(row.amount),
    method: "transfer" as const,
  }));
}

async function getPaidSales(params: Record<string, unknown>) {
  const cte = buildPaidSalesCte();
  const [summaryRows, rows] = await Promise.all([
    executeQuery<PaidSaleSummaryRow>(
      `
        ${cte}
        SELECT
          COUNT(*) as count,
          ISNULL(SUM(amount), 0) as total
        FROM paid_sales
        WHERE remaining_amount <= 0
      `,
      params,
      false,
    ),
    executeQuery<PaidSaleRow>(
      `
        ${cte}
        SELECT TOP (@listLimit)
          document_no,
          occurred_at,
          customer_name,
          name_car,
          province,
          amount,
          cash,
          transfer,
          deposits
        FROM paid_sales
        WHERE remaining_amount <= 0
        ORDER BY occurred_at DESC, document_no DESC
      `,
      { ...params, listLimit: LIST_LIMIT },
      false,
    ),
  ]);
  const summary = summaryRows[0];

  return {
    summary: {
      count: Number(summary?.count) || 0,
      total: normalizeMoney(summary?.total),
    },
    items: rows.map((row) => {
      const cash = normalizeMoney(row.cash);
      const transfer = normalizeMoney(row.transfer);
      const deposits = normalizeMoney(row.deposits);

      return {
        id: `paid-sale-${normalizeText(row.document_no)}`,
        label: normalizeText(row.document_no)
          ? `บิล ${normalizeText(row.document_no)}`
          : "บิลขายที่ชำระครบ",
        description:
          compactDescription([
            row.customer_name,
            row.name_car,
            row.province,
            deposits > 0 ? `มัดจำ ${normalizeMoney(deposits)} บาท` : "",
          ]) || "ชำระครบแล้ว",
        occurredAt: toISOStringOrNull(row.occurred_at),
        amount: normalizeMoney(row.amount),
        cash,
        transfer,
        method: getPaymentMethod(cash, transfer),
      };
    }),
  };
}

async function getOutstandingReceivables(params: Record<string, unknown>) {
  const cte = buildOutstandingCte();
  const [summaryRows, rows] = await Promise.all([
    executeQuery<OutstandingSummaryRow>(
      `
        ${cte}
        SELECT
          COUNT(*) as count,
          ISNULL(SUM(amount), 0) as total
        FROM outstanding
        WHERE amount > 0
      `,
      params,
      false,
    ),
    executeQuery<OutstandingRow>(
      `
        ${cte}
        SELECT TOP (@listLimit)
          document_no,
          occurred_at,
          customer_name,
          name_car,
          province,
          amount
        FROM outstanding
        WHERE amount > 0
        ORDER BY occurred_at DESC, document_no DESC
      `,
      { ...params, listLimit: LIST_LIMIT },
      false,
    ),
  ]);
  const summary = summaryRows[0];

  return {
    summary: {
      count: Number(summary?.count) || 0,
      total: normalizeMoney(summary?.total),
    },
    items: rows.map((row) => ({
      id: `outstanding-${normalizeText(row.document_no)}`,
      label: normalizeText(row.document_no)
        ? `บิล ${normalizeText(row.document_no)}`
        : "ลูกหนี้ค้างชำระ",
      description:
        compactDescription([row.customer_name, row.name_car, row.province]) ||
        "ไม่ระบุรายละเอียด",
      occurredAt: toISOStringOrNull(row.occurred_at),
      amount: normalizeMoney(row.amount),
      cash: 0,
      transfer: 0,
      method: "unspecified" as const,
    })),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { dateFrom, dateTo } = getDateRange(request.nextUrl.searchParams);
    const params = { dateFrom, dateTo };

    const data = await withTimeout(async () => {
      const hasWebLog = await receivablePaymentLogTableExists();
      const [
        categories,
        saleSummary,
        paymentData,
        receivablePayments,
        paidSales,
        transfers,
        outstanding,
      ] = await Promise.all([
        getCategories(params),
        getSaleSummary(params),
        getPaymentData(params),
        getReceivablePayments(params, hasWebLog),
        getPaidSales(params),
        getTransfers(params),
        getOutstandingReceivables(params),
      ]);

      const categorySales = normalizeMoney(
        categories.reduce((sum, category) => sum + category.amount, 0),
      );
      const soldQuantity = normalizeMoney(
        categories.reduce((sum, category) => sum + category.quantity, 0),
      );
      const salesTotal = categorySales || saleSummary.total;
      const netAmount = normalizeMoney(
        salesTotal +
          saleSummary.deposits +
          paymentData.summary.incomeTotal +
          receivablePayments.summary.total -
          paymentData.summary.expenseTotal -
          saleSummary.transfer -
          outstanding.summary.total,
      );

      const summary: FinancialSummary = {
        dateFrom,
        dateTo,
        categories,
        metrics: {
          soldQuantity,
          salesBillCount: saleSummary.billCount,
          salesTotal,
          salesCash: saleSummary.cash,
          salesTransfer: saleSummary.transfer,
          deposits: saleSummary.deposits,
          income: paymentData.summary.incomeTotal,
          incomeCash: paymentData.summary.incomeCash,
          incomeTransfer: paymentData.summary.incomeTransfer,
          receivableCollected: receivablePayments.summary.total,
          receivableCollectedCash: receivablePayments.summary.cash,
          receivableCollectedTransfer: receivablePayments.summary.transfer,
          expenses: paymentData.summary.expenseTotal,
          expensesCash: paymentData.summary.expenseCash,
          expensesTransfer: paymentData.summary.expenseTransfer,
          employeeExpenses: paymentData.summary.employeeTotal,
          paidSalesTotal: paidSales.summary.total,
          paidSalesCount: paidSales.summary.count,
          outstandingReceivables: outstanding.summary.total,
          outstandingReceivableCount: outstanding.summary.count,
          unclassifiedIncome: paymentData.summary.incomeUnclassified,
          unclassifiedExpenses: paymentData.summary.expenseUnclassified,
        },
        totals: {
          netAmount,
        },
        lists: {
          paidSales: {
            items: paidSales.items,
            totalCount: paidSales.summary.count,
          },
          income: {
            items: paymentData.income,
            totalCount: paymentData.summary.incomeCount,
          },
          expenses: {
            items: paymentData.expenses,
            totalCount: paymentData.summary.expenseCount,
          },
          receivablePayments: {
            items: receivablePayments.items,
            totalCount: receivablePayments.summary.count,
          },
          employeePayments: {
            items: paymentData.employees,
            totalCount: paymentData.summary.employeeCount,
          },
          transfers: {
            items: transfers,
            totalCount: saleSummary.transferCount,
          },
          outstandingReceivables: {
            items: outstanding.items,
            totalCount: outstanding.summary.count,
          },
        },
      };

      return summary;
    }, 60000);

    return successResponse(data);
  } catch (error) {
    return handleApiError(error, "Financial summary API error");
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
