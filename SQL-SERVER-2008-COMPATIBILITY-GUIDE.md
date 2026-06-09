# SQL Server 2008 Compatibility Guide

## ปัญหา

SQL Server 2008 **ไม่รองรับ** syntax `OFFSET ... FETCH NEXT` ซึ่งเป็น feature ใน SQL Server 2012+

### Error ที่เจอ:
```
Invalid usage of the option NEXT in the FETCH statement
Incorrect syntax near 'OFFSET'
```

---

## ไฟล์ที่ต้องแก้ (10 ไฟล์)

1. `src/app/api/sales/route.ts` ⚠️ **ลูกค้า error ที่นี่**
2. `src/app/api/customers/route.ts`
3. `src/app/api/cash-invoices/route.ts`
4. `src/app/api/tax-invoices/route.ts`
5. `src/app/api/tax-invoices/cancelled/route.ts`
6. `src/app/api/bills/deleted/route.ts`
7. `src/app/api/bills/edit-history/route.ts`
8. `src/app/api/stock/route.ts`

---

## วิธีแก้

### ❌ Syntax ที่ไม่รองรับ (SQL 2012+):

```sql
SELECT 
  m.NumberPrintSalePost as id,
  m.DateSalePost as date,
  m.TotalPrice as totalPrice
FROM dbo.MasterSalePost m
LEFT JOIN dbo.Customer c ON m.CodeCustomer = c.CodeCustomer
WHERE m.DateSalePost >= @startDate
ORDER BY DateSalePost DESC
OFFSET @offset ROWS          -- ❌ SQL 2008 ไม่รู้จัก
FETCH NEXT @limit ROWS ONLY  -- ❌ SQL 2008 ไม่รู้จัก
```

### ✅ Syntax ที่รองรับ SQL 2008:

```sql
WITH PaginatedData AS (
  SELECT 
    m.NumberPrintSalePost as id,
    m.DateSalePost as date,
    m.TotalPrice as totalPrice,
    ROW_NUMBER() OVER (ORDER BY m.DateSalePost DESC) as RowNum  -- ✅ ใช้ ROW_NUMBER
  FROM dbo.MasterSalePost m
  LEFT JOIN dbo.Customer c ON m.CodeCustomer = c.CodeCustomer
  WHERE m.DateSalePost >= @startDate
)
SELECT id, date, totalPrice
FROM PaginatedData
WHERE RowNum > @offset AND RowNum <= (@offset + @limit)  -- ✅ Filter ด้วย RowNum
```

---

## Template สำหรับแก้ไข

### ขั้นตอนที่ 1: หา Query ที่มี `OFFSET ... FETCH`

ค้นหา pattern นี้ในไฟล์:
```typescript
ORDER BY [column] DESC
OFFSET @offset ROWS
FETCH NEXT @limit ROWS ONLY
```

### ขั้นตอนที่ 2: แปลงเป็น CTE + ROW_NUMBER

**Before:**
```typescript
let query = `
  SELECT [columns]
  FROM [tables]
  WHERE [conditions]
  ORDER BY [order]
  OFFSET @offset ROWS
  FETCH NEXT @limit ROWS ONLY
`;
```

**After:**
```typescript
const query = `
  WITH PaginatedData AS (
    SELECT 
      [columns],
      ROW_NUMBER() OVER (ORDER BY [order]) as RowNum
    FROM [tables]
    WHERE [conditions]
  )
  SELECT [column-aliases-only]
  FROM PaginatedData
  WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
`;
```

### ⚠️ สิ่งที่ต้องระวัง:

1. **ORDER BY clause** ต้องเหมือนเดิม (ย้ายไปใน `ROW_NUMBER() OVER (ORDER BY ...)`)
2. **SELECT ชั้นนอก** ต้องใช้ **alias เท่านั้น** (ไม่ใช่ `m.NumberPrintSalePost` แต่ใช้ `id`)
3. **WHERE clause** ต้องอยู่ใน CTE (ไม่ใช่ SELECT ชั้นนอก)
4. **Parameters** (`@offset`, `@limit`) ยังใช้ได้เหมือนเดิม

---

## ตัวอย่างเต็ม: `src/app/api/sales/route.ts`

### ❌ Before (SQL 2012+):

```typescript
let query = `
  SELECT 
    m.NumberPrintSalePost as id,
    m.DateSalePost as date,
    ISNULL(m.NameCustomer, 'ไม่ระบุ') as customerName,
    ISNULL(c.PhoneCustomer, '') as customerPhone,
    m.TotalPrice as totalPrice,
    m.TotalProfit as totalProfit,
    m.Cash as cash,
    m.Transfer as transfer,
    (SELECT COUNT(*) FROM dbo.DetailSalePost WHERE NumberPrintSalePost = m.NumberPrintSalePost) as itemCount
  FROM dbo.MasterSalePost m
  LEFT JOIN dbo.Customer c ON m.CodeCustomer = c.CodeCustomer
`;

if (conditions.length > 0) {
  query += ` WHERE ${conditions.join(" AND ")}`;
}

query += `
  ORDER BY DateSalePost DESC
  OFFSET @offset ROWS
  FETCH NEXT @limit ROWS ONLY
`;
```

### ✅ After (SQL 2008+):

```typescript
let query = `
  WITH PaginatedData AS (
    SELECT 
      m.NumberPrintSalePost as id,
      m.DateSalePost as date,
      ISNULL(m.NameCustomer, 'ไม่ระบุ') as customerName,
      ISNULL(c.PhoneCustomer, '') as customerPhone,
      m.TotalPrice as totalPrice,
      m.TotalProfit as totalProfit,
      m.Cash as cash,
      m.Transfer as transfer,
      (SELECT COUNT(*) FROM dbo.DetailSalePost WHERE NumberPrintSalePost = m.NumberPrintSalePost) as itemCount,
      ROW_NUMBER() OVER (ORDER BY m.DateSalePost DESC) as RowNum
    FROM dbo.MasterSalePost m
    LEFT JOIN dbo.Customer c ON m.CodeCustomer = c.CodeCustomer
`;

if (conditions.length > 0) {
  query += ` WHERE ${conditions.join(" AND ")}`;
}

query += `
  )
  SELECT 
    id, date, customerName, customerPhone, 
    totalPrice, totalProfit, cash, transfer, itemCount
  FROM PaginatedData
  WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
`;
```

---

## สรุป Pattern ทั่วไป

```typescript
// Pattern เดิม
ORDER BY [column]
OFFSET @offset ROWS
FETCH NEXT @limit ROWS ONLY

// แปลงเป็น
WITH PaginatedData AS (
  SELECT 
    [all columns],
    ROW_NUMBER() OVER (ORDER BY [column]) as RowNum
  FROM [tables]
  [WHERE conditions]
)
SELECT [aliases only]
FROM PaginatedData
WHERE RowNum > @offset AND RowNum <= (@offset + @limit)
```

---

## การทดสอบ

### ทดสอบกับ SQL Server 2008:
1. เปิด SSMS เชื่อมต่อ SQL Server 2008
2. Copy query ที่แก้แล้ว
3. ประกาศตัวแปร:
   ```sql
   DECLARE @offset INT = 0;
   DECLARE @limit INT = 20;
   DECLARE @search NVARCHAR(100) = '%%';
   DECLARE @startDate DATE = NULL;
   DECLARE @endDate DATE = NULL;
   ```
4. รัน query
5. ถ้าไม่ error แสดงว่าใช้ได้

### ทดสอบกับ App:
1. Deploy code ที่แก้แล้ว
2. เปิด browser ไปหน้าที่ error เดิม (เช่น `/api/sales?limit=20&offset=0`)
3. ดูว่า return data ปกติไหม

---

## เพิ่มเติม

### ถ้าต้องการให้รองรับทั้ง 2 version:

สามารถเช็ค SQL Server version แล้วใช้ query ที่เหมาะสมได้:

```typescript
// เช็ค SQL version (รันครั้งเดียวตอน init)
const [versionResult] = await executeQuery<{ version: string }>(
  "SELECT CAST(SERVERPROPERTY('ProductVersion') AS VARCHAR) as version"
);
const majorVersion = parseInt(versionResult.version.split('.')[0]);

// ใช้ syntax ตาม version
if (majorVersion >= 11) { // SQL 2012+
  query += `ORDER BY ... OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
} else { // SQL 2008
  query = `WITH PaginatedData AS (...) SELECT ... WHERE RowNum > @offset ...`;
}
```

แต่วิธีนี้ซับซ้อน **แนะนำใช้ ROW_NUMBER() ทุก version เลย** (เพราะ SQL 2012+ ก็รองรับ)

---

## ไฟล์อ้างอิง

- ✅ `SQL-SERVER-2008-COMPATIBILITY-GUIDE.md` (ไฟล์นี้)
- 📝 `fix-sql-2008-compatibility.js` (สคริปต์ scan ไฟล์ที่ต้องแก้)
- 📁 ไฟล์ที่ต้องแก้ทั้งหมดอยู่ใน `src/app/api/*/route.ts`

---

**สร้างโดย:** Kiro AI  
**วันที่:** 2026-06-09  
**สถานะ:** พร้อมใช้งาน - รอแก้ไขใน branch ใหม่
