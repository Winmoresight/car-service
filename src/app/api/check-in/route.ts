import sql from "mssql";
import { type NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, readAuthToken } from "@/lib/auth-session";
import { executeQuery, getPool } from "@/lib/db";
import { getEmployeeAccess } from "@/lib/employee-access";

const attendanceTable = "WebEmployeeAttendance";
const employeeStatuses = new Set([
  "full_day",
  "absent",
  "half_day",
  "sunday_off",
  "special_paid",
  "special_unpaid",
]);

interface CheckInPayload {
  status?: unknown;
}

function getBangkokDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
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

async function getSelfAccess(request: NextRequest) {
  const access = await getEmployeeAccess(request);

  if (
    !access.authenticated ||
    access.canManage ||
    access.employeeCode === null ||
    access.mustChangePassword
  ) {
    return null;
  }

  return access;
}

export async function GET(request: NextRequest) {
  try {
    const access = await getSelfAccess(request);

    if (!access) {
      return NextResponse.json(
        {
          success: false,
          error: "บัญชีนี้ยังไม่ได้เชื่อมกับข้อมูลพนักงาน",
        },
        { status: 403 },
      );
    }

    await ensureAttendanceTable();
    const date = getBangkokDate();
    const rows = await executeQuery<{
      code: number;
      name: string | null;
      position: string | null;
      phone: string | null;
      address: string | null;
      birthDate: Date | null;
      age: number | null;
      status: string | null;
      updatedAt: Date | null;
    }>(
      `
        SELECT TOP 1
          employee.Code as code,
          ISNULL(employee.NameSure, '') as name,
          ISNULL(employee.Positions, '') as position,
          employee.Phone as phone,
          employee.Address as address,
          employee.DateBirthDay as birthDate,
          employee.Age as age,
          attendance.Status as status,
          attendance.UpdatedAt as updatedAt
        FROM dbo.NameServiceProduct employee
        LEFT JOIN dbo.${attendanceTable} attendance
          ON attendance.CodeStaff = employee.Code
          AND attendance.AttendanceDate = @date
        WHERE employee.Code = @employeeCode
      `,
      { date, employeeCode: access.employeeCode },
      false,
    );
    const employee = rows[0];

    if (!employee) {
      return NextResponse.json(
        { success: false, error: "ไม่พบข้อมูลพนักงานของบัญชีนี้" },
        { status: 404 },
      );
    }

    const history = await executeQuery<{
      date: string;
      status: string;
      updatedAt: Date | null;
    }>(
      `
        SELECT TOP 30
          CONVERT(varchar(10), AttendanceDate, 23) as date,
          Status as status,
          UpdatedAt as updatedAt
        FROM dbo.${attendanceTable}
        WHERE CodeStaff = @employeeCode
        ORDER BY AttendanceDate DESC
      `,
      { employeeCode: access.employeeCode },
      false,
    );

    return NextResponse.json({
      success: true,
      data: {
        date,
        serverTime: new Date().toISOString(),
        employee: {
          code: Number(employee.code),
          name: employee.name?.trim() || "พนักงาน",
          position: employee.position?.trim() || "",
          phone: employee.phone?.trim() || "",
          address: employee.address?.trim() || "",
          birthDate: employee.birthDate?.toISOString() ?? null,
          age: employee.age === null ? null : Number(employee.age),
        },
        record: employee.status
          ? {
              status: employee.status,
              updatedAt: employee.updatedAt?.toISOString() ?? null,
            }
          : null,
        history: history.map((item) => ({
          date: item.date,
          status: item.status,
          updatedAt: item.updatedAt?.toISOString() ?? null,
        })),
      },
    });
  } catch (error) {
    console.error("Employee self check-in GET error:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถโหลดข้อมูลลงเวลาทำงานได้" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  let transaction: sql.Transaction | null = null;

  try {
    const access = await getSelfAccess(request);

    if (!access) {
      return NextResponse.json(
        {
          success: false,
          error: "บัญชีนี้ยังไม่ได้เชื่อมกับข้อมูลพนักงาน",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CheckInPayload;
    const status = typeof body.status === "string" ? body.status.trim() : "";

    if (!employeeStatuses.has(status)) {
      return NextResponse.json(
        { success: false, error: "กรุณาเลือกสถานะการทำงานให้ถูกต้อง" },
        { status: 400 },
      );
    }

    await ensureAttendanceTable();
    const date = getBangkokDate();
    const token = await readAuthToken(
      request.cookies.get(AUTH_COOKIE_NAME)?.value,
    );
    const updatedBy = token?.nameUser || token?.username || "employee";
    const pool = await getPool();
    transaction = new sql.Transaction(pool);
    await transaction.begin();

    const saveRequest = new sql.Request(transaction);
    saveRequest.input("attendanceDate", sql.Date, date);
    saveRequest.input("codeStaff", sql.Int, access.employeeCode);
    saveRequest.input("status", sql.NVarChar(30), status);
    saveRequest.input("updatedBy", sql.NVarChar(100), updatedBy);

    await saveRequest.query(`
      UPDATE dbo.${attendanceTable}
      SET
        Status = @status,
        Note = NULL,
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
          NULL,
          @updatedBy
        )
      END
    `);

    await transaction.commit();
    transaction = null;

    return NextResponse.json({
      success: true,
      data: { date, status },
    });
  } catch (error) {
    if (transaction) {
      await transaction.rollback().catch(() => undefined);
    }

    console.error("Employee self check-in PUT error:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถบันทึกสถานะการทำงานได้" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
