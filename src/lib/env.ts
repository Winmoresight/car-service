/**
 * Environment variables configuration
 * Centralized environment variable access with type safety
 */

export const env = {
  database: {
    server: process.env.DATABASE_SERVER || "localhost\\SQLEXPRESS",
    database: process.env.DATABASE_NAME || "BaseSeviceCar",
    user: process.env.DATABASE_USER || undefined, // undefined = Windows Auth
    password: process.env.DATABASE_PASSWORD || undefined,
    port: Number.parseInt(process.env.DATABASE_PORT || "1433", 10),
    options: {
      encrypt: process.env.DATABASE_ENCRYPT === "true",
      trustServerCertificate:
        process.env.DATABASE_TRUST_SERVER_CERTIFICATE === "true",
    },
  },
  nodeEnv: process.env.NODE_ENV || "development",
} as const;
