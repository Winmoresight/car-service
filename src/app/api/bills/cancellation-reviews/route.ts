import type { NextRequest } from "next/server";
import {
  errorResponse,
  handleApiError,
  successResponse,
  withTimeout,
} from "@/lib/api-utils";
import { executeQuery } from "@/lib/db";

const snapshotTableName = "WebBillCancellationSnapshots";
const reviewTableName = "WebBillCancellationReviews";

type CancellationReviewStatus = "pending" | "approved";
type CancellationReviewReason = "status_cancelled" | "missing";
type CancellationReviewFilter = CancellationReviewStatus | "all";

interface CancellationReview {
  numberPrint: string;
  originalDate: string | null;
  customerName: string;
  totalPrice: number;
  totalProfit: number;
  cash: number;
  transfer: number;
  legacyStatus: string;
  userName: string;
  detectedReason: CancellationReviewReason;
  detectedAt: string;
  reviewStatus: CancellationReviewStatus;
  approvedAt: string | null;
  approvedBy: string;
  note: string;
}

interface CancellationReviewSummary {
  totalReviews: number;
  pendingCount: number;
  approvedCount: number;
  pendingAmount: number;
  approvedAmount: number;
}

interface CancellationReviewRow {
  numberPrint: string | null;
  originalDate: Date | null;
  customerName: string | null;
  totalPrice: number | string | null;
  totalProfit: number | string | null;
  cash: number | string | null;
  transfer: number | string | null;
  legacyStatus: string | null;
  userName: string | null;
  detectedReason: CancellationReviewReason | null;
  detectedAt: Date | null;
  reviewStatus: CancellationReviewStatus | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  note: string | null;
}

interface CancellationReviewPayload {
  numberPrint: string;
  approvedBy: string;
  note: string;
}

class CancellationReviewValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CancellationReviewValidationError";
    this.status = status;
  }
}

function quoteIdentifier(identifier: string) {
  return `[${identifier.replaceAll("]", "]]")}]`;
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

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeLimit(value: string | null) {
  const limit = Number.parseInt(value || "20", 10);

  if (!Number.isFinite(limit) || limit <= 0) {
    return 20;
  }

  return Math.min(limit, 100);
}

function normalizeOffset(value: string | null) {
  const offset = Number.parseInt(value || "0", 10);

  return Number.isFinite(offset) && offset > 0 ? offset : 0;
}

function normalizeReviewFilter(value: string | null): CancellationReviewFilter {
  if (value === "approved" || value === "pending") {
    return value;
  }

  return "all";
}

function parseApprovePayload(body: unknown): CancellationReviewPayload {
  if (typeof body !== "object" || body === null) {
    throw new CancellationReviewValidationError("ข้อมูลอนุมัติไม่ถูกต้อง");
  }

  const source = body as Record<string, unknown>;
  const numberPrint = normalizeText(source.numberPrint);

  if (!numberPrint) {
    throw new CancellationReviewValidationError("กรุณาระบุเลขที่บิล");
  }

  return {
    numberPrint,
    approvedBy: normalizeText(source.approvedBy) || "WEB",
    note: normalizeText(source.note).slice(0, 500),
  };
}

async function ensureCancellationReviewTables() {
  await executeQuery(
    `
      IF OBJECT_ID(N'dbo.${snapshotTableName}', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.${quoteIdentifier(snapshotTableName)} (
          NumberPrintSalePost nvarchar(30) NOT NULL,
          DateSalePost datetime NULL,
          CustomerName nvarchar(250) NULL,
          TotalPrice money NOT NULL
            CONSTRAINT DF_${snapshotTableName}_TotalPrice DEFAULT 0,
          TotalProfit money NOT NULL
            CONSTRAINT DF_${snapshotTableName}_TotalProfit DEFAULT 0,
          Cash money NOT NULL
            CONSTRAINT DF_${snapshotTableName}_Cash DEFAULT 0,
          Transfer money NOT NULL
            CONSTRAINT DF_${snapshotTableName}_Transfer DEFAULT 0,
          LegacyStatus nvarchar(100) NULL,
          UserName nvarchar(250) NULL,
          FirstSeenAt datetime NOT NULL
            CONSTRAINT DF_${snapshotTableName}_FirstSeenAt DEFAULT GETDATE(),
          LastSeenAt datetime NOT NULL
            CONSTRAINT DF_${snapshotTableName}_LastSeenAt DEFAULT GETDATE(),
          CONSTRAINT PK_${snapshotTableName}
            PRIMARY KEY (NumberPrintSalePost)
        )
      END

      IF OBJECT_ID(N'dbo.${reviewTableName}', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.${quoteIdentifier(reviewTableName)} (
          NumberPrintSalePost nvarchar(30) NOT NULL,
          OriginalDate datetime NULL,
          CustomerName nvarchar(250) NULL,
          TotalPrice money NOT NULL
            CONSTRAINT DF_${reviewTableName}_TotalPrice DEFAULT 0,
          TotalProfit money NOT NULL
            CONSTRAINT DF_${reviewTableName}_TotalProfit DEFAULT 0,
          Cash money NOT NULL
            CONSTRAINT DF_${reviewTableName}_Cash DEFAULT 0,
          Transfer money NOT NULL
            CONSTRAINT DF_${reviewTableName}_Transfer DEFAULT 0,
          LegacyStatus nvarchar(100) NULL,
          UserName nvarchar(250) NULL,
          DetectedReason nvarchar(30) NOT NULL,
          DetectedAt datetime NOT NULL
            CONSTRAINT DF_${reviewTableName}_DetectedAt DEFAULT GETDATE(),
          ReviewStatus nvarchar(20) NOT NULL
            CONSTRAINT DF_${reviewTableName}_ReviewStatus DEFAULT N'pending',
          ApprovedAt datetime NULL,
          ApprovedBy nvarchar(250) NULL,
          Note nvarchar(500) NULL,
          CONSTRAINT PK_${reviewTableName}
            PRIMARY KEY (NumberPrintSalePost)
        )
      END
    `,
    undefined,
    false,
  );
}

async function syncCancellationReviews() {
  await ensureCancellationReviewTables();

  await executeQuery(
    `
      UPDATE snapshot
      SET
        DateSalePost = m.DateSalePost,
        CustomerName = ISNULL(m.NameCustomer, N'ไม่ระบุ'),
        TotalPrice = ISNULL(m.TotalPrice, 0),
        TotalProfit = ISNULL(m.TotalProfit, 0),
        Cash = ISNULL(m.Cash, 0),
        Transfer = ISNULL(m.Transfer, 0),
        LegacyStatus = LTRIM(RTRIM(ISNULL(m.Status, N''))),
        UserName = ISNULL(m.NameSave, N''),
        LastSeenAt = GETDATE()
      FROM dbo.${quoteIdentifier(snapshotTableName)} snapshot
      INNER JOIN dbo.MasterSalePost m
        ON m.NumberPrintSalePost = snapshot.NumberPrintSalePost
      WHERE ISNULL(m.NumberPrintSalePost, N'') <> N''
        AND m.NumberPrintSalePost LIKE N'SA%'
        AND LTRIM(RTRIM(ISNULL(m.Status, N''))) NOT LIKE N'%ยกเลิก%'

      INSERT INTO dbo.${quoteIdentifier(snapshotTableName)} (
        NumberPrintSalePost,
        DateSalePost,
        CustomerName,
        TotalPrice,
        TotalProfit,
        Cash,
        Transfer,
        LegacyStatus,
        UserName
      )
      SELECT
        m.NumberPrintSalePost,
        m.DateSalePost,
        ISNULL(m.NameCustomer, N'ไม่ระบุ'),
        ISNULL(m.TotalPrice, 0),
        ISNULL(m.TotalProfit, 0),
        ISNULL(m.Cash, 0),
        ISNULL(m.Transfer, 0),
        LTRIM(RTRIM(ISNULL(m.Status, N''))),
        ISNULL(m.NameSave, N'')
      FROM dbo.MasterSalePost m
      WHERE ISNULL(m.NumberPrintSalePost, N'') <> N''
        AND m.NumberPrintSalePost LIKE N'SA%'
        AND LTRIM(RTRIM(ISNULL(m.Status, N''))) NOT LIKE N'%ยกเลิก%'
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.${quoteIdentifier(snapshotTableName)} snapshot
          WHERE snapshot.NumberPrintSalePost = m.NumberPrintSalePost
        )

      INSERT INTO dbo.${quoteIdentifier(reviewTableName)} (
        NumberPrintSalePost,
        OriginalDate,
        CustomerName,
        TotalPrice,
        TotalProfit,
        Cash,
        Transfer,
        LegacyStatus,
        UserName,
        DetectedReason
      )
      SELECT
        m.NumberPrintSalePost,
        m.DateSalePost,
        ISNULL(m.NameCustomer, N'ไม่ระบุ'),
        ISNULL(m.TotalPrice, 0),
        ISNULL(m.TotalProfit, 0),
        ISNULL(m.Cash, 0),
        ISNULL(m.Transfer, 0),
        LTRIM(RTRIM(ISNULL(m.Status, N''))),
        ISNULL(m.NameSave, N''),
        N'status_cancelled'
      FROM dbo.MasterSalePost m
      WHERE ISNULL(m.NumberPrintSalePost, N'') <> N''
        AND m.NumberPrintSalePost LIKE N'SA%'
        AND LTRIM(RTRIM(ISNULL(m.Status, N''))) LIKE N'%ยกเลิก%'
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.${quoteIdentifier(reviewTableName)} review
          WHERE review.NumberPrintSalePost = m.NumberPrintSalePost
        )

      INSERT INTO dbo.${quoteIdentifier(reviewTableName)} (
        NumberPrintSalePost,
        OriginalDate,
        CustomerName,
        TotalPrice,
        TotalProfit,
        Cash,
        Transfer,
        LegacyStatus,
        UserName,
        DetectedReason
      )
      SELECT
        d.NumberPrint,
        d.DateDelect,
        ISNULL(d.NameCustomer, N'ไม่ระบุ'),
        ISNULL(d.TotalPrice, 0),
        0,
        0,
        0,
        N'ยกเลิก',
        ISNULL(d.NameUser, N''),
        N'status_cancelled'
      FROM dbo.MasterPrintDelect d
      WHERE ISNULL(d.NumberPrint, N'') <> N''
        AND d.NumberPrint LIKE N'SA%'
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.${quoteIdentifier(reviewTableName)} review
          WHERE review.NumberPrintSalePost = d.NumberPrint
        )

      INSERT INTO dbo.${quoteIdentifier(reviewTableName)} (
        NumberPrintSalePost,
        OriginalDate,
        CustomerName,
        TotalPrice,
        TotalProfit,
        Cash,
        Transfer,
        LegacyStatus,
        UserName,
        DetectedReason
      )
      SELECT
        snapshot.NumberPrintSalePost,
        snapshot.DateSalePost,
        snapshot.CustomerName,
        snapshot.TotalPrice,
        snapshot.TotalProfit,
        snapshot.Cash,
        snapshot.Transfer,
        snapshot.LegacyStatus,
        snapshot.UserName,
        N'missing'
      FROM dbo.${quoteIdentifier(snapshotTableName)} snapshot
      WHERE snapshot.NumberPrintSalePost LIKE N'SA%'
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.MasterSalePost m
          WHERE m.NumberPrintSalePost = snapshot.NumberPrintSalePost
        )
        AND NOT EXISTS (
          SELECT 1
          FROM dbo.${quoteIdentifier(reviewTableName)} review
          WHERE review.NumberPrintSalePost = snapshot.NumberPrintSalePost
        )
    `,
    undefined,
    false,
  );
}

function getFilterCondition(filter: CancellationReviewFilter) {
  if (filter === "pending") {
    return "AND ReviewStatus = N'pending'";
  }

  if (filter === "approved") {
    return "AND ReviewStatus = N'approved'";
  }

  return "";
}

function getDateFilterCondition(startDate: string, endDate: string) {
  const conditions: string[] = [];

  if (startDate) {
    conditions.push("AND CONVERT(date, OriginalDate) >= @startDate");
  }

  if (endDate) {
    conditions.push("AND CONVERT(date, OriginalDate) <= @endDate");
  }

  return conditions.join("\n");
}

function mapCancellationReview(row: CancellationReviewRow): CancellationReview {
  return {
    numberPrint: normalizeText(row.numberPrint),
    originalDate: toIsoString(row.originalDate),
    customerName: normalizeText(row.customerName) || "ไม่ระบุ",
    totalPrice: normalizeMoney(row.totalPrice),
    totalProfit: normalizeMoney(row.totalProfit),
    cash: normalizeMoney(row.cash),
    transfer: normalizeMoney(row.transfer),
    legacyStatus: normalizeText(row.legacyStatus),
    userName: normalizeText(row.userName),
    detectedReason:
      row.detectedReason === "missing" ? "missing" : "status_cancelled",
    detectedAt: toIsoString(row.detectedAt) || new Date().toISOString(),
    reviewStatus: row.reviewStatus === "approved" ? "approved" : "pending",
    approvedAt: toIsoString(row.approvedAt),
    approvedBy: normalizeText(row.approvedBy),
    note: normalizeText(row.note),
  };
}

async function getCancellationReviews({
  limit,
  offset,
  filter,
  startDate,
  endDate,
}: {
  limit: number;
  offset: number;
  filter: CancellationReviewFilter;
  startDate: string;
  endDate: string;
}) {
  await syncCancellationReviews();

  const filterCondition = getFilterCondition(filter);
  const dateFilterCondition = getDateFilterCondition(startDate, endDate);
  const queryParams = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };
  const [summaryRows, countRows, rows] = await Promise.all([
    executeQuery<{
      totalReviews: number | null;
      pendingCount: number | null;
      approvedCount: number | null;
      pendingAmount: number | string | null;
      approvedAmount: number | string | null;
    }>(
      `
        SELECT
          COUNT(1) as totalReviews,
          SUM(CASE WHEN ReviewStatus = N'pending' THEN 1 ELSE 0 END) as pendingCount,
          SUM(CASE WHEN ReviewStatus = N'approved' THEN 1 ELSE 0 END) as approvedCount,
          ISNULL(SUM(CASE WHEN ReviewStatus = N'pending' THEN TotalPrice ELSE 0 END), 0) as pendingAmount,
          ISNULL(SUM(CASE WHEN ReviewStatus = N'approved' THEN TotalPrice ELSE 0 END), 0) as approvedAmount
        FROM dbo.${quoteIdentifier(reviewTableName)}
        WHERE ISNULL(NumberPrintSalePost, N'') <> N''
          ${dateFilterCondition}
      `,
      queryParams,
      false,
    ),
    executeQuery<{ total: number }>(
      `
        SELECT COUNT(1) as total
        FROM dbo.${quoteIdentifier(reviewTableName)}
        WHERE ISNULL(NumberPrintSalePost, N'') <> N''
          ${filterCondition}
          ${dateFilterCondition}
      `,
      queryParams,
      false,
    ),
    executeQuery<CancellationReviewRow>(
      `
        WITH PaginatedData AS (
          SELECT
            NumberPrintSalePost as numberPrint,
            OriginalDate as originalDate,
            CustomerName as customerName,
            TotalPrice as totalPrice,
            TotalProfit as totalProfit,
            Cash as cash,
            Transfer as transfer,
            LegacyStatus as legacyStatus,
            UserName as userName,
            DetectedReason as detectedReason,
            DetectedAt as detectedAt,
            ReviewStatus as reviewStatus,
            ApprovedAt as approvedAt,
            ApprovedBy as approvedBy,
            Note as note,
            ROW_NUMBER() OVER (
              ORDER BY
                OriginalDate DESC,
                DetectedAt DESC,
                NumberPrintSalePost DESC
            ) as RowNum
          FROM dbo.${quoteIdentifier(reviewTableName)}
          WHERE ISNULL(NumberPrintSalePost, N'') <> N''
            ${filterCondition}
            ${dateFilterCondition}
        )
        SELECT
          numberPrint,
          originalDate,
          customerName,
          totalPrice,
          totalProfit,
          cash,
          transfer,
          legacyStatus,
          userName,
          detectedReason,
          detectedAt,
          reviewStatus,
          approvedAt,
          approvedBy,
          note
        FROM PaginatedData
        WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
        ORDER BY RowNum
      `,
      { ...queryParams, limit, offset },
      false,
    ),
  ]);
  const summaryRow = summaryRows[0];
  const summary: CancellationReviewSummary = {
    totalReviews: Number(summaryRow?.totalReviews) || 0,
    pendingCount: Number(summaryRow?.pendingCount) || 0,
    approvedCount: Number(summaryRow?.approvedCount) || 0,
    pendingAmount: normalizeMoney(summaryRow?.pendingAmount),
    approvedAmount: normalizeMoney(summaryRow?.approvedAmount),
  };

  return {
    items: rows.map(mapCancellationReview),
    summary,
    total: Number(countRows[0]?.total) || 0,
    limit,
    offset,
  };
}

async function approveCancellationReview(payload: CancellationReviewPayload) {
  await ensureCancellationReviewTables();

  const rows = await executeQuery<{ numberPrint: string | null }>(
    `
      UPDATE dbo.${quoteIdentifier(reviewTableName)}
      SET
        ReviewStatus = N'approved',
        ApprovedAt = GETDATE(),
        ApprovedBy = @approvedBy,
        Note = @note
      OUTPUT inserted.NumberPrintSalePost as numberPrint
      WHERE NumberPrintSalePost = @numberPrint
        AND NumberPrintSalePost LIKE N'SA%'
    `,
    {
      numberPrint: payload.numberPrint,
      approvedBy: payload.approvedBy,
      note: payload.note,
    },
    false,
  );
  const numberPrint = normalizeText(rows[0]?.numberPrint);

  if (!numberPrint) {
    throw new CancellationReviewValidationError(
      "ไม่พบรายการยกเลิกที่ต้องการอนุมัติ",
      404,
    );
  }

  return {
    numberPrint,
    reviewStatus: "approved" as const,
  };
}

export async function GET(request: NextRequest) {
  try {
    const limit = normalizeLimit(request.nextUrl.searchParams.get("limit"));
    const offset = normalizeOffset(request.nextUrl.searchParams.get("offset"));
    const filter = normalizeReviewFilter(
      request.nextUrl.searchParams.get("status"),
    );
    const startDate = request.nextUrl.searchParams.get("startDate") || "";
    const endDate = request.nextUrl.searchParams.get("endDate") || "";
    const data = await withTimeout(
      () =>
        getCancellationReviews({
          limit,
          offset,
          filter,
          startDate,
          endDate,
        }),
      60000,
    );

    return successResponse(data);
  } catch (error) {
    return handleApiError(error, "Bill cancellation reviews API error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = parseApprovePayload(body);
    const data = await withTimeout(
      () => approveCancellationReview(payload),
      30000,
    );

    return successResponse(data);
  } catch (error) {
    if (error instanceof CancellationReviewValidationError) {
      return errorResponse(error.message, error.status);
    }

    return handleApiError(error, "Bill cancellation approve API error");
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
