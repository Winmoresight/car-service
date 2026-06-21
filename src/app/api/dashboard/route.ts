/**
 * Dashboard API
 * GET /api/dashboard - ดึง KPI หลักสำหรับหน้า Dashboard
 * Query params:
 *   - date: วันที่ต้องการดูข้อมูล (YYYY-MM-DD) ถ้าไม่ระบุจะใช้วันนี้
 */

import type { NextRequest } from "next/server";
import { handleApiError, successResponse, withTimeout } from "@/lib/api-utils";
import { executeQuery } from "@/lib/db";
import { receivablePaymentLogTableExists } from "@/lib/receivable-payment-log";
import type { DashboardKPI, DashboardMoneyBreakdownItem } from "@/types/api";

interface OtherPaymentSummary {
  other_count: number;
  income_total: number;
  expense_total: number;
  income_cash: number;
  expense_cash: number;
  income_transfer: number;
  expense_transfer: number;
}

interface ReceivableSummary {
  receivable_count: number;
  receivable_total: number;
}

interface OptionalDailyMoneySummary {
  count: number;
  total: number;
  cash: number;
  transfer: number;
}

interface StockInSummary {
  stock_in_count: number;
  stock_in_quantity: number;
}

interface DailySaleMoneyRow {
  number_print: string;
  date_post: Date | null;
  customer_name: string;
  name_car: string;
  province: string;
  cash: number;
  transfer: number;
}

interface DashboardMoneyBreakdown {
  cash: DashboardMoneyBreakdownItem[];
  transfer: DashboardMoneyBreakdownItem[];
}

const zeroOtherPayment: OtherPaymentSummary = {
  other_count: 0,
  income_total: 0,
  expense_total: 0,
  income_cash: 0,
  expense_cash: 0,
  income_transfer: 0,
  expense_transfer: 0,
};

const zeroReceivable: ReceivableSummary = {
  receivable_count: 0,
  receivable_total: 0,
};

const zeroOptionalDailyMoney: OptionalDailyMoneySummary = {
  count: 0,
  total: 0,
  cash: 0,
  transfer: 0,
};

const zeroStockIn: StockInSummary = {
  stock_in_count: 0,
  stock_in_quantity: 0,
};

const zeroMoneyBreakdown: DashboardMoneyBreakdown = {
  cash: [],
  transfer: [],
};

function quoteIdentifier(identifier: string) {
  return `[${identifier.replaceAll("]", "]]")}]`;
}

function getColumn(
  columns: Set<string>,
  candidates: string[],
): string | undefined {
  const normalizedColumns = new Map(
    [...columns].map((column) => [column.toLowerCase(), column]),
  );

  return candidates
    .map((candidate) => normalizedColumns.get(candidate.toLowerCase()))
    .find((column): column is string => Boolean(column));
}

function getSafeMoneyExpression(valueExpression: string) {
  const textExpression = `CONVERT(nvarchar(100), ${valueExpression})`;

  return `ISNULL(CONVERT(money, CASE WHEN ${valueExpression} IS NULL THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMoney(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Number(number.toFixed(2));
}

function toISOStringOrNull(value: Date | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function compactDescription(parts: string[]) {
  return parts.map(normalizeText).filter(Boolean).join(" · ");
}

function getMoneyExpression(
  columns: Set<string>,
  candidates: string[],
  fallback = "0",
) {
  const column = getColumn(columns, candidates);

  if (!column) {
    return fallback;
  }

  return getSafeMoneyExpression(quoteIdentifier(column));
}

async function getTableColumns(tableName: string) {
  const rows = await executeQuery<{ COLUMN_NAME: string }>(
    `
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = @tableName
    `,
    { tableName },
    false,
  );

  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function getOtherPaymentSummary(
  dateCondition: string,
  params?: Record<string, unknown>,
): Promise<OtherPaymentSummary> {
  try {
    const [summary] = await executeQuery<OtherPaymentSummary>(
      `
        WITH normalized AS (
          SELECT
            ABS(${getSafeMoneyExpression("TotalPrice")}) as total_price,
            ABS(${getSafeMoneyExpression("MoneyCash")}) as money_cash,
            ABS(${getSafeMoneyExpression("MoneyTransfer")}) as money_transfer,
            ${getSafeMoneyExpression("Debit")} as debit_value,
            ${getSafeMoneyExpression("Credit")} as credit_value,
            CASE
              WHEN CodeStaff > 0
                AND NameSure IS NOT NULL
                AND NameSure != ''
                THEN 1
              ELSE 0
            END as has_employee,
            ISNULL(NameExpensesORIncome, '') as payment_name
          FROM dbo.Payment
          WHERE CONVERT(date, Datepayment) = ${dateCondition}
        ),
        classified AS (
          SELECT
            *,
            CASE
              WHEN has_employee = 1 THEN 0
              WHEN credit_value > 0 AND debit_value <= 0 THEN 1
              WHEN payment_name LIKE N'%รายรับ%' THEN 1
              ELSE 0
            END as is_income,
            CASE
              WHEN has_employee = 1 AND total_price > 0 THEN total_price
              WHEN has_employee = 1 AND debit_value > 0 THEN debit_value
              WHEN has_employee = 1 THEN credit_value
              ELSE total_price
            END as effective_total
          FROM normalized
        )
        SELECT
          COUNT(*) as other_count,
          ISNULL(SUM(CASE WHEN is_income = 1 THEN effective_total ELSE 0 END), 0) as income_total,
          ISNULL(SUM(CASE WHEN is_income = 0 THEN effective_total ELSE 0 END), 0) as expense_total,
          ISNULL(SUM(CASE WHEN is_income = 1 THEN money_cash ELSE 0 END), 0) as income_cash,
          ISNULL(SUM(CASE WHEN is_income = 0 THEN money_cash ELSE 0 END), 0) as expense_cash,
          ISNULL(SUM(CASE WHEN is_income = 1 THEN money_transfer ELSE 0 END), 0) as income_transfer,
          ISNULL(SUM(CASE WHEN is_income = 0 THEN money_transfer ELSE 0 END), 0) as expense_transfer
        FROM classified
      `,
      params,
      false,
    );

    return summary ?? zeroOtherPayment;
  } catch (error) {
    console.warn("Optional other payment summary failed:", error);
    return zeroOtherPayment;
  }
}

async function getReceivableSummary(
  dateCondition: string,
  params?: Record<string, unknown>,
): Promise<ReceivableSummary> {
  try {
    const [summary] = await executeQuery<ReceivableSummary>(
      `
        WITH unpaid_sales AS (
          SELECT
            NumberPrintSalePost,
            ${getSafeMoneyExpression("TotalPrice")} as total_price,
            ${getSafeMoneyExpression("Cash")} as cash,
            ${getSafeMoneyExpression("Transfer")} as transfer
          FROM dbo.MasterSalePost
          WHERE LTRIM(RTRIM(ISNULL(Status, ''))) = N'ค้างชำระ'
            AND CONVERT(date, DateSalePost) = ${dateCondition}
        ),
        latest_receivable AS (
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
            unpaid_sales.NumberPrintSalePost,
            CASE
              WHEN latest_receivable.NumberPrintPost IS NOT NULL
                THEN latest_receivable.sub_money
              ELSE unpaid_sales.total_price - unpaid_sales.cash - unpaid_sales.transfer
            END as receivable_amount
          FROM unpaid_sales
          LEFT JOIN latest_receivable
            ON latest_receivable.NumberPrintPost = unpaid_sales.NumberPrintSalePost
            AND latest_receivable.row_number = 1
        )
        SELECT
          ISNULL(
            SUM(
              CASE
                WHEN receivable_amount > 0 THEN 1
                ELSE 0
              END
            ),
            0
          ) as receivable_count,
          ISNULL(
            SUM(
              CASE
                WHEN receivable_amount > 0 THEN receivable_amount
                ELSE 0
              END
            ),
            0
          ) as receivable_total
        FROM normalized
      `,
      params,
      false,
    );

    return summary ?? zeroReceivable;
  } catch (error) {
    console.warn("Optional receivable summary failed:", error);
    return zeroReceivable;
  }
}

async function getOptionalDailyMoneySummary({
  tableName,
  dateCondition,
  params,
  dateCandidates,
  totalCandidates,
  cashCandidates,
  transferCandidates,
}: {
  tableName: string | string[];
  dateCondition: string;
  params?: Record<string, unknown>;
  dateCandidates: string[];
  totalCandidates: string[];
  cashCandidates: string[];
  transferCandidates: string[];
}): Promise<OptionalDailyMoneySummary> {
  const tableNames = Array.isArray(tableName) ? tableName : [tableName];

  try {
    let selectedTableName = "";
    let columns = new Set<string>();

    for (const candidateTableName of tableNames) {
      columns = await getTableColumns(candidateTableName);

      if (columns.size > 0) {
        selectedTableName = candidateTableName;
        break;
      }
    }

    if (!selectedTableName) {
      return zeroOptionalDailyMoney;
    }

    const dateColumn = getColumn(columns, dateCandidates);

    if (!dateColumn) {
      return zeroOptionalDailyMoney;
    }

    const cashExpression = getMoneyExpression(columns, cashCandidates);
    const transferExpression = getMoneyExpression(columns, transferCandidates);
    const totalExpression = getMoneyExpression(
      columns,
      totalCandidates,
      `(${cashExpression} + ${transferExpression})`,
    );

    const [summary] = await executeQuery<OptionalDailyMoneySummary>(
      `
        SELECT
          COUNT(*) as count,
          ISNULL(SUM(${totalExpression}), 0) as total,
          ISNULL(SUM(${cashExpression}), 0) as cash,
          ISNULL(SUM(${transferExpression}), 0) as transfer
        FROM dbo.${quoteIdentifier(selectedTableName)}
        WHERE CONVERT(date, ${quoteIdentifier(dateColumn)}) = ${dateCondition}
      `,
      params,
      false,
    );

    return summary ?? zeroOptionalDailyMoney;
  } catch (error) {
    console.warn(`Optional ${tableNames.join(", ")} summary failed:`, error);
    return zeroOptionalDailyMoney;
  }
}

async function getReceivablePaymentLogSummary(
  dateCondition: string,
  params?: Record<string, unknown>,
): Promise<OptionalDailyMoneySummary> {
  try {
    if (!(await receivablePaymentLogTableExists())) {
      return zeroOptionalDailyMoney;
    }

    const [summary] = await executeQuery<OptionalDailyMoneySummary>(
      `
        SELECT
          COUNT(*) as count,
          ISNULL(SUM(${getSafeMoneyExpression("p.PaidAmount")}), 0) as total,
          ISNULL(
            SUM(
              CASE
                WHEN LTRIM(RTRIM(ISNULL(p.PaymentMethod, ''))) = 'cash'
                  THEN ${getSafeMoneyExpression("p.PaidAmount")}
                ELSE 0
              END
            ),
            0
          ) as cash,
          ISNULL(
            SUM(
              CASE
                WHEN LTRIM(RTRIM(ISNULL(p.PaymentMethod, ''))) = 'transfer'
                  THEN ${getSafeMoneyExpression("p.PaidAmount")}
                ELSE 0
              END
            ),
            0
          ) as transfer
        FROM dbo.WebReceivablePayments p
        INNER JOIN dbo.MasterSalePost m
          ON m.NumberPrintSalePost = p.NumberPrintSalePost
        WHERE CONVERT(date, p.PaidAt) = ${dateCondition}
          AND m.DateSalePost IS NOT NULL
          AND CONVERT(date, m.DateSalePost) < CONVERT(date, p.PaidAt)
          AND ${getSafeMoneyExpression("p.PaidAmount")} > 0
      `,
      params,
      false,
    );

    return summary ?? zeroOptionalDailyMoney;
  } catch (error) {
    console.warn("Optional receivable payment log summary failed:", error);
    return zeroOptionalDailyMoney;
  }
}

async function getDailySaleMoneyItems(
  dateCondition: string,
  params?: Record<string, unknown>,
): Promise<DashboardMoneyBreakdownItem[]> {
  try {
    const cashExpression = getSafeMoneyExpression("m.Cash");
    const transferExpression = getSafeMoneyExpression("m.Transfer");
    const rows = await executeQuery<DailySaleMoneyRow>(
      `
        SELECT
          ISNULL(m.NumberPrintSalePost, '') as number_print,
          m.DateSalePost as date_post,
          ISNULL(m.NameCustomer, N'ไม่ระบุลูกค้า') as customer_name,
          ISNULL(m.NameCar, '') as name_car,
          ISNULL(m.Province, '') as province,
          ${cashExpression} as cash,
          ${transferExpression} as transfer
        FROM dbo.MasterSalePost m
        WHERE CONVERT(date, m.DateSalePost) = ${dateCondition}
          AND (${cashExpression} > 0 OR ${transferExpression} > 0)
        ORDER BY m.DateSalePost DESC, m.NumberPrintSalePost DESC
      `,
      params,
      false,
    );

    return rows.flatMap((row) => {
      const numberPrint = normalizeText(row.number_print);
      const description =
        compactDescription([row.customer_name, row.name_car, row.province]) ||
        "ไม่ระบุรายละเอียด";
      const baseItem = {
        label: numberPrint ? `บิลขาย ${numberPrint}` : "บิลขาย",
        description,
        occurredAt: toISOStringOrNull(row.date_post),
        direction: "in" as const,
        source: "sale" as const,
      };
      const items: DashboardMoneyBreakdownItem[] = [];
      const cash = normalizeMoney(row.cash);
      const transfer = normalizeMoney(row.transfer);

      if (cash > 0) {
        items.push({
          ...baseItem,
          id: `sale-cash-${numberPrint || items.length}`,
          amount: cash,
          method: "cash",
        });
      }

      if (transfer > 0) {
        items.push({
          ...baseItem,
          id: `sale-transfer-${numberPrint || items.length}`,
          amount: transfer,
          method: "transfer",
        });
      }

      return items;
    });
  } catch (error) {
    console.warn("Optional daily sale money items failed:", error);
    return [];
  }
}

async function getMoneyBreakdown(
  dateCondition: string,
  params?: Record<string, unknown>,
): Promise<DashboardMoneyBreakdown> {
  try {
    const items = (await getDailySaleMoneyItems(dateCondition, params)).sort(
      (first, second) => {
        const firstTime = first.occurredAt
          ? new Date(first.occurredAt).getTime()
          : 0;
        const secondTime = second.occurredAt
          ? new Date(second.occurredAt).getTime()
          : 0;

        return secondTime - firstTime;
      },
    );

    return {
      cash: items.filter((item) => item.method === "cash"),
      transfer: items.filter((item) => item.method === "transfer"),
    };
  } catch (error) {
    console.warn("Optional dashboard money breakdown failed:", error);
    return zeroMoneyBreakdown;
  }
}

async function getStockInSummary(
  dateCondition: string,
  params?: Record<string, unknown>,
): Promise<StockInSummary> {
  try {
    const debitExpression = getSafeMoneyExpression("Debit");
    const [summary] = await executeQuery<StockInSummary>(
      `
        SELECT
          COUNT(*) as stock_in_count,
          ISNULL(SUM(${debitExpression}), 0) as stock_in_quantity
        FROM dbo.INOUTStockProduct
        WHERE CONVERT(date, DateSave) = ${dateCondition}
          AND ${debitExpression} > 0
      `,
      params,
      false,
    );

    return summary ?? zeroStockIn;
  } catch (error) {
    console.warn("Optional stock in summary failed:", error);
    return zeroStockIn;
  }
}

export async function GET(request: NextRequest) {
  try {
    // อ่าน query parameter สำหรับวันที่
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get("date");

    // Wrap ด้วย timeout (60 วินาที)
    const data = await withTimeout(async () => {
      // ถ้ามีการระบุวันที่ ให้ใช้วันที่นั้น ถ้าไม่มีใช้วันนี้
      const dateParams = dateParam ? { selectedDate: dateParam } : undefined;
      const dateExpression = dateParam
        ? "@selectedDate"
        : "CONVERT(date, GETDATE())";
      const dateCondition = `CONVERT(date, DateSalePost) = ${dateExpression}`;

      // Query สำหรับข้อมูลวันที่เลือก
      const todayQuery = `
        SELECT 
          COUNT(*) as bill_count,
          ISNULL(SUM(TotalPrice), 0) as total_sales,
          ISNULL(SUM(TotalProfit), 0) as total_profit,
          ISNULL(SUM(Cash), 0) as total_cash,
          ISNULL(SUM(Transfer), 0) as total_transfer
        FROM dbo.MasterSalePost
        WHERE ${dateCondition}
      `;

      // Query สำหรับข้อมูลเดือนนี้
      const monthQuery = `
        SELECT 
          COUNT(*) as bill_count,
          ISNULL(SUM(TotalPrice), 0) as total_sales,
          ISNULL(SUM(TotalProfit), 0) as total_profit
        FROM dbo.MasterSalePost
        WHERE YEAR(DateSalePost) = YEAR(GETDATE())
          AND MONTH(DateSalePost) = MONTH(GETDATE())
      `;

      // Execute queries (with automatic retry)
      const [todayResult] = await executeQuery<{
        bill_count: number;
        total_sales: number;
        total_profit: number;
        total_cash: number;
        total_transfer: number;
      }>(todayQuery, dateParams);

      const [monthResult] = await executeQuery<{
        bill_count: number;
        total_sales: number;
        total_profit: number;
      }>(monthQuery);

      const [
        otherPayment,
        receivable,
        receivableCollected,
        supplierBills,
        stockIn,
        moneyBreakdown,
      ] = await Promise.all([
        getOtherPaymentSummary(dateExpression, dateParams),
        getReceivableSummary(dateExpression, dateParams),
        getReceivablePaymentLogSummary(dateExpression, dateParams),
        getOptionalDailyMoneySummary({
          tableName: [
            "MasterPrintOrderBuyProduct",
            "MasterPrintOderBuyProduct",
          ],
          dateCondition: dateExpression,
          params: dateParams,
          dateCandidates: [
            "DatePost",
            "DatePrint",
            "DateOrder",
            "DateOder",
            "DateSave",
          ],
          totalCandidates: [
            "TotalPrice",
            "TotalPayment",
            "TotalMoney",
            "SubTotal",
            "SumPrice",
            "Amount",
            "Price",
          ],
          cashCandidates: ["Cash", "MoneyCash", "PayCash", "TotalCash"],
          transferCandidates: [
            "Transfer",
            "MoneyTransfer",
            "PayTransfer",
            "TotalTransfer",
          ],
        }),
        getStockInSummary(dateExpression, dateParams),
        getMoneyBreakdown(dateExpression, dateParams),
      ]);

      // คำนวณอัตรากำไรขั้นต้น
      const profitMargin =
        monthResult.total_sales > 0
          ? (monthResult.total_profit / monthResult.total_sales) * 100
          : 0;

      const cashDrawerExpected = todayResult.total_cash;
      const transferNet = todayResult.total_transfer;

      // สร้าง response
      const kpi: DashboardKPI = {
        todaySales: todayResult.total_sales,
        todayProfit: todayResult.total_profit,
        todayBills: todayResult.bill_count,
        todayCash: todayResult.total_cash,
        todayTransfer: todayResult.total_transfer,
        cashDrawerExpected,
        transferNet,
        otherIncome: otherPayment.income_total,
        otherExpense: otherPayment.expense_total,
        otherIncomeCash: otherPayment.income_cash,
        otherExpenseCash: otherPayment.expense_cash,
        otherIncomeTransfer: otherPayment.income_transfer,
        otherExpenseTransfer: otherPayment.expense_transfer,
        otherPaymentCount: otherPayment.other_count,
        receivableTotal: receivable.receivable_total,
        receivableCount: receivable.receivable_count,
        receivableCollected: receivableCollected.total,
        receivableCollectedCash: receivableCollected.cash,
        receivableCollectedTransfer: receivableCollected.transfer,
        receivableCollectedCount: receivableCollected.count,
        cashBreakdownItems: moneyBreakdown.cash,
        transferBreakdownItems: moneyBreakdown.transfer,
        supplierBillTotal: supplierBills.total,
        supplierBillCount: supplierBills.count,
        stockInCount: stockIn.stock_in_count,
        stockInQuantity: stockIn.stock_in_quantity,
        monthSales: monthResult.total_sales,
        monthProfit: monthResult.total_profit,
        monthBills: monthResult.bill_count,
        profitMargin: Number(profitMargin.toFixed(2)),
      };

      return kpi;
    }, 60000);

    return successResponse(data);
  } catch (error) {
    return handleApiError(error, "Dashboard API error");
  }
}

// Disable caching for real-time data
export const dynamic = "force-dynamic";
export const revalidate = 0;
