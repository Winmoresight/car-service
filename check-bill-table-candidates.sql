-- ========================================
-- SQL Script สำหรับพิสูจน์ตารางที่น่าจะเกี่ยวข้องกับการสร้างบิล
-- ใช้หลังจากดู row-count.csv แล้ว เพื่อเช็คความสัมพันธ์ของเลขบิลจริง
-- ========================================

-- 1. Candidate tables ที่น่าจะเกี่ยวข้องกับ flow สร้างบิล / พิมพ์บิล / แก้ไขบิล
WITH candidate_tables AS (
    SELECT *
    FROM (VALUES
        ('core_sale', 'MasterSalePost', N'หัวบิลขายหน้าร้าน / transaction หลัก'),
        ('core_sale', 'DetailSalePost', N'รายการสินค้าในบิลขายหน้าร้าน'),
        ('core_sale', 'INOUTStockProduct', N'stock movement ที่น่าจะถูกสร้างตามรายการขาย'),
        ('core_sale', 'Customer', N'ข้อมูลลูกค้าที่ join ผ่าน CodeCustomer'),
        ('payment', 'Payment', N'รายการรับ/จ่าย อาจเกี่ยวกับเงินของบิลหรือค่าใช้จ่าย'),
        ('payment', 'MasterPaymentCustomer', N'รับชำระจากลูกค้า / ลูกหนี้'),
        ('payment', 'DetailPaymentCustomer', N'รายละเอียดรับชำระจากลูกค้า'),
        ('payment', 'MasterRecivePaymentCustomer', N'รับชำระจากลูกค้าอีกชุด'),
        ('print_normal', 'MasterPrintPost', N'หัวเอกสารพิมพ์บิลปกติ'),
        ('print_normal', 'DetailPrintPost', N'รายการสินค้าในเอกสารพิมพ์บิลปกติ'),
        ('print_vat', 'MasterPrintPostVate', N'หัวใบกำกับภาษีแบบ post / VAT'),
        ('print_vat', 'DetailPrintPostVate', N'รายการสินค้าในใบกำกับภาษีแบบ post / VAT'),
        ('print_cash_vat', 'MasterPrintCashVate', N'หัวใบเสร็จเงินสด / VAT'),
        ('print_cash_vat', 'DetailPrintCashVate', N'รายการสินค้าในใบเสร็จเงินสด / VAT'),
        ('edit_delete', 'ChangeEditPrint', N'ประวัติแก้ไขยอดเงิน / วิธีชำระ / ธนาคาร'),
        ('edit_delete', 'EditTotalOldNewPrint', N'ประวัติแก้ไขยอดรวมเก่า-ใหม่'),
        ('edit_delete', 'MasterPrintDelect', N'หัวบิลที่ถูกลบหรือยกเลิก (สะกด Delect)'),
        ('edit_delete', 'DetailPrintDelect', N'รายละเอียดบิลที่ถูกลบหรือยกเลิก'),
        ('numbering', 'NumberSalePost', N'เลขรันของบิลขายหน้าร้าน'),
        ('numbering', 'NumberPrintPost', N'เลขรันของเอกสารพิมพ์บิลปกติ'),
        ('numbering', 'NumberPrintPostVate', N'เลขรันของใบกำกับภาษีแบบ post / VAT'),
        ('numbering', 'NumberPrintCashVate', N'เลขรันของใบเสร็จเงินสด / VAT'),
        ('draft', 'TmpSalePost', N'ตะกร้า/บิลชั่วคราวเดิม แต่ตอนนี้ไม่มีข้อมูล'),
        ('draft', 'WebBillDrafts', N'draft ฝั่ง web ที่สร้างใหม่ แต่ตอนนี้ไม่มีข้อมูล')
    ) AS v(group_name, table_name, note)
),
table_rows AS (
    SELECT
        t.object_id,
        SUM(p.rows) AS row_count
    FROM sys.tables AS t
    LEFT JOIN sys.partitions AS p
        ON p.object_id = t.object_id
        AND p.index_id IN (0, 1)
    WHERE t.is_ms_shipped = 0
    GROUP BY t.object_id
)
SELECT
    c.group_name,
    s.name AS table_schema,
    c.table_name,
    ISNULL(tr.row_count, 0) AS row_count,
    c.note
FROM candidate_tables AS c
LEFT JOIN sys.tables AS t
    ON t.name = c.table_name
LEFT JOIN sys.schemas AS s
    ON s.schema_id = t.schema_id
LEFT JOIN table_rows AS tr
    ON tr.object_id = t.object_id
ORDER BY
    c.group_name,
    ISNULL(tr.row_count, 0) DESC,
    c.table_name;

-- ========================================

-- 2. ดูคอลัมน์สำคัญของ candidate tables
SELECT
    TABLE_NAME,
    ORDINAL_POSITION,
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN (
    'MasterSalePost',
    'DetailSalePost',
    'INOUTStockProduct',
    'Customer',
    'Payment',
    'MasterPaymentCustomer',
    'DetailPaymentCustomer',
    'MasterRecivePaymentCustomer',
    'MasterPrintPost',
    'DetailPrintPost',
    'MasterPrintPostVate',
    'DetailPrintPostVate',
    'MasterPrintCashVate',
    'DetailPrintCashVate',
    'ChangeEditPrint',
    'EditTotalOldNewPrint',
    'MasterPrintDelect',
    'DetailPrintDelect',
    'NumberSalePost',
    'NumberPrintPost',
    'NumberPrintPostVate',
    'NumberPrintCashVate',
    'TmpSalePost',
    'WebBillDrafts'
)
ORDER BY
    TABLE_NAME,
    ORDINAL_POSITION;

-- ========================================

-- 3. พิสูจน์ master/detail ของบิลขายหน้าร้าน
-- ถ้า detail_without_master = 0 และ avg_items_per_bill สมเหตุสมผล ตารางคู่นี้คือแกนหลักของบิลขาย
SELECT
    COUNT(DISTINCT m.NumberPrintSalePost) AS master_bill_count,
    COUNT(d.NumberPrintSalePost) AS detail_line_count,
    COUNT(DISTINCT d.NumberPrintSalePost) AS detail_bill_count,
    CAST(COUNT(d.NumberPrintSalePost) * 1.0 / NULLIF(COUNT(DISTINCT m.NumberPrintSalePost), 0) AS decimal(10, 2)) AS avg_items_per_bill,
    SUM(CASE WHEN d.NumberPrintSalePost IS NULL THEN 1 ELSE 0 END) AS master_without_detail
FROM dbo.MasterSalePost AS m
LEFT JOIN dbo.DetailSalePost AS d
    ON d.NumberPrintSalePost = m.NumberPrintSalePost;

SELECT
    COUNT(*) AS detail_without_master
FROM dbo.DetailSalePost AS d
LEFT JOIN dbo.MasterSalePost AS m
    ON m.NumberPrintSalePost = d.NumberPrintSalePost
WHERE m.NumberPrintSalePost IS NULL;

-- ========================================

-- 4. ดู prefix เลขบิลของ flow หลัก
SELECT
    LEFT(NumberPrintSalePost, 4) AS bill_prefix,
    COUNT(*) AS bill_count,
    MIN(DateSalePost) AS first_date,
    MAX(DateSalePost) AS last_date,
    MIN(NumberPrintSalePost) AS min_bill_no,
    MAX(NumberPrintSalePost) AS max_bill_no
FROM dbo.MasterSalePost
GROUP BY LEFT(NumberPrintSalePost, 4)
ORDER BY bill_count DESC;

-- ========================================

-- 5. เช็คว่า stock movement ผูกกับเลขบิลขายหรือไม่
-- ถ้า matched_sale_bill เยอะ แปลว่า INOUTStockProduct ถูกสร้างตอนขาย/ตัดสต็อกด้วย
SELECT
    COUNT(*) AS stock_movement_rows,
    SUM(CASE WHEN m.NumberPrintSalePost IS NOT NULL THEN 1 ELSE 0 END) AS matched_sale_bill,
    SUM(CASE WHEN m.NumberPrintSalePost IS NULL THEN 1 ELSE 0 END) AS not_matched_sale_bill
FROM dbo.INOUTStockProduct AS i
LEFT JOIN dbo.MasterSalePost AS m
    ON m.NumberPrintSalePost = i.NumberPrint;

SELECT TOP 20
    i.NumberPrint,
    i.DateSave,
    i.BarCode,
    i.NameProduct,
    i.Debit,
    i.Credit,
    i.Stock,
    CASE WHEN m.NumberPrintSalePost IS NULL THEN 'not matched' ELSE 'matched sale bill' END AS match_status
FROM dbo.INOUTStockProduct AS i
LEFT JOIN dbo.MasterSalePost AS m
    ON m.NumberPrintSalePost = i.NumberPrint
ORDER BY i.DateSave DESC;

-- ========================================

-- 6. พิสูจน์ master/detail ของเอกสารพิมพ์และใบกำกับภาษี
SELECT
    'MasterPrintPost + DetailPrintPost' AS pair_name,
    COUNT(DISTINCT m.NumberPrintPost) AS master_count,
    COUNT(d.NumberPrintPost) AS detail_count,
    CAST(COUNT(d.NumberPrintPost) * 1.0 / NULLIF(COUNT(DISTINCT m.NumberPrintPost), 0) AS decimal(10, 2)) AS avg_items_per_doc
FROM dbo.MasterPrintPost AS m
LEFT JOIN dbo.DetailPrintPost AS d
    ON d.NumberPrintPost = m.NumberPrintPost

UNION ALL

SELECT
    'MasterPrintPostVate + DetailPrintPostVate' AS pair_name,
    COUNT(DISTINCT m.NumberPrintPost) AS master_count,
    COUNT(d.NumberPrintPost) AS detail_count,
    CAST(COUNT(d.NumberPrintPost) * 1.0 / NULLIF(COUNT(DISTINCT m.NumberPrintPost), 0) AS decimal(10, 2)) AS avg_items_per_doc
FROM dbo.MasterPrintPostVate AS m
LEFT JOIN dbo.DetailPrintPostVate AS d
    ON d.NumberPrintPost = m.NumberPrintPost

UNION ALL

SELECT
    'MasterPrintCashVate + DetailPrintCashVate' AS pair_name,
    COUNT(DISTINCT m.NumberPrintCash) AS master_count,
    COUNT(d.NumberPrintCash) AS detail_count,
    CAST(COUNT(d.NumberPrintCash) * 1.0 / NULLIF(COUNT(DISTINCT m.NumberPrintCash), 0) AS decimal(10, 2)) AS avg_items_per_doc
FROM dbo.MasterPrintCashVate AS m
LEFT JOIN dbo.DetailPrintCashVate AS d
    ON d.NumberPrintCash = m.NumberPrintCash;

-- ========================================

-- 7. เช็คว่าเลขเอกสาร Print/VAT อ้างกลับไปหา MasterSalePost ได้ไหม
-- ถ้า match ต่ำ แปลว่ากลุ่ม Print อาจเป็นระบบเอกสารแยก ไม่ใช่ตารางหลักของการขาย
SELECT
    'MasterPrintPost' AS source_table,
    COUNT(*) AS source_rows,
    SUM(CASE WHEN m.NumberPrintSalePost IS NOT NULL THEN 1 ELSE 0 END) AS matched_sale_bill
FROM dbo.MasterPrintPost AS p
LEFT JOIN dbo.MasterSalePost AS m
    ON m.NumberPrintSalePost = p.NumberPrintPost

UNION ALL

SELECT
    'MasterPrintPostVate' AS source_table,
    COUNT(*) AS source_rows,
    SUM(CASE WHEN m.NumberPrintSalePost IS NOT NULL THEN 1 ELSE 0 END) AS matched_sale_bill
FROM dbo.MasterPrintPostVate AS p
LEFT JOIN dbo.MasterSalePost AS m
    ON m.NumberPrintSalePost = p.NumberPrintPost

UNION ALL

SELECT
    'MasterPrintCashVate' AS source_table,
    COUNT(*) AS source_rows,
    SUM(CASE WHEN m.NumberPrintSalePost IS NOT NULL THEN 1 ELSE 0 END) AS matched_sale_bill
FROM dbo.MasterPrintCashVate AS p
LEFT JOIN dbo.MasterSalePost AS m
    ON m.NumberPrintSalePost = p.NumberPrintCash;

-- ========================================

-- 8. เช็ค ChangeEditPrint ว่าเลขบิลไป match กับ flow ไหนมากที่สุด
SELECT
    COUNT(*) AS edit_rows,
    SUM(CASE WHEN s.NumberPrintSalePost IS NOT NULL THEN 1 ELSE 0 END) AS matched_master_sale_post,
    SUM(CASE WHEN pp.NumberPrintPost IS NOT NULL THEN 1 ELSE 0 END) AS matched_master_print_post,
    SUM(CASE WHEN pv.NumberPrintPost IS NOT NULL THEN 1 ELSE 0 END) AS matched_master_print_post_vate,
    SUM(CASE WHEN cv.NumberPrintCash IS NOT NULL THEN 1 ELSE 0 END) AS matched_master_print_cash_vate
FROM dbo.ChangeEditPrint AS e
LEFT JOIN dbo.MasterSalePost AS s
    ON s.NumberPrintSalePost = e.NumberPrint
LEFT JOIN dbo.MasterPrintPost AS pp
    ON pp.NumberPrintPost = e.NumberPrint
LEFT JOIN dbo.MasterPrintPostVate AS pv
    ON pv.NumberPrintPost = e.NumberPrint
LEFT JOIN dbo.MasterPrintCashVate AS cv
    ON cv.NumberPrintCash = e.NumberPrint;

SELECT TOP 50
    e.NumberPrint,
    e.DateEditPrint,
    e.Times,
    e.PayCashOld,
    e.PayCashNew,
    e.PayTransferOld,
    e.PayTransferNew,
    e.NameBankOld,
    e.NameBankNew,
    e.NameUser
FROM dbo.ChangeEditPrint AS e
ORDER BY e.DateEditPrint DESC, e.Times DESC;

-- ========================================

-- 9. ดูข้อมูลตัวอย่างของกลุ่มบิลหลักและกลุ่มเอกสารพิมพ์
SELECT TOP 20 *
FROM dbo.MasterSalePost
ORDER BY DateSalePost DESC;

SELECT TOP 20 *
FROM dbo.DetailSalePost
ORDER BY DateSalePost DESC;

SELECT TOP 20 *
FROM dbo.MasterPrintDelect;

SELECT TOP 20 *
FROM dbo.DetailPrintDelect;

SELECT TOP 20 *
FROM dbo.MasterPrintPostVate
ORDER BY DatePost DESC;

SELECT TOP 20 *
FROM dbo.MasterPrintCashVate
ORDER BY DateCash DESC;

-- ========================================

-- 10. ดูเลขรัน/เลขล่าสุดของเอกสารแต่ละประเภท
SELECT 'NumberSalePost' AS table_name, *
FROM dbo.NumberSalePost;

SELECT 'NumberPrintPost' AS table_name, *
FROM dbo.NumberPrintPost;

SELECT 'NumberPrintPostVate' AS table_name, *
FROM dbo.NumberPrintPostVate;

SELECT 'NumberPrintCashVate' AS table_name, *
FROM dbo.NumberPrintCashVate;
