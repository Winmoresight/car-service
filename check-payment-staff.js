/**
 * ตรวจสอบข้อมูล CodeStaff ในตาราง Payment
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

async function checkPaymentStaff() {
  let pool = null;
  
  try {
    console.log('🔐 เชื่อมต่อฐานข้อมูล...\n');
    pool = await sql.connect(config);
    
    // ดู CodeStaff ที่มีในตาราง Payment
    console.log('='.repeat(80));
    console.log('📊 CodeStaff ที่มีในตาราง Payment (แยกตามความถี่)');
    console.log('='.repeat(80) + '\n');
    
    const staffCodes = await pool.request().query(`
      SELECT 
        CodeStaff,
        COUNT(*) as Count,
        MIN(NameSure) as ExampleName
      FROM Payment
      GROUP BY CodeStaff
      ORDER BY CodeStaff
    `);
    
    console.table(staffCodes.recordset);
    
    // เช็คว่า CodeStaff = 0 มีข้อมูลอะไรบ้าง
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  รายการที่ CodeStaff = 0 (ตัวอย่าง 5 รายการ)');
    console.log('='.repeat(80) + '\n');
    
    const zeroStaff = await pool.request().query(`
      SELECT TOP 5
        OrderNum,
        DatePost,
        CodeStaff,
        NameSure,
        NamePositions,
        TotalPrice,
        Datepayment
      FROM Payment
      WHERE CodeStaff = 0 OR CodeStaff IS NULL
      ORDER BY DatePost DESC
    `);
    
    console.table(zeroStaff.recordset);
    
    // เช็คว่ามีพนักงานไหนที่ไม่มีรายการจ่ายเงินบ้าง
    console.log('\n' + '='.repeat(80));
    console.log('🔍 เปรียบเทียบ PasswordID vs Payment');
    console.log('='.repeat(80) + '\n');
    
    const comparison = await pool.request().query(`
      SELECT 
        p.Codeperson,
        p.NameUser,
        p.UserName,
        COUNT(pay.OrderNum) as PaymentCount,
        SUM(pay.TotalPrice) as TotalAmount
      FROM PasswordID p
      LEFT JOIN Payment pay ON p.Codeperson = pay.CodeStaff
      GROUP BY p.Codeperson, p.NameUser, p.UserName
      ORDER BY p.Codeperson
    `);
    
    console.table(comparison.recordset);
    
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

checkPaymentStaff();
