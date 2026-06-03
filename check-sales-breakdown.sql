-- ========================================
-- SQL Query สำหรับตรวจสอบยอดขายแยกเงินสดและเงินโอน
-- ========================================

-- 1. ตรวจสอบยอดขายวันที่เฉพาะเจาะจง
-- เปลี่ยน '2026-06-02' เป็นวันที่ต้องการตรวจสอบ
SELECT 
  CONVERT(date, DateSalePost) as sale_date,
  COUNT(*) as bill_count,
  ISNULL(SUM(Cash), 0) as total_cash,
  ISNULL(SUM(Transfer), 0) as total_transfer,
  ISNULL(SUM(TotalPrice), 0) as total_sales,
  ISNULL(SUM(TotalProfit), 0) as total_profit,
  -- ตรวจสอบว่า Cash + Transfer = TotalPrice หรือไม่
  CASE 
    WHEN ISNULL(SUM(Cash), 0) + ISNULL(SUM(Transfer), 0) = ISNULL(SUM(TotalPrice), 0) 
    THEN 'OK' 
    ELSE 'มีปัญหา' 
  END as status,
  -- แสดงส่วนต่าง (ถ้ามี)
  ISNULL(SUM(TotalPrice), 0) - (ISNULL(SUM(Cash), 0) + ISNULL(SUM(Transfer), 0)) as difference
FROM dbo.MasterSalePost
WHERE CONVERT(date, DateSalePost) = '2026-06-02'
GROUP BY CONVERT(date, DateSalePost);

-- ========================================

-- 2. ตรวจสอบยอดขายแยกตามวัน (ช่วง 7 วันล่าสุด)
SELECT 
  CONVERT(date, DateSalePost) as sale_date,
  COUNT(*) as bill_count,
  ISNULL(SUM(Cash), 0) as total_cash,
  ISNULL(SUM(Transfer), 0) as total_transfer,
  ISNULL(SUM(TotalPrice), 0) as total_sales,
  ISNULL(SUM(TotalProfit), 0) as total_profit,
  -- คำนวณเปอร์เซ็นต์เงินสด
  CASE 
    WHEN ISNULL(SUM(TotalPrice), 0) > 0 
    THEN CAST(ISNULL(SUM(Cash), 0) * 100.0 / ISNULL(SUM(TotalPrice), 0) AS DECIMAL(5,2))
    ELSE 0 
  END as cash_percent,
  -- คำนวณเปอร์เซ็นต์เงินโอน
  CASE 
    WHEN ISNULL(SUM(TotalPrice), 0) > 0 
    THEN CAST(ISNULL(SUM(Transfer), 0) * 100.0 / ISNULL(SUM(TotalPrice), 0) AS DECIMAL(5,2))
    ELSE 0 
  END as transfer_percent
FROM dbo.MasterSalePost
WHERE CONVERT(date, DateSalePost) >= DATEADD(day, -7, GETDATE())
GROUP BY CONVERT(date, DateSalePost)
ORDER BY sale_date DESC;

-- ========================================

-- 3. ตรวจสอบยอดขายเดือนปัจจุบัน
SELECT 
  COUNT(*) as bill_count,
  ISNULL(SUM(Cash), 0) as total_cash,
  ISNULL(SUM(Transfer), 0) as total_transfer,
  ISNULL(SUM(TotalPrice), 0) as total_sales,
  ISNULL(SUM(TotalProfit), 0) as total_profit,
  MIN(CONVERT(date, DateSalePost)) as first_date,
  MAX(CONVERT(date, DateSalePost)) as last_date,
  -- คำนวณเปอร์เซ็นต์
  CASE 
    WHEN ISNULL(SUM(TotalPrice), 0) > 0 
    THEN CAST(ISNULL(SUM(Cash), 0) * 100.0 / ISNULL(SUM(TotalPrice), 0) AS DECIMAL(5,2))
    ELSE 0 
  END as cash_percent,
  CASE 
    WHEN ISNULL(SUM(TotalPrice), 0) > 0 
    THEN CAST(ISNULL(SUM(Transfer), 0) * 100.0 / ISNULL(SUM(TotalPrice), 0) AS DECIMAL(5,2))
    ELSE 0 
  END as transfer_percent
FROM dbo.MasterSalePost
WHERE YEAR(DateSalePost) = YEAR(GETDATE())
  AND MONTH(DateSalePost) = MONTH(GETDATE());

-- ========================================

-- 4. หา Transaction ที่อาจมีปัญหา (Cash + Transfer ไม่เท่ากับ TotalPrice)
SELECT TOP 10
  BillNo,
  CONVERT(date, DateSalePost) as sale_date,
  Cash,
  Transfer,
  TotalPrice,
  Cash + Transfer as sum_payment,
  TotalPrice - (Cash + Transfer) as difference
FROM dbo.MasterSalePost
WHERE Cash + Transfer <> TotalPrice
ORDER BY DateSalePost DESC;

-- ========================================

-- 5. สถิติการชำระเงินแยกตามประเภท (เดือนนี้)
SELECT 
  COUNT(CASE WHEN Cash > 0 AND Transfer = 0 THEN 1 END) as cash_only_count,
  COUNT(CASE WHEN Transfer > 0 AND Cash = 0 THEN 1 END) as transfer_only_count,
  COUNT(CASE WHEN Cash > 0 AND Transfer > 0 THEN 1 END) as mixed_payment_count,
  ISNULL(SUM(CASE WHEN Cash > 0 AND Transfer = 0 THEN TotalPrice END), 0) as cash_only_sales,
  ISNULL(SUM(CASE WHEN Transfer > 0 AND Cash = 0 THEN TotalPrice END), 0) as transfer_only_sales,
  ISNULL(SUM(CASE WHEN Cash > 0 AND Transfer > 0 THEN TotalPrice END), 0) as mixed_payment_sales
FROM dbo.MasterSalePost
WHERE YEAR(DateSalePost) = YEAR(GETDATE())
  AND MONTH(DateSalePost) = MONTH(GETDATE());
