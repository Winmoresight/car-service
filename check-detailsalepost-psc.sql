-- ========================================
-- ตรวจสอบตาราง DetailSalePost สำหรับใบกำกับภาษีเงินสดหน้าร้าน (รหัส psc)
-- ========================================

-- 1. ดูโครงสร้างตาราง DetailSalePost ทั้งหมด
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    ORDINAL_POSITION
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'DetailSalePost'
ORDER BY ORDINAL_POSITION;

-- ========================================

-- 2. นับจำนวนข้อมูลทั้งหมด
SELECT COUNT(*) as TotalRecords
FROM dbo.DetailSalePost;

-- ========================================

-- 3. ดูข้อมูลตัวอย่าง 20 รายการล่าสุด
SELECT TOP 20 * 
FROM dbo.DetailSalePost
ORDER BY DateSave DESC;

-- ========================================

-- 4. ค้นหาคอลัมน์ที่อาจเก็บรหัสบิล (InvoiceNo, BillNo, etc.)
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'DetailSalePost'
    AND (
        COLUMN_NAME LIKE '%No%'
        OR COLUMN_NAME LIKE '%ID%'
        OR COLUMN_NAME LIKE '%Code%'
        OR COLUMN_NAME LIKE '%Number%'
        OR COLUMN_NAME LIKE '%Bill%'
        OR COLUMN_NAME LIKE '%Invoice%'
        OR COLUMN_NAME LIKE '%Print%'
        OR COLUMN_NAME LIKE '%Post%'
        OR COLUMN_NAME LIKE '%Cash%'
        OR COLUMN_NAME LIKE '%PSC%'
    )
ORDER BY ORDINAL_POSITION;

-- ========================================

-- 5. ลองค้นหาข้อมูลที่มี "psc" ในทุกคอลัมน์ที่เป็น string
-- (รันทีละคอลัมน์ตามที่เห็นจากผลลัพธ์ข้อ 1)

-- ตัวอย่าง: ถ้ามีคอลัมน์ชื่อ InvoiceNo
-- SELECT TOP 50 *
-- FROM dbo.DetailSalePost
-- WHERE InvoiceNo LIKE '%psc%'
-- ORDER BY DateSave DESC;

-- ตัวอย่าง: ถ้ามีคอลัมน์ชื่อ BillNo
-- SELECT TOP 50 *
-- FROM dbo.DetailSalePost
-- WHERE BillNo LIKE '%psc%'
-- ORDER BY DateSave DESC;

-- ========================================

-- 6. ตรวจสอบรูปแบบข้อมูลในคอลัมน์ที่น่าสนใจ
-- (แทนที่ [ColumnName] ด้วยชื่อคอลัมน์ที่เก็บรหัสบิล)

-- SELECT TOP 100
--     [ColumnName],
--     COUNT(*) as Count
-- FROM dbo.DetailSalePost
-- GROUP BY [ColumnName]
-- ORDER BY [ColumnName] DESC;

-- ========================================

-- 7. ดูความสัมพันธ์กับ MasterSalePost
SELECT TOP 20
    m.*,
    d.*
FROM dbo.MasterSalePost m
INNER JOIN dbo.DetailSalePost d ON m.InvoiceNo = d.InvoiceNo
ORDER BY m.DateSalePost DESC;

-- ========================================

-- 8. ค้นหารหัสบิลที่ขึ้นต้นด้วย "psc" แบบเจาะจง
-- (รันหลังจากรู้ว่าคอลัมน์ไหนเก็บรหัสบิล)

-- ถ้าเก็บที่ InvoiceNo:
SELECT TOP 50 *
FROM dbo.DetailSalePost
WHERE InvoiceNo LIKE 'psc%'
ORDER BY DateSave DESC;

-- ถ้าเก็บที่ InvoiceNo แต่ต้องการดูทั้ง master และ detail:
SELECT TOP 50
    m.InvoiceNo,
    m.DateSalePost,
    m.TotalAmount,
    m.Vat,
    m.NetAmount,
    d.*
FROM dbo.MasterSalePost m
INNER JOIN dbo.DetailSalePost d ON m.InvoiceNo = d.InvoiceNo
WHERE m.InvoiceNo LIKE 'psc%'
ORDER BY m.DateSalePost DESC;

-- ========================================

-- 9. วิเคราะห์รูปแบบของรหัสบิลทั้งหมด (ดูว่ามีกี่แบบ)
SELECT 
    LEFT(InvoiceNo, 3) as Prefix,
    COUNT(*) as Count,
    MIN(DateSave) as FirstDate,
    MAX(DateSave) as LastDate
FROM dbo.DetailSalePost
GROUP BY LEFT(InvoiceNo, 3)
ORDER BY Count DESC;

-- ========================================

-- 10. เช็คว่ามี "psc" ในข้อมูลไหม
SELECT COUNT(*) as PSC_Count
FROM dbo.DetailSalePost
WHERE InvoiceNo LIKE 'psc%';

-- ========================================
