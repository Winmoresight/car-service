-- ลบบิลขาย NumberPrintSalePost = 'WEB392940916'
-- ⚠️ คำเตือน: รันคำสั่งนี้บน SQL Server ของลูกค้าเท่านั้น!
-- ⚠️ ข้อมูลที่ลบไปแล้วจะกู้คืนไม่ได้!

USE [BaseSeviceCar];
GO

-- ===================================================
-- ขั้นตอนที่ 1: เช็คข้อมูลก่อนลบ
-- ===================================================

PRINT '========================================';
PRINT 'ขั้นตอนที่ 1: ตรวจสอบข้อมูลก่อนลบ';
PRINT '========================================';
PRINT '';

-- 1.1 เช็คข้อมูลหลักใน MasterSalePost
PRINT '1.1 ข้อมูลหลักใน MasterSalePost:';
SELECT 
    NumberPrintSalePost,
    DateSalePost,
    NameCustomer,
    CodeCustomer,
    TotalPrice,
    TotalProfit,
    Status
FROM dbo.MasterSalePost
WHERE NumberPrintSalePost = 'WEB392940916';

-- 1.2 เช็ครายละเอียดสินค้าใน DetailSalePost
PRINT '';
PRINT '1.2 รายละเอียดสินค้า (DetailSalePost):';
SELECT 
    NumberPrintSalePost,
    BarCode,
    NameProduct,
    Price,
    Amount,
    COUNT(*) OVER() as TotalItems
FROM dbo.DetailSalePost
WHERE NumberPrintSalePost = 'WEB392940916';

-- 1.3 เช็คประวัติการแก้ไขใน EditSalePost (ถ้ามี)
PRINT '';
PRINT '1.3 ประวัติการแก้ไข (EditSalePost):';
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EditSalePost')
BEGIN
    SELECT 
        NumberPrintSalePost,
        DateEditPrint,
        Times,
        COUNT(*) OVER() as TotalEdits
    FROM dbo.EditSalePost
    WHERE NumberPrintSalePost = 'WEB392940916';
END
ELSE
BEGIN
    PRINT '   ⚠️ ตาราง EditSalePost ไม่มี';
END

-- 1.4 เช็คการชำระเงินใน Payment (ถ้ามี)
PRINT '';
PRINT '1.4 การชำระเงิน (Payment):';
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Payment')
BEGIN
    SELECT 
        NumberPrintSalePost,
        DatePayment,
        Cash,
        Transfer,
        COUNT(*) OVER() as TotalPayments
    FROM dbo.Payment
    WHERE NumberPrintSalePost = 'WEB392940916';
END
ELSE
BEGIN
    PRINT '   ⚠️ ตาราง Payment ไม่มี';
END

-- 1.5 เช็คใบกำกับภาษีใน TaxInvoice (ถ้ามี)
PRINT '';
PRINT '1.5 ใบกำกับภาษี (TaxInvoice):';
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TaxInvoice')
BEGIN
    SELECT 
        NumberPrintSalePost,
        NumberTaxInvoice,
        DatePost,
        COUNT(*) OVER() as TotalTaxInvoices
    FROM dbo.TaxInvoice
    WHERE NumberPrintSalePost = 'WEB392940916';
END
ELSE
BEGIN
    PRINT '   ⚠️ ตาราง TaxInvoice ไม่มี';
END

PRINT '';
PRINT '========================================';
PRINT '⚠️  โปรดตรวจสอบข้อมูลด้านบนให้แน่ใจ';
PRINT '    ถ้าถูกต้อง ให้รัน Section 2 ต่อไป';
PRINT '========================================';
PRINT '';

-- ===================================================
-- ขั้นตอนที่ 2: ลบข้อมูล (รันแยกจาก Section 1)
-- ===================================================

/*
-- ⚠️⚠️⚠️ ยกเลิก Comment ด้านล่างนี้เมื่อพร้อมลบจริง ⚠️⚠️⚠️

BEGIN TRANSACTION; -- เริ่ม Transaction เพื่อสามารถ Rollback ได้

PRINT '';
PRINT '========================================';
PRINT 'ขั้นตอนที่ 2: กำลังลบข้อมูล...';
PRINT '========================================';
PRINT '';

DECLARE @NumberPrint VARCHAR(50) = 'WEB392940916';
DECLARE @RowsAffected INT;

-- 2.1 ลบรายละเอียดสินค้า (ต้องลบก่อน เพราะเป็น Child Table)
DELETE FROM dbo.DetailSalePost 
WHERE NumberPrintSalePost = @NumberPrint;
SET @RowsAffected = @@ROWCOUNT;
PRINT '✅ ลบ DetailSalePost: ' + CAST(@RowsAffected AS VARCHAR) + ' rows';

-- 2.2 ลบประวัติการแก้ไข (ถ้ามี)
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EditSalePost')
BEGIN
    DELETE FROM dbo.EditSalePost 
    WHERE NumberPrintSalePost = @NumberPrint;
    SET @RowsAffected = @@ROWCOUNT;
    PRINT '✅ ลบ EditSalePost: ' + CAST(@RowsAffected AS VARCHAR) + ' rows';
END

-- 2.3 ลบการชำระเงิน (ถ้ามี)
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Payment')
BEGIN
    DELETE FROM dbo.Payment 
    WHERE NumberPrintSalePost = @NumberPrint;
    SET @RowsAffected = @@ROWCOUNT;
    PRINT '✅ ลบ Payment: ' + CAST(@RowsAffected AS VARCHAR) + ' rows';
END

-- 2.4 ลบใบกำกับภาษี (ถ้ามี)
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'TaxInvoice')
BEGIN
    DELETE FROM dbo.TaxInvoice 
    WHERE NumberPrintSalePost = @NumberPrint;
    SET @RowsAffected = @@ROWCOUNT;
    PRINT '✅ ลบ TaxInvoice: ' + CAST(@RowsAffected AS VARCHAR) + ' rows';
END

-- 2.5 ลบข้อมูลหลัก MasterSalePost (ลบทีหลังสุด)
DELETE FROM dbo.MasterSalePost 
WHERE NumberPrintSalePost = @NumberPrint;
SET @RowsAffected = @@ROWCOUNT;
PRINT '✅ ลบ MasterSalePost: ' + CAST(@RowsAffected AS VARCHAR) + ' rows';

PRINT '';
PRINT '========================================';
PRINT '✅ ลบข้อมูลเสร็จสมบูรณ์';
PRINT '========================================';
PRINT '';
PRINT '⚠️  ตรวจสอบผลลัพธ์ด้านบน';
PRINT '   ถ้าถูกต้อง: รัน COMMIT TRANSACTION;';
PRINT '   ถ้าผิดพลาด: รัน ROLLBACK TRANSACTION;';
PRINT '';

-- COMMIT TRANSACTION;   -- ยกเลิก comment ตรงนี้เพื่อ commit จริง
-- ROLLBACK TRANSACTION; -- หรือใช้ rollback ถ้าต้องการยกเลิก

*/

-- ===================================================
-- ขั้นตอนที่ 3: ตรวจสอบหลังลบ
-- ===================================================

/*
-- ตรวจสอบว่าลบหมดแล้วจริงๆ
SELECT COUNT(*) as RemainingRecords
FROM dbo.MasterSalePost
WHERE NumberPrintSalePost = 'WEB392940916';

SELECT COUNT(*) as RemainingDetails
FROM dbo.DetailSalePost
WHERE NumberPrintSalePost = 'WEB392940916';

-- ควรได้ 0 ทั้งคู่
*/
