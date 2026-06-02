/**
 * SQL Server Connection Tester - SQL Authentication
 * ทดสอบด้วย SQL Authentication และ options ต่าง ๆ
 */

const sql = require('mssql');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function testConnection(server, database, user, password) {
  const configs = [
    {
      name: "SQL Auth + TCP/IP + Port",
      config: {
        server: server,
        database: database,
        user: user,
        password: password,
        port: 1433,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
        connectionTimeout: 5000,
      }
    },
    {
      name: "SQL Auth + Named Pipes",
      config: {
        server: server,
        database: database,
        user: user,
        password: password,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
          instanceName: server.includes('\\') ? server.split('\\')[1] : undefined,
        },
        connectionTimeout: 5000,
      }
    },
    {
      name: "SQL Auth + localhost",
      config: {
        server: 'localhost',
        database: database,
        user: user,
        password: password,
        port: 1433,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
        connectionTimeout: 5000,
      }
    },
  ];

  console.log('\n' + '='.repeat(60));
  console.log('🔧 กำลังทดสอบการเชื่อมต่อ...');
  console.log('='.repeat(60));

  for (const configObj of configs) {
    console.log(`\n🔍 ${configObj.name}`);
    console.log(`   Server: ${configObj.config.server}`);
    console.log(`   Database: ${configObj.config.database}`);
    console.log(`   User: ${configObj.config.user}`);
    
    try {
      const pool = await sql.connect(configObj.config);
      console.log(`   ✅ เชื่อมต่อสำเร็จ!`);
      
      // ทดสอบ query
      const result = await pool.request().query('SELECT COUNT(*) as count FROM dbo.MasterSalePost');
      console.log(`   ✅ Query สำเร็จ! พบข้อมูล ${result.recordset[0].count} บิล`);
      
      await pool.close();
      
      console.log('\n🎉 เจอแล้ว! ใช้ config นี้ใน .env.local:');
      console.log('─'.repeat(60));
      console.log(`DATABASE_SERVER=${configObj.config.server}`);
      console.log(`DATABASE_NAME=${configObj.config.database}`);
      console.log(`DATABASE_USER=${configObj.config.user}`);
      console.log(`DATABASE_PASSWORD=${password}`);
      if (configObj.config.port) {
        console.log(`DATABASE_PORT=${configObj.config.port}`);
      }
      console.log('DATABASE_ENCRYPT=false');
      console.log('DATABASE_TRUST_SERVER_CERTIFICATE=true');
      console.log('─'.repeat(60));
      
      return true;
    } catch (err) {
      console.log(`   ❌ ล้มเหลว: ${err.message}`);
    }
  }
  
  return false;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 SQL Server Connection Tester (SQL Authentication)');
  console.log('='.repeat(60));
  console.log('');
  
  const server = await question('Server name (เช่น localhost\\SQLEXPRESS): ');
  const database = await question('Database name (default: BaseSeviceCar): ') || 'BaseSeviceCar';
  const user = await question('Username (เช่น sa): ');
  const password = await question('Password: ');
  
  const success = await testConnection(server, database, user, password);
  
  if (!success) {
    console.log('\n❌ ไม่สามารถเชื่อมต่อได้ทุก config');
    console.log('\n📋 วิธีแก้ปัญหา:');
    console.log('');
    console.log('1️⃣ ตรวจสอบ SQL Server Authentication:');
    console.log('   - เปิด SQL Server Management Studio');
    console.log('   - Right-click Server → Properties → Security');
    console.log('   - เลือก "SQL Server and Windows Authentication mode"');
    console.log('   - Restart SQL Server service');
    console.log('');
    console.log('2️⃣ ตรวจสอบ User Login:');
    console.log('   - Security → Logins → Right-click sa → Properties');
    console.log('   - ตั้งรหัสผ่านใหม่');
    console.log('   - Uncheck "Enforce password policy" (ถ้าต้องการ)');
    console.log('   - Status tab → Login: Enabled');
    console.log('');
    console.log('3️⃣ ตรวจสอบ SQL Server service:');
    console.log('   - เปิด Services (services.msc)');
    console.log('   - หา "SQL Server (SQLEXPRESS)"');
    console.log('   - ต้องเป็น "Running" และ "Automatic"');
    console.log('');
    console.log('4️⃣ Enable TCP/IP:');
    console.log('   - เปิด SQL Server Configuration Manager');
    console.log('   - SQL Server Network Configuration → Protocols for SQLEXPRESS');
    console.log('   - TCP/IP → Enable');
    console.log('   - Restart SQL Server service');
  }
  
  rl.close();
}

main().catch(err => {
  console.error('❌ เกิดข้อผิดพลาด:', err);
  rl.close();
  process.exit(1);
});
