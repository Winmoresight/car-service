/**
 * Database connection and query utilities
 * Production-ready SQL Server connection pooling with retry logic
 */

import sql from "mssql";
import { env } from "./env";

// Connection configuration - optimized for PM2 + Local Production
const config: sql.config = {
  server: env.database.server,
  database: env.database.database,
  options: {
    encrypt: env.database.options.encrypt,
    trustServerCertificate: env.database.options.trustServerCertificate,
    enableArithAbort: true,
    // ใช้ Named Pipes สำหรับ local SQL Server
    instanceName: env.database.server.includes("\\")
      ? env.database.server.split("\\")[1]
      : undefined,
  },
  pool: {
    max: 50, // เพิ่มสูงสำหรับ production (รองรับ concurrent users)
    min: 5, // maintain 5 connections ตลอด
    idleTimeoutMillis: 300000, // ปิดหลัง 5 นาที idle (ไม่ใช่เลย)
  },
  connectionTimeout: 30000, // 30 วินาที (local ควรเร็ว ถ้าช้ากว่านี้แสดงว่ามีปัญหา)
  requestTimeout: 120000, // 2 นาที (ให้เวลา query ซับซ้อน)
  // Retry logic
  connectionIsolationLevel: sql.ISOLATION_LEVEL.READ_COMMITTED,
  parseJSON: true,
};

// Add authentication only if user/password provided (SQL Auth)
// Otherwise use Windows Authentication
if (env.database.user && env.database.password) {
  config.user = env.database.user;
  config.password = env.database.password;
  if (env.database.port) {
    config.port = env.database.port;
  }
  console.log("🔐 Using SQL Server Authentication");
} else {
  // Windows Authentication
  config.authentication = {
    type: "ntlm",
    options: {
      domain: "",
      userName: "",
      password: "",
    },
  };
  console.log("🔐 Using Windows Authentication");
}

// Connection pool singleton
let pool: sql.ConnectionPool | null = null;
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 วินาที

/**
 * Verify if pool is healthy and connected
 */
async function isPoolHealthy(p: sql.ConnectionPool): Promise<boolean> {
  if (!p || !p.connected) {
    return false;
  }
  
  try {
    // ทดสอบด้วย query เบา ๆ
    const request = p.request();
    await request.query("SELECT 1 as test");
    return true;
  } catch (error) {
    console.warn("⚠️ Pool health check failed:", error);
    return false;
  }
}

/**
 * Get or create database connection pool with retry logic
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  // ถ้ามี pool อยู่แล้ว เช็คว่ายัง healthy ไหม
  if (pool?.connected) {
    const healthy = await isPoolHealthy(pool);
    if (healthy) {
      connectionAttempts = 0; // reset counter
      return pool;
    }
    // ถ้าไม่ healthy ให้ปิดแล้วสร้างใหม่
    console.warn("⚠️ Pool unhealthy, recreating...");
    try {
      await pool.close();
    } catch (err) {
      console.warn("⚠️ Error closing unhealthy pool:", err);
    }
    pool = null;
  }

  // ถ้ากำลัง connecting อยู่ รอให้เสร็จ
  if (isConnecting && pool) {
    const maxWait = 70000; // 70 วินาที (มากกว่า connectionTimeout)
    const startTime = Date.now();
    while (!pool.connected && Date.now() - startTime < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (pool.connected) {
      const healthy = await isPoolHealthy(pool);
      if (healthy) {
        connectionAttempts = 0;
        return pool;
      }
    }
  }

  // สร้าง connection ใหม่พร้อม retry logic
  isConnecting = true;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`🔄 Connecting to database (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})...`);
      
      // สร้าง pool ใหม่
      const newPool = new sql.ConnectionPool(config);
      
      // เพิ่ม error handler
      newPool.on("error", (err) => {
        console.error("❌ Pool error:", err);
      });

      // เชื่อมต่อ
      await newPool.connect();
      
      // ตรวจสอบว่า connect สำเร็จจริง ๆ
      const healthy = await isPoolHealthy(newPool);
      if (!healthy) {
        throw new Error("Pool connected but health check failed");
      }

      pool = newPool;
      connectionAttempts = 0;
      isConnecting = false;
      console.log("✅ Database connected successfully");
      return pool;
      
    } catch (error) {
      lastError = error as Error;
      connectionAttempts++;
      console.error(
        `❌ Connection attempt ${attempt}/${MAX_RETRY_ATTEMPTS} failed:`,
        error
      );

      // ถ้ายังมี attempt เหลือ รอแล้วลองใหม่
      if (attempt < MAX_RETRY_ATTEMPTS) {
        const delay = RETRY_DELAY * attempt; // เพิ่ม delay ทีละน้อย (2s, 4s, 6s)
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  isConnecting = false;
  
  // ถ้าครบ retry แล้วยังไม่ได้ ให้ throw error
  const errorMsg = `Failed to connect after ${MAX_RETRY_ATTEMPTS} attempts: ${lastError?.message}`;
  console.error(`❌ ${errorMsg}`);
  throw new Error(errorMsg);
}

/**
 * Execute a SQL query with parameters and automatic retry
 * @param query SQL query string
 * @param params Optional query parameters
 * @param retryOnFailure Enable automatic retry (default: true)
 */
export async function executeQuery<T = unknown>(
  query: string,
  params?: Record<string, unknown>,
  retryOnFailure = true,
): Promise<T[]> {
  const maxQueryRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxQueryRetries; attempt++) {
    try {
      const connectionPool = await getPool();
      const request = connectionPool.request();

      // Add parameters if provided
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          request.input(key, value);
        }
      }

      const result = await request.query(query);
      return result.recordset as T[];
      
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Query error (attempt ${attempt}/${maxQueryRetries}):`, error);

      // ถ้าเป็น connection error ให้ reset pool
      const errorMsg = error instanceof Error ? error.message.toLowerCase() : "";
      const isConnectionError = 
        errorMsg.includes("connection") ||
        errorMsg.includes("timeout") ||
        errorMsg.includes("socket") ||
        errorMsg.includes("econnreset") ||
        errorMsg.includes("closed");

      if (isConnectionError && pool) {
        console.warn("⚠️ Connection error detected, resetting pool...");
        try {
          await pool.close();
        } catch (closeErr) {
          console.warn("⚠️ Error closing pool:", closeErr);
        }
        pool = null;
      }

      // ถ้ายังมี retry เหลือและเปิด retry flag
      if (attempt < maxQueryRetries && retryOnFailure) {
        console.log(`⏳ Retrying query in 1s...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        break;
      }
    }
  }

  // ถ้าครบ retry แล้วยังไม่ได้
  throw lastError || new Error("Query failed after retries");
}

/**
 * Close database connection pool gracefully
 * Call this when shutting down the application
 */
export async function closePool(): Promise<void> {
  if (pool) {
    try {
      console.log("🔌 Closing database connection pool...");
      await pool.close();
      pool = null;
      isConnecting = false;
      connectionAttempts = 0;
      console.log("✅ Database connection closed successfully");
    } catch (error) {
      console.error("❌ Error closing pool:", error);
      pool = null; // force reset
    }
  }
}

/**
 * Get connection pool statistics
 * Useful for monitoring and debugging
 */
export function getPoolStats() {
  if (!pool) {
    return { connected: false, size: 0, available: 0, pending: 0 };
  }

  return {
    connected: pool.connected,
    size: pool.size,
    available: pool.available,
    pending: pool.pending,
    borrowed: pool.borrowed,
  };
}

// Warm up connection on server start (only in production/development, not during build)
if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
  // เชื่อมต่อทันทีตอน server start แต่ไม่ block
  getPool()
    .then(() => {
      console.log("🚀 Database pool warmed up");
      console.log("📊 Pool stats:", getPoolStats());
    })
    .catch((err) => {
      console.warn(
        "⚠️ Database warm-up failed (will retry on first request):",
        err.message,
      );
    });
}

// Cleanup on process exit
process.on("SIGINT", async () => {
  console.log("\n⚠️ Received SIGINT, closing database connections...");
  await closePool();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n⚠️ Received SIGTERM, closing database connections...");
  await closePool();
  process.exit(0);
});
