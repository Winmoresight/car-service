import sql from "mssql";
import { type NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, readAuthToken } from "@/lib/auth-session";
import { executeQuery, getPool } from "@/lib/db";
import { getEmployeeAccess } from "@/lib/employee-access";

const attendanceTable = "WebEmployeeAttendance";
const payrollAdjustmentTable = "WebEmployeePayrollAdjustment";
const payrollSettingsTable = "WebEmployeePayrollSettings";
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
  manualAdvance: number;
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

function isPayrollPeriod(startDate: string, endDate: string) {
  const [year, month, startDay] = startDate.split("-").map(Number);
  const [, endMonth, endDay] = endDate.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();

  return (
    month === endMonth &&
    ((startDay === 1 && endDay === 15) ||
      (startDay === 16 && endDay === lastDay))
  );
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
    const manualAdvance = normalizeMoney(item.manualAdvance);

    if (
      !Number.isInteger(codeStaff) ||
      codeStaff <= 0 ||
      socialSecurity === null ||
      otherDeduction === null ||
      manualAdvance === null ||
      seenEmployees.has(codeStaff)
    ) {
      return null;
    }

    seenEmployees.add(codeStaff);
    items.push({
      codeStaff,
      socialSecurity,
      otherDeduction,
      manualAdvance,
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
          ManualAdvance decimal(18, 2) NOT NULL
            CONSTRAINT DF_${payrollAdjustmentTable}_Advance DEFAULT 0,
          CarryIn decimal(18, 2) NOT NULL
            CONSTRAINT DF_${payrollAdjustmentTable}_CarryIn DEFAULT 0,
          SnapshotPayableDays decimal(5, 1) NULL,
          SnapshotGrossWage decimal(18, 2) NULL,
          SnapshotSocialSecurity decimal(18, 2) NULL,
          SnapshotOtherDeduction decimal(18, 2) NULL,
          SnapshotAdvance decimal(18, 2) NULL,
          NetWage decimal(18, 2) NULL,
          PaidAmount decimal(18, 2) NULL,
          CarryOut decimal(18, 2) NOT NULL
            CONSTRAINT DF_${payrollAdjustmentTable}_CarryOut DEFAULT 0,
          PaidAt datetime NULL,
          PaidBy nvarchar(100) NULL,
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

      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'ManualAdvance') IS NULL
      BEGIN
        ALTER TABLE dbo.${payrollAdjustmentTable}
        ADD ManualAdvance decimal(18, 2) NOT NULL
          CONSTRAINT DF_${payrollAdjustmentTable}_Advance DEFAULT 0
      END


      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'CarryIn') IS NULL
        ALTER TABLE dbo.${payrollAdjustmentTable} ADD CarryIn decimal(18, 2) NOT NULL CONSTRAINT DF_${payrollAdjustmentTable}_CarryIn DEFAULT 0
      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'SnapshotPayableDays') IS NULL
        ALTER TABLE dbo.${payrollAdjustmentTable} ADD SnapshotPayableDays decimal(5, 1) NULL
      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'SnapshotGrossWage') IS NULL
        ALTER TABLE dbo.${payrollAdjustmentTable} ADD SnapshotGrossWage decimal(18, 2) NULL
      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'SnapshotSocialSecurity') IS NULL
        ALTER TABLE dbo.${payrollAdjustmentTable} ADD SnapshotSocialSecurity decimal(18, 2) NULL
      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'SnapshotOtherDeduction') IS NULL
        ALTER TABLE dbo.${payrollAdjustmentTable} ADD SnapshotOtherDeduction decimal(18, 2) NULL
      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'SnapshotAdvance') IS NULL
        ALTER TABLE dbo.${payrollAdjustmentTable} ADD SnapshotAdvance decimal(18, 2) NULL
      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'NetWage') IS NULL
        ALTER TABLE dbo.${payrollAdjustmentTable} ADD NetWage decimal(18, 2) NULL
      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'PaidAmount') IS NULL
        ALTER TABLE dbo.${payrollAdjustmentTable} ADD PaidAmount decimal(18, 2) NULL
      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'CarryOut') IS NULL
        ALTER TABLE dbo.${payrollAdjustmentTable} ADD CarryOut decimal(18, 2) NOT NULL CONSTRAINT DF_${payrollAdjustmentTable}_CarryOut DEFAULT 0
      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'PaidAt') IS NULL
        ALTER TABLE dbo.${payrollAdjustmentTable} ADD PaidAt datetime NULL
      IF COL_LENGTH(N'dbo.${payrollAdjustmentTable}', N'PaidBy') IS NULL
        ALTER TABLE dbo.${payrollAdjustmentTable} ADD PaidBy nvarchar(100) NULL
    `,
    undefined,
    false,
  );
}

async function ensurePayrollSettingsTable() {
  await executeQuery(
    `
      IF OBJECT_ID(N'dbo.${payrollSettingsTable}', N'U') IS NULL
      BEGIN
        CREATE TABLE dbo.${payrollSettingsTable} (
          CodeStaff int NOT NULL,
          SocialSecurityMonthly decimal(18, 2) NOT NULL
            CONSTRAINT DF_${payrollSettingsTable}_Social DEFAULT 0,
          UpdatedBy nvarchar(100) NULL,
          CreatedAt datetime NOT NULL
            CONSTRAINT DF_${payrollSettingsTable}_CreatedAt DEFAULT GETDATE(),
          UpdatedAt datetime NOT NULL
            CONSTRAINT DF_${payrollSettingsTable}_UpdatedAt DEFAULT GETDATE(),
          CONSTRAINT PK_${payrollSettingsTable} PRIMARY KEY (CodeStaff)
        )
      END

      INSERT INTO dbo.${payrollSettingsTable} (
        CodeStaff,
        SocialSecurityMonthly,
        UpdatedBy
      )
      SELECT
        employee.Code,
        ISNULL(previousAdjustment.SocialSecurity, 0),
        N'เริ่มต้นจากรายการเดิม'
      FROM dbo.NameServiceProduct employee
      OUTER APPLY (
        SELECT TOP 1 adjustment.SocialSecurity
        FROM dbo.${payrollAdjustmentTable} adjustment
        WHERE adjustment.CodeStaff = employee.Code
        ORDER BY adjustment.PeriodStart DESC, adjustment.UpdatedAt DESC
      ) previousAdjustment
      WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.${payrollSettingsTable} settings
        WHERE settings.CodeStaff = employee.Code
      )
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
    await ensureAttendanceTable();
    await ensurePayrollAdjustmentTable();
    await ensurePayrollSettingsTable();

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

    const access = await getEmployeeAccess(request);
    const employeeCode = access.canManage ? 0 : (access.employeeCode ?? -1);

    const [employees, records, adjustments] = await Promise.all([
      executeQuery<{
        code: number;
        name: string | null;
        phone: string | null;
        position: string | null;
        dailyWage: number | string | null;
      }>(
        `
          SELECT
            Code as code,
            ISNULL(NameSure, '') as name,
            ISNULL(Phone, '') as phone,
            ISNULL(Positions, '') as position,
            ISNULL(PriceToWorkDay, 0) as dailyWage
          FROM dbo.NameServiceProduct
          WHERE @employeeCode = 0 OR Code = @employeeCode
          ORDER BY Code
        `,
        { employeeCode },
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
            AND (@employeeCode = 0 OR CodeStaff = @employeeCode)
          ORDER BY AttendanceDate, CodeStaff
        `,
        { startDate, endDate, employeeCode },
        false,
      ),
      executeQuery<{
        codeStaff: number;
        socialSecurity: number | string;
        otherDeduction: number | string;
        manualAdvance: number | string;
        note: string | null;
        monthlySocialSecurity: number | string;
        socialSecurityDeductedThisMonth: boolean | number;
        carryIn: number | string;
        snapshotPayableDays: number | string | null;
        snapshotGrossWage: number | string | null;
        snapshotSocialSecurity: number | string | null;
        snapshotOtherDeduction: number | string | null;
        snapshotAdvance: number | string | null;
        netWage: number | string | null;
        paidAmount: number | string | null;
        carryOut: number | string;
        paidAt: Date | null;
        paidBy: string | null;
      }>(
        `
          SELECT
            employee.Code as codeStaff,
            CASE WHEN DAY(@startDate) = 1
              THEN ISNULL(settings.SocialSecurityMonthly, 0)
              ELSE 0
            END as socialSecurity,
            ISNULL(settings.SocialSecurityMonthly, 0) as monthlySocialSecurity,
            ISNULL(currentPeriod.OtherDeduction, 0) as otherDeduction,
            ISNULL(currentPeriod.ManualAdvance, 0) as manualAdvance,
            ISNULL(currentPeriod.Note, '') as note,
            CASE
              WHEN currentPeriod.PaidAt IS NOT NULL THEN ISNULL(currentPeriod.CarryIn, 0)
              ELSE ISNULL(previousPeriod.CarryOut, 0)
            END as carryIn,
            currentPeriod.SnapshotPayableDays as snapshotPayableDays,
            currentPeriod.SnapshotGrossWage as snapshotGrossWage,
            currentPeriod.SnapshotSocialSecurity as snapshotSocialSecurity,
            currentPeriod.SnapshotOtherDeduction as snapshotOtherDeduction,
            currentPeriod.SnapshotAdvance as snapshotAdvance,
            currentPeriod.NetWage as netWage,
            currentPeriod.PaidAmount as paidAmount,
            ISNULL(currentPeriod.CarryOut, 0) as carryOut,
            currentPeriod.PaidAt as paidAt,
            ISNULL(currentPeriod.PaidBy, '') as paidBy,
            CASE
              WHEN ISNULL(firstPeriod.SocialSecurity, 0) > 0 THEN 1
              ELSE 0
            END as socialSecurityDeductedThisMonth
          FROM dbo.NameServiceProduct employee
          LEFT JOIN dbo.${payrollSettingsTable} settings
            ON settings.CodeStaff = employee.Code
          LEFT JOIN dbo.${payrollAdjustmentTable} currentPeriod
            ON currentPeriod.CodeStaff = employee.Code
            AND currentPeriod.PeriodStart = @startDate
            AND currentPeriod.PeriodEnd = @endDate
          OUTER APPLY (
            SELECT TOP 1 adjustment.SocialSecurity
            FROM dbo.${payrollAdjustmentTable} adjustment
            WHERE adjustment.CodeStaff = employee.Code
              AND YEAR(adjustment.PeriodStart) = YEAR(@startDate)
              AND MONTH(adjustment.PeriodStart) = MONTH(@startDate)
              AND DAY(adjustment.PeriodStart) = 1
            ORDER BY adjustment.UpdatedAt DESC
          ) firstPeriod
          OUTER APPLY (
            SELECT TOP 1 adjustment.CarryOut
            FROM dbo.${payrollAdjustmentTable} adjustment
            WHERE adjustment.CodeStaff = employee.Code
              AND adjustment.PeriodStart < @startDate
              AND adjustment.PaidAt IS NOT NULL
            ORDER BY adjustment.PeriodStart DESC
          ) previousPeriod
          WHERE @employeeCode = 0 OR employee.Code = @employeeCode
          ORDER BY employee.Code
        `,
        { startDate, endDate, employeeCode },
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
          SUM(
            CASE
              WHEN CodeTypepayment = 24 THEN ABS(ISNULL(TotalPrice, 0))
              ELSE ${getSafeMoneyExpression("AdvancePayment")}
            END
          ) as advanceAmount
        FROM dbo.Payment
        WHERE CodeStaff > 0
          AND (@employeeCode = 0 OR CodeStaff = @employeeCode)
          AND (
            CodeTypepayment = 24
            OR ${getSafeMoneyExpression("AdvancePayment")} <> 0
          )
          AND CONVERT(date, COALESCE(Datepayment, DatePost)) >= @startDate
          AND CONVERT(date, COALESCE(Datepayment, DatePost)) <= @endDate
        GROUP BY
          CONVERT(date, COALESCE(Datepayment, DatePost)),
          CodeStaff
      `,
      { startDate, endDate, employeeCode },
      false,
    ).catch((error) => {
      console.error("Employee advance summary query error:", error);
      return [];
    });

    return NextResponse.json({
      success: true,
      data: {
        access: {
          canManage: access.canManage,
          employeeLinked: access.canManage || access.employeeCode !== null,
        },
        employees: employees.map((employee) => ({
          code: Number(employee.code),
          name: normalizeText(employee.name),
          phone: normalizeText(employee.phone),
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
          monthlySocialSecurity: Number(adjustment.monthlySocialSecurity) || 0,
          otherDeduction: Number(adjustment.otherDeduction) || 0,
          manualAdvance: Number(adjustment.manualAdvance) || 0,
          note: normalizeText(adjustment.note),
          carryIn: Number(adjustment.carryIn) || 0,
          snapshotPayableDays:
            adjustment.snapshotPayableDays === null
              ? null
              : Number(adjustment.snapshotPayableDays),
          snapshotGrossWage:
            adjustment.snapshotGrossWage === null
              ? null
              : Number(adjustment.snapshotGrossWage),
          snapshotSocialSecurity:
            adjustment.snapshotSocialSecurity === null
              ? null
              : Number(adjustment.snapshotSocialSecurity),
          snapshotOtherDeduction:
            adjustment.snapshotOtherDeduction === null
              ? null
              : Number(adjustment.snapshotOtherDeduction),
          snapshotAdvance:
            adjustment.snapshotAdvance === null
              ? null
              : Number(adjustment.snapshotAdvance),
          netWage:
            adjustment.netWage === null ? null : Number(adjustment.netWage),
          paidAmount:
            adjustment.paidAmount === null
              ? null
              : Number(adjustment.paidAmount),
          carryOut: Number(adjustment.carryOut) || 0,
          paidAt: adjustment.paidAt
            ? new Date(adjustment.paidAt).toISOString()
            : null,
          paidBy: normalizeText(adjustment.paidBy),
          socialSecurityDeductedThisMonth: Boolean(
            adjustment.socialSecurityDeductedThisMonth,
          ),
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
    await ensurePayrollSettingsTable();
    const access = await getEmployeeAccess(request);

    if (!access.canManage) {
      return NextResponse.json(
        { success: false, error: "บัญชีนี้ไม่มีสิทธิ์แก้ไขรายการเงินเดือน" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as PayrollAdjustmentPayload;
    const periodStart = normalizeDate(body.periodStart);
    const periodEnd = normalizeDate(body.periodEnd);
    const items = normalizeAdjustmentItems(body.items);

    if (!periodStart || !periodEnd || periodStart > periodEnd || !items) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุรายการหักและยอดเบิกให้ถูกต้อง" },
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
    const deductSocialSecurityThisPeriod = periodStart.endsWith("-01");
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
        deductSocialSecurityThisPeriod ? item.socialSecurity : 0,
      );
      saveRequest.input(
        "monthlySocialSecurity",
        sql.Decimal(18, 2),
        item.socialSecurity,
      );
      saveRequest.input(
        "otherDeduction",
        sql.Decimal(18, 2),
        item.otherDeduction,
      );
      saveRequest.input(
        "manualAdvance",
        sql.Decimal(18, 2),
        item.manualAdvance,
      );
      saveRequest.input("note", sql.NVarChar(250), item.note || null);
      saveRequest.input("updatedBy", sql.NVarChar(100), updatedBy);

      await saveRequest.query(`
        IF EXISTS (
          SELECT 1
          FROM dbo.${payrollAdjustmentTable}
          WHERE PeriodStart = @periodStart
            AND CodeStaff = @codeStaff
            AND PaidAt IS NOT NULL
        )
          THROW 50001, N'รอบเงินเดือนที่จ่ายแล้วไม่สามารถแก้รายการหักได้', 1;

        UPDATE dbo.${payrollSettingsTable}
        SET
          SocialSecurityMonthly = @monthlySocialSecurity,
          UpdatedBy = @updatedBy,
          UpdatedAt = GETDATE()
        WHERE CodeStaff = @codeStaff;

        IF @@ROWCOUNT = 0
        BEGIN
          INSERT INTO dbo.${payrollSettingsTable} (
            CodeStaff,
            SocialSecurityMonthly,
            UpdatedBy
          )
          VALUES (
            @codeStaff,
            @monthlySocialSecurity,
            @updatedBy
          )
        END;

        UPDATE dbo.${payrollAdjustmentTable}
        SET
          PeriodEnd = @periodEnd,
          SocialSecurity = @socialSecurity,
          OtherDeduction = @otherDeduction,
          ManualAdvance = @manualAdvance,
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
            ManualAdvance,
            Note,
            UpdatedBy
          )
          VALUES (
            @periodStart,
            @periodEnd,
            @codeStaff,
            @socialSecurity,
            @otherDeduction,
            @manualAdvance,
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
        error: "ไม่สามารถบันทึกรายการหักและยอดเบิกของพนักงานได้",
        ...(process.env.NODE_ENV !== "production" && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let transaction: sql.Transaction | null = null;

  try {
    await ensureAttendanceTable();
    await ensurePayrollAdjustmentTable();
    await ensurePayrollSettingsTable();
    const access = await getEmployeeAccess(request);

    if (!access.canManage) {
      return NextResponse.json(
        { success: false, error: "บัญชีนี้ไม่มีสิทธิ์ปิดรอบเงินเดือน" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as PayrollAdjustmentPayload;
    const periodStart = normalizeDate(body.periodStart);
    const periodEnd = normalizeDate(body.periodEnd);

    if (
      !periodStart ||
      !periodEnd ||
      periodStart > periodEnd ||
      !isPayrollPeriod(periodStart, periodEnd)
    ) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุรอบเงินเดือนให้ถูกต้อง" },
        { status: 400 },
      );
    }

    const token = await readAuthToken(
      request.cookies.get(AUTH_COOKIE_NAME)?.value,
    );
    const paidBy = token?.nameUser || token?.username || "web";
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const settlementRequest = new sql.Request(transaction);
    settlementRequest.input("periodStart", sql.Date, periodStart);
    settlementRequest.input("periodEnd", sql.Date, periodEnd);
    settlementRequest.input("paidBy", sql.NVarChar(100), paidBy);
    const settlementResult = await settlementRequest.query<{ paidAt: Date }>(`
      IF @periodEnd > CONVERT(date, GETDATE())
        THROW 50004, N'ยังไม่สามารถปิดรอบที่ยังไม่สิ้นสุดได้', 1;

      IF EXISTS (
        SELECT 1
        FROM dbo.${payrollAdjustmentTable}
        WHERE PeriodStart = @periodStart
          AND PaidAt IS NOT NULL
      )
        THROW 50002, N'รอบเงินเดือนนี้ถูกปิดและบันทึกการจ่ายแล้ว', 1;

      IF EXISTS (
        SELECT 1
        FROM dbo.${payrollAdjustmentTable}
        WHERE PeriodStart > @periodStart
          AND PaidAt IS NOT NULL
      )
        THROW 50003, N'ไม่สามารถปิดรอบย้อนหลังหลังจากมีรอบที่จ่ายแล้ว', 1;

      INSERT INTO dbo.${payrollAdjustmentTable} (
        PeriodStart,
        PeriodEnd,
        CodeStaff,
        SocialSecurity,
        OtherDeduction,
        ManualAdvance,
        UpdatedBy
      )
      SELECT
        @periodStart,
        @periodEnd,
        employee.Code,
        CASE WHEN DAY(@periodStart) = 1
          THEN ISNULL(settings.SocialSecurityMonthly, 0)
          ELSE 0
        END,
        0,
        0,
        @paidBy
      FROM dbo.NameServiceProduct employee
      LEFT JOIN dbo.${payrollSettingsTable} settings
        ON settings.CodeStaff = employee.Code
      WHERE NOT EXISTS (
        SELECT 1
        FROM dbo.${payrollAdjustmentTable} adjustment
        WHERE adjustment.PeriodStart = @periodStart
          AND adjustment.CodeStaff = employee.Code
      );

      DECLARE @paidAt datetime = GETDATE();

      ;WITH PayrollData AS (
        SELECT
          employee.Code as CodeStaff,
          ISNULL(attendance.PayableDays, 0) as PayableDays,
          CAST(
            ISNULL(attendance.PayableDays, 0) * ${getSafeMoneyExpression("employee.PriceToWorkDay")}
            AS decimal(18, 2)
          ) as GrossWage,
          ISNULL(adjustment.SocialSecurity, 0) as SocialSecurity,
          ISNULL(adjustment.OtherDeduction, 0) as OtherDeduction,
          ISNULL(adjustment.ManualAdvance, 0) + ISNULL(advance.Amount, 0) as AdvanceAmount,
          ISNULL(previousPeriod.CarryOut, 0) as CarryIn
        FROM dbo.NameServiceProduct employee
        INNER JOIN dbo.${payrollAdjustmentTable} adjustment
          ON adjustment.CodeStaff = employee.Code
          AND adjustment.PeriodStart = @periodStart
        OUTER APPLY (
          SELECT SUM(CASE
            WHEN record.Status IN (N'full_day', N'special_paid') THEN 1.0
            WHEN record.Status = N'half_day' THEN 0.5
            ELSE 0
          END) as PayableDays
          FROM dbo.${attendanceTable} record
          WHERE record.CodeStaff = employee.Code
            AND record.AttendanceDate >= @periodStart
            AND record.AttendanceDate <= @periodEnd
        ) attendance
        OUTER APPLY (
          SELECT SUM(CASE
            WHEN payment.CodeTypepayment = 24 THEN ABS(ISNULL(payment.TotalPrice, 0))
            ELSE ${getSafeMoneyExpression("payment.AdvancePayment")}
          END) as Amount
          FROM dbo.Payment payment
          WHERE payment.CodeStaff = employee.Code
            AND (
              payment.CodeTypepayment = 24
              OR ${getSafeMoneyExpression("payment.AdvancePayment")} <> 0
            )
            AND CONVERT(date, COALESCE(payment.Datepayment, payment.DatePost)) >= @periodStart
            AND CONVERT(date, COALESCE(payment.Datepayment, payment.DatePost)) <= @periodEnd
        ) advance
        OUTER APPLY (
          SELECT TOP 1 previousAdjustment.CarryOut
          FROM dbo.${payrollAdjustmentTable} previousAdjustment
          WHERE previousAdjustment.CodeStaff = employee.Code
            AND previousAdjustment.PeriodStart < @periodStart
            AND previousAdjustment.PaidAt IS NOT NULL
          ORDER BY previousAdjustment.PeriodStart DESC
        ) previousPeriod
      ), PayrollBalance AS (
        SELECT
          *,
          CAST(
            GrossWage - SocialSecurity - OtherDeduction - AdvanceAmount - CarryIn
            AS decimal(18, 2)
          ) as NetWage
        FROM PayrollData
      )
      UPDATE adjustment
      SET
        PeriodEnd = @periodEnd,
        CarryIn = payroll.CarryIn,
        SnapshotPayableDays = payroll.PayableDays,
        SnapshotGrossWage = payroll.GrossWage,
        SnapshotSocialSecurity = payroll.SocialSecurity,
        SnapshotOtherDeduction = payroll.OtherDeduction,
        SnapshotAdvance = payroll.AdvanceAmount,
        NetWage = payroll.NetWage,
        PaidAmount = CASE WHEN payroll.NetWage > 0 THEN payroll.NetWage ELSE 0 END,
        CarryOut = CASE WHEN payroll.NetWage < 0 THEN ABS(payroll.NetWage) ELSE 0 END,
        PaidAt = @paidAt,
        PaidBy = @paidBy,
        UpdatedBy = @paidBy,
        UpdatedAt = @paidAt
      FROM dbo.${payrollAdjustmentTable} adjustment
      INNER JOIN PayrollBalance payroll ON payroll.CodeStaff = adjustment.CodeStaff
      WHERE adjustment.PeriodStart = @periodStart;

      SELECT @paidAt as paidAt;
    `);

    await transaction.commit();
    transaction = null;

    return NextResponse.json({
      success: true,
      data: {
        periodStart,
        periodEnd,
        paidAt: settlementResult.recordset[0]?.paidAt.toISOString(),
      },
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback().catch(() => undefined);
    }

    console.error("Employee payroll settlement POST API error:", error);
    const message = error instanceof Error ? error.message : "";
    const alreadyPaid = message.includes("ถูกปิดและบันทึกการจ่ายแล้ว");
    const outOfOrder = message.includes("ไม่สามารถปิดรอบย้อนหลัง");
    const periodNotEnded = message.includes("รอบที่ยังไม่สิ้นสุด");
    return NextResponse.json(
      {
        success: false,
        error: alreadyPaid
          ? "รอบเงินเดือนนี้ถูกปิดและบันทึกการจ่ายแล้ว"
          : outOfOrder
            ? "ไม่สามารถปิดรอบย้อนหลังหลังจากมีรอบที่จ่ายแล้ว"
            : periodNotEnded
              ? "ยังไม่สามารถปิดรอบที่ยังไม่สิ้นสุดได้"
              : "ไม่สามารถปิดรอบและบันทึกการจ่ายเงินเดือนได้",
        ...(process.env.NODE_ENV !== "production" && { details: message }),
      },
      {
        status: alreadyPaid || outOfOrder || periodNotEnded ? 409 : 500,
      },
    );
  }
}

export async function PUT(request: NextRequest) {
  let transaction: sql.Transaction | null = null;

  try {
    await ensureAttendanceTable();
    const access = await getEmployeeAccess(request);

    if (!access.canManage) {
      return NextResponse.json(
        { success: false, error: "บัญชีนี้ไม่มีสิทธิ์แก้ไขวันทำงาน" },
        { status: 403 },
      );
    }

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
