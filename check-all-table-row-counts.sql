-- ========================================
-- SQL Script สำหรับดูทุกตารางพร้อมจำนวนแถว
-- เหมาะสำหรับสำรวจฐานข้อมูล SQL Server ของโปรเจกต์ที่ยังไม่รู้โครงสร้าง
-- ========================================

-- 1. แสดงทุกตาราง พร้อมจำนวนแถวแบบเร็วจาก metadata
-- หมายเหตุ: ใช้ sys.partitions จึงไม่ต้องสแกนข้อมูลทั้งตารางเหมือน COUNT(*)
WITH table_rows AS (
    SELECT
        t.object_id,
        SUM(p.rows) AS row_count
    FROM sys.tables AS t
    LEFT JOIN sys.partitions AS p
        ON p.object_id = t.object_id
        AND p.index_id IN (0, 1) -- heap หรือ clustered index เท่านั้น เพื่อไม่ให้นับซ้ำจาก nonclustered indexes
    WHERE t.is_ms_shipped = 0
    GROUP BY t.object_id
),
column_counts AS (
    SELECT
        object_id,
        COUNT(*) AS column_count
    FROM sys.columns
    GROUP BY object_id
)
SELECT
    s.name AS table_schema,
    t.name AS table_name,
    QUOTENAME(s.name) + '.' + QUOTENAME(t.name) AS full_table_name,
    ISNULL(tr.row_count, 0) AS row_count,
    ISNULL(cc.column_count, 0) AS column_count,
    t.create_date,
    t.modify_date
FROM sys.tables AS t
INNER JOIN sys.schemas AS s
    ON s.schema_id = t.schema_id
LEFT JOIN table_rows AS tr
    ON tr.object_id = t.object_id
LEFT JOIN column_counts AS cc
    ON cc.object_id = t.object_id
WHERE t.is_ms_shipped = 0
ORDER BY
    ISNULL(tr.row_count, 0) DESC,
    s.name,
    t.name;

-- ========================================

-- 2. สรุปรวมทั้งฐานข้อมูล: มีกี่ตาราง, ตารางไหนมีข้อมูล, รวมแถวทั้งหมดเท่าไร
WITH table_rows AS (
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
    COUNT(*) AS table_count,
    SUM(CASE WHEN ISNULL(row_count, 0) > 0 THEN 1 ELSE 0 END) AS table_with_rows_count,
    SUM(CASE WHEN ISNULL(row_count, 0) = 0 THEN 1 ELSE 0 END) AS empty_table_count,
    SUM(ISNULL(row_count, 0)) AS total_row_count
FROM table_rows;

-- ========================================

-- 3. แสดงเฉพาะตารางว่าง เพื่อช่วยตัดตัวเลือกที่ยังไม่น่าเกี่ยวข้องออกก่อน
WITH table_rows AS (
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
    s.name AS table_schema,
    t.name AS table_name,
    QUOTENAME(s.name) + '.' + QUOTENAME(t.name) AS full_table_name,
    ISNULL(tr.row_count, 0) AS row_count
FROM sys.tables AS t
INNER JOIN sys.schemas AS s
    ON s.schema_id = t.schema_id
LEFT JOIN table_rows AS tr
    ON tr.object_id = t.object_id
WHERE
    t.is_ms_shipped = 0
    AND ISNULL(tr.row_count, 0) = 0
ORDER BY
    s.name,
    t.name;

-- ========================================

-- 4. ถ้าต้องการนับแบบ exact จริงๆ ให้ใช้บล็อกนี้แทน
-- คำเตือน: COUNT_BIG(*) จะสแกนทุกตาราง อาจช้ามากในฐานข้อมูลใหญ่
--
-- IF OBJECT_ID('tempdb..#ExactTableRows') IS NOT NULL
--     DROP TABLE #ExactTableRows;
--
-- CREATE TABLE #ExactTableRows (
--     table_schema sysname,
--     table_name sysname,
--     full_table_name nvarchar(517),
--     row_count bigint
-- );
--
-- DECLARE @sql nvarchar(max) = N'';
--
-- SELECT @sql = @sql + N'
-- INSERT INTO #ExactTableRows (table_schema, table_name, full_table_name, row_count)
-- SELECT
--     N''' + REPLACE(s.name, '''', '''''') + N''',
--     N''' + REPLACE(t.name, '''', '''''') + N''',
--     N''' + REPLACE(QUOTENAME(s.name) + N'.' + QUOTENAME(t.name), '''', '''''') + N''',
--     COUNT_BIG(*)
-- FROM ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N';'
-- FROM sys.tables AS t
-- INNER JOIN sys.schemas AS s
--     ON s.schema_id = t.schema_id
-- WHERE t.is_ms_shipped = 0
-- ORDER BY s.name, t.name;
--
-- EXEC sp_executesql @sql;
--
-- SELECT *
-- FROM #ExactTableRows
-- ORDER BY row_count DESC, table_schema, table_name;
