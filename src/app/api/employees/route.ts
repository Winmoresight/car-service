/**
 * API Endpoint: GET /api/employees
 * ดึงข้อมูลพนักงานทั้งหมดจากตาราง NameServiceProduct (ตารางพนักงานจริง)
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
      { status: 500 }
    );
  }
}
