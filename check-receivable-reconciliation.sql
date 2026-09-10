/*
  กระทบยอดหน้าลูกหนี้เว็บกับโปรแกรมเดิม

  หน้าเว็บ:
    - เริ่มจาก MasterSalePost ที่ Status = 'ค้างชำระ'
    - ถ้ามี MasterRecivePaymentCustomer ใช้ SubMoney ของรายการล่าสุดต่อบิล
    - ถ้าไม่มี ใช้ TotalPrice - Cash - Transfer

  โปรแกรมเดิม (สมมติฐานจากหน้าจอ):
    - เริ่มจาก MasterRecivePaymentCustomer
    - แสดงยอด SubMoney คงเหลือ และรวมหน้าจอตามลูกค้า

  สคริปต์นี้อ่านข้อมูลอย่างเดียว ไม่มี INSERT / UPDATE / DELETE
*/

SET NOCOUNT ON;

IF OBJECT_ID('tempdb..#LatestReceivable') IS NOT NULL DROP TABLE #LatestReceivable;
IF OBJECT_ID('tempdb..#WebBills') IS NOT NULL DROP TABLE #WebBills;
IF OBJECT_ID('tempdb..#LegacyBills') IS NOT NULL DROP TABLE #LegacyBills;

;WITH ranked AS (
    SELECT
        LTRIM(RTRIM(NumberPrintPost)) AS bill_no,
        LTRIM(RTRIM(ISNULL(CodeCustomer, ''))) AS customer_code,
        ISNULL(NameCustomer, N'') AS customer_name,
        ISNULL(CONVERT(money, CASE WHEN ISNUMERIC(CONVERT(nvarchar(100), TotalPrice)) = 1
            THEN CONVERT(nvarchar(100), TotalPrice) ELSE '0' END), 0) AS total_amount,
        ISNULL(CONVERT(money, CASE WHEN ISNUMERIC(CONVERT(nvarchar(100), PayMoney)) = 1
            THEN CONVERT(nvarchar(100), PayMoney) ELSE '0' END), 0) AS paid_amount,
        ISNULL(CONVERT(money, CASE WHEN ISNUMERIC(CONVERT(nvarchar(100), SubMoney)) = 1
            THEN CONVERT(nvarchar(100), SubMoney) ELSE '0' END), 0) AS outstanding_amount,
        DatePost AS receivable_date,
        ROW_NUMBER() OVER (
            PARTITION BY LTRIM(RTRIM(NumberPrintPost))
            ORDER BY DatePost DESC
        ) AS row_number
    FROM dbo.MasterRecivePaymentCustomer
)
SELECT
    bill_no,
    customer_code,
    customer_name,
    total_amount,
    paid_amount,
    outstanding_amount,
    receivable_date
INTO #LatestReceivable
FROM ranked
WHERE row_number = 1;

SELECT
    LTRIM(RTRIM(m.NumberPrintSalePost)) AS bill_no,
    m.DateSalePost AS sale_date,
    LTRIM(RTRIM(ISNULL(m.CodeCustomer, ''))) AS customer_code,
    ISNULL(m.NameCustomer, N'') AS customer_name,
    ISNULL(CONVERT(money, CASE WHEN ISNUMERIC(CONVERT(nvarchar(100), m.TotalPrice)) = 1
        THEN CONVERT(nvarchar(100), m.TotalPrice) ELSE '0' END), 0) AS total_amount,
    ISNULL(CONVERT(money, CASE WHEN ISNUMERIC(CONVERT(nvarchar(100), m.Cash)) = 1
        THEN CONVERT(nvarchar(100), m.Cash) ELSE '0' END), 0)
        + ISNULL(CONVERT(money, CASE WHEN ISNUMERIC(CONVERT(nvarchar(100), m.Transfer)) = 1
            THEN CONVERT(nvarchar(100), m.Transfer) ELSE '0' END), 0) AS sale_paid_amount,
    CASE
        WHEN r.bill_no IS NOT NULL THEN r.outstanding_amount
        ELSE ISNULL(CONVERT(money, CASE WHEN ISNUMERIC(CONVERT(nvarchar(100), m.TotalPrice)) = 1
                THEN CONVERT(nvarchar(100), m.TotalPrice) ELSE '0' END), 0)
            - ISNULL(CONVERT(money, CASE WHEN ISNUMERIC(CONVERT(nvarchar(100), m.Cash)) = 1
                THEN CONVERT(nvarchar(100), m.Cash) ELSE '0' END), 0)
            - ISNULL(CONVERT(money, CASE WHEN ISNUMERIC(CONVERT(nvarchar(100), m.Transfer)) = 1
                THEN CONVERT(nvarchar(100), m.Transfer) ELSE '0' END), 0)
    END AS web_outstanding_amount,
    CASE WHEN r.bill_no IS NULL THEN 1 ELSE 0 END AS web_used_sale_fallback
INTO #WebBills
FROM dbo.MasterSalePost AS m
LEFT JOIN #LatestReceivable AS r
    ON r.bill_no = LTRIM(RTRIM(m.NumberPrintSalePost))
WHERE LTRIM(RTRIM(ISNULL(m.Status, ''))) = N'ค้างชำระ';

SELECT
    bill_no,
    customer_code,
    customer_name,
    total_amount,
    paid_amount,
    outstanding_amount AS legacy_outstanding_amount
INTO #LegacyBills
FROM #LatestReceivable
WHERE outstanding_amount > 0;

/* Result 1: ภาพรวม — บนข้อมูลตามภาพควรเห็นเว็บ 26 ใบ / 170,219
   และโปรแกรมเดิม 17 ลูกค้า / 168,006 */
SELECT
    (SELECT COUNT(*) FROM #WebBills WHERE web_outstanding_amount > 0) AS web_bill_count,
    (SELECT COUNT(DISTINCT customer_code) FROM #WebBills WHERE web_outstanding_amount > 0)
        AS web_customer_count,
    (SELECT ISNULL(SUM(web_outstanding_amount), 0)
     FROM #WebBills WHERE web_outstanding_amount > 0) AS web_total,
    (SELECT COUNT(*) FROM #LegacyBills) AS legacy_bill_count,
    (SELECT COUNT(DISTINCT customer_code) FROM #LegacyBills) AS legacy_customer_count,
    (SELECT ISNULL(SUM(legacy_outstanding_amount), 0) FROM #LegacyBills) AS legacy_total,
    (SELECT ISNULL(SUM(web_outstanding_amount), 0)
     FROM #WebBills WHERE web_outstanding_amount > 0)
        - (SELECT ISNULL(SUM(legacy_outstanding_amount), 0) FROM #LegacyBills) AS difference;

/* Result 2: ตัวทำให้ยอดต่าง — เรียงรายการที่ต่างมากสุดก่อน */
SELECT
    CASE
        WHEN w.bill_no IS NULL THEN 'ONLY_LEGACY'
        WHEN l.bill_no IS NULL THEN 'ONLY_WEB'
        ELSE 'AMOUNT_DIFF'
    END AS difference_type,
    COALESCE(w.bill_no, l.bill_no) AS bill_no,
    COALESCE(w.customer_code, l.customer_code) AS customer_code,
    COALESCE(w.customer_name, l.customer_name) AS customer_name,
    w.sale_date,
    w.total_amount AS web_bill_total,
    w.sale_paid_amount,
    w.web_outstanding_amount AS web_outstanding,
    l.legacy_outstanding_amount AS legacy_outstanding,
    ISNULL(w.web_outstanding_amount, 0)
        - ISNULL(l.legacy_outstanding_amount, 0) AS difference,
    w.web_used_sale_fallback
FROM #WebBills AS w
FULL OUTER JOIN #LegacyBills AS l
    ON l.bill_no = w.bill_no
WHERE
    (w.web_outstanding_amount > 0 OR l.legacy_outstanding_amount > 0)
    AND (
        w.bill_no IS NULL
        OR l.bill_no IS NULL
        OR w.web_outstanding_amount <> l.legacy_outstanding_amount
    )
ORDER BY ABS(
    ISNULL(w.web_outstanding_amount, 0)
        - ISNULL(l.legacy_outstanding_amount, 0)
) DESC, bill_no;

/* Result 3: รวมแบบหน้าจอเดิม (หนึ่งแถวต่อลูกค้า) */
SELECT
    customer_code,
    MAX(customer_name) AS customer_name,
    COUNT(*) AS bill_count,
    SUM(legacy_outstanding_amount) AS outstanding_amount
FROM #LegacyBills
GROUP BY customer_code
ORDER BY customer_code;

/* Result 4: ตรวจว่าตารางรับลูกหนี้มีหลาย record ต่อบิลหรือไม่
   ถ้ามี และ DatePost เท่ากัน หน้าเว็บอาจเลือกรายการล่าสุดไม่แน่นอน */
SELECT
    LTRIM(RTRIM(NumberPrintPost)) AS bill_no,
    COUNT(*) AS record_count,
    COUNT(DISTINCT DatePost) AS distinct_dates,
    MAX(DatePost) AS latest_date
FROM dbo.MasterRecivePaymentCustomer
GROUP BY LTRIM(RTRIM(NumberPrintPost))
HAVING COUNT(*) > 1
ORDER BY record_count DESC, bill_no;
