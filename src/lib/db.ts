/**
 * Database connection and query utilities
 * Handles SQL Server connection pooling and query execution
 */

import sql from "mssql";
import { env } from "./env";

// Connection configuration
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
    max: 10,
    min: 2, // เพิ่ม min connections
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000, // เพิ่มเป็น 30 วินาที
  requestTimeout: 30000,
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

/**
 * Get or create database connection pool
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  // ถ้ามี pool อยู่แล้วและยัง connected
  if (pool?.connected) {
    return pool;
  }

  // ถ้ากำลัง connecting อยู่ รอให้เสร็จ
  if (isConnecting && pool) {
    // รอจนกว่า pool จะ ready
    const maxWait = 35000; // 35 วินาที
    const startTime = Date.now();
    while (!pool.connected && Date.now() - startTime < maxWait) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (pool.connected) {
      return pool;
    }
  }

  // สร้าง connection ใหม่
  try {
    isConnecting = true;
    console.log("🔄 Connecting to database...");
    pool = await sql.connect(config);
    console.log("✅ Database connected successfully");
    isConnecting = false;
    return pool;
  } catch (error) {
    isConnecting = false;
    console.error("❌ Database connection failed:", error);
    throw error;
  }
}

/**
 * Execute a SQL query with parameters
 * @param query SQL query string
 * @param params Optional query parameters
 */
export async function executeQuery<T = unknown>(
  query: string,
  params?: Record<string, unknown>,
): Promise<T[]> {
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
    console.error("❌ Database query error:", error);
    throw error;
  }
}

/**
 * Close database connection pool
 * Call this when shutting down the application
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log("🔌 Database connection closed");
  }
}

// Warm up connection on server start (only in production/development, not during build)
if (typeof window === "undefined" && process.env.NODE_ENV !== "test") {
  // เชื่อมต่อทันทีตอน server start แต่ไม่ block
  getPool()
    .then(() => {
      console.log("🚀 Database pool warmed up");
    })
    .catch((err) => {
      console.warn("⚠️ Database warm-up failed (will retry on first request):", err.message);
    });
}
