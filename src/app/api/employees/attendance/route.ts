import sql from "mssql";
import { type NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, readAuthToken } from "@/lib/auth-session";
import { executeQuery, getPool } from "@/lib/db";

const attendanceTable = "WebEmployeeAttendance";
const payrollAdjustmentTable = "WebEmployeePayrollAdjustment";
const attendanceStatuses = new Set([
  "full_day",
  "half_day",
  "absent",
  "sunday_off",
  "special_paid",
  "special_unpaid",
]);

interface AttendanceUpdatePayload {
  date?: unknown;
  items?: unknown;
}

interface AttendanceUpdateItem {
  codeStaff: number;
  status: string;
  note: string;
}

interface PayrollAdjustmentPayload {
  periodStart?: unknown;
  periodEnd?: unknown;
  items?: unknown;
}

interface PayrollAdjustmentItem {
  codeStaff: number;
  socialSecurity: number;
  otherDeduction: number;
  note: string;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDate(value: unknown) {
  const text = normalizeText(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }

  const parsed = new Date(`${text}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const [year, month, day] = text.split("-").map(Number);

  return parsed.getFullYear() === year &&
    parsed.getMonth() + 1 === month &&
    parsed.getDate() === day
    ? text
    : null;
}

function normalizeItems(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const items: AttendanceUpdateItem[] = [];
  const seenEmployees = new Set<number>();

  for (const rawItem of value) {
    if (typeof rawItem !== "object" || rawItem === null) {
      return null;
    }

    const item = rawItem as Record<string, unknown>;
    const codeStaff = Number(item.codeStaff);
    const status = normalizeText(item.status);
    const note = normalizeText(item.note).slice(0, 250);

    if (
      !Number.isInteger(codeStaff) ||
      codeStaff <= 0 ||
      !attendanceStatuses.has(status) ||
      seenEmployees.has(codeStaff)
    ) {
      return null;
    }

    seenEmployees.add(codeStaff);
    items.push({ codeStaff, status, note });
  }

  return items;
}

function normalizeMoney(value: unknown) {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 10_000_000
    ? Number(amount.toFixed(2))
    : null;
}

function normalizeAdjustmentItems(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  const items: PayrollAdjustmentItem[] = [];
  const seenEmployees = new Set<number>();

  for (const rawItem of value) {
    if (typeof rawItem !== "object" || rawItem === null) {
      return null;
    }

    const item = rawItem as Record<string, unknown>;
    const codeStaff = Number(item.codeStaff);
    const socialSecurity = normalizeMoney(item.socialSecurity);
    const otherDeduction = normalizeMoney(item.otherDeduction);

    if (
      !Number.isInteger(codeStaff) ||
      codeStaff <= 0 ||
      socialSecurity === null ||
      otherDeduction === null ||
      seenEmployees.has(codeStaff)
    ) {
      return null;
    }

    seenEmployees.add(codeStaff);
    items.push({
      codeStaff,
      socialSecurity,
      otherDeduction,
      note: normalizeText(item.note).slice(0, 250),
    });
  }

  return items;
}

async function ensureAttendanceTable() {
  await executeQuery(
    `
      IF OBJECT_ID(N'dbo.${attendanceTable}', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.${attendanceTable} (
          AttendanceDate date NOT NULL,
          CodeStaff int NOT NULL,
          Status nvarchar(30) NOT NULL,
          Note nvarchar(250) NULL,
          UpdatedBy nvarchar(100) NULL,
          CreatedAt datetime NOT NULL
            CONSTRAINT DF_${attendanceTable}_CreatedAt DEFAULT GETDATE(),
          UpdatedAt datetime NOT NULL
            CONSTRAINT DF_${attendanceTable}_UpdatedAt DEFAULT GETDATE(),
          CONSTRAINT PK_${attendanceTable}
            PRIMARY KEY (AttendanceDate, CodeStaff)
        )
      END
    `,
    undefined,
    false,
  );
}

async function ensurePayrollAdjustmentTable() {
  await executeQuery(
    `
      IF OBJECT_ID(N'dbo.${payrollAdjustmentTable}', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.${payrollAdjustmentTable} (
          PeriodStart date NOT NULL,
          PeriodEnd date NOT NULL,
          CodeStaff int NOT NULL,
          SocialSecurity decimal(18, 2) NOT NULL
            CONSTRAINT DF_${payrollAdjustmentTable}_Social DEFAULT 0,
          OtherDeduction decimal(18, 2) NOT NULL
            CONSTRAINT DF_${payrollAdjustmentTable}_Other DEFAULT 0,
          Note nvarchar(250) NULL,
          UpdatedBy nvarchar(100) NULL,
          CreatedAt datetime NOT NULL
            CONSTRAINT DF_${payrollAdjustmentTable}_CreatedAt DEFAULT GETDATE(),
          UpdatedAt datetime NOT NULL
            CONSTRAINT DF_${payrollAdjustmentTable}_UpdatedAt DEFAULT GETDATE(),
          CONSTRAINT PK_${payrollAdjustmentTable}
            PRIMARY KEY (PeriodStart, CodeStaff)
        )
      END
    `,
    undefined,
    false,
  );
}

function getSafeMoneyExpression(columnName: string) {
  const text = `LTRIM(RTRIM(CONVERT(nvarchar(100), ${columnName})))`;

  return `ISNULL(CONVERT(money, CASE WHEN ${columnName} IS NULL THEN '0' WHEN ${text} IN ('', '-', '.', ',', '-.', '-,') THEN '0' WHEN ${text} LIKE '%[^0-9.,-]%' THEN '0' WHEN ISNUMERIC(${text}) = 1 THEN ${text} ELSE '0' END), 0)`;
}

export async function GET(request: NextRequest) {
  try {
    await Promise.all([
      ensureAttendanceTable(),
      ensurePayrollAdjustmentTable(),
    ]);

    const startDate = normalizeDate(
      request.nextUrl.searchParams.get("startDate"),
    );
    const endDate = normalizeDate(request.nextUrl.searchParams.get("endDate"));

    if (!startDate || !endDate || startDate > endDate) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุช่วงวันที่ให้ถูกต้อง" },
        { status: 400 },
      );
    }

    const [employees, records, adjustments] = await Promise.all([
      executeQuery<{
        code: number;
        name: string | null;
        position: string | null;
        dailyWage: number | string | null;
      }>(
        `
          SELECT
            Code as code,
            ISNULL(NameSure, '') as name,
            ISNULL(Positions, '') as position,
            ISNULL(PriceToWorkDay, 0) as dailyWage
          FROM dbo.NameServiceProduct
          ORDER BY Code
        `,
        undefined,
        false,
      ),
      executeQuery<{
        date: string;
        codeStaff: number;
        status: string;
        note: string | null;
        updatedBy: string | null;
        updatedAt: Date;
      }>(
        `
          SELECT
            CONVERT(varchar(10), AttendanceDate, 23) as date,
            CodeStaff as codeStaff,
            Status as status,
            ISNULL(Note, '') as note,
            ISNULL(UpdatedBy, '') as updatedBy,
            UpdatedAt as updatedAt
          FROM dbo.${attendanceTable}
          WHERE AttendanceDate >= @startDate
            AND AttendanceDate <= @endDate
          ORDER BY AttendanceDate, CodeStaff
        `,
        { startDate, endDate },
        false,
      ),
      executeQuery<{
        codeStaff: number;
        socialSecurity: number | string;
        otherDeduction: number | string;
        note: string | null;
      }>(
        `
          SELECT
            CodeStaff as codeStaff,
            SocialSecurity as socialSecurity,
            OtherDeduction as otherDeduction,
            ISNULL(Note, '') as note
          FROM dbo.${payrollAdjustmentTable}
          WHERE PeriodStart = @startDate
            AND PeriodEnd = @endDate
          ORDER BY CodeStaff
        `,
        { startDate, endDate },
        false,
      ),
    ]);

    const advances = await executeQuery<{
      date: string;
      codeStaff: number;
      advanceAmount: number | string | null;
    }>(
      `
        SELECT
          CONVERT(
            varchar(10),
            CONVERT(date, COALESCE(Datepayment, DatePost)),
            23
          ) as date,
          CodeStaff as codeStaff,
          SUM(${getSafeMoneyExpression("AdvancePayment")}) as advanceAmount
        FROM dbo.Payment
        WHERE CodeStaff > 0
          AND CONVERT(date, COALESCE(Datepayment, DatePost)) >= @startDate
          AND CONVERT(date, COALESCE(Datepayment, DatePost)) <= @endDate
        GROUP BY
          CONVERT(date, COALESCE(Datepayment, DatePost)),
          CodeStaff
      `,
      { startDate, endDate },
      false,
    ).catch((error) => {
      console.error("Employee advance summary query error:", error);
      return [];
    });

    return NextResponse.json({
      success: true,
      data: {
        employees: employees.map((employee) => ({
          code: Number(employee.code),
          name: normalizeText(employee.name),
          position: normalizeText(employee.position),
          dailyWage: Number(employee.dailyWage) || 0,
        })),
        records: records.map((record) => ({
          date: normalizeText(record.date),
          codeStaff: Number(record.codeStaff),
          status: normalizeText(record.status),
          note: normalizeText(record.note),
          updatedBy: normalizeText(record.updatedBy),
          updatedAt: new Date(record.updatedAt).toISOString(),
        })),
        advances: advances.map((advance) => ({
          date: normalizeText(advance.date),
          codeStaff: Number(advance.codeStaff),
          amount: Number(advance.advanceAmount) || 0,
        })),
        adjustments: adjustments.map((adjustment) => ({
          codeStaff: Number(adjustment.codeStaff),
          socialSecurity: Number(adjustment.socialSecurity) || 0,
          otherDeduction: Number(adjustment.otherDeduction) || 0,
          note: normalizeText(adjustment.note),
        })),
      },
    });
  } catch (error) {
    console.error("Employee attendance GET API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถโหลดข้อมูลวันทำงานของพนักงานได้",
        ...(process.env.NODE_ENV !== "production" && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  let transaction: sql.Transaction | null = null;

  try {
    await ensurePayrollAdjustmentTable();

    const body = (await request.json()) as PayrollAdjustmentPayload;
    const periodStart = normalizeDate(body.periodStart);
    const periodEnd = normalizeDate(body.periodEnd);
    const items = normalizeAdjustmentItems(body.items);

    if (!periodStart || !periodEnd || periodStart > periodEnd || !items) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุรายการหักให้ถูกต้อง" },
        { status: 400 },
      );
    }

    const employeeRows = await executeQuery<{ code: number }>(
      "SELECT Code as code FROM dbo.NameServiceProduct",
      undefined,
      false,
    );
    const employeeCodes = new Set(employeeRows.map((row) => Number(row.code)));

    if (items.some((item) => !employeeCodes.has(item.codeStaff))) {
      return NextResponse.json(
        { success: false, error: "พบข้อมูลพนักงานที่ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const token = await readAuthToken(
      request.cookies.get(AUTH_COOKIE_NAME)?.value,
    );
    const updatedBy = token?.nameUser || token?.username || "web";
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const item of items) {
      const saveRequest = new sql.Request(transaction);
      saveRequest.input("periodStart", sql.Date, periodStart);
      saveRequest.input("periodEnd", sql.Date, periodEnd);
      saveRequest.input("codeStaff", sql.Int, item.codeStaff);
      saveRequest.input(
        "socialSecurity",
        sql.Decimal(18, 2),
        item.socialSecurity,
      );
      saveRequest.input(
        "otherDeduction",
        sql.Decimal(18, 2),
        item.otherDeduction,
      );
      saveRequest.input("note", sql.NVarChar(250), item.note || null);
      saveRequest.input("updatedBy", sql.NVarChar(100), updatedBy);

      await saveRequest.query(`
        UPDATE dbo.${payrollAdjustmentTable}
        SET
          PeriodEnd = @periodEnd,
          SocialSecurity = @socialSecurity,
          OtherDeduction = @otherDeduction,
          Note = @note,
          UpdatedBy = @updatedBy,
          UpdatedAt = GETDATE()
        WHERE PeriodStart = @periodStart
          AND CodeStaff = @codeStaff;

        IF @@ROWCOUNT = 0
        BEGIN
          INSERT INTO dbo.${payrollAdjustmentTable} (
            PeriodStart,
            PeriodEnd,
            CodeStaff,
            SocialSecurity,
            OtherDeduction,
            Note,
            UpdatedBy
          )
          VALUES (
            @periodStart,
            @periodEnd,
            @codeStaff,
            @socialSecurity,
            @otherDeduction,
            @note,
            @updatedBy
          )
        END
      `);
    }

    await transaction.commit();
    transaction = null;

    return NextResponse.json({
      success: true,
      data: { periodStart, periodEnd, savedCount: items.length },
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback().catch(() => undefined);
    }

    console.error("Employee payroll adjustment PATCH API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถบันทึกรายการหักของพนักงานได้",
        ...(process.env.NODE_ENV !== "production" && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  let transaction: sql.Transaction | null = null;

  try {
    await ensureAttendanceTable();

    const body = (await request.json()) as AttendanceUpdatePayload;
    const attendanceDate = normalizeDate(body.date);
    const items = normalizeItems(body.items);

    if (!attendanceDate || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุวันและสถานะพนักงานให้ครบถ้วน" },
        { status: 400 },
      );
    }

    const employeeRows = await executeQuery<{ code: number }>(
      "SELECT Code as code FROM dbo.NameServiceProduct",
      undefined,
      false,
    );
    const employeeCodes = new Set(employeeRows.map((row) => Number(row.code)));

    if (items.some((item) => !employeeCodes.has(item.codeStaff))) {
      return NextResponse.json(
        { success: false, error: "พบข้อมูลพนักงานที่ไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const token = await readAuthToken(
      request.cookies.get(AUTH_COOKIE_NAME)?.value,
    );
    const updatedBy = token?.nameUser || token?.username || "web";
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    for (const item of items) {
      const saveRequest = new sql.Request(transaction);
      saveRequest.input("attendanceDate", sql.Date, attendanceDate);
      saveRequest.input("codeStaff", sql.Int, item.codeStaff);
      saveRequest.input("status", sql.NVarChar(30), item.status);
      saveRequest.input("note", sql.NVarChar(250), item.note || null);
      saveRequest.input("updatedBy", sql.NVarChar(100), updatedBy);

      await saveRequest.query(`
        UPDATE dbo.${attendanceTable}
        SET
          Status = @status,
          Note = @note,
          UpdatedBy = @updatedBy,
          UpdatedAt = GETDATE()
        WHERE AttendanceDate = @attendanceDate
          AND CodeStaff = @codeStaff;

        IF @@ROWCOUNT = 0
        BEGIN
          INSERT INTO dbo.${attendanceTable} (
            AttendanceDate,
            CodeStaff,
            Status,
            Note,
            UpdatedBy
          )
          VALUES (
            @attendanceDate,
            @codeStaff,
            @status,
            @note,
            @updatedBy
          )
        END
      `);
    }

    await transaction.commit();
    transaction = null;

    return NextResponse.json({
      success: true,
      data: { date: attendanceDate, savedCount: items.length },
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback().catch(() => undefined);
    }

    console.error("Employee attendance PUT API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "ไม่สามารถบันทึกวันทำงานของพนักงานได้",
        ...(process.env.NODE_ENV !== "production" && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
