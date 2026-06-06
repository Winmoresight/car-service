/**
 * Detailed Analysis of ChangeEditPrint Logic
 * ช่วยวิเคราะห์ว่าการแก้ไขแต่ละรายการเกิดจากอะไร และมีความผิดปกติหรือไม่
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

async function analyzeEditLogic() {
  try {
    console.log('🔍 กำลังวิเคราะห์ Logic การแก้ไขบิล...\n');
    
    await sql.connect(config);

    // 1. วิเคราะห์ประเภทการแก้ไขทั้งหมด
    console.log('📊 === สรุปประเภทการแก้ไข ===\n');
    
    const summaryQuery = `
      SELECT 
        -- รวมทั้งหมด
        COUNT(*) as totalRecords,
        
        -- แก้ไขยอดเงินจริงๆ (มีผลต่อยอดรวม)
        SUM(CASE 
          WHEN (PayCashOld <> PayCashNew) OR (PayTransferOld <> PayTransferNew)
          THEN 1 ELSE 0 
        END) as actualAmountChanges,
        
        -- แก้ไขเฉพาะธนาคาร (ไม่กระทบยอดเงิน)
        SUM(CASE 
          WHEN (PayCashOld = PayCashNew) 
            AND (PayTransferOld = PayTransferNew) 
            AND (NameBankOld <> NameBankNew)
          THEN 1 ELSE 0 
        END) as bankOnlyChanges,
        
        -- ไม่มีการเปลี่ยนแปลงเลย (ผิดปกติ)
        SUM(CASE 
          WHEN (PayCashOld = PayCashNew) 
            AND (PayTransferOld = PayTransferNew) 
            AND (ISNULL(NameBankOld, '') = ISNULL(NameBankNew, ''))
          THEN 1 ELSE 0 
        END) as noChanges,
        
        -- แก้ไขเงินสด
        SUM(CASE WHEN PayCashOld <> PayCashNew THEN 1 ELSE 0 END) as cashChanges,
        
        -- แก้ไขเงินโอน
        SUM(CASE WHEN PayTransferOld <> PayTransferNew THEN 1 ELSE 0 END) as transferChanges,
        
        -- แก้ไขธนาคาร
        SUM(CASE WHEN NameBankOld <> NameBankNew THEN 1 ELSE 0 END) as bankChanges,
        
        -- ผลรวมส่วนต่างเงินทั้งหมด (Absolute)
        SUM(ABS((PayCashNew + PayTransferNew) - (PayCashOld + PayTransferOld))) as totalAbsoluteDifference,
        
        -- ผลรวมส่วนต่างเงินสุทธิ (Net - บวก/ลบตามทิศทาง)
        SUM((PayCashNew + PayTransferNew) - (PayCashOld + PayTransferOld)) as totalNetDifference
        
      FROM dbo.ChangeEditPrint
    `;
    
    const summaryResult = await sql.query(summaryQuery);
    const summary = summaryResult.recordset[0];
    
    console.log(`📝 รายการทั้งหมด: ${summary.totalRecords.toLocaleString()} รายการ\n`);
    
    console.log(`💰 แก้ไขจำนวนเงินจริง: ${summary.actualAmountChanges.toLocaleString()} รายการ (${(summary.actualAmountChanges/summary.totalRecords*100).toFixed(2)}%)`);
    console.log(`   ├─ แก้ไขเงินสด: ${summary.cashChanges.toLocaleString()} รายการ`);
    console.log(`   └─ แก้ไขเงินโอน: ${summary.transferChanges.toLocaleString()} รายการ\n`);
    
    console.log(`🏦 แก้ไขเฉพาะธนาคาร: ${summary.bankOnlyChanges.toLocaleString()} รายการ (${(summary.bankOnlyChanges/summary.totalRecords*100).toFixed(2)}%)`);
    console.log(`   └─ ไม่กระทบยอดเงิน (แค่เปลี่ยนชื่อธนาคาร)\n`);
    
    console.log(`❓ ไม่มีการเปลี่ยนแปลงเลย: ${summary.noChanges.toLocaleString()} รายการ (${(summary.noChanges/summary.totalRecords*100).toFixed(2)}%)`);
    console.log(`   └─ สงสัย: ทำไมถึงมีรายการแก้ไข แต่ไม่ได้เปลี่ยนอะไรเลย?\n`);
    
    console.log(`💵 ผลรวมส่วนต่างเงิน (Absolute): ฿${summary.totalAbsoluteDifference.toLocaleString('th-TH', {minimumFractionDigits: 2})}`);
    console.log(`💵 ผลรวมส่วนต่างเงิน (Net): ฿${summary.totalNetDifference.toLocaleString('th-TH', {minimumFractionDigits: 2, signDisplay: 'always'})}\n`);

    // 2. วิเคราะห์ตามผู้แก้ไข
    console.log('\n👤 === การแก้ไขตามผู้ใช้งาน ===\n');
    
    const userQuery = `
      SELECT 
        NameUser,
        COUNT(*) as totalEdits,
        SUM(CASE WHEN (PayCashOld <> PayCashNew) OR (PayTransferOld <> PayTransferNew) THEN 1 ELSE 0 END) as amountChanges,
        SUM(CASE WHEN (PayCashOld = PayCashNew) AND (PayTransferOld = PayTransferNew) AND (NameBankOld <> NameBankNew) THEN 1 ELSE 0 END) as bankOnlyChanges,
        SUM(CASE WHEN (PayCashOld = PayCashNew) AND (PayTransferOld = PayTransferNew) AND (ISNULL(NameBankOld, '') = ISNULL(NameBankNew, '')) THEN 1 ELSE 0 END) as noChanges,
        SUM(ABS((PayCashNew + PayTransferNew) - (PayCashOld + PayTransferOld))) as totalDifference,
        MAX(ABS((PayCashNew + PayTransferNew) - (PayCashOld + PayTransferOld))) as maxDifference
      FROM dbo.ChangeEditPrint
      GROUP BY NameUser
      ORDER BY totalEdits DESC
    `;
    
    const userResult = await sql.query(userQuery);
    
    console.log('ผู้ใช้งาน'.padEnd(20) + 'รวมแก้ไข'.padEnd(12) + 'แก้ไขยอด'.padEnd(12) + 'แก้ไขธนค.'.padEnd(12) + 'ไม่เปลี่ยน'.padEnd(12) + 'ผลรวมส่วนต่าง');
    console.log('─'.repeat(90));
    
    for (const row of userResult.recordset) {
      console.log(
        row.NameUser.padEnd(20) + 
        row.totalEdits.toString().padEnd(12) + 
        row.amountChanges.toString().padEnd(12) + 
        row.bankOnlyChanges.toString().padEnd(12) + 
        row.noChanges.toString().padEnd(12) + 
        `฿${row.totalDifference.toLocaleString('th-TH')}`
      );
    }

    // 3. ตัวอย่างรายการที่น่าสงสัย
    console.log('\n\n🚨 === รายการที่น่าสงสัย ===\n');
    
    const suspiciousQuery = `
      SELECT TOP 20
        NumberPrint,
        DateEditPrint,
        Times,
        PayCashOld,
        PayCashNew,
        PayTransferOld,
        PayTransferNew,
        NameBankOld,
        NameBankNew,
        NameUser,
        (PayCashNew + PayTransferNew) - (PayCashOld + PayTransferOld) as difference,
        CASE 
          WHEN (PayCashOld <> PayCashNew) OR (PayTransferOld <> PayTransferNew) THEN 'แก้ไขยอดเงิน'
          WHEN (PayCashOld = PayCashNew) AND (PayTransferOld = PayTransferNew) AND (NameBankOld <> NameBankNew) THEN 'แก้ไขธนาคาร'
          ELSE 'ไม่เปลี่ยนอะไร'
        END as editType
      FROM dbo.ChangeEditPrint
      WHERE 
        -- รายการที่มีส่วนต่างมาก
        ABS((PayCashNew + PayTransferNew) - (PayCashOld + PayTransferOld)) > 10000
      ORDER BY ABS((PayCashNew + PayTransferNew) - (PayCashOld + PayTransferOld)) DESC
    `;
    
    const suspiciousResult = await sql.query(suspiciousQuery);
    
    if (suspiciousResult.recordset.length > 0) {
      console.log('🔴 รายการที่มีส่วนต่างเงิน > 10,000 บาท:\n');
      
      for (const row of suspiciousResult.recordset) {
        console.log(`📋 บิล: ${row.NumberPrint}`);
        console.log(`   วันที่: ${new Date(row.DateEditPrint).toLocaleDateString('th-TH')} ${row.Times}`);
        console.log(`   ผู้แก้ไข: ${row.NameUser}`);
        console.log(`   เงินสด: ฿${row.PayCashOld.toLocaleString()} → ฿${row.PayCashNew.toLocaleString()}`);
        console.log(`   เงินโอน: ฿${row.PayTransferOld.toLocaleString()} → ฿${row.PayTransferNew.toLocaleString()}`);
        console.log(`   ธนาคาร: "${row.NameBankOld}" → "${row.NameBankNew}"`);
        console.log(`   ส่วนต่าง: ฿${row.difference.toLocaleString('th-TH', {signDisplay: 'always'})}`);
        console.log(`   ประเภท: ${row.editType}\n`);
      }
    } else {
      console.log('✅ ไม่พบรายการที่มีส่วนต่าง > 10,000 บาท\n');
    }

    // 4. รายการที่ "ไม่เปลี่ยนอะไรเลย" แต่มีในระบบ
    console.log('\n❓ === รายการที่ไม่มีการเปลี่ยนแปลงเลย ===\n');
    
    const noChangeQuery = `
      SELECT TOP 10
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
    
    const noChangeResult = await sql.query(noChangeQuery);
    
    if (noChangeResult.recordset.length > 0) {
      console.log('⚠️  ตัวอย่างรายการที่บันทึกแต่ไม่มีการเปลี่ยนแปลง:\n');
      
      for (const row of noChangeResult.recordset) {
        console.log(`📋 บิล: ${row.NumberPrint}`);
        console.log(`   วันที่: ${new Date(row.DateEditPrint).toLocaleDateString('th-TH')} ${row.Times}`);
        console.log(`   ผู้แก้ไข: ${row.NameUser}`);
        console.log(`   เงินสด: ฿${row.PayCashOld.toLocaleString()} → ฿${row.PayCashNew.toLocaleString()} (เหมือนเดิม)`);
        console.log(`   เงินโอน: ฿${row.PayTransferOld.toLocaleString()} → ฿${row.PayTransferNew.toLocaleString()} (เหมือนเดิม)`);
        console.log(`   ธนาคาร: "${row.NameBankOld}" → "${row.NameBankNew}" (เหมือนเดิม)\n`);
      }
    } else {
      console.log('✅ ไม่พบรายการที่ไม่มีการเปลี่ยนแปลง\n');
    }

    // 5. สรุปและคำแนะนำ
    console.log('\n\n💡 === สรุปและคำแนะนำ ===\n');
    
    console.log('🔍 การวิเคราะห์:');
    console.log(`   1. จาก ${summary.totalRecords} รายการ มีเพียง ${summary.actualAmountChanges} รายการ (${(summary.actualAmountChanges/summary.totalRecords*100).toFixed(2)}%) ที่เปลี่ยนแปลงยอดเงินจริง`);
    console.log(`   2. มี ${summary.bankOnlyChanges} รายการ (${(summary.bankOnlyChanges/summary.totalRecords*100).toFixed(2)}%) เป็นการแก้ไขเฉพาะชื่อธนาคาร (ไม่กระทบยอดเงิน)`);
    console.log(`   3. มี ${summary.noChanges} รายการ (${(summary.noChanges/summary.totalRecords*100).toFixed(2)}%) ที่ไม่มีการเปลี่ยนแปลงเลย (น่าสงสัย)\n`);
    
    console.log('🚨 ความเสี่ยง:');
    console.log('   1. ระบบบันทึกทุกครั้งที่มีการกด "แก้ไข" แม้ไม่ได้เปลี่ยนข้อมูล');
    console.log('   2. อาจมีการแก้ไขหลายครั้งบนบิลเดียวกัน');
    console.log('   3. ต้องตรวจสอบว่าการแก้ไขยอดเงินเกิดจากความจำเป็นหรือเจตนาไม่ดี\n');
    
    console.log('✅ คำแนะนำ:');
    console.log('   1. เพิ่ม Filter ให้แสดงเฉพาะ "รายการที่เปลี่ยนยอดเงินจริง"');
    console.log('   2. เพิ่ม Alert สำหรับการแก้ไขที่มีส่วนต่าง > threshold (เช่น > 5,000 บาท)');
    console.log('   3. เพิ่ม Log เหตุผลการแก้ไข (ให้พนักงานระบุว่าทำไมถึงแก้ไข)');
    console.log('   4. จำกัดสิทธิ์การแก้ไข (เฉพาะ Admin หรือผู้จัดการ)');
    console.log('   5. แสดงประวัติการแก้ไขของบิลแต่ละใบ (มีการแก้ไขกี่ครั้ง)\n');

    await sql.close();
    console.log('\n✅ วิเคราะห์เสร็จสิ้น!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    process.exit(1);
  }
}

analyzeEditLogic();
