/**
 * Test script to verify Sales API
 * Run: node test-sales-api.js
 */

async function testSalesAPI() {
  const baseUrl = "http://localhost:3000";
  
  console.log("🧪 Testing Sales API...\n");
  
  try {
    console.log("📡 GET /api/sales?limit=5&offset=0");
    const response = await fetch(`${baseUrl}/api/sales?limit=5&offset=0`);
    
    console.log("Status:", response.status);
    console.log("Status Text:", response.statusText);
    
    const data = await response.json();
    
    console.log("\n📦 Response:");
    console.log(JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log("\n✅ API Test PASSED");
      console.log(`Found ${data.data.total} total sales`);
      console.log(`Returned ${data.data.sales.length} sales`);
    } else {
      console.log("\n❌ API Test FAILED");
      console.log("Error:", data.error);
    }
    
  } catch (error) {
    console.error("\n❌ Test Error:", error.message);
  }
}

testSalesAPI();
