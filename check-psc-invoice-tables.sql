-- ========================================
-- ค้นหาตารางที่เกี่ยวข้องกับใบกำกับภาษีเงินสดหน้าร้าน (รหัสขึ้นต้นด้วย psc)
-- ========================================

-- 1. ตรวจสอบโครงสร้างตาราง MasterPrintCashVate
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'MasterPrintCashVate'
ORDER BY ORDINAL_POSITION;

-- ========================================

-- 2. ตรวจสอบโครงสร้างตาราง DetailPrintCashVate
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'DetailPrintCashVate'
ORDER BY ORDINAL_POSITION;

-- ========================================

-- 3. ค้นหาคอลัมน์ที่อาจเก็บรหัสบิล/เลขที่ใบกำกับ ในตาราง MasterPrintCashVate
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'MasterPrintCashVate'
    AND (
        COLUMN_NAME LIKE '%No%'
        OR COLUMN_NAME LIKE '%ID%'
        OR COLUMN_NAME LIKE '%Code%'
        OR COLUMN_NAME LIKE '%Number%'
        OR COLUMN_NAME LIKE '%Bill%'
        OR COLUMN_NAME LIKE '%Invoice%'
        OR COLUMN_NAME LIKE '%Print%'
        OR COLUMN_NAME LIKE '%Cash%'
    )
ORDER BY ORDINAL_POSITION;

-- ========================================

-- 4. ดูข้อมูลตัวอย่าง 10 รายการล่าสุด จาก MasterPrintCashVate
SELECT TOP 10 * 
FROM dbo.MasterPrintCashVate
ORDER BY 1 DESC;

-- ========================================

-- 5. ดูข้อมูลตัวอย่าง 10 รายการล่าสุด จาก DetailPrintCashVate
SELECT TOP 10 * 
FROM dbo.DetailPrintCashVate
ORDER BY 1 DESC;

-- ========================================

-- 6. ค้นหาตารางอื่นๆ ที่อาจเกี่ยวข้องกับ Cash Invoice
SELECT 
    TABLE_SCHEMA,
    TABLE_NAME,
    TABLE_TYPE
FROM INFORMATION_SCHEMA.TABLES
WHERE 
    (TABLE_NAME LIKE '%Cash%' OR TABLE_NAME LIKE '%PSC%')
    AND TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

-- ========================================

-- 7. หลังจากรันคำสั่งข้างบนแล้ว ถ้ารู้ว่าคอลัมน์ไหนเก็บรหัสบิล
-- ให้แทนที่ [ColumnName] ด้วยชื่อคอลัมน์จริง และรันคำสั่งนี้
-- เพื่อค้นหารหัสบิลที่ขึ้นต้นด้วย 'psc'

-- ตัวอย่าง: ถ้าคอลัมน์ชื่อ InvoiceNo
-- SELECT TOP 20 * 
-- FROM dbo.MasterPrintCashVate
-- WHERE InvoiceNo LIKE 'psc%'
-- ORDER BY InvoiceNo DESC;

-- ========================================
