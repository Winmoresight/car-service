/**
 * Script สำหรับตรวจสอบโครงสร้างตารางใบกำกับภาษีโดยละเอียด
 * รัน: node check-tax-invoice-structure.js
 */

const sql = require("mssql");
const fs = require("fs");
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
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const taxTables = [
  "MasterPrintPostVate",      // ใบกำกับภาษีหลัก
  "DetailPrintPostVate",      // รายละเอียดใบกำกับภาษี
  "MasterPrintCashVate",      // ใบเสร็จเงินสด/ภาษี
  "DetailPrintCashVate",      // รายละเอียดเงินสด
  "ChangeEditPrint",          // บิลที่แก้ไข/ยกเลิก
  "EditTotalOldNewPrint",     // แก้ไขยอดรวม
  "MasterPrintPost",          // บิลหลัก
  "DetailPrintPost",          // รายละเอียดบิล
];

async function checkTaxInvoiceStructure() {
  let pool;

  try {
    console.log("🔍 เริ่มตรวจสอบโครงสร้างตารางใบกำกับภาษี...\n");
    pool = await sql.connect(config);
    console.log("✅ เชื่อมต่อฐานข้อมูลสำเร็จ\n");

    const report = {
      timestamp: new Date().toISOString(),
      tables: {},
    };

    for (const tableName of taxTables) {
      console.log("=" .repeat(80));
      console.log(`📊 ตาราง: ${tableName}`);
      console.log("=" .repeat(80));

      try {
        // ดูโครงสร้างตาราง
        const structure = await pool.request().query(`
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            CHARACTER_MAXIMUM_LENGTH,
            IS_NULLABLE,
            COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `);

        console.log("\n🏗️  โครงสร้างคอลัมน์:");
        console.table(structure.recordset);

        // นับจำนวนข้อมูล
        const count = await pool.request().query(`
          SELECT COUNT(*) as total FROM dbo.[${tableName}]
        `);

        console.log(`\n📈 จำนวนข้อมูลทั้งหมด: ${count.recordset[0].total.toLocaleString()} รายการ`);

        // ดู Sample Data (5 รายการล่าสุด)
        if (count.recordset[0].total > 0) {
          const sample = await pool.request().query(`
            SELECT TOP 5 * FROM dbo.[${tableName}]
            ORDER BY 1 DESC
          `);

          console.log("\n📝 ตัวอย่างข้อมูล (5 รายการล่าสุด):");
          console.table(sample.recordset);
        } else {
          console.log("\n⚠️  ไม่มีข้อมูลในตารางนี้");
        }

        // บันทึกข้อมูลลง report
        report.tables[tableName] = {
          structure: structure.recordset,
          totalRecords: count.recordset[0].total,
          hasSample: count.recordset[0].total > 0,
        };

        console.log("\n");

      } catch (error) {
        console.log(`⚠️  ไม่สามารถเข้าถึงตาราง ${tableName}: ${error.message}\n`);
        report.tables[tableName] = {
          error: error.message,
        };
      }
    }

    // บันทึกรายงาน
    fs.writeFileSync(
      "tax-invoice-structure-report.json",
      JSON.stringify(report, null, 2)
    );

    console.log("=" .repeat(80));
    console.log("✅ บันทึกรายงานเป็นไฟล์: tax-invoice-structure-report.json");
    console.log("=" .repeat(80));

  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:", error.message);
    if (error.originalError) {
      console.error("รายละเอียด:", error.originalError.message);
    }
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log("\n🔌 ปิดการเชื่อมต่อฐานข้อมูลแล้ว");
    }
  }
}

checkTaxInvoiceStructure();
