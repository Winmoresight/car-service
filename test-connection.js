/**
 * SQL Server Connection Tester
 * ไฟล์นี้ช่วยทดสอบการเชื่อมต่อ SQL Server
 */

const sql = require("mssql");

// ลองหลายแบบ config
const configs = [
  {
    name: "Windows Auth - localhost\\SQLEXPRESS",
    config: {
      server: "localhost\\SQLEXPRESS",
      database: "BaseSeviceCar",
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
      connectionTimeout: 5000,
    },
  },
  {
    name: "Windows Auth - localhost",
    config: {
      server: "localhost",
      database: "BaseSeviceCar",
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
      connectionTimeout: 5000,
    },
  },
  {
    name: "Windows Auth - .\\SQLEXPRESS",
    config: {
      server: ".\\SQLEXPRESS",
      database: "BaseSeviceCar",
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
      connectionTimeout: 5000,
    },
  },
  {
    name: "Windows Auth - (localdb)\\MSSQLLocalDB",
    config: {
      server: "(localdb)\\MSSQLLocalDB",
      database: "BaseSeviceCar",
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
      },
      connectionTimeout: 5000,
    },
  },
];

async function testConnection(configObj) {
  console.log(`\n🔍 กำลังทดสอบ: ${configObj.name}`);
  console.log(`   Server: ${configObj.config.server}`);
  console.log(`   Database: ${configObj.config.database}`);

  try {
    const pool = await sql.connect(configObj.config);
    console.log(`   ✅ เชื่อมต่อสำเร็จ!`);

    // ทดสอบ query
    const result = await pool
      .request()
      .query("SELECT COUNT(*) as count FROM dbo.MasterSalePost");
    console.log(`   ✅ Query สำเร็จ! พบข้อมูล ${result.recordset[0].count} บิล`);

    await pool.close();
    return true;
  } catch (err) {
    console.log(`   ❌ ล้มเหลว: ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("🔧 SQL Server Connection Tester");
  console.log("=".repeat(60));

  let successCount = 0;

  for (const configObj of configs) {
    const success = await testConnection(configObj);
    if (success) {
      successCount++;
      console.log("\n🎉 พบ config ที่ใช้ได้! คัดลอกไปใช้ใน .env.local:");
      console.log("─".repeat(60));
      console.log(`DATABASE_SERVER=${configObj.config.server}`);
      console.log(`DATABASE_NAME=${configObj.config.database}`);
      console.log("# DATABASE_USER= (comment ออกสำหรับ Windows Auth)");
      console.log("# DATABASE_PASSWORD= (comment ออกสำหรับ Windows Auth)");
      console.log("DATABASE_PORT=1433");
      console.log("DATABASE_ENCRYPT=false");
      console.log("DATABASE_TRUST_SERVER_CERTIFICATE=true");
      console.log("─".repeat(60));
      break; // หยุดเมื่อเจอตัวแรกที่ใช้ได้
    }
  }

  if (successCount === 0) {
    console.log("\n❌ ไม่สามารถเชื่อมต่อได้ทุก config");
    console.log("\n📋 กรุณาตรวจสอบ:");
    console.log("1. SQL Server กำลังรันอยู่หรือไม่?");
    console.log("   - เปิด Services (services.msc)");
    console.log('   - หา "SQL Server (SQLEXPRESS)" ต้องเป็น "Running"');
    console.log("");
    console.log("2. TCP/IP enabled หรือไม่?");
    console.log("   - เปิด SQL Server Configuration Manager");
    console.log(
      "   - SQL Server Network Configuration → Protocols for SQLEXPRESS",
    );
    console.log('   - TCP/IP ต้องเป็น "Enabled"');
    console.log("");
    console.log("3. ชื่อ instance ถูกต้องหรือไม่?");
    console.log("   - เปิด SQL Server Management Studio");
    console.log("   - ดู Server name ที่ใช้งานจริง");
  }

  console.log("\n" + "=".repeat(60));
}

runTests().catch((err) => {
  console.error("❌ เกิดข้อผิดพลาด:", err);
  process.exit(1);
});
