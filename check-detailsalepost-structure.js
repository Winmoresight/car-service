/**
 * Script เช็คโครงสร้างตาราง DetailSalePost
 */

const sql = require("mssql");
require("dotenv").config({ path: ".env.local" });

const config = {
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  server: process.env.DATABASE_SERVER,
  database: process.env.DATABASE_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
    connectionTimeout: 30000,
    requestTimeout: 30000,
  },
};

async function checkStructure() {
  let pool;

  try {
    console.log("🔍 เชื่อมต่อฐานข้อมูล...");
    pool = await sql.connect(config);
    console.log("✅ เชื่อมต่อสำเร็จ\n");

    // ดูโครงสร้างตาราง DetailSalePost
    console.log("📊 โครงสร้างตาราง DetailSalePost:");
    console.log("=".repeat(80));
    
    const structure = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'DetailSalePost'
      ORDER BY ORDINAL_POSITION
    `);

    console.table(structure.recordset);

    // ดูข้อมูลตัวอย่าง 5 รายการ
    console.log("\n📝 ตัวอย่างข้อมูล 5 รายการล่าสุด:");
    console.log("=".repeat(80));
    
    const sample = await pool.request().query(`
      SELECT TOP 5 * 
      FROM dbo.DetailSalePost
      ORDER BY 1 DESC
    `);

    console.table(sample.recordset);

    // ดูว่ามีรหัส psc ไหม
    console.log("\n🔍 ตรวจสอบข้อมูลที่มี 'psc' (ใช้คอลัมน์แรก):");
    console.log("=".repeat(80));
    
    const columnName = structure.recordset[0].COLUMN_NAME;
    
    const pscCheck = await pool.request().query(`
      SELECT TOP 10 * 
      FROM dbo.DetailSalePost
      WHERE ${columnName} LIKE 'psc%'
      ORDER BY ${columnName} DESC
    `);

    console.log(`\nพบข้อมูล psc: ${pscCheck.recordset.length} รายการ`);
    if (pscCheck.recordset.length > 0) {
      console.table(pscCheck.recordset);
    }

  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:", error.message);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log("\n🔌 ปิดการเชื่อมต่อแล้ว");
    }
  }
}

checkStructure();
