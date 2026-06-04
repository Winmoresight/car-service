/**
 * ตรวจสอบโครงสร้างและข้อมูลในตาราง NameServiceProduct
 */

const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const config = {
  server: process.env.DATABASE_SERVER,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: parseInt(process.env.DATABASE_PORT),
  options: {
    encrypt: process.env.DATABASE_ENCRYPT === 'true',
    trustServerCertificate: process.env.DATABASE_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

async function checkServiceProduct() {
  let pool = null;
  
  try {
    console.log('🔐 เชื่อมต่อฐานข้อมูล...\n');
    pool = await sql.connect(config);
    
    // ดูโครงสร้างตาราง
    console.log('='.repeat(80));
    console.log('📋 โครงสร้างตาราง NameServiceProduct');
    console.log('='.repeat(80) + '\n');
    
    const structure = await pool.request().query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'NameServiceProduct'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(structure.recordset);
    
    // ดูข้อมูลทั้งหมด
    console.log('\n' + '='.repeat(80));
    console.log('📊 ข้อมูลทั้งหมดในตาราง NameServiceProduct');
    console.log('='.repeat(80) + '\n');
    
    const allData = await pool.request().query(`
      SELECT * FROM NameServiceProduct
      ORDER BY Code
    `);
    
    console.table(allData.recordset);
    console.log(`\n📈 จำนวนทั้งหมด: ${allData.recordset.length} รายการ\n`);
    
    console.log('✅ เสร็จสิ้น');
    
  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาด:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
      console.log('\n🔌 ปิดการเชื่อมต่อฐานข้อมูลแล้ว');
    }
  }
}

checkServiceProduct();
