-- Check column names in MasterSalePost table
SELECT TOP 1 * FROM dbo.MasterSalePost;

-- Get column information
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'MasterSalePost'
ORDER BY ORDINAL_POSITION;
