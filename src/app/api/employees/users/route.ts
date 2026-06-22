/**
 * API Endpoint: GET /api/employees/users
 * ดึงรายชื่อผู้ใช้จากตาราง PasswordID สำหรับช่องผู้รับงาน
 */

import { type NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

interface EmployeeUser {
  nameUser: string;
}

function parseLimit(value: string | null) {
  const limit = Number.parseInt(value || "12", 10);

  if (!Number.isFinite(limit) || limit <= 0) {
    return 12;
  }

  return Math.min(limit, 50);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search")?.trim() || "";
    const limit = parseLimit(searchParams.get("limit"));
    const searchLike = `%${search}%`;

    const query = `
      SELECT DISTINCT TOP (@limit)
        LTRIM(RTRIM(ISNULL(NameUser, ''))) as nameUser
      FROM dbo.PasswordID
      WHERE NameUser IS NOT NULL
        AND LTRIM(RTRIM(NameUser)) <> ''
        AND (@search = '' OR NameUser LIKE @searchLike)
      ORDER BY nameUser
    `;

    const employees = await executeQuery<EmployeeUser>(
      query,
      { limit, search, searchLike },
      false,
    );

    return NextResponse.json({
      success: true,
      data: employees,
      total: employees.length,
    });
  } catch (error) {
    console.error("Employee users API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch employee users",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
export const revalidate = 0;
