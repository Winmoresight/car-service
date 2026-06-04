/**
 * Script to find employee-related tables in the database
 */

const sql = require('mssql');
const fs = require('fs');
const path = require('path');

// อ่านค่าจาก .env.local
require('dotenv').config({ path: '.env.local' });

// Configuration (ใช้ชื่อตัวแปรตาม .env.local)
const config = {
  server: process.env.DATABASE_SERVER || 'localhost',
  database: process.env.DATABASE_NAME || 'BaseSeviceCar',
  options: {
    encrypt: process.env.DATABASE_ENCRYPT === 'true',
    trustServerCertificate: process.env.DATABASE_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
};

// Add authentication
if (process.env.DATABASE_USER && process.env.DATABASE_PASSWORD) {
  config.user = process.env.DATABASE_USER;
  config.password = process.env.DATABASE_PASSWORD;
  if (process.env.DATABASE_PORT) {
    config.port = parseInt(process.env.DATABASE_PORT);
  }
  console.log('🔐 Using SQL Server Authentication');
} else {
  config.authentication = {
    type: 'ntlm',
    options: {
      domain: '',
      userName: '',
      password: '',
    },
  };
  console.log('🔐 Using Windows Authentication');
}

async function runQuery() {
  let pool = null;
  
  try {
    console.log('📊 กำลังเชื่อมต่อฐานข้อมูล...');
    pool = await sql.connect(config);
    console.log('✅ เชื่อมต่อสำเร็จ\n');

    console.log('='.repeat(80));
    console.log('🔍 ค้นหาตารางที่เกี่ยวข้องกับพนักงาน');
    console.log('='.repeat(80) + '\n');

    // Query 1: ค้นหาตารางที่มีคำว่า Employee, Staff, Worker ฯลฯ
    console.log('\n📋 Query 1: ค้นหาตารางที่มีชื่อเกี่ยวกับพนักงาน...\n');
    try {
      const result1 = await pool.request().query(`
        SELECT 
            TABLE_SCHEMA,
            TABLE_NAME,
            TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE 
            TABLE_NAME LIKE '%Employee%'
            OR TABLE_NAME LIKE '%Staff%'
            OR TABLE_NAME LIKE '%Worker%'
            OR TABLE_NAME LIKE '%User%'
            OR TABLE_NAME LIKE '%Person%'
            OR TABLE_NAME LIKE '%Member%'
        ORDER BY TABLE_NAME
      `);
      
      if (result1.recordset && result1.recordset.length > 0) {
        console.log(`✅ พบตาราง ${result1.recordset.length} ตาราง:`);
        console.table(result1.recordset);
      } else {
        console.log('⚠️ ไม่พบตารางที่มีชื่อเกี่ยวกับพนักงาน');
      }
    } catch (err) {
      console.error('❌ เกิดข้อผิดพลาด:', err.message);
    }

    // Query 2: ค้นหาคอลัมน์ที่มีคำว่า Employee, Staff, Worker ฯลฯ
    console.log('\n📋 Query 2: ค้นหาคอลัมน์ที่มีชื่อเกี่ยวกับพนักงาน...\n');
    try {
      const result2 = await pool.request().query(`
        SELECT DISTINCT
            TABLE_SCHEMA,
            TABLE_NAME,
            COLUMN_NAME,
            DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE 
            COLUMN_NAME LIKE '%Employee%'
            OR COLUMN_NAME LIKE '%Staff%'
            OR COLUMN_NAME LIKE '%Worker%'
            OR COLUMN_NAME LIKE '%User%'
            OR COLUMN_NAME LIKE '%Person%'
        ORDER BY TABLE_NAME, COLUMN_NAME
      `);
      
      if (result2.recordset && result2.recordset.length > 0) {
        console.log(`✅ พบคอลัมน์ ${result2.recordset.length} คอลัมน์:`);
        console.table(result2.recordset);
      } else {
        console.log('⚠️ ไม่พบคอลัมน์ที่มีชื่อเกี่ยวกับพนักงาน');
      }
    } catch (err) {
      console.error('❌ เกิดข้อผิดพลาด:', err.message);
    }

    // Query 3: แสดงตารางทั้งหมด
    console.log('\n📋 Query 3: แสดงตารางทั้งหมดในฐานข้อมูล...\n');
    try {
      const result3 = await pool.request().query(`
        SELECT 
            TABLE_SCHEMA,
            TABLE_NAME,
            TABLE_TYPE
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `);
      
      if (result3.recordset && result3.recordset.length > 0) {
        console.log(`✅ พบตาราง ${result3.recordset.length} ตาราง:`);
        console.table(result3.recordset);
      } else {
        console.log('⚠️ ไม่พบตาราง');
      }
    } catch (err) {
      console.error('❌ เกิดข้อผิดพลาด:', err.message);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ เสร็จสิ้น');
    console.log('='.repeat(80));

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

// Run the script
runQuery();
