/**
 * Bill Drafts API
 * เปิดบิลจากมือถือเข้าตารางบิลขายจริงของ POS เดิม
 */

import sql from "mssql";
import { type NextRequest, NextResponse } from "next/server";
import { executeQuery, getPool } from "@/lib/db";

interface BillDraftItem {
  type?: "product" | "service";
  barCode?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  cost?: number;
  discount?: number;
  note?: string;
}

interface BillDraftPayload {
  customerCode?: string;
  customerName: string;
  phoneCustomer?: string;
  nameCar?: string;
  province?: string;
  brandAndGenerate?: string;
  mileCar?: string;
  deposits?: number;
  cash?: number;
  transfer?: number;
  nameBank?: string;
  note?: string;
  createdBy?: string;
  createdFrom?: string;
  items: BillDraftItem[];
}

interface BillDraftRow {
  id: number;
  draftNo: string;
  status: string;
  paymentStatus: string;
  customerCode: string | null;
  customerName: string | null;
  phoneCustomer: string | null;
  nameCar: string | null;
  province: string | null;
  brandAndGenerate: string | null;
  mileCar: string | null;
  itemsJson: string;
  subTotal: number;
  discountTotal: number;
  totalPrice: number;
  note: string | null;
  createdFrom: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface BillTotals {
  subTotal: number;
  discountTotal: number;
  totalPrice: number;
  totalCost: number;
  totalProfit: number;
  serviceTotal: number;
}

interface BillPayment {
  deposits: number;
  cash: number;
  transfer: number;
  paidTotal: number;
  remainingAmount: number;
  legacyStatus: "ค้างชำระ" | "ชำระเงินแล้ว";
  draftPaymentStatus: "ยังไม่ชำระ" | "ชำระบางส่วน" | "ชำระแล้ว";
  nameBank: string;
}

interface LegacyCustomerResolution {
  codeCustomer: string | null;
  created: boolean;
}

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMoney(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Number(number.toFixed(2));
}

function normalizeQuantity(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return 1;
  }

  return Number(number.toFixed(2));
}

function normalizeItems(items: unknown): BillDraftItem[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const normalizedItems: BillDraftItem[] = [];

  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }

    const rawItem = item as Record<string, unknown>;
    const name = sanitizeText(rawItem.name);

    if (!name) {
      continue;
    }

    normalizedItems.push({
      type: rawItem.type === "product" ? "product" : "service",
      barCode: sanitizeText(rawItem.barCode),
      name,
      quantity: normalizeQuantity(rawItem.quantity),
      unitPrice: normalizeMoney(rawItem.unitPrice),
      cost: normalizeMoney(rawItem.cost),
      discount: normalizeMoney(rawItem.discount),
      note: sanitizeText(rawItem.note),
    });
  }

  return normalizedItems;
}

function calculateTotals(items: BillDraftItem[]) {
  const subTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const discountTotal = items.reduce(
    (sum, item) => sum + (item.discount || 0),
    0,
  );
  const totalPrice = Math.max(subTotal - discountTotal, 0);
  const totalCost = items.reduce(
    (sum, item) => sum + item.quantity * (item.cost || 0),
    0,
  );
  const serviceTotal = items.reduce((sum, item) => {
    if (item.type !== "service") {
      return sum;
    }

    return (
      sum + Math.max(item.quantity * item.unitPrice - (item.discount || 0), 0)
    );
  }, 0);

  return {
    subTotal: Number(subTotal.toFixed(2)),
    discountTotal: Number(discountTotal.toFixed(2)),
    totalPrice: Number(totalPrice.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    totalProfit: Number((totalPrice - totalCost).toFixed(2)),
    serviceTotal: Number(serviceTotal.toFixed(2)),
  };
}

function calculatePayment(body: BillDraftPayload, totalPrice: number) {
  const deposits = normalizeMoney(body.deposits);
  const cash = normalizeMoney(body.cash);
  const transfer = normalizeMoney(body.transfer);
  const paidTotal = Number((deposits + cash + transfer).toFixed(2));
  const remainingAmount = Number(
    Math.max(totalPrice - paidTotal, 0).toFixed(2),
  );
  const draftPaymentStatus =
    remainingAmount <= 0
      ? "ชำระแล้ว"
      : paidTotal > 0
        ? "ชำระบางส่วน"
        : "ยังไม่ชำระ";

  return {
    deposits,
    cash,
    transfer,
    paidTotal,
    remainingAmount,
    legacyStatus: remainingAmount <= 0 ? "ชำระเงินแล้ว" : "ค้างชำระ",
    draftPaymentStatus,
    nameBank: transfer > 0 ? sanitizeText(body.nameBank) : "",
  } satisfies BillPayment;
}

function formatLegacyBillNo(params: {
  shortCode: string;
  date: Date;
  reportNumber: number;
}) {
  const month = String(params.date.getMonth() + 1);
  const shortYear = String(params.date.getFullYear()).slice(-2);
  const paddedReportNumber = String(params.reportNumber).padStart(6, "0");

  return `${params.shortCode}${month}${shortYear}${paddedReportNumber}`;
}

async function createLegacyBillNo(
  transaction: sql.Transaction,
  createdAt: Date,
) {
  const yearToday = String(createdAt.getFullYear());
  const seedRequest = new sql.Request(transaction);

  seedRequest.input("yearToday", sql.NVarChar(20), yearToday);
  seedRequest.input("shortCode", sql.NVarChar(15), "PSC");

  await seedRequest.query(`
    IF NOT EXISTS (
      SELECT 1
      FROM dbo.NumberSalePost WITH (UPDLOCK, HOLDLOCK)
      WHERE YearToday = @yearToday
    )
    BEGIN
      INSERT INTO dbo.NumberSalePost (YearToday, ShortCH, NumReport)
      VALUES (@yearToday, @shortCode, 0)
    END
  `);

  const readRequest = new sql.Request(transaction);
  readRequest.input("yearToday", sql.NVarChar(20), yearToday);

  const numberRows = await readRequest.query<{
    ShortCH: string | null;
    NumReport: number | null;
  }>(`
    SELECT TOP 1
      ISNULL(ShortCH, 'PSC') AS ShortCH,
      ISNULL(NumReport, 0) AS NumReport
    FROM dbo.NumberSalePost WITH (UPDLOCK, HOLDLOCK)
    WHERE YearToday = @yearToday
    ORDER BY ShortCH
  `);

  const numberRow = numberRows.recordset[0];

  if (!numberRow) {
    throw new Error("ไม่พบข้อมูลเลขรันบิล NumberSalePost");
  }

  const shortCode = sanitizeText(numberRow.ShortCH) || "PSC";
  let reportNumber = Number(numberRow.NumReport || 0) + 1;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const billNo = formatLegacyBillNo({
      shortCode,
      date: createdAt,
      reportNumber,
    });
    const existingRequest = new sql.Request(transaction);
    existingRequest.input("billNo", sql.NVarChar(20), billNo);

    const existingRows = await existingRequest.query<{ count: number }>(`
      SELECT COUNT(*) AS count
      FROM dbo.MasterSalePost WITH (UPDLOCK, HOLDLOCK)
      WHERE NumberPrintSalePost = @billNo
    `);

    if (!existingRows.recordset[0]?.count) {
      const updateRequest = new sql.Request(transaction);
      updateRequest.input("yearToday", sql.NVarChar(20), yearToday);
      updateRequest.input("shortCode", sql.NVarChar(15), shortCode);
      updateRequest.input("reportNumber", sql.Int, reportNumber);

      await updateRequest.query(`
        UPDATE dbo.NumberSalePost
        SET NumReport = @reportNumber
        WHERE YearToday = @yearToday
          AND ISNULL(ShortCH, 'PSC') = @shortCode
      `);

      return billNo;
    }

    reportNumber += 1;
  }

  throw new Error("ไม่สามารถสร้างเลขบิลจาก NumberSalePost ที่ไม่ซ้ำได้");
}

function formatLegacyTime(date: Date) {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");
}

function getLegacyDateOnly(date: Date) {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
}

function truncateText(value: string | null, maxLength: number) {
  if (!value) {
    return null;
  }

  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function getLineTotal(item: BillDraftItem) {
  return Number(
    Math.max(item.quantity * item.unitPrice - (item.discount || 0), 0).toFixed(
      2,
    ),
  );
}

function getLineCost(item: BillDraftItem) {
  return Number((item.quantity * (item.cost || 0)).toFixed(2));
}

function getItemBarcode(item: BillDraftItem, index: number) {
  return truncateText(sanitizeText(item.barCode), 20) || `SVC${index + 1}`;
}

function getMeterProduct(item: BillDraftItem) {
  return item.type === "service" ? "ครั้ง" : "ชิ้น";
}

function formatStockValue(value: number) {
  return Number(value.toFixed(2)).toString();
}

function parseLegacyNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getLegacyDetailPrint(body: BillDraftPayload) {
  const phoneCustomer = sanitizeText(body.phoneCustomer);
  const note = sanitizeText(body.note);
  const detail = [phoneCustomer ? `โทร: ${phoneCustomer}` : "", note].filter(
    Boolean,
  );

  return truncateText(detail.join("\n"), 4000);
}

function formatLegacyCustomerCode(code: number) {
  return String(code).padStart(6, "0");
}

function getLookupText(value: string) {
  const text = sanitizeText(value);

  return text && text !== "-" && text !== "0" ? text : "";
}

async function findLegacyCustomerCode(
  transaction: sql.Transaction,
  params: {
    customerCode: string | null;
    customerName: string;
    phoneCustomer: string;
    nameCar: string;
  },
) {
  if (params.customerCode) {
    const codeRequest = new sql.Request(transaction);
    codeRequest.input("customerCode", sql.NVarChar(30), params.customerCode);

    const codeRows = await codeRequest.query<{ CodeCustomer: string | null }>(`
      SELECT TOP 1 CodeCustomer
      FROM dbo.Customer WITH (UPDLOCK, HOLDLOCK)
      WHERE CodeCustomer = @customerCode
      ORDER BY Code DESC
    `);

    const existingCode = truncateText(
      sanitizeText(codeRows.recordset[0]?.CodeCustomer),
      20,
    );

    if (existingCode) {
      return existingCode;
    }
  }

  const customerName = getLookupText(params.customerName);

  if (!customerName) {
    return null;
  }

  const phoneCustomer = getLookupText(params.phoneCustomer);
  const nameCar = getLookupText(params.nameCar);
  const lookupRequest = new sql.Request(transaction);
  const conditions: string[] = [];

  lookupRequest.input("customerName", sql.NVarChar(sql.MAX), customerName);

  if (phoneCustomer) {
    lookupRequest.input("phoneCustomer", sql.NVarChar(250), phoneCustomer);
    conditions.push(
      "(NameCustomer = @customerName AND PhoneCustomer = @phoneCustomer)",
    );
  }

  if (nameCar) {
    lookupRequest.input("nameCar", sql.NVarChar(250), nameCar);
    conditions.push("(NameCustomer = @customerName AND NameCar = @nameCar)");
  }

  if (conditions.length === 0) {
    conditions.push("NameCustomer = @customerName");
  }

  const lookupRows = await lookupRequest.query<{
    CodeCustomer: string | null;
  }>(`
    SELECT TOP 1 CodeCustomer
    FROM dbo.Customer WITH (UPDLOCK, HOLDLOCK)
    WHERE ${conditions.join(" OR ")}
    ORDER BY Code DESC
  `);

  return truncateText(sanitizeText(lookupRows.recordset[0]?.CodeCustomer), 20);
}

async function createLegacyCustomer(
  transaction: sql.Transaction,
  params: {
    body: BillDraftPayload;
    customerName: string;
    nameCar: string;
    createdAt: Date;
  },
) {
  const insertRequest = new sql.Request(transaction);

  insertRequest.input(
    "nameCar",
    sql.NVarChar(250),
    truncateText(params.nameCar, 250),
  );
  insertRequest.input(
    "province",
    sql.NVarChar(250),
    truncateText(sanitizeText(params.body.province), 250),
  );
  insertRequest.input(
    "brandAndGenerate",
    sql.NVarChar(250),
    truncateText(sanitizeText(params.body.brandAndGenerate), 250),
  );
  insertRequest.input(
    "mileCar",
    sql.NVarChar(250),
    truncateText(sanitizeText(params.body.mileCar), 250),
  );
  insertRequest.input("dateRegistration", sql.DateTime, params.createdAt);
  insertRequest.input(
    "nameCustomer",
    sql.NVarChar(sql.MAX),
    params.customerName,
  );
  insertRequest.input(
    "phoneCustomer",
    sql.NVarChar(250),
    truncateText(sanitizeText(params.body.phoneCustomer), 250),
  );
  insertRequest.input("caseCustomer", sql.NVarChar(150), "ลูกค้าทั่วไป");

  const insertedRows = await insertRequest.query<{ code: number }>(`
    INSERT INTO dbo.Customer (
      NameCar,
      Province,
      BrandAndGenerate,
      MileCar,
      DateRegistration,
      NameCustomer,
      PhoneCustomer,
      CaseCustomer
    )
    VALUES (
      @nameCar,
      @province,
      @brandAndGenerate,
      @mileCar,
      @dateRegistration,
      @nameCustomer,
      @phoneCustomer,
      @caseCustomer
    )

    SELECT CAST(SCOPE_IDENTITY() AS int) AS code
  `);
  const code = insertedRows.recordset[0]?.code;

  if (!code) {
    throw new Error("ไม่สามารถอ่านรหัสลูกค้าที่สร้างใหม่ได้");
  }

  const codeCustomer = formatLegacyCustomerCode(code);
  const updateRequest = new sql.Request(transaction);

  updateRequest.input("code", sql.Int, code);
  updateRequest.input("codeCustomer", sql.NVarChar(30), codeCustomer);

  await updateRequest.query(`
    UPDATE dbo.Customer
    SET CodeCustomer = @codeCustomer
    WHERE Code = @code
  `);

  return codeCustomer;
}

async function resolveLegacyCustomer(
  transaction: sql.Transaction,
  params: {
    body: BillDraftPayload;
    customerName: string;
    nameCar: string;
    createdAt: Date;
  },
): Promise<LegacyCustomerResolution> {
  const customerCode = truncateText(sanitizeText(params.body.customerCode), 20);
  const phoneCustomer = sanitizeText(params.body.phoneCustomer);
  const existingCustomerCode = await findLegacyCustomerCode(transaction, {
    customerCode,
    customerName: params.customerName,
    phoneCustomer,
    nameCar: params.nameCar,
  });

  if (existingCustomerCode) {
    return {
      codeCustomer: existingCustomerCode,
      created: false,
    };
  }

  if (!params.customerName) {
    return {
      codeCustomer: customerCode,
      created: false,
    };
  }

  return {
    codeCustomer: await createLegacyCustomer(transaction, params),
    created: true,
  };
}

async function createLegacySaleBill(params: {
  body: BillDraftPayload;
  items: BillDraftItem[];
  totals: BillTotals;
  payment: BillPayment;
  customerName: string;
  nameCar: string;
}) {
  const { body, items, totals, payment, customerName, nameCar } = params;
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);
  const createdAt = new Date();
  const saleDate = getLegacyDateOnly(createdAt);
  const createdBy = truncateText(sanitizeText(body.createdBy) || "Mobile", 250);
  let customerCode: string | null = null;
  let customerCreated = false;
  const itemSummary = truncateText(
    items.map((item) => item.name).join(", "),
    4000,
  );

  await transaction.begin();

  try {
    const customerResolution = await resolveLegacyCustomer(transaction, {
      body,
      customerName,
      nameCar,
      createdAt,
    });

    customerCode = customerResolution.codeCustomer;
    customerCreated = customerResolution.created;

    const billNo = await createLegacyBillNo(transaction, createdAt);
    const masterRequest = new sql.Request(transaction);

    masterRequest.input("dateSalePost", sql.DateTime, saleDate);
    masterRequest.input("times", formatLegacyTime(createdAt));
    masterRequest.input("billNo", billNo);
    masterRequest.input("nameCar", truncateText(nameCar, 250));
    masterRequest.input(
      "province",
      truncateText(sanitizeText(body.province), 250),
    );
    masterRequest.input(
      "brandAndGenerate",
      truncateText(sanitizeText(body.brandAndGenerate), 250),
    );
    masterRequest.input(
      "mileCar",
      truncateText(sanitizeText(body.mileCar), 50),
    );
    masterRequest.input("customerCode", sql.NVarChar(30), customerCode);
    masterRequest.input("customerName", customerName || null);
    masterRequest.input("deposits", sql.Money, payment.deposits);
    masterRequest.input("totalReduce", sql.Money, totals.discountTotal);
    masterRequest.input("totalPrice", sql.Money, totals.totalPrice);
    masterRequest.input("totalCost", sql.Money, totals.totalCost);
    masterRequest.input("totalProfit", sql.Money, totals.totalProfit);
    masterRequest.input("cash", sql.Money, payment.cash);
    masterRequest.input("transfer", sql.Money, payment.transfer);
    masterRequest.input("createdBy", createdBy);
    masterRequest.input("closeAcc", "");
    masterRequest.input("status", payment.legacyStatus);
    masterRequest.input("numberPrintCash", "");
    masterRequest.input("code", sql.Int, null);
    masterRequest.input("nameBank", truncateText(payment.nameBank, 250) || "");
    masterRequest.input("priceService", sql.Money, totals.serviceTotal);
    masterRequest.input("itemSummary", itemSummary);
    masterRequest.input("detailPrint", getLegacyDetailPrint(body));

    await masterRequest.query(`
      INSERT INTO dbo.MasterSalePost (
        DateSalePost,
        Times,
        NumberPrintSalePost,
        NameCar,
        Province,
        BrandAndGenerate,
        MileCar,
        CodeCustomer,
        NameCustomer,
        Deposits,
        TotalReduce,
        TotalPrice,
        TotalCost,
        TotalProfit,
        Cash,
        Transfer,
        NameSave,
        CloseAcc,
        Status,
        NumberPrintCash,
        Code,
        NameBank,
        PriceService,
        NameSeviceProduct,
        DetailPrint
      )
      VALUES (
        @dateSalePost,
        @times,
        @billNo,
        @nameCar,
        @province,
        @brandAndGenerate,
        @mileCar,
        @customerCode,
        @customerName,
        @deposits,
        @totalReduce,
        @totalPrice,
        @totalCost,
        @totalProfit,
        @cash,
        @transfer,
        @createdBy,
        @closeAcc,
        @status,
        @numberPrintCash,
        @code,
        @nameBank,
        @priceService,
        @itemSummary,
        @detailPrint
      )
    `);

    for (const [index, item] of items.entries()) {
      const barCode = getItemBarcode(item, index);
      const meterProduct = getMeterProduct(item);
      const lineTotal = getLineTotal(item);
      const lineCost = getLineCost(item);
      const detailRequest = new sql.Request(transaction);

      detailRequest.input("dateSalePost", sql.DateTime, saleDate);
      detailRequest.input("billNo", billNo);
      detailRequest.input("orderNumber", sql.Int, index + 1);
      detailRequest.input("barCode", barCode);
      detailRequest.input("nameProduct", truncateText(item.name, 250));
      detailRequest.input("quantity", sql.Real, item.quantity);
      detailRequest.input("meterProduct", meterProduct);
      detailRequest.input("salePrice", sql.Money, item.unitPrice);
      detailRequest.input("reducePrice", sql.Money, item.discount || 0);
      detailRequest.input("sumPrice", sql.Money, lineTotal);
      detailRequest.input("sumCost", sql.Money, lineCost);
      detailRequest.input("sumProfit", sql.Money, lineTotal - lineCost);
      detailRequest.input(
        "typeSale",
        item.type === "product" ? "สินค้า" : "บริการ",
      );
      detailRequest.input("customerCode", sql.NVarChar(20), customerCode);
      detailRequest.input("createdBy", truncateText(createdBy, 200));

      await detailRequest.query(`
        INSERT INTO dbo.DetailSalePost (
          DateSalePost,
          NumberPrintSalePost,
          OderNum,
          BarCode,
          NameProduct,
          NumProduct,
          MeterProduct,
          SalePrice,
          ReducePrice,
          SumPrice,
          SumCost,
          SumProfit,
          TypeSale,
          CodeCustomer,
          NameSave
        )
        VALUES (
          @dateSalePost,
          @billNo,
          @orderNumber,
          @barCode,
          @nameProduct,
          @quantity,
          @meterProduct,
          @salePrice,
          @reducePrice,
          @sumPrice,
          @sumCost,
          @sumProfit,
          @typeSale,
          @customerCode,
          @createdBy
        )
      `);

      const currentStockRequest = new sql.Request(transaction);
      currentStockRequest.input("barCode", sql.NVarChar(30), barCode);

      const currentStockRows = await currentStockRequest.query<{
        Stock: string | null;
      }>(`
        SELECT TOP 1 Stock
        FROM dbo.INOUTStockProduct WITH (UPDLOCK, HOLDLOCK)
        WHERE BarCode = @barCode
        ORDER BY DateSave DESC, Times DESC, NumberPrint DESC
      `);

      const currentStock = parseLegacyNumber(
        currentStockRows.recordset[0]?.Stock,
      );
      const nextStock = currentStock - item.quantity;
      const stockRequest = new sql.Request(transaction);

      stockRequest.input("dateSave", sql.DateTime, createdAt);
      stockRequest.input("times", formatLegacyTime(createdAt));
      stockRequest.input("billNo", billNo);
      stockRequest.input("barCode", truncateText(barCode, 30));
      stockRequest.input("nameProduct", truncateText(item.name, 250));
      stockRequest.input("meterProduct", truncateText(meterProduct, 50));
      stockRequest.input("credit", formatStockValue(item.quantity));
      stockRequest.input("stock", formatStockValue(nextStock));

      await stockRequest.query(`
        INSERT INTO dbo.INOUTStockProduct (
          DateSave,
          Times,
          NumberPrint,
          BarCode,
          NameProduct,
          MeterProduct,
          Debit,
          Credit,
          Stock,
          CostPrice,
          CodeCompany,
          NameCompany
        )
        VALUES (
          @dateSave,
          @times,
          @billNo,
          @barCode,
          @nameProduct,
          @meterProduct,
          '',
          @credit,
          @stock,
          '',
          '',
          ''
        )
      `);
    }

    if (payment.remainingAmount > 0) {
      const receivableRequest = new sql.Request(transaction);

      receivableRequest.input("datePost", sql.DateTime, createdAt);
      receivableRequest.input("billNo", billNo);
      receivableRequest.input("customerCode", sql.NVarChar(30), customerCode);
      receivableRequest.input("customerName", customerName || null);
      receivableRequest.input("totalPrice", sql.Money, totals.totalPrice);
      receivableRequest.input("payMoney", sql.Money, payment.paidTotal);
      receivableRequest.input("subMoney", sql.Money, payment.remainingAmount);

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
    }

    await transaction.commit();

    return {
      billNo,
      createdAt,
      customerCode,
      customerCreated,
    };
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.warn("Bill draft transaction rollback failed:", rollbackError);
    }
    throw error;
  }
}

async function billDraftTableExists() {
  const [result] = await executeQuery<{ count: number }>(
    `
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
        AND TABLE_NAME = 'WebBillDrafts'
    `,
    undefined,
    false,
  );

  return (result?.count || 0) > 0;
}

async function ensureBillDraftTable() {
  await executeQuery(
    `
      IF OBJECT_ID(N'dbo.WebBillDrafts', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.WebBillDrafts (
          ID int IDENTITY(1,1) NOT NULL PRIMARY KEY,
          DraftNo nvarchar(30) NOT NULL UNIQUE,
          Status nvarchar(30) NOT NULL DEFAULT N'เปิดบิล',
          PaymentStatus nvarchar(30) NOT NULL DEFAULT N'ยังไม่ชำระ',
          CustomerCode nvarchar(30) NULL,
          CustomerName nvarchar(200) NULL,
          PhoneCustomer nvarchar(50) NULL,
          NameCar nvarchar(100) NULL,
          Province nvarchar(100) NULL,
          BrandAndGenerate nvarchar(150) NULL,
          MileCar nvarchar(50) NULL,
          ItemsJson nvarchar(max) NOT NULL,
          SubTotal money NOT NULL DEFAULT 0,
          DiscountTotal money NOT NULL DEFAULT 0,
          TotalPrice money NOT NULL DEFAULT 0,
          Note nvarchar(max) NULL,
          CreatedFrom nvarchar(30) NULL,
          CreatedBy nvarchar(100) NULL,
          CreatedAt datetime NOT NULL DEFAULT GETDATE(),
          UpdatedAt datetime NOT NULL DEFAULT GETDATE(),
          SentToMainAt datetime NULL
        );

        CREATE INDEX IX_WebBillDrafts_CreatedAt
        ON dbo.WebBillDrafts (CreatedAt DESC);
      END
    `,
    undefined,
    false,
  );
}

function mapDraft(row: BillDraftRow) {
  let items: BillDraftItem[] = [];

  try {
    items = JSON.parse(row.itemsJson) as BillDraftItem[];
  } catch {
    items = [];
  }

  return {
    id: row.id,
    draftNo: row.draftNo,
    status: row.status,
    paymentStatus: row.paymentStatus,
    customerCode: row.customerCode,
    customerName: row.customerName,
    phoneCustomer: row.phoneCustomer,
    nameCar: row.nameCar,
    province: row.province,
    brandAndGenerate: row.brandAndGenerate,
    mileCar: row.mileCar,
    items,
    subTotal: row.subTotal,
    discountTotal: row.discountTotal,
    totalPrice: row.totalPrice,
    note: row.note,
    createdFrom: row.createdFrom,
    createdBy: row.createdBy,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") || "20", 10),
      100,
    );
    const search = searchParams.get("search") || "";

    if (!(await billDraftTableExists())) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    const conditions: string[] = [];
    const params: Record<string, unknown> = { limit };

    if (search) {
      conditions.push(
        `(DraftNo LIKE @search OR CustomerName LIKE @search OR NameCar LIKE @search OR PhoneCustomer LIKE @search)`,
      );
      params.search = `%${search}%`;
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const rows = await executeQuery<BillDraftRow>(
      `
        SELECT TOP (@limit)
          ID as id,
          DraftNo as draftNo,
          Status as status,
          PaymentStatus as paymentStatus,
          CustomerCode as customerCode,
          CustomerName as customerName,
          PhoneCustomer as phoneCustomer,
          NameCar as nameCar,
          Province as province,
          BrandAndGenerate as brandAndGenerate,
          MileCar as mileCar,
          ItemsJson as itemsJson,
          SubTotal as subTotal,
          DiscountTotal as discountTotal,
          TotalPrice as totalPrice,
          Note as note,
          CreatedFrom as createdFrom,
          CreatedBy as createdBy,
          CreatedAt as createdAt,
          UpdatedAt as updatedAt
        FROM dbo.WebBillDrafts
        ${whereClause}
        ORDER BY CreatedAt DESC
      `,
      params,
      false,
    );

    return NextResponse.json({
      success: true,
      data: rows.map(mapDraft),
      total: rows.length,
    });
  } catch (error) {
    console.error("Bill drafts API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch bill drafts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BillDraftPayload;
    const items = normalizeItems(body.items);
    const customerName = sanitizeText(body.customerName);
    const nameCar = sanitizeText(body.nameCar);

    if (!customerName && !nameCar) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาระบุชื่อลูกค้าหรือข้อมูลรถ",
        },
        { status: 400 },
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาเพิ่มรายการอย่างน้อย 1 รายการ",
        },
        { status: 400 },
      );
    }

    const totals = calculateTotals(items);
    const payment = calculatePayment(body, totals.totalPrice);

    if (payment.paidTotal > totals.totalPrice) {
      return NextResponse.json(
        {
          success: false,
          error: "ยอดชำระมากกว่ายอดรวมของบิล",
        },
        { status: 400 },
      );
    }

    if (payment.transfer > 0 && !payment.nameBank) {
      return NextResponse.json(
        {
          success: false,
          error: "กรุณาระบุธนาคารสำหรับเงินโอน",
        },
        { status: 400 },
      );
    }

    const legacyBill = await createLegacySaleBill({
      body,
      items,
      totals,
      payment,
      customerName,
      nameCar,
    });
    const billNo = legacyBill.billNo;
    const billCustomerCode = legacyBill.customerCode || null;
    let created: BillDraftRow | null = null;

    try {
      await ensureBillDraftTable();

      const [createdRow] = await executeQuery<BillDraftRow>(
        `
          INSERT INTO dbo.WebBillDrafts (
            DraftNo,
            Status,
            PaymentStatus,
            CustomerCode,
            CustomerName,
            PhoneCustomer,
            NameCar,
            Province,
            BrandAndGenerate,
            MileCar,
            ItemsJson,
            SubTotal,
            DiscountTotal,
            TotalPrice,
            Note,
            CreatedFrom,
            CreatedBy,
            SentToMainAt
          )
          OUTPUT
            INSERTED.ID as id,
            INSERTED.DraftNo as draftNo,
            INSERTED.Status as status,
            INSERTED.PaymentStatus as paymentStatus,
            INSERTED.CustomerCode as customerCode,
            INSERTED.CustomerName as customerName,
            INSERTED.PhoneCustomer as phoneCustomer,
            INSERTED.NameCar as nameCar,
            INSERTED.Province as province,
            INSERTED.BrandAndGenerate as brandAndGenerate,
            INSERTED.MileCar as mileCar,
            INSERTED.ItemsJson as itemsJson,
            INSERTED.SubTotal as subTotal,
            INSERTED.DiscountTotal as discountTotal,
            INSERTED.TotalPrice as totalPrice,
            INSERTED.Note as note,
            INSERTED.CreatedFrom as createdFrom,
            INSERTED.CreatedBy as createdBy,
            INSERTED.CreatedAt as createdAt,
            INSERTED.UpdatedAt as updatedAt
          VALUES (
            @draftNo,
            N'เปิดบิล',
            @paymentStatus,
            @customerCode,
            @customerName,
            @phoneCustomer,
            @nameCar,
            @province,
            @brandAndGenerate,
            @mileCar,
            @itemsJson,
            @subTotal,
            @discountTotal,
            @totalPrice,
            @note,
            @createdFrom,
            @createdBy,
            GETDATE()
          )
        `,
        {
          draftNo: billNo,
          paymentStatus: payment.draftPaymentStatus,
          customerCode: billCustomerCode,
          customerName: customerName || null,
          phoneCustomer: sanitizeText(body.phoneCustomer) || null,
          nameCar: nameCar || null,
          province: sanitizeText(body.province) || null,
          brandAndGenerate: sanitizeText(body.brandAndGenerate) || null,
          mileCar: sanitizeText(body.mileCar) || null,
          itemsJson: JSON.stringify(items),
          subTotal: totals.subTotal,
          discountTotal: totals.discountTotal,
          totalPrice: totals.totalPrice,
          note: sanitizeText(body.note) || null,
          createdFrom: sanitizeText(body.createdFrom) || "mobile",
          createdBy: sanitizeText(body.createdBy) || null,
        },
        false,
      );
      created = createdRow || null;
    } catch (logError) {
      console.warn("Bill draft log insert failed:", logError);
    }

    const data = created
      ? mapDraft(created)
      : {
          id: 0,
          draftNo: billNo,
          status: "เปิดบิล",
          paymentStatus: payment.draftPaymentStatus,
          customerCode: billCustomerCode,
          customerName: customerName || null,
          phoneCustomer: sanitizeText(body.phoneCustomer) || null,
          nameCar: nameCar || null,
          province: sanitizeText(body.province) || null,
          brandAndGenerate: sanitizeText(body.brandAndGenerate) || null,
          mileCar: sanitizeText(body.mileCar) || null,
          items,
          subTotal: totals.subTotal,
          discountTotal: totals.discountTotal,
          totalPrice: totals.totalPrice,
          note: sanitizeText(body.note) || null,
          createdFrom: sanitizeText(body.createdFrom) || "mobile",
          createdBy: sanitizeText(body.createdBy) || null,
          createdAt: legacyBill.createdAt.toISOString(),
          updatedAt: legacyBill.createdAt.toISOString(),
        };

    return NextResponse.json(
      {
        success: true,
        data: {
          ...data,
          billNo,
          legacyBillNo: billNo,
          customerCreated: legacyBill.customerCreated,
          sourceTable: "MasterSalePost",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Bill drafts create API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create bill draft",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
