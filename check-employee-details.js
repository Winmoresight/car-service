/**
 * ดูข้อมูลรายละเอียดของตารางพนักงาน
 */

const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const config = {
  server: process.env.DATABASE_SERVER || 'localhost',
  database: process.env.DATABASE_NAME || 'BaseSeviceCar',
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT) : 1433,
  options: {
    encrypt: process.env.DATABASE_ENCRYPT === 'true',
    trustServerCertificate: process.env.DATABASE_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

async function checkEmployeeTables() {
  let pool = null;
  
  try {
    console.log('🔐 เชื่อมต่อฐานข้อมูล...\n');
    pool = await sql.connect(config);
    
    // ดูโครงสร้างตาราง PasswordID
    console.log('='.repeat(80));
    console.log('📋 โครงสร้างตาราง PasswordID (ตารางผู้ใช้/พนักงาน)');
    console.log('='.repeat(80) + '\n');
    
    const structure = await pool.request().query(`
      SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE,
          COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'PasswordID'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(structure.recordset);
    
    // ดูข้อมูลตัวอย่าง (ไม่แสดง password)
    console.log('\n' + '='.repeat(80));
    console.log('👥 ข้อมูลพนักงานตัวอย่าง (Top 10)');
    console.log('='.repeat(80) + '\n');
    
    const sample = await pool.request().query(`
      SELECT TOP 10
          Codeperson,
          NameUser,
          UserName,
          '***' as UserPwd
      FROM PasswordID
      ORDER BY Codeperson
    `);
    
    console.table(sample.recordset);
    
    // นับจำนวนพนักงาน
    const count = await pool.request().query(`
      SELECT COUNT(*) as TotalEmployees FROM PasswordID
    `);
    
    console.log(`\n📊 จำนวนพนักงานทั้งหมด: ${count.recordset[0].TotalEmployees} คน\n`);
    
    // ดูโครงสร้างตาราง NamePositions
    console.log('='.repeat(80));
    console.log('📋 โครงสร้างตาราง NamePositions (ตำแหน่งงาน)');
    console.log('='.repeat(80) + '\n');
    
    const posStructure = await pool.request().query(`
      SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'NamePositions'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(posStructure.recordset);
    
    // ดูข้อมูลตำแหน่ง
    console.log('\n' + '='.repeat(80));
    console.log('💼 ตำแหน่งงานทั้งหมด');
    console.log('='.repeat(80) + '\n');
    
    const positions = await pool.request().query(`
      SELECT * FROM NamePositions
    `);
    
    if (positions.recordset.length > 0) {
      console.table(positions.recordset);
    } else {
      console.log('⚠️ ไม่มีข้อมูลตำแหน่งงาน');
    }
    
    // ดูตาราง Payment และ BroughtForwordSalary
    console.log('\n' + '='.repeat(80));
    console.log('💰 โครงสร้างตาราง Payment (การจ่ายเงิน/เงินเดือน)');
    console.log('='.repeat(80) + '\n');
    
    const paymentStructure = await pool.request().query(`
      SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Payment'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(paymentStructure.recordset);
    
    console.log('\n' + '='.repeat(80));
    console.log('💰 โครงสร้างตาราง BroughtForwordSalary (เงินเดือนยกมา)');
    console.log('='.repeat(80) + '\n');
    
    const salaryStructure = await pool.request().query(`
      SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          CHARACTER_MAXIMUM_LENGTH,
          IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'BroughtForwordSalary'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.table(salaryStructure.recordset);
    
    console.log('\n✅ เสร็จสิ้น');
    
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

checkEmployeeTables();
