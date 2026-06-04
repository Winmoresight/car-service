/**
 * API Endpoint: GET /api/employees/positions
 * ดึงข้อมูลตำแหน่งงานทั้งหมด
 */

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/db";

interface Position {
  Code: number;
  NamePositions: string;
}

export async function GET() {
  try {
    const query = `
      SELECT 
        Code,
        NamePositions
      FROM dbo.NamePositions
      ORDER BY Code
    `;

    const positions = await executeQuery<Position>(query);

    return NextResponse.json({
      success: true,
      data: positions,
      total: positions.length,
    });
  } catch (error) {
    console.error("❌ Error fetching positions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch positions",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
