-- ========================================
-- SQL Script สำหรับเช็ค flow เปิดบิล / ค้างชำระ / ชำระเงิน
-- ใช้พิสูจน์ว่าบิลจากมือถือควร sync เข้า table ไหน และโปรแกรมเดิมจะเห็นอย่างไร
-- ========================================

-- 1. ภาพรวมสถานะใน MasterSalePost
-- ถ้ามี Status = N'ค้างชำระ' แปลว่าตารางนี้รองรับบิลที่ยังไม่รับเงินอยู่แล้ว
SELECT
    ISNULL(Status, N'(NULL)') AS status,
    COUNT(*) AS bill_count,
    ISNULL(SUM(TotalPrice), 0) AS total_price,
    ISNULL(SUM(Cash), 0) AS total_cash,
    ISNULL(SUM(Transfer), 0) AS total_transfer,
    ISNULL(SUM(TotalPrice - (ISNULL(Cash, 0) + ISNULL(Transfer, 0))), 0) AS remaining_amount,
    MIN(DateSalePost) AS first_date,
    MAX(DateSalePost) AS last_date
FROM dbo.MasterSalePost
GROUP BY ISNULL(Status, N'(NULL)')
ORDER BY bill_count DESC;

-- ========================================

-- 2. ดูบิลที่ยังรับเงินไม่ครบ
-- ใช้จับทั้งเคส Status ค้างชำระ และเคสยอด Cash + Transfer ยังน้อยกว่า TotalPrice
SELECT TOP 100
    NumberPrintSalePost,
    DateSalePost,
    NameCustomer,
    CodeCustomer,
    TotalPrice,
    ISNULL(Cash, 0) AS Cash,
    ISNULL(Transfer, 0) AS Transfer,
    TotalPrice - (ISNULL(Cash, 0) + ISNULL(Transfer, 0)) AS remaining_amount,
    Status,
    NameSave,
    NumberPrintCash,
    NameBank,
    DetailPrint
FROM dbo.MasterSalePost
WHERE
    Status = N'ค้างชำระ'
    OR TotalPrice > (ISNULL(Cash, 0) + ISNULL(Transfer, 0))
ORDER BY DateSalePost DESC;

-- ========================================

-- 3. เช็คบิลที่มาจากเว็บ/มือถือด้วย prefix WEB
-- ปัจจุบัน API /api/bill-drafts สร้างเลขบิลแบบ WEB#########
SELECT
    COUNT(*) AS web_bill_count,
    ISNULL(SUM(TotalPrice), 0) AS web_total_price,
    ISNULL(SUM(Cash), 0) AS web_total_cash,
    ISNULL(SUM(Transfer), 0) AS web_total_transfer,
    ISNULL(SUM(TotalPrice - (ISNULL(Cash, 0) + ISNULL(Transfer, 0))), 0) AS web_remaining_amount,
    MIN(DateSalePost) AS first_web_bill_date,
    MAX(DateSalePost) AS last_web_bill_date
FROM dbo.MasterSalePost
WHERE NumberPrintSalePost LIKE 'WEB%';

SELECT TOP 100
    NumberPrintSalePost,
    DateSalePost,
    NameCustomer,
    CodeCustomer,
    TotalPrice,
    Cash,
    Transfer,
    Status,
    NameSave,
    DetailPrint
FROM dbo.MasterSalePost
WHERE NumberPrintSalePost LIKE 'WEB%'
ORDER BY DateSalePost DESC;

-- ========================================

-- 4. เช็คว่า WEB bill มี detail ครบหรือไม่
SELECT
    m.NumberPrintSalePost,
    m.DateSalePost,
    m.NameCustomer,
    m.TotalPrice,
    m.Status,
    COUNT(d.NumberPrintSalePost) AS detail_line_count,
    ISNULL(SUM(d.SumPrice), 0) AS detail_total_price,
    m.TotalPrice - ISNULL(SUM(d.SumPrice), 0) AS master_detail_difference
FROM dbo.MasterSalePost AS m
LEFT JOIN dbo.DetailSalePost AS d
    ON d.NumberPrintSalePost = m.NumberPrintSalePost
WHERE m.NumberPrintSalePost LIKE 'WEB%'
GROUP BY
    m.NumberPrintSalePost,
    m.DateSalePost,
    m.NameCustomer,
    m.TotalPrice,
    m.Status
ORDER BY m.DateSalePost DESC;

-- ========================================

-- 5. เช็คว่า WEB bill มี stock movement หรือไม่
-- ถ้าไม่มี match เลย แปลว่าการเปิดบิลจากเว็บยังไม่ได้ตัด stock ใน INOUTStockProduct
SELECT
    m.NumberPrintSalePost,
    m.DateSalePost,
    m.TotalPrice,
    m.Status,
    COUNT(i.NumberPrint) AS stock_movement_line_count
FROM dbo.MasterSalePost AS m
LEFT JOIN dbo.INOUTStockProduct AS i
    ON i.NumberPrint = m.NumberPrintSalePost
WHERE m.NumberPrintSalePost LIKE 'WEB%'
GROUP BY
    m.NumberPrintSalePost,
    m.DateSalePost,
    m.TotalPrice,
    m.Status
ORDER BY m.DateSalePost DESC;

-- ========================================

-- 6. เช็ค log WebBillDrafts เทียบกับ MasterSalePost
-- ถ้า WebBillDrafts ไม่มี แต่ MasterSalePost มี WEB แปลว่า log ฝั่งเว็บเคย fail หรือถูกลบ
IF OBJECT_ID(N'dbo.WebBillDrafts', N'U') IS NOT NULL
BEGIN
    SELECT
        w.DraftNo,
        w.Status AS web_status,
        w.PaymentStatus AS web_payment_status,
        w.TotalPrice AS web_total_price,
        w.SentToMainAt,
        m.NumberPrintSalePost,
        m.Status AS master_status,
        m.TotalPrice AS master_total_price,
        m.Cash,
        m.Transfer
    FROM dbo.WebBillDrafts AS w
    LEFT JOIN dbo.MasterSalePost AS m
        ON m.NumberPrintSalePost = w.DraftNo
    ORDER BY w.CreatedAt DESC;
END
ELSE
BEGIN
    PRINT 'dbo.WebBillDrafts ยังไม่มีในฐานข้อมูลนี้';
END

-- ========================================

-- 7. เช็คว่าบิลค้างชำระถูกบันทึกรับเงินไว้ใน Payment หรือไม่
-- ตาราง Payment ในโปรเจกต์ใช้ NumberPrintPost / CodePrint เป็นเลขเอกสาร
SELECT TOP 100
    m.NumberPrintSalePost,
    m.DateSalePost,
    m.NameCustomer,
    m.TotalPrice AS bill_total_price,
    m.Cash AS bill_cash,
    m.Transfer AS bill_transfer,
    m.Status AS bill_status,
    p.Datepayment,
    p.TotalPrice AS payment_total_price,
    p.MoneyCash,
    p.MoneyTransfer,
    p.NumberPrintPost AS payment_number_print_post,
    p.CodePrint AS payment_code_print,
    p.NameExpensesORIncome,
    p.UserName
FROM dbo.MasterSalePost AS m
LEFT JOIN dbo.Payment AS p
    ON p.NumberPrintPost = m.NumberPrintSalePost
    OR p.CodePrint = m.NumberPrintSalePost
WHERE
    m.Status = N'ค้างชำระ'
    OR m.NumberPrintSalePost LIKE 'WEB%'
ORDER BY m.DateSalePost DESC;

-- ========================================

-- 8. เช็คตารางลูกหนี้/รับชำระลูกค้าว่ามี column อะไรให้ผูกต่อ
SELECT
    TABLE_NAME,
    ORDINAL_POSITION,
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN (
    'MasterPaymentCustomer',
    'DetailPaymentCustomer',
    'MasterRecivePaymentCustomer',
    'PayCredit',
    'ReciveCreditCustomer',
    'DateDuePayment',
    'CloseSalePostAccount'
)
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SELECT TOP 50 *
FROM dbo.MasterPaymentCustomer
ORDER BY 1 DESC;

SELECT TOP 50 *
FROM dbo.DetailPaymentCustomer
ORDER BY 1 DESC;

SELECT TOP 50 *
FROM dbo.MasterRecivePaymentCustomer
ORDER BY 1 DESC;

SELECT TOP 50 *
FROM dbo.PayCredit
ORDER BY 1 DESC;

SELECT TOP 50 *
FROM dbo.ReciveCreditCustomer
ORDER BY 1 DESC;

-- ========================================

-- 9. เช็คเลขรันเดิม
-- ถ้าระบบเดิมคาดหวังเลขจาก NumberSalePost แต่เว็บใช้ WEB random อาจต้องยืนยันกับโปรแกรมเดิมก่อน
SELECT 'NumberSalePost' AS table_name, *
FROM dbo.NumberSalePost;

SELECT TOP 20
    LEFT(NumberPrintSalePost, 4) AS bill_prefix,
    COUNT(*) AS bill_count,
    MIN(NumberPrintSalePost) AS min_bill_no,
    MAX(NumberPrintSalePost) AS max_bill_no,
    MIN(DateSalePost) AS first_date,
    MAX(DateSalePost) AS last_date
FROM dbo.MasterSalePost
GROUP BY LEFT(NumberPrintSalePost, 4)
ORDER BY bill_count DESC;
