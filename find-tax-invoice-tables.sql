-- ========================================
-- SQL Script สำหรับค้นหา Tables ที่เกี่ยวข้องกับใบกำกับภาษี
-- ========================================

-- 1. ค้นหาตารางที่มีชื่อเกี่ยวข้องกับ Invoice, Tax, VAT, Print
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE 
    TABLE_NAME LIKE '%Invoice%'
    OR TABLE_NAME LIKE '%Tax%'
    OR TABLE_NAME LIKE '%VAT%'
    OR TABLE_NAME LIKE '%Print%'
    OR TABLE_NAME LIKE '%Bill%'
    OR TABLE_NAME LIKE '%Receipt%'
    OR TABLE_NAME LIKE '%Sale%'
    OR TABLE_NAME LIKE '%Post%'
    OR TABLE_NAME LIKE '%Master%'
    OR TABLE_NAME LIKE '%Detail%'
    OR TABLE_NAME LIKE '%Change%'
    OR TABLE_NAME LIKE '%Edit%'
    OR TABLE_NAME LIKE '%Cancel%'
    OR TABLE_NAME LIKE '%Delete%'
    OR TABLE_NAME LIKE '%Void%'
ORDER BY TABLE_NAME;

-- ========================================

-- 2. ค้นหาคอลัมน์ที่มีคำว่า Tax, VAT, Print, Cancel, Edit ในชื่อ
SELECT DISTINCT
    TABLE_SCHEMA,
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE 
    COLUMN_NAME LIKE '%Tax%'
    OR COLUMN_NAME LIKE '%VAT%'
    OR COLUMN_NAME LIKE '%Print%'
    OR COLUMN_NAME LIKE '%Invoice%'
    OR COLUMN_NAME LIKE '%Cancel%'
    OR COLUMN_NAME LIKE '%Edit%'
    OR COLUMN_NAME LIKE '%Delete%'
    OR COLUMN_NAME LIKE '%Void%'
    OR COLUMN_NAME LIKE '%Modify%'
    OR COLUMN_NAME LIKE '%Change%'
ORDER BY TABLE_NAME, COLUMN_NAME;

-- ========================================

-- 3. แสดงตารางทั้งหมดในฐานข้อมูล
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- ========================================

-- 4. ดูโครงสร้างของตาราง MasterSalePost (หลัก)
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'MasterSalePost'
ORDER BY ORDINAL_POSITION;

-- ========================================

-- 5. ดูโครงสร้างของตาราง DetailSalePost (รายละเอียด)
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'DetailSalePost'
ORDER BY ORDINAL_POSITION;

-- ========================================

-- 6. ตรวจสอบ Sample Data จาก MasterSalePost
SELECT TOP 5 * 
FROM dbo.MasterSalePost
ORDER BY DateSalePost DESC;

-- ========================================

-- 7. ตรวจสอบ Sample Data จาก DetailSalePost
SELECT TOP 5 * 
FROM dbo.DetailSalePost
ORDER BY DateSave DESC;
