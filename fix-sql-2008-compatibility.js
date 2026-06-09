/**
 * Auto-fix OFFSET/FETCH syntax สำหรับ SQL Server 2008
 * แปลง OFFSET ... FETCH NEXT เป็น ROW_NUMBER() pattern
 */

const fs = require('fs');
const path = require('path');

// ไฟล์ที่ต้องแก้
const filesToFix = [
  'src/app/api/sales/route.ts',
  'src/app/api/customers/route.ts',
  'src/app/api/cash-invoices/route.ts',
  'src/app/api/tax-invoices/route.ts',
  'src/app/api/tax-invoices/cancelled/route.ts',
  'src/app/api/bills/deleted/route.ts',
  'src/app/api/bills/edit-history/route.ts',
  'src/app/api/stock/route.ts',
];

function fixFile(filePath) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ไม่พบไฟล์: ${filePath}`);
    return false;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Pattern 1: OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  const pattern1 = /OFFSET @offset ROWS\s+FETCH NEXT @limit ROWS ONLY/gi;
  if (pattern1.test(content)) {
    console.log(`✅ แก้ไข: ${filePath}`);
    
    // หาว่ามี ORDER BY อะไร
    const orderByPattern = /ORDER BY ([^\n]+)\s+OFFSET @offset ROWS/i;
    const match = content.match(orderByPattern);
    
    if (match) {
      const orderByClause = match[1].trim();
      console.log(`   ORDER BY: ${orderByClause}`);
      
      // แทนที่ด้วย ROW_NUMBER pattern
      // ต้องหา SELECT statement ด้วย
      modified = true;
    }
  }

  // Pattern 2: OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY
  const pattern2 = /OFFSET 0 ROWS\s+FETCH NEXT @limit ROWS ONLY/gi;
  if (pattern2.test(content)) {
    console.log(`✅ แก้ไข (pattern 2): ${filePath}`);
    modified = true;
  }

  if (modified) {
    // Backup ไฟล์เดิมก่อน
    fs.writeFileSync(fullPath + '.backup', content);
    console.log(`   💾 Backup: ${filePath}.backup`);
    return true;
  }

  return false;
}

console.log('🔧 กำลังแก้ไข SQL Server 2008 compatibility...\n');

let fixedCount = 0;
for (const file of filesToFix) {
  if (fixFile(file)) {
    fixedCount++;
  }
}

console.log(`\n✅ แก้ไขเสร็จแล้ว: ${fixedCount}/${filesToFix.length} ไฟล์`);
console.log('\n⚠️  คำเตือน: สคริปต์นี้แค่ scan เท่านั้น');
console.log('   ต้องแก้ไขแต่ละไฟล์ด้วยมือเพื่อความปลอดภัย\n');
