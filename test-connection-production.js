/**
 * Production-grade Connection Test Script
 * ทดสอบ connection พร้อม monitoring
 */

const sql = require("mssql");

// สีสำหรับ console
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

// Configuration
const config = {
  server: process.env.DATABASE_SERVER || "localhost",
  database: process.env.DATABASE_NAME || "BaseSeviceCar",
  user: process.env.DATABASE_USER || "sa",
  password: process.env.DATABASE_PASSWORD || "",
  port: Number.parseInt(process.env.DATABASE_PORT || "1433", 10),
  options: {
    encrypt: process.env.DATABASE_ENCRYPT === "true",
    trustServerCertificate: process.env.DATABASE_TRUST_SERVER_CERTIFICATE === "true",
    enableArithAbort: true,
  },
  pool: {
    max: 20,
    min: 0,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 60000,
  },
  connectionTimeout: 60000,
  requestTimeout: 60000,
};

async function testConnection() {
  console.log(`${colors.cyan}${"=".repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}🧪 Production Connection Test${colors.reset}`);
  console.log(`${colors.cyan}${"=".repeat(60)}${colors.reset}\n`);

  console.log(`${colors.blue}📋 Configuration:${colors.reset}`);
  console.log(`   Server: ${config.server}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Encrypt: ${config.options.encrypt}`);
  console.log(`   Trust Certificate: ${config.options.trustServerCertificate}`);
  console.log(`   Max Pool: ${config.pool.max}`);
  console.log(`   Connection Timeout: ${config.connectionTimeout}ms`);
  console.log(`   Request Timeout: ${config.requestTimeout}ms\n`);

  let pool = null;

  try {
    // Test 1: Connection
    console.log(`${colors.yellow}🔄 Test 1: Establishing connection...${colors.reset}`);
    const startConnect = Date.now();
    
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    const connectTime = Date.now() - startConnect;
    console.log(`${colors.green}✅ Connected in ${connectTime}ms${colors.reset}\n`);

    // Test 2: Simple Query
    console.log(`${colors.yellow}🔄 Test 2: Running simple query...${colors.reset}`);
    const startQuery1 = Date.now();
    
    const result1 = await pool.request().query("SELECT 1 as test, GETDATE() as now");
    
    const queryTime1 = Date.now() - startQuery1;
    console.log(`${colors.green}✅ Query executed in ${queryTime1}ms${colors.reset}`);
    console.log(`   Result:`, result1.recordset[0]);
    console.log();

    // Test 3: Database Query
    console.log(`${colors.yellow}🔄 Test 3: Querying database tables...${colors.reset}`);
    const startQuery2 = Date.now();
    
    const result2 = await pool.request().query(`
      SELECT 
        COUNT(*) as sales_count,
        ISNULL(SUM(TotalPrice), 0) as total_sales
      FROM dbo.MasterSalePost
    `);
    
    const queryTime2 = Date.now() - startQuery2;
    console.log(`${colors.green}✅ Query executed in ${queryTime2}ms${colors.reset}`);
    console.log(`   Sales Count:`, result2.recordset[0].sales_count);
    console.log(`   Total Sales:`, result2.recordset[0].total_sales);
    console.log();

    // Test 4: Pool Stats
    console.log(`${colors.yellow}📊 Test 4: Pool Statistics${colors.reset}`);
    console.log(`   Connected: ${pool.connected}`);
    console.log(`   Pool Size: ${pool.size}`);
    console.log(`   Available: ${pool.available}`);
    console.log(`   Pending: ${pool.pending}`);
    console.log(`   Borrowed: ${pool.borrowed}`);
    console.log();

    // Test 5: Concurrent Queries
    console.log(`${colors.yellow}🔄 Test 5: Running 10 concurrent queries...${colors.reset}`);
    const startConcurrent = Date.now();
    
    const queries = Array.from({ length: 10 }, (_, i) =>
      pool.request().query(`SELECT ${i + 1} as query_number, GETDATE() as timestamp`)
    );
    
    await Promise.all(queries);
    
    const concurrentTime = Date.now() - startConcurrent;
    console.log(`${colors.green}✅ All queries completed in ${concurrentTime}ms${colors.reset}`);
    console.log(`   Average: ${(concurrentTime / 10).toFixed(2)}ms per query`);
    console.log();

    // Test 6: Heavy Query
    console.log(`${colors.yellow}🔄 Test 6: Running heavy query...${colors.reset}`);
    const startHeavy = Date.now();
    
    const result3 = await pool.request().query(`
      SELECT 
        YEAR(DateSalePost) as year,
        MONTH(DateSalePost) as month,
        COUNT(*) as bill_count,
        SUM(TotalPrice) as total_sales
      FROM dbo.MasterSalePost
      GROUP BY YEAR(DateSalePost), MONTH(DateSalePost)
      ORDER BY year DESC, month DESC
    `);
    
    const heavyTime = Date.now() - startHeavy;
    console.log(`${colors.green}✅ Heavy query executed in ${heavyTime}ms${colors.reset}`);
    console.log(`   Rows returned: ${result3.recordset.length}`);
    console.log();

    // Success Summary
    console.log(`${colors.cyan}${"=".repeat(60)}${colors.reset}`);
    console.log(`${colors.green}${colors.bright}✅ ALL TESTS PASSED!${colors.reset}`);
    console.log(`${colors.cyan}${"=".repeat(60)}${colors.reset}\n`);
    
    console.log(`${colors.blue}⚡ Performance Summary:${colors.reset}`);
    console.log(`   Connection: ${connectTime}ms`);
    console.log(`   Simple Query: ${queryTime1}ms`);
    console.log(`   Database Query: ${queryTime2}ms`);
    console.log(`   Concurrent Queries: ${concurrentTime}ms`);
    console.log(`   Heavy Query: ${heavyTime}ms`);
    console.log();
    
    if (connectTime > 5000) {
      console.log(`${colors.yellow}⚠️  Connection is slow (>5s). Check:${colors.reset}`);
      console.log(`   - SQL Server is running`);
      console.log(`   - TCP/IP is enabled`);
      console.log(`   - Firewall settings`);
      console.log();
    }

  } catch (error) {
    console.error(`\n${colors.red}${colors.bright}❌ TEST FAILED!${colors.reset}\n`);
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
    
    if (error.code) {
      console.error(`${colors.red}Code:${colors.reset}`, error.code);
    }
    
    console.log(`\n${colors.yellow}💡 Troubleshooting:${colors.reset}`);
    
    if (error.message.includes("timeout") || error.message.includes("15000ms")) {
      console.log(`   1. Check SQL Server is running: services.msc`);
      console.log(`   2. Enable TCP/IP in SQL Server Configuration Manager`);
      console.log(`   3. Set TCP Port to 1433`);
      console.log(`   4. Restart SQL Server service`);
    } else if (error.message.includes("Login failed")) {
      console.log(`   1. Check username and password in .env.local`);
      console.log(`   2. Enable SQL Server Authentication mode`);
      console.log(`   3. Enable 'sa' login and set password`);
    } else if (error.message.includes("ECONNREFUSED")) {
      console.log(`   1. SQL Server is not listening on port ${config.port}`);
      console.log(`   2. Check firewall settings`);
      console.log(`   3. Try using 'localhost\\SQLEXPRESS' instead of 'localhost'`);
    }
    
    console.log();
    process.exit(1);
    
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log(`${colors.blue}🔌 Connection closed${colors.reset}`);
      } catch (err) {
        console.error(`${colors.red}⚠️  Error closing connection:${colors.reset}`, err.message);
      }
    }
  }
}

// Load .env.local
try {
  const fs = require("fs");
  const path = require("path");
  const envPath = path.join(__dirname, ".env.local");
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (error) {
  console.warn(`${colors.yellow}⚠️  Could not load .env.local${colors.reset}`);
}

// Run test
testConnection();
