/**
 * Database Monitor API
 * GET /api/monitor - ดูสถิติ pool และ performance metrics
 */

import { NextResponse } from "next/server";
import { getPoolStats } from "@/lib/db";

// Store metrics in memory (for development)
const metrics = {
  requests: 0,
  errors: 0,
  totalResponseTime: 0,
  slowQueries: 0, // queries > 1s
  lastError: null as string | null,
  lastErrorTime: null as string | null,
  startTime: Date.now(),
};

export function recordRequest(responseTime: number, error?: Error) {
  metrics.requests++;
  metrics.totalResponseTime += responseTime;
  
  if (error) {
    metrics.errors++;
    metrics.lastError = error.message;
    metrics.lastErrorTime = new Date().toISOString();
  }
  
  if (responseTime > 1000) {
    metrics.slowQueries++;
  }
}

export async function GET() {
  const poolStats = getPoolStats();
  const uptime = Date.now() - metrics.startTime;
  const avgResponseTime = metrics.requests > 0 
    ? (metrics.totalResponseTime / metrics.requests).toFixed(2)
    : "0";

  const monitor = {
    timestamp: new Date().toISOString(),
    uptime: {
      ms: uptime,
      readable: `${Math.floor(uptime / 1000 / 60)}m ${Math.floor((uptime / 1000) % 60)}s`,
    },
    pool: poolStats,
    metrics: {
      totalRequests: metrics.requests,
      errors: metrics.errors,
      errorRate: metrics.requests > 0 
        ? `${((metrics.errors / metrics.requests) * 100).toFixed(2)}%`
        : "0%",
      avgResponseTime: `${avgResponseTime}ms`,
      slowQueries: metrics.slowQueries,
      lastError: metrics.lastError,
      lastErrorTime: metrics.lastErrorTime,
    },
    health: {
      poolConnected: poolStats.connected,
      poolHealthy: poolStats.connected && poolStats.size >= 0,
      errorRateOk: metrics.requests === 0 || (metrics.errors / metrics.requests) < 0.05,
      avgResponseOk: Number.parseFloat(avgResponseTime) < 1000,
    },
  };

  return NextResponse.json(monitor);
}

// Disable caching
export const dynamic = "force-dynamic";
export const revalidate = 0;
