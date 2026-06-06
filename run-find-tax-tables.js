/**
 * Script สำหรับค้นหา Tables ที่เกี่ยวข้องกับใบกำกับภาษี
 * รัน: node run-find-tax-tables.js
 */

const sql = require("mssql");
const fs = require("fs");
require("dotenv").config({ path: ".env.local" });

// Database configuration
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
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function findTaxTables() {
  let pool;

  try {
    console.log("🔍 เริ่มค้นหา Tables ที่เกี่ยวข้องกับใบกำกับภาษี...\n");

    // Connect to database
    pool = await sql.connect(config);
    console.log("✅ เชื่อมต่อฐานข้อมูลสำเร็จ\n");

    // 1. หา Tables ที่เกี่ยวข้อง
    console.log("=" .repeat(80));
    console.log("1️⃣  ตารางที่เกี่ยวข้องกับ Invoice, Tax, Print, Sale");
    console.log("=" .repeat(80));
    
    const tablesResult = await pool.request().query(`
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE 
        TABLE_NAME LIKE '%Invoice%'
        OR TABLE_NAME LIKE '%Tax%'
        OR TABLE_NAME LIKE '%VAT%'
        OR TABLE_NAME LIKE '%Print%'
        OR TABLE_NAME LIKE '%Bill%'
        OR TABLE_NAME LIKE '%Receipt%'
        OR TABLE_NAME LIKE '%Sale%'
        OR TABLE_NAME LIKE '%Post%'
        OR TABLE_NAME LIKE '%Master%'
        OR TABLE_NAME LIKE '%Detail%'
        OR TABLE_NAME LIKE '%Change%'
        OR TABLE_NAME LIKE '%Edit%'
        OR TABLE_NAME LIKE '%Cancel%'
        OR TABLE_NAME LIKE '%Delete%'
        OR TABLE_NAME LIKE '%Void%'
      ORDER BY TABLE_NAME
    `);
    
    console.table(tablesResult.recordset);
    console.log(`\n📊 พบทั้งหมด: ${tablesResult.recordset.length} tables\n`);

    // 2. หา Columns ที่เกี่ยวข้อง
    console.log("=" .repeat(80));
    console.log("2️⃣  คอลัมน์ที่เกี่ยวข้องกับ Tax, VAT, Print, Cancel, Edit");
    console.log("=" .repeat(80));
    
    const columnsResult = await pool.request().query(`
      SELECT DISTINCT
        TABLE_NAME,
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE 
        COLUMN_NAME LIKE '%Tax%'
        OR COLUMN_NAME LIKE '%VAT%'
        OR COLUMN_NAME LIKE '%Print%'
        OR COLUMN_NAME LIKE '%Invoice%'
        OR COLUMN_NAME LIKE '%Cancel%'
        OR COLUMN_NAME LIKE '%Edit%'
        OR COLUMN_NAME LIKE '%Delete%'
        OR COLUMN_NAME LIKE '%Void%'
        OR COLUMN_NAME LIKE '%Modify%'
        OR COLUMN_NAME LIKE '%Change%'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `);
    
    console.table(columnsResult.recordset);
    console.log(`\n📊 พบทั้งหมด: ${columnsResult.recordset.length} columns\n`);

    // 3. ดูโครงสร้าง MasterSalePost
    console.log("=" .repeat(80));
    console.log("3️⃣  โครงสร้างตาราง MasterSalePost (ตารางหลักขาย)");
    console.log("=" .repeat(80));
    
    const masterStructure = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'MasterSalePost'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(masterStructure.recordset);
    console.log(`\n📊 จำนวนคอลัมน์: ${masterStructure.recordset.length}\n`);

    // 4. ดูโครงสร้าง DetailSalePost
    console.log("=" .repeat(80));
    console.log("4️⃣  โครงสร้างตาราง DetailSalePost (รายละเอียดขาย)");
    console.log("=" .repeat(80));
    
    const detailStructure = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'DetailSalePost'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(detailStructure.recordset);
    console.log(`\n📊 จำนวนคอลัมน์: ${detailStructure.recordset.length}\n`);

    // 5. ดู Sample Data จาก MasterSalePost
    console.log("=" .repeat(80));
    console.log("5️⃣  ตัวอย่างข้อมูลจาก MasterSalePost (5 รายการล่าสุด)");
    console.log("=" .repeat(80));
    
    const masterSample = await pool.request().query(`
      SELECT TOP 5 * 
      FROM dbo.MasterSalePost
      ORDER BY DateSalePost DESC
    `);
    
    console.table(masterSample.recordset);

    // 6. แสดงตารางทั้งหมด
    console.log("\n" + "=" .repeat(80));
    console.log("6️⃣  ตารางทั้งหมดในฐานข้อมูล");
    console.log("=" .repeat(80));
    
    const allTables = await pool.request().query(`
      SELECT 
        TABLE_SCHEMA,
        TABLE_NAME,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.table(allTables.recordset);
    console.log(`\n📊 ทั้งหมด: ${allTables.recordset.length} tables\n`);

    // บันทึกผลลัพธ์เป็นไฟล์
    const report = {
      timestamp: new Date().toISOString(),
      relatedTables: tablesResult.recordset,
      relatedColumns: columnsResult.recordset,
      masterSalePostStructure: masterStructure.recordset,
      detailSalePostStructure: detailStructure.recordset,
      allTables: allTables.recordset,
    };

    fs.writeFileSync(
      "tax-invoice-tables-report.json",
      JSON.stringify(report, null, 2)
    );

    console.log("\n✅ บันทึกรายงานเป็นไฟล์: tax-invoice-tables-report.json\n");

  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:", error.message);
    if (error.originalError) {
      console.error("รายละเอียด:", error.originalError.message);
    }
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log("🔌 ปิดการเชื่อมต่อฐานข้อมูลแล้ว");
    }
  }
}

// รันฟังก์ชัน
findTaxTables();
