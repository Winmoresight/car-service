/**
 * ตรวจสอบรายการที่บันทึกแต่ไม่มีการเปลี่ยนแปลงเลย
 * เพื่อหา bug ในระบบเก่า
 */

const sql = require('mssql');
require('dotenv').config({ path: '.env.local' });

const config = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

async function checkNoChangeRecords() {
  try {
    console.log('🔍 กำลังตรวจสอบรายการที่ไม่มีการเปลี่ยนแปลงเลย...\n');
    
    await sql.connect(config);

    // นับจำนวนรายการที่ไม่มีการเปลี่ยนแปลงเลย
    const countQuery = `
      SELECT 
        COUNT(*) as noChangeCount
      FROM dbo.ChangeEditPrint
      WHERE 
        PayCashOld = PayCashNew
        AND PayTransferOld = PayTransferNew
        AND ISNULL(NameBankOld, '') = ISNULL(NameBankNew, '')
    `;
    
    const [countResult] = await sql.query(countQuery);
    
    console.log(`📊 จำนวนรายการที่ไม่มีการเปลี่ยนแปลงเลย: ${countResult.noChangeCount} รายการ\n`);
    
    if (countResult.noChangeCount === 0) {
      console.log('✅ ดีมาก! ไม่มีรายการที่บันทึกโดยไม่มีการเปลี่ยนแปลง\n');
      await sql.close();
      return;
    }
    
    console.log('⚠️  พบรายการที่น่าสงสัย! มาดูรายละเอียดกัน:\n');
    
    // ดึงรายการที่ไม่มีการเปลี่ยนแปลง
    const detailQuery = `
      SELECT TOP 20
        NumberPrint,
        DateEditPrint,
        Times,
        PayCashOld,
        PayCashNew,
        PayTransferOld,
        PayTransferNew,
        ISNULL(NameBankOld, '') as NameBankOld,
        ISNULL(NameBankNew, '') as NameBankNew,
        NameUser
      FROM dbo.ChangeEditPrint
      WHERE 
        PayCashOld = PayCashNew
        AND PayTransferOld = PayTransferNew
        AND ISNULL(NameBankOld, '') = ISNULL(NameBankNew, '')
      ORDER BY DateEditPrint DESC
    `;
    
    const detailResult = await sql.query(detailQuery);
    
    console.log('📋 ตัวอย่าง 20 รายการแรก:\n');
    console.log('─'.repeat(120));
    console.log(
      'บิล'.padEnd(20) +
      'วันที่'.padEnd(15) +
      'เวลา'.padEnd(12) +
      'เงินสด'.padEnd(12) +
      'เงินโอน'.padEnd(12) +
      'ธนาคาร'.padEnd(20) +
      'ผู้แก้ไข'
    );
    console.log('─'.repeat(120));
    
    for (const row of detailResult.recordset) {
      console.log(
        row.NumberPrint.padEnd(20) +
        new Date(row.DateEditPrint).toLocaleDateString('th-TH').padEnd(15) +
        row.Times.padEnd(12) +
        `฿${row.PayCashOld}`.padEnd(12) +
        `฿${row.PayTransferOld}`.padEnd(12) +
        (row.NameBankOld || 'ไม่ระบุ').padEnd(20) +
        row.NameUser
      );
    }
    
    console.log('─'.repeat(120));
    
    // วิเคราะห์ตามผู้ใช้
    console.log('\n\n👤 การแก้ไขที่ไม่มีการเปลี่ยนแปลง จำแนกตามผู้ใช้:\n');
    
    const userQuery = `
      SELECT 
        NameUser,
        COUNT(*) as noChangeCount
      FROM dbo.ChangeEditPrint
      WHERE 
        PayCashOld = PayCashNew
        AND PayTransferOld = PayTransferNew
        AND ISNULL(NameBankOld, '') = ISNULL(NameBankNew, '')
      GROUP BY NameUser
      ORDER BY noChangeCount DESC
    `;
    
    const userResult = await sql.query(userQuery);
    
    console.log('ผู้ใช้'.padEnd(20) + 'จำนวนรายการ');
    console.log('─'.repeat(40));
    
    for (const row of userResult.recordset) {
      console.log(
        row.NameUser.padEnd(20) +
        row.noChangeCount.toString()
      );
    }
    
    // สรุปและคำแนะนำ
    console.log('\n\n💡 สรุปและคำแนะนำ:\n');
    
    console.log('🔍 สาเหตุที่เป็นไปได้:');
    console.log('   1. ระบบเก่ามี bug - บันทึก log ทุกครั้งที่เปิดฟอร์มแก้ไข (แม้ไม่ได้แก้ไข)');
    console.log('   2. ระบบไม่เช็คว่ามีการเปลี่ยนแปลงจริงก่อนบันทึก');
    console.log('   3. พนักงานเปิดฟอร์มแก้ไข แล้วกด "บันทึก" โดยไม่ได้แก้ไขอะไร\n');
    
    console.log('✅ การแก้ไข:');
    console.log('   1. ใน Backend API: ไม่นับรายการที่ไม่มีการเปลี่ยนแปลงเลย');
    console.log('   2. ใน Frontend: แสดงข้อความ "ไม่มีการเปลี่ยนแปลง" สีเทา');
    console.log('   3. ในระบบใหม่: เช็คก่อน save ว่ามีการเปลี่ยนแปลงจริงหรือไม่\n');
    
    console.log('🎯 ผลกระทบต่อการวิเคราะห์:');
    console.log(`   - รายการที่ต้องตรวจสอบจริงๆ: ${1051 - countResult.noChangeCount} รายการ`);
    console.log(`   - รายการที่เป็น noise (bug): ${countResult.noChangeCount} รายการ\n`);

    await sql.close();
    console.log('✅ ตรวจสอบเสร็จสิ้น!\n');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

checkNoChangeRecords();
