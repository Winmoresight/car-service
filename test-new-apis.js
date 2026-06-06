/**
 * Test Script สำหรับ API ใหม่ทั้งหมด
 * รัน: node test-new-apis.js
 */

const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

async function testAPI(name, url, description) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${colors.cyan}🧪 Testing: ${name}${colors.reset}`);
  console.log(`${colors.blue}📝 ${description}${colors.reset}`);
  console.log(`${colors.yellow}🔗 URL: ${url}${colors.reset}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url);
    const endTime = Date.now();
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`${colors.green}✅ SUCCESS${colors.reset} (${endTime - startTime}ms)`);
      console.log(`\n📊 Response Data:`);
      console.log(JSON.stringify(data, null, 2));
      return true;
    } else {
      console.log(`${colors.red}❌ FAILED${colors.reset}`);
      console.log(`Status: ${response.status}`);
      console.log(`Error: ${data.error || 'Unknown error'}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ ERROR${colors.reset}`);
    console.log(`Error: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║        🧪 Testing New Tax Invoice & Reports APIs 🧪          ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const tests = [
    // 1. Tax Invoices - ทั้งหมด
    {
      name: 'Tax Invoices - All',
      url: `${BASE_URL}/api/tax-invoices?limit=5`,
      description: 'ดึงรายการใบกำกับภาษีทั้งหมด 5 รายการแรก'
    },
    
    // 2. Tax Invoices - กรองตาม Status
    {
      name: 'Tax Invoices - Filter by Status',
      url: `${BASE_URL}/api/tax-invoices?status=ค้างชำระ&limit=3`,
      description: 'ดึงรายการใบกำกับภาษีที่ค้างชำระ'
    },

    // 3. Cancelled Tax Invoices
    {
      name: 'Cancelled Tax Invoices',
      url: `${BASE_URL}/api/tax-invoices/cancelled?limit=10`,
      description: 'ดึงรายการใบกำกับภาษีที่ถูกยกเลิก'
    },

    // 4. Bill Edit History
    {
      name: 'Bill Edit History',
      url: `${BASE_URL}/api/bills/edit-history?limit=10`,
      description: 'ดึงประวัติการแก้ไขบิล 10 รายการล่าสุด'
    },

    // 5. Bill Edit History - ช่วงวันที่
    {
      name: 'Bill Edit History - Date Range',
      url: `${BASE_URL}/api/bills/edit-history?startDate=2026-06-01&endDate=2026-06-30&limit=5`,
      description: 'ดึงประวัติการแก้ไขบิลเดือนมิถุนายน 2026'
    },

    // 6. Deleted Bills
    {
      name: 'Deleted Bills',
      url: `${BASE_URL}/api/bills/deleted?days=30&limit=10`,
      description: 'ดึงรายการบิลที่ถูกลบ 30 วันล่าสุด'
    },

    // 7. Top Selling Products - เดือนปัจจุบัน
    {
      name: 'Top Selling Products - Current Month',
      url: `${BASE_URL}/api/products/top-selling?month=${new Date().getMonth() + 1}&year=${new Date().getFullYear()}&limit=10`,
      description: 'ดึงสินค้าขายดี Top 10 เดือนปัจจุบัน'
    },

    // 8. Top Selling Products - มิถุนายน 2026
    {
      name: 'Top Selling Products - June 2026',
      url: `${BASE_URL}/api/products/top-selling?month=6&year=2026&limit=10`,
      description: 'ดึงสินค้าขายดี Top 10 เดือนมิถุนายน 2026'
    },

    // 9. Tax Invoices with Search
    {
      name: 'Tax Invoices - Search',
      url: `${BASE_URL}/api/tax-invoices?search=โรงพยาบาล&limit=5`,
      description: 'ค้นหาใบกำกับภาษีด้วยคำว่า "โรงพยาบาล"'
    },

    // 10. Bill Edit History - Search
    {
      name: 'Bill Edit History - Search',
      url: `${BASE_URL}/api/bills/edit-history?search=PSC626&limit=5`,
      description: 'ค้นหาประวัติการแก้ไขด้วยเลขที่บิล PSC626'
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await testAPI(test.name, test.url, test.description);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    
    // รอหน่อยก่อนทดสอบต่อไป
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║                     📊 Test Summary 📊                        ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);
  
  console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
  console.log(`📈 Total: ${tests.length}`);
  console.log(`📊 Success Rate: ${((passed / tests.length) * 100).toFixed(2)}%`);
  
  console.log(`\n${'='.repeat(80)}\n`);
}

// Run tests
console.log(`${colors.yellow}⏳ Starting API tests...${colors.reset}\n`);
console.log(`${colors.yellow}📌 Make sure the Next.js server is running on ${BASE_URL}${colors.reset}\n`);

runAllTests().then(() => {
  console.log(`${colors.green}✨ All tests completed!${colors.reset}\n`);
}).catch(error => {
  console.error(`${colors.red}❌ Test suite error:${colors.reset}`, error);
  process.exit(1);
});
