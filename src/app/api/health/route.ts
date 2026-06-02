/**
 * Health Check API
 * GET /api/health - ตรวจสอบสถานะระบบและ database connection
 */

import { NextResponse } from "next/server";
import { getPool, getPoolStats } from "@/lib/db";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "unknown";
  let dbResponseTime = 0;
  let dbError = null;

  try {
    // ทดสอบ database connection
    const dbStart = Date.now();
    const pool = await getPool();
    const result = await pool.request().query("SELECT 1 as test, GETDATE() as now");
    dbResponseTime = Date.now() - dbStart;
    
    if (result.recordset[0].test === 1) {
      dbStatus = "healthy";
    }
  } catch (error) {
    dbStatus = "unhealthy";
    dbError = error instanceof Error ? error.message : "Unknown error";
  }

  const totalTime = Date.now() - startTime;
  const poolStats = getPoolStats();

  const health = {
    status: dbStatus === "healthy" ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      responseTime: `${dbResponseTime}ms`,
      error: dbError,
      pool: poolStats,
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
      },
    },
    responseTime: `${totalTime}ms`,
  };

  const statusCode = dbStatus === "healthy" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}

// Disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;
