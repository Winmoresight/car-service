import { executeQuery } from "@/lib/db";

interface ReceivablePaymentSourceConfig {
  detailPaymentCustomerColumns: Set<string>;
  masterPaymentCustomerColumns: Set<string>;
  webReceivablePaymentColumns: Set<string>;
}

type DateFilterBuilder = (dateExpression: string) => string;

const emptyPaymentCte = (name: string) => `
  ${name} AS (
    SELECT
      CAST(NULL AS nvarchar(150)) as id,
      CAST(NULL AS datetime) as occurred_at,
      CAST(NULL AS nvarchar(30)) as document_no,
      CAST(NULL AS nvarchar(30)) as customer_code,
      CAST(NULL AS nvarchar(200)) as customer_name,
      CAST(NULL AS nvarchar(100)) as name_car,
      CAST(NULL AS nvarchar(100)) as province,
      CAST(0 AS money) as amount,
      CAST(0 AS money) as total_price,
      CAST('cash' AS nvarchar(20)) as payment_method,
      CAST(NULL AS nvarchar(250)) as bank_name,
      CAST(NULL AS nvarchar(100)) as created_by,
      CAST('legacy' AS nvarchar(20)) as source
    WHERE 1 = 0
  )
`;

function quoteIdentifier(identifier: string) {
  return `[${identifier.replaceAll("]", "]]")}]`;
}

function qualify(alias: string, column: string) {
  return `${alias}.${quoteIdentifier(column)}`;
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

function getColumnByNamePart(
  columns: Set<string>,
  includeParts: string[],
  excludeParts: string[] = [],
) {
  return [...columns].find((column) => {
    const normalizedColumn = column.toLowerCase();

    return (
      includeParts.some((part) => normalizedColumn.includes(part)) &&
      !excludeParts.some((part) => normalizedColumn.includes(part))
    );
  });
}

function getSafeMoneyExpression(valueExpression: string) {
  const textExpression = `CONVERT(nvarchar(100), ${valueExpression})`;

  return `ISNULL(CONVERT(money, CASE WHEN ${valueExpression} IS NULL THEN '0' WHEN ISNUMERIC(${textExpression}) = 1 THEN ${textExpression} ELSE '0' END), 0)`;
}

function getTextExpression(
  alias: string,
  columns: Set<string>,
  candidates: string[],
  fallback = "''",
) {
  const column = getColumn(columns, candidates);

  return column ? `ISNULL(${qualify(alias, column)}, '')` : fallback;
}

function getMoneyColumnExpression(
  alias: string,
  columns: Set<string>,
  candidates: string[],
  fallbackNameParts: string[] = [],
) {
  const column =
    getColumn(columns, candidates) ||
    getColumnByNamePart(columns, fallbackNameParts, [
      "bank",
      "code",
      "date",
      "form",
      "name",
      "number",
      "remark",
      "status",
      "user",
    ]);

  return column ? getSafeMoneyExpression(qualify(alias, column)) : undefined;
}

async function getTableColumns(tableName: string) {
  try {
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
  } catch (error) {
    console.warn(`Optional ${tableName} schema lookup failed:`, error);
    return new Set<string>();
  }
}

export async function getReceivablePaymentSourceConfig(): Promise<ReceivablePaymentSourceConfig> {
  const [
    detailPaymentCustomerColumns,
    masterPaymentCustomerColumns,
    webReceivablePaymentColumns,
  ] = await Promise.all([
    getTableColumns("DetailPaymentCustomer"),
    getTableColumns("MasterPaymentCustomer"),
    getTableColumns("WebReceivablePayments"),
  ]);

  return {
    detailPaymentCustomerColumns,
    masterPaymentCustomerColumns,
    webReceivablePaymentColumns,
  };
}

function buildWebReceivablePaymentsCte(
  columns: Set<string>,
  dateFilter: DateFilterBuilder,
) {
  if (columns.size === 0) {
    return emptyPaymentCte("web_payments");
  }

  return `
    web_payments AS (
      SELECT
        CAST(p.ID AS nvarchar(50)) as id,
        p.PaidAt as occurred_at,
        p.NumberPrintSalePost as document_no,
        ISNULL(p.CodeCustomer, ISNULL(m.CodeCustomer, '')) as customer_code,
        ISNULL(p.NameCustomer, ISNULL(m.NameCustomer, N'ไม่ระบุ')) as customer_name,
        ISNULL(p.NameCar, ISNULL(m.NameCar, '')) as name_car,
        ISNULL(p.Province, ISNULL(m.Province, '')) as province,
        ${getSafeMoneyExpression("p.PaidAmount")} as amount,
        ${getSafeMoneyExpression("m.TotalPrice")} as total_price,
        CASE
          WHEN LTRIM(RTRIM(ISNULL(p.PaymentMethod, ''))) = 'transfer'
            THEN 'transfer'
          ELSE 'cash'
        END as payment_method,
        ISNULL(p.NameBank, ISNULL(m.NameBank, '')) as bank_name,
        ISNULL(p.CreatedBy, '') as created_by,
        'web' as source
      FROM dbo.WebReceivablePayments p
      INNER JOIN dbo.MasterSalePost m
        ON m.NumberPrintSalePost = p.NumberPrintSalePost
      WHERE ${dateFilter("p.PaidAt")}
        AND m.DateSalePost IS NOT NULL
        AND CONVERT(date, m.DateSalePost) < CONVERT(date, p.PaidAt)
        AND ${getSafeMoneyExpression("p.PaidAmount")} > 0
    )
  `;
}

function buildPaymentCustomerCte(
  detailColumns: Set<string>,
  masterColumns: Set<string>,
  dateFilter: DateFilterBuilder,
) {
  const masterNumberColumn = getColumn(masterColumns, [
    "NumberPrint",
    "NumberPrintPay",
    "NumberPrintPost",
  ]);
  const detailPaymentNumberColumn = getColumn(detailColumns, [
    "NumberPrintPost",
    "NumberPrintPay",
    "NumberPrint",
  ]);
  const detailSaleNumberColumn = getColumn(detailColumns, [
    "FormNumberPrint",
    "NumberPrintSalePost",
  ]);
  const masterDateColumn =
    getColumn(masterColumns, [
      "DatePost",
      "DatePayment",
      "Datepayment",
      "DatePay",
      "DateSave",
      "CreatedAt",
    ]) ?? getColumnByNamePart(masterColumns, ["date"], ["due"]);
  const detailDateColumn =
    getColumn(detailColumns, [
      "DatePost",
      "DatePayment",
      "Datepayment",
      "DatePay",
      "DateSave",
      "CreatedAt",
    ]) ?? getColumnByNamePart(detailColumns, ["date"], ["due"]);
  const dateExpression = detailDateColumn
    ? qualify("d", detailDateColumn)
    : masterDateColumn
      ? qualify("p", masterDateColumn)
      : "";

  if (
    !masterNumberColumn ||
    !detailPaymentNumberColumn ||
    !detailSaleNumberColumn ||
    !dateExpression
  ) {
    return emptyPaymentCte("payment_customer_payments");
  }

  const amountCandidates = [
    "PayMoney",
    "PaidAmount",
    "PaymentAmount",
    "PayAmount",
    "TotalPrice",
    "TotalPayment",
    "TotalMoney",
    "Amount",
    "Money",
    "Price",
    "SumPrice",
    "Result",
  ];
  const cashCandidates = ["PayCash", "Cash", "MoneyCash", "TotalCash"];
  const transferCandidates = [
    "PayTransfer",
    "Transfer",
    "MoneyTransfer",
    "TotalTransfer",
  ];
  const detailCashExpression =
    getMoneyColumnExpression("d", detailColumns, cashCandidates, ["cash"]) ??
    "0";
  const detailTransferExpression =
    getMoneyColumnExpression("d", detailColumns, transferCandidates, [
      "transfer",
    ]) ?? "0";
  const masterCashExpression =
    getMoneyColumnExpression("p", masterColumns, cashCandidates, ["cash"]) ??
    "0";
  const masterTransferExpression =
    getMoneyColumnExpression("p", masterColumns, transferCandidates, [
      "transfer",
    ]) ?? "0";
  const amountNameParts = [
    "amount",
    "money",
    "paid",
    "pay",
    "price",
    "sum",
    "total",
  ];
  const amountExpression =
    getMoneyColumnExpression(
      "d",
      detailColumns,
      amountCandidates,
      amountNameParts,
    ) ??
    (detailCashExpression !== "0" || detailTransferExpression !== "0"
      ? `(${detailCashExpression} + ${detailTransferExpression})`
      : (getMoneyColumnExpression(
          "p",
          masterColumns,
          amountCandidates,
          amountNameParts,
        ) ?? `(${masterCashExpression} + ${masterTransferExpression})`));
  const transferExpression =
    detailTransferExpression !== "0"
      ? detailTransferExpression
      : masterTransferExpression;
  const cashExpression =
    detailCashExpression !== "0" ? detailCashExpression : masterCashExpression;
  const bankExpression = getTextExpression(
    "d",
    detailColumns,
    ["NameBank", "BankName", "Bank", "NameBankPay"],
    getTextExpression(
      "p",
      masterColumns,
      ["NameBank", "BankName", "Bank", "NameBankPay"],
      "ISNULL(m.NameBank, '')",
    ),
  );
  const typePaymentExpression = getTextExpression(
    "d",
    detailColumns,
    ["TypePayment", "PaymentType", "PaymentMethod", "PayType"],
    getTextExpression("p", masterColumns, [
      "TypePayment",
      "PaymentType",
      "PaymentMethod",
      "PayType",
    ]),
  );
  const customerCodeExpression = getTextExpression(
    "d",
    detailColumns,
    ["CodeCustomer", "CustomerCode", "Code"],
    getTextExpression(
      "p",
      masterColumns,
      ["CodeCustomer", "CustomerCode", "Code"],
      "ISNULL(m.CodeCustomer, '')",
    ),
  );
  const customerNameExpression = getTextExpression(
    "d",
    detailColumns,
    ["NameCustomer", "CustomerName", "Name"],
    getTextExpression(
      "p",
      masterColumns,
      ["NameCustomer", "CustomerName", "Name"],
      "ISNULL(m.NameCustomer, N'ไม่ระบุ')",
    ),
  );
  const createdByExpression = getTextExpression("p", masterColumns, [
    "NameUser",
    "UserName",
    "NameSave",
    "CreatedBy",
    "SaveBy",
  ]);

  return `
    payment_customer_payments AS (
      SELECT
        CAST(
          'payment-customer-'
          + ISNULL(CONVERT(nvarchar(50), ${qualify("d", detailPaymentNumberColumn)}), '')
          + '-'
          + ISNULL(CONVERT(nvarchar(50), ${qualify("d", detailSaleNumberColumn)}), '')
          + '-'
          + CONVERT(nvarchar(30), ${dateExpression}, 121)
          AS nvarchar(150)
        ) as id,
        ${dateExpression} as occurred_at,
        ${qualify("d", detailSaleNumberColumn)} as document_no,
        ${customerCodeExpression} as customer_code,
        ${customerNameExpression} as customer_name,
        ISNULL(m.NameCar, '') as name_car,
        ISNULL(m.Province, '') as province,
        ${amountExpression} as amount,
        ${getSafeMoneyExpression("m.TotalPrice")} as total_price,
        CASE
          WHEN ${typePaymentExpression} LIKE N'%โอน%'
            OR LOWER(${typePaymentExpression}) LIKE '%transfer%'
            THEN 'transfer'
          WHEN ${typePaymentExpression} LIKE N'%สด%'
            OR LOWER(${typePaymentExpression}) LIKE '%cash%'
            THEN 'cash'
          WHEN ${transferExpression} > 0
            AND (
              LTRIM(RTRIM(${bankExpression})) <> ''
              OR ${cashExpression} <= 0
            )
            THEN 'transfer'
          ELSE 'cash'
        END as payment_method,
        ${bankExpression} as bank_name,
        ${createdByExpression} as created_by,
        'legacy' as source
      FROM dbo.DetailPaymentCustomer d
      INNER JOIN dbo.MasterPaymentCustomer p
        ON ${qualify("p", masterNumberColumn)} = ${qualify("d", detailPaymentNumberColumn)}
      LEFT JOIN dbo.MasterSalePost m
        ON m.NumberPrintSalePost = ${qualify("d", detailSaleNumberColumn)}
      WHERE ${dateFilter(dateExpression)}
        AND m.DateSalePost IS NOT NULL
        AND CONVERT(date, m.DateSalePost) < CONVERT(date, ${dateExpression})
        AND ${amountExpression} > 0
    )
  `;
}

function buildMasterReceivableCte(dateFilter: DateFilterBuilder) {
  return `
    master_receivable_payments AS (
      SELECT
        CAST('legacy-' + ISNULL(r.NumberPrintPost, '') + '-' + CONVERT(nvarchar(30), r.DatePost, 121) AS nvarchar(100)) as id,
        r.DatePost as occurred_at,
        r.NumberPrintPost as document_no,
        ISNULL(r.CodeCustomer, ISNULL(m.CodeCustomer, '')) as customer_code,
        ISNULL(r.NameCustomer, ISNULL(m.NameCustomer, N'ไม่ระบุ')) as customer_name,
        ISNULL(m.NameCar, '') as name_car,
        ISNULL(m.Province, '') as province,
        CASE
          WHEN ${getSafeMoneyExpression("r.PayMoney")} - ISNULL(previous_payment.previous_pay_money, 0) > 0
            THEN ${getSafeMoneyExpression("r.PayMoney")} - ISNULL(previous_payment.previous_pay_money, 0)
          ELSE ${getSafeMoneyExpression("r.PayMoney")}
        END as amount,
        ${getSafeMoneyExpression("r.TotalPrice")} as total_price,
        CASE
          WHEN ${getSafeMoneyExpression("m.Transfer")} > 0
            AND (
              LTRIM(RTRIM(ISNULL(m.NameBank, ''))) <> ''
              OR ${getSafeMoneyExpression("m.Cash")} <= 0
            )
            THEN 'transfer'
          ELSE 'cash'
        END as payment_method,
        ISNULL(m.NameBank, '') as bank_name,
        '' as created_by,
        'legacy' as source
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
      WHERE ${dateFilter("r.DatePost")}
        AND m.DateSalePost IS NOT NULL
        AND CONVERT(date, m.DateSalePost) < CONVERT(date, r.DatePost)
        AND ${getSafeMoneyExpression("r.SubMoney")} = 0
        AND ${getSafeMoneyExpression("r.PayMoney")} > 0
    )
  `;
}

export function buildReceivablePaymentCte(
  config: ReceivablePaymentSourceConfig,
  dateFilter: DateFilterBuilder,
) {
  return `
    WITH
    ${buildWebReceivablePaymentsCte(
      config.webReceivablePaymentColumns,
      dateFilter,
    )},
    ${buildPaymentCustomerCte(
      config.detailPaymentCustomerColumns,
      config.masterPaymentCustomerColumns,
      dateFilter,
    )},
    ${buildMasterReceivableCte(dateFilter)},
    combined AS (
      SELECT * FROM payment_customer_payments
      UNION ALL
      SELECT web.*
      FROM web_payments web
      WHERE NOT EXISTS (
        SELECT 1
        FROM payment_customer_payments official
        WHERE official.document_no = web.document_no
          AND CONVERT(date, official.occurred_at) = CONVERT(date, web.occurred_at)
      )
      UNION ALL
      SELECT legacy.*
      FROM master_receivable_payments legacy
      WHERE NOT EXISTS (
        SELECT 1
        FROM payment_customer_payments official
        WHERE official.document_no = legacy.document_no
          AND CONVERT(date, official.occurred_at) = CONVERT(date, legacy.occurred_at)
      )
        AND NOT EXISTS (
          SELECT 1
          FROM web_payments web
          WHERE web.document_no = legacy.document_no
            AND CONVERT(date, web.occurred_at) = CONVERT(date, legacy.occurred_at)
        )
    )
  `;
}
