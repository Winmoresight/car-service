/**
 * API Endpoint: /api/employees
 * GET ดึงข้อมูลพนักงานทั้งหมด
 * DELETE ลบพนักงานเมื่อไม่มีประวัติที่ต้องเก็บรักษา
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

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

export async function GET() {
  try {
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
      ORDER BY Code
    `;

    const employees = await executeQuery<Employee>(query);

    return NextResponse.json({
      success: true,
      data: employees,
      total: employees.length,
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

interface DeleteEmployeePayload {
  code?: unknown;
  confirmationCode?: unknown;
}

interface EmployeeReferenceCounts {
  paymentCount: number;
  attendanceCount: number;
  adjustmentCount: number;
}

export async function DELETE(request: Request) {
  try {
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
        DELETE FROM dbo.NameServiceProduct
        OUTPUT DELETED.Code as deletedCode
        WHERE Code = @code
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
