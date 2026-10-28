/**
 * API Endpoint: /api/employees
 * GET ดึงข้อมูลพนักงานทั้งหมด และ POST เพิ่มพนักงานพร้อมบัญชีเข้าสู่ระบบ
 * DELETE ลบพนักงานเมื่อไม่มีประวัติที่ต้องเก็บรักษา
 */

import sql from "mssql";
import { type NextRequest, NextResponse } from "next/server";
import { executeQuery, getPool } from "@/lib/db";
import { getEmployeeAccess } from "@/lib/employee-access";
import {
  EmployeeCredentialError,
  normalizeEmployeePhone,
  resetEmployeePassword,
  updateEmployeePhoneAccess,
} from "@/lib/employee-credentials";

interface Employee {
  Code: number;
  NameSure: string;
  Address: string;
  Phone: string;
  IDCard: string;
  DateBirthDay: string;
  Age: number;
  Positions: string;
  PriceToWorkDay: number;
}

interface CreateEmployeePayload {
  name?: unknown;
  address?: unknown;
  phone?: unknown;
  idCard?: unknown;
  birthDate?: unknown;
  position?: unknown;
  dailyWage?: unknown;
}

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeDate(value: unknown) {
  const text = normalizeText(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00`);
  const [year, month, day] = text.split("-").map(Number);
  return !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
    ? text
    : null;
}

export async function POST(request: NextRequest) {
  let createdCode: number | null = null;

  try {
    const access = await getEmployeeAccess(request);
    if (!access.canManage) {
      return NextResponse.json(
        { success: false, error: "บัญชีนี้ไม่มีสิทธิ์เพิ่มพนักงาน" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as CreateEmployeePayload;
    const name = normalizeText(body.name, 200);
    const address = normalizeText(body.address, 500);
    const phone = normalizeEmployeePhone(body.phone);
    const idCard = normalizeText(body.idCard, 13).replace(/\D/g, "");
    const birthDate = body.birthDate ? normalizeDate(body.birthDate) : null;
    const position = normalizeText(body.position, 100);
    const dailyWage = Number(body.dailyWage);

    if (!name || !position || !phone) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกชื่อ ตำแหน่ง และเบอร์โทรให้ครบ" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(dailyWage) || dailyWage < 0 || dailyWage > 1_000_000) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกค่าแรงต่อวันให้ถูกต้อง" },
        { status: 400 },
      );
    }
    if (body.birthDate && !birthDate) {
      return NextResponse.json(
        { success: false, error: "วันเกิดไม่ถูกต้อง" },
        { status: 400 },
      );
    }
    if (birthDate && new Date(`${birthDate}T00:00:00`) > new Date()) {
      return NextResponse.json(
        { success: false, error: "วันเกิดต้องไม่เป็นวันที่ในอนาคต" },
        { status: 400 },
      );
    }
    if (idCard && idCard.length !== 13) {
      return NextResponse.json(
        { success: false, error: "เลขบัตรประชาชนต้องมี 13 หลัก" },
        { status: 400 },
      );
    }

    const positionRows = await executeQuery<{ total: number }>(
      "SELECT COUNT(*) as total FROM dbo.NamePositions WHERE NamePositions = @position",
      { position },
      false,
    );
    if (Number(positionRows[0]?.total || 0) === 0) {
      return NextResponse.json(
        { success: false, error: "ไม่พบตำแหน่งงานที่เลือก" },
        { status: 400 },
      );
    }

    const pool = await getPool();
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const insertRequest = new sql.Request(transaction);
      insertRequest.input("name", sql.NVarChar(200), name);
      insertRequest.input("address", sql.NVarChar(500), address);
      insertRequest.input("phone", sql.NVarChar(20), phone);
      insertRequest.input("idCard", sql.NVarChar(20), idCard);
      insertRequest.input("birthDate", sql.Date, birthDate);
      insertRequest.input("position", sql.NVarChar(100), position);
      insertRequest.input(
        "dailyWage",
        sql.Decimal(18, 2),
        Number(dailyWage.toFixed(2)),
      );
      const result = await insertRequest.query<{ code: number }>(`
        DECLARE @createdEmployee TABLE (Code int);

        IF COLUMNPROPERTY(OBJECT_ID(N'dbo.NameServiceProduct'), N'Code', 'IsIdentity') = 1
        BEGIN
          INSERT INTO dbo.NameServiceProduct (
            NameSure, Address, Phone, IDCard, DateBirthDay, Age, Positions, PriceToWorkDay
          )
          OUTPUT INSERTED.Code INTO @createdEmployee
          VALUES (
            @name, @address, @phone, @idCard, @birthDate,
            CASE WHEN @birthDate IS NULL THEN 0 ELSE DATEDIFF(YEAR, @birthDate, GETDATE()) -
              CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, @birthDate, GETDATE()), @birthDate) > GETDATE() THEN 1 ELSE 0 END
            END,
            @position, @dailyWage
          );
        END
        ELSE
        BEGIN
          DECLARE @nextCode int;
          SELECT @nextCode = ISNULL(MAX(Code), 0) + 1
          FROM dbo.NameServiceProduct WITH (UPDLOCK, HOLDLOCK);

          INSERT INTO dbo.NameServiceProduct (
            Code, NameSure, Address, Phone, IDCard, DateBirthDay, Age, Positions, PriceToWorkDay
          )
          OUTPUT INSERTED.Code INTO @createdEmployee
          VALUES (
            @nextCode, @name, @address, @phone, @idCard, @birthDate,
            CASE WHEN @birthDate IS NULL THEN 0 ELSE DATEDIFF(YEAR, @birthDate, GETDATE()) -
              CASE WHEN DATEADD(YEAR, DATEDIFF(YEAR, @birthDate, GETDATE()), @birthDate) > GETDATE() THEN 1 ELSE 0 END
            END,
            @position, @dailyWage
          );
        END;

        SELECT Code as code FROM @createdEmployee;
      `);
      createdCode = Number(result.recordset[0]?.code) || null;
      if (!createdCode) throw new Error("ไม่สามารถสร้างรหัสพนักงานได้");
      await transaction.commit();
    } catch (error) {
      await transaction.rollback().catch(() => undefined);
      throw error;
    }

    await updateEmployeePhoneAccess(createdCode, phone, true);
    const [employee] = await executeQuery<Employee>(
      `SELECT Code, NameSure, Address, Phone, IDCard, DateBirthDay, Age, Positions, PriceToWorkDay
       FROM dbo.NameServiceProduct WHERE Code = @code`,
      { code: createdCode },
      false,
    );
    if (!employee) throw new Error("ไม่พบข้อมูลพนักงานหลังบันทึก");

    return NextResponse.json(
      { success: true, data: employee },
      { status: 201 },
    );
  } catch (error) {
    if (createdCode) {
      await executeQuery(
        `BEGIN TRANSACTION;
         BEGIN TRY
           IF OBJECT_ID(N'dbo.WebEmployeeCredential', N'U') IS NOT NULL
             DELETE FROM dbo.WebEmployeeCredential WHERE CodeStaff = @code;
           DELETE FROM dbo.NameServiceProduct WHERE Code = @code;
           COMMIT TRANSACTION;
         END TRY
         BEGIN CATCH
           IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
           THROW;
         END CATCH`,
        { code: createdCode },
        false,
      ).catch(() => undefined);
    }
    if (error instanceof EmployeeCredentialError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }
    console.error("Employee POST API error:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถเพิ่มพนักงานได้" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const access = await getEmployeeAccess(request);
    const employeeCode = access.canManage ? 0 : (access.employeeCode ?? -1);
    const query = `
      SELECT 
        Code,
        NameSure,
        Address,
        Phone,
        IDCard,
        DateBirthDay,
        Age,
        Positions,
        PriceToWorkDay
      FROM dbo.NameServiceProduct
      WHERE @employeeCode = 0 OR Code = @employeeCode
      ORDER BY Code
    `;

    const employees = await executeQuery<Employee>(query, { employeeCode });

    return NextResponse.json({
      success: true,
      data: employees,
      total: employees.length,
      access: {
        canManage: access.canManage,
        employeeLinked: access.canManage || access.employeeCode !== null,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch employees",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

interface UpdateEmployeeAccessPayload {
  code?: unknown;
  phone?: unknown;
  action?: unknown;
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await getEmployeeAccess(request);
    if (!access.canManage) {
      return NextResponse.json(
        { success: false, error: "บัญชีนี้ไม่มีสิทธิ์แก้ไขข้อมูลพนักงาน" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as UpdateEmployeeAccessPayload;
    const code = Number(body.code);
    if (!Number.isInteger(code) || code <= 0) {
      return NextResponse.json(
        { success: false, error: "รหัสพนักงานไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    const phone =
      body.action === "reset_password"
        ? await resetEmployeePassword(code)
        : await updateEmployeePhoneAccess(code, String(body.phone ?? ""));

    return NextResponse.json({
      success: true,
      data: {
        code,
        phone,
        passwordReset: body.action === "reset_password",
      },
    });
  } catch (error) {
    if (error instanceof EmployeeCredentialError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.code === "not_found" ? 404 : 400 },
      );
    }
    console.error("Employee PATCH API error:", error);
    return NextResponse.json(
      { success: false, error: "ไม่สามารถอัปเดตบัญชีพนักงานได้" },
      { status: 500 },
    );
  }
}

interface DeleteEmployeePayload {
  code?: unknown;
  confirmationCode?: unknown;
}

interface EmployeeReferenceCounts {
  paymentCount: number;
  attendanceCount: number;
  adjustmentCount: number;
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await getEmployeeAccess(request);

    if (!access.canManage) {
      return NextResponse.json(
        { success: false, error: "บัญชีนี้ไม่มีสิทธิ์ลบข้อมูลพนักงาน" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as DeleteEmployeePayload;
    const code = Number(body.code);
    const confirmationCode = String(body.confirmationCode ?? "").trim();

    if (!Number.isInteger(code) || code <= 0) {
      return NextResponse.json(
        { success: false, error: "รหัสพนักงานไม่ถูกต้อง" },
        { status: 400 },
      );
    }

    if (confirmationCode !== String(code)) {
      return NextResponse.json(
        { success: false, error: "รหัสยืนยันไม่ตรงกับรหัสพนักงาน" },
        { status: 400 },
      );
    }

    const employee = await executeQuery<{ name: string }>(
      `
        SELECT TOP 1 LTRIM(RTRIM(ISNULL(NameSure, ''))) as name
        FROM dbo.NameServiceProduct
        WHERE Code = @code
      `,
      { code },
      false,
    );

    if (!employee[0]) {
      return NextResponse.json(
        { success: false, error: "ไม่พบพนักงานที่ต้องการลบ" },
        { status: 404 },
      );
    }

    const referenceRows = await executeQuery<EmployeeReferenceCounts>(
      `
        SELECT
          (SELECT COUNT(*) FROM dbo.Payment WHERE CodeStaff = @code) as paymentCount,
          CASE
            WHEN OBJECT_ID('dbo.WebEmployeeAttendance', 'U') IS NULL THEN 0
            ELSE (SELECT COUNT(*) FROM dbo.WebEmployeeAttendance WHERE CodeStaff = @code)
          END as attendanceCount,
          CASE
            WHEN OBJECT_ID('dbo.WebEmployeePayrollAdjustment', 'U') IS NULL THEN 0
            ELSE (SELECT COUNT(*) FROM dbo.WebEmployeePayrollAdjustment WHERE CodeStaff = @code)
          END as adjustmentCount
      `,
      { code },
      false,
    );
    const references = referenceRows[0];
    const totalReferences =
      Number(references?.paymentCount || 0) +
      Number(references?.attendanceCount || 0) +
      Number(references?.adjustmentCount || 0);

    if (totalReferences > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "ยังลบพนักงานคนนี้ไม่ได้",
          message:
            "พนักงานมีประวัติการจ่ายเงินหรือวันทำงาน ระบบจึงเก็บข้อมูลไว้เพื่อไม่ให้รายงานย้อนหลังเสียหาย",
          references: {
            payments: Number(references?.paymentCount || 0),
            attendance: Number(references?.attendanceCount || 0),
            adjustments: Number(references?.adjustmentCount || 0),
          },
        },
        { status: 409 },
      );
    }

    const result = await executeQuery<{ deletedCode: number }>(
      `
        BEGIN TRANSACTION;

        BEGIN TRY
          IF OBJECT_ID(N'dbo.WebEmployeeCredential', N'U') IS NOT NULL
          BEGIN
            DELETE FROM dbo.WebEmployeeCredential WHERE CodeStaff = @code
          END

          DELETE FROM dbo.NameServiceProduct
          OUTPUT DELETED.Code as deletedCode
          WHERE Code = @code;

          COMMIT TRANSACTION;
        END TRY
        BEGIN CATCH
          IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
          THROW;
        END CATCH
      `,
      { code },
      false,
    );

    if (!result[0]) {
      return NextResponse.json(
        { success: false, error: "ไม่พบพนักงานที่ต้องการลบ" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { code, name: employee[0].name },
    });
  } catch (error) {
    console.error("Employee DELETE API error:", error);
    const isReferenceConflict =
      typeof error === "object" &&
      error !== null &&
      "number" in error &&
      error.number === 547;

    return NextResponse.json(
      {
        success: false,
        error: isReferenceConflict ? "ยังลบพนักงานคนนี้ไม่ได้" : "ลบพนักงานไม่สำเร็จ",
        message: isReferenceConflict
          ? "ยังมีข้อมูลในระบบที่อ้างอิงพนักงานคนนี้อยู่"
          : "ระบบไม่สามารถลบข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
      },
      { status: isReferenceConflict ? 409 : 500 },
    );
  }
}
