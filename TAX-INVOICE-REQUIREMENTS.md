# 📋 สรุป Requirements: ระบบรายงานใบกำกับภาษีและยอดขาย

## 🎯 Requirements ที่ต้องการพัฒนา

### 1. **ใบกำกับภาษีที่ถูกยกเลิก** (`masterPrintPostVate`)
- แสดงรายการใบกำกับภาษีทั้งหมดที่ถูกยกเลิก
- กรองตามช่วงเวลา (วัน/เดือน/ปี)
- แสดงยอดเงินที่ถูกยกเลิก
- ระบุเหตุผลและผู้ยกเลิก

**ตารางที่เกี่ยวข้อง:**
- `MasterPrintPostVate` (ใบกำกับภาษีหลัก - มี VAT)
- `DetailPrintPostVate` (รายละเอียดใบกำกับภาษี)
- `MasterPrintCashVate` (ใบเสร็จเงินสด/ภาษี)
- `DetailPrintCashVate` (รายละเอียดเงินสด)

**Field สำคัญ:**
- `Status`: สถานะบิล (ชำระเงินแล้ว / ค้างชำระ / **ยกเลิก**)
- `NumberPrintPost`: เลขที่บิล
- `DatePost`: วันที่ออกบิล
- `TotalPrice`: ยอดรวม
- `VatePrice`: ภาษี VAT

---

### 2. **บิลที่ถูกแก้ไข / ยกเลิก** (`ChangeEditPrint`)
- แสดงประวัติการแก้ไขทั้งหมด
- เปรียบเทียบข้อมูลเก่า-ใหม่ (ยอดเงิน, ธนาคาร)
- แสดงผู้แก้ไข, วันเวลา
- แสดงบิลที่ถูกลบล่าสุด

**ตารางที่เกี่ยวข้อง:**
- `ChangeEditPrint` ✅ (บันทึกการแก้ไข/ยกเลิก) - **มีข้อมูล 1,051 รายการ**
- `EditTotalOldNewPrint` (แก้ไขยอดรวมเก่า-ใหม่)

**Field สำคัญ:**
```
- DateEditPrint: วันที่แก้ไข
- Times: เวลา
- NumberPrint: เลขที่บิล
- PayCashOld / PayCashNew: เงินสดเก่า/ใหม่
- PayTransferOld / PayTransferNew: เงินโอนเก่า/ใหม่
- NameBankOld / NameBankNew: ธนาคารเก่า/ใหม่
- NameUser: ผู้แก้ไข
```

---

### 3. **สรุปรายการสินค้า Top 10** (ขายหน้าร้าน)
- สินค้าขายดี 10 อันดับแรก
- สรุปรายเดือน
- แสดงจำนวน, ยอดขาย, กำไร
- กรองตามช่วงเวลา

**ตารางที่เกี่ยวข้อง:**
- `DetailSalePost` (รายละเอียดสินค้าแต่ละบิล)
- `MasterSalePost` (บิลขายหน้าร้าน)

**Field สำคัญ:**
```
- NameProduct: ชื่อสินค้า
- NumProduct: จำนวน
- SumPrice: ยอดขาย
- SumProfit: กำไร
- DateSalePost: วันที่ขาย
```

**Query ตัวอย่าง:**
```sql
SELECT TOP 10
  NameProduct,
  COUNT(*) as sales_count,
  SUM(NumProduct) as total_quantity,
  SUM(SumPrice) as total_sales,
  SUM(SumProfit) as total_profit
FROM dbo.DetailSalePost
WHERE YEAR(DateSalePost) = YEAR(GETDATE())
  AND MONTH(DateSalePost) = MONTH(GETDATE())
GROUP BY NameProduct
ORDER BY total_sales DESC
```

---

## 📊 โครงสร้างตารางสำคัญ

### `MasterPrintPostVate` (ใบกำกับภาษีหลัก)
```
- DatePost (datetime): วันที่ออกบิล
- NumberPrintPost (nvarchar 30): เลขที่บิล
- NameCustomer (nvarchar): ชื่อลูกค้า
- SubVatePrice (money): ราคาก่อน VAT
- VatePrice (money): ภาษี VAT 7%
- TotalPrice (money): ยอดรวมทั้งหมด
- Status (nvarchar 30): สถานะ (ชำระเงินแล้ว / ค้างชำระ / ยกเลิก)
- NameUser (nvarchar 250): ผู้ออกบิล

📈 จำนวนข้อมูล: 5 รายการ
```

### `DetailPrintPostVate` (รายละเอียดใบกำกับภาษี)
```
- DatePost (datetime): วันที่
- NumberPrintPost (nvarchar 30): เลขที่บิล
- BarCode (nvarchar 30): บาร์โค้ดสินค้า
- NameProduct (nvarchar 250): ชื่อสินค้า
- NumProduct (nvarchar 30): จำนวน
- SalePrice (nvarchar 30): ราคาขาย
- VatePrice (nvarchar 30): ภาษี VAT
- SumPrice (nvarchar 30): ยอดรวม
- CheckVate (nvarchar 1): Y = มี VAT, N = ไม่มี VAT
- Status (nvarchar 30): สถานะ

📈 จำนวนข้อมูล: 12 รายการ
```

### `ChangeEditPrint` (ประวัติการแก้ไขบิล) ⭐
```
- DateEditPrint (datetime): วันที่แก้ไข
- Times (nvarchar 20): เวลา
- NumberPrint (nvarchar 30): เลขที่บิล
- PayCashOld (money): เงินสดเดิม
- PayTransferOld (money): เงินโอนเดิม
- NameBankOld (nvarchar 200): ธนาคารเดิม
- PayCashNew (money): เงินสดใหม่
- PayTransferNew (money): เงินโอนใหม่
- NameBankNew (nvarchar 200): ธนาคารใหม่
- NameUser (nvarchar 200): ผู้แก้ไข

📈 จำนวนข้อมูล: 1,051 รายการ ✅
```

### `MasterSalePost` (บิลขายหน้าร้าน - ที่ใช้อยู่แล้ว)
```
- DateSalePost (datetime): วันที่ขาย
- NumberPrintSalePost (nvarchar 20): เลขที่บิล
- NameCustomer (nvarchar): ชื่อลูกค้า
- TotalPrice (money): ยอดรวม
- TotalProfit (money): กำไร
- Cash (money): เงินสด
- Transfer (money): เงินโอน
- Status (nvarchar 30): สถานะ (ชำระเงินแล้ว / ค้างชำระ)

📈 จำนวนข้อมูล: มาก (ใช้งานหลักอยู่แล้ว)
```

### `DetailSalePost` (รายละเอียดสินค้าแต่ละบิล)
```
- DateSalePost (datetime): วันที่ขาย
- NumberPrintSalePost (nvarchar 20): เลขที่บิล
- BarCode (nvarchar 20): บาร์โค้ด
- NameProduct (nvarchar 250): ชื่อสินค้า
- NumProduct (real): จำนวน
- SalePrice (money): ราคาขาย
- SumPrice (money): ยอดรวม
- SumProfit (money): กำไร

📈 จำนวนข้อมูล: มาก (ใช้งานหลักอยู่แล้ว)
```

---

## 🛠️ API Endpoints ที่ต้องสร้าง

### 1. `/api/tax-invoices/cancelled` - ใบกำกับภาษีที่ถูกยกเลิก
```typescript
GET /api/tax-invoices/cancelled?startDate=2026-01-01&endDate=2026-06-30

Response:
{
  "data": [
    {
      "numberPrint": "POSV625000001",
      "date": "2025-06-09",
      "customerName": "โรงพยาบาล...",
      "totalPrice": 16124.90,
      "vatePrice": 1054.90,
      "cancelledBy": "ต้นเตย",
      "cancelledDate": "2025-06-10",
      "reason": "ลูกค้าขอยกเลิก"
    }
  ],
  "summary": {
    "totalCancelled": 5,
    "totalAmount": 50000.00
  }
}
```

### 2. `/api/bills/edit-history` - ประวัติการแก้ไข/ยกเลิกบิล
```typescript
GET /api/bills/edit-history?startDate=2026-06-01&endDate=2026-06-30&limit=50

Response:
{
  "data": [
    {
      "numberPrint": "PSC626003948",
      "editDate": "2026-06-02",
      "editTime": "9:41:23",
      "changes": {
        "cash": { "old": 740, "new": 740 },
        "transfer": { "old": 0, "new": 0 },
        "bank": { "old": "", "new": "กรุงไทย" }
      },
      "editedBy": "พลอย",
      "totalChange": 0
    }
  ],
  "summary": {
    "totalEdits": 1051,
    "recentEdits": 15
  }
}
```

### 3. `/api/products/top-selling` - สินค้าขายดี Top 10
```typescript
GET /api/products/top-selling?month=6&year=2026&limit=10

Response:
{
  "data": [
    {
      "rank": 1,
      "productName": "GOODYEAR 245/70 R16",
      "barcode": "0104010110",
      "salesCount": 50,
      "totalQuantity": 200,
      "totalSales": 690000.00,
      "totalProfit": 50000.00,
      "profitMargin": 7.25
    }
  ],
  "summary": {
    "period": "มิถุนายน 2026",
    "totalProducts": 150,
    "totalSales": 2500000.00,
    "totalProfit": 250000.00
  }
}
```

### 4. `/api/bills/deleted` - บิลที่ถูกลบล่าสุด
```typescript
GET /api/bills/deleted?days=30

Response:
{
  "data": [
    {
      "numberPrint": "PSC626003940",
      "deletedDate": "2026-06-03",
      "deletedTime": "14:30:00",
      "originalDate": "2026-06-02",
      "totalPrice": 48.00,
      "deletedBy": "admin",
      "reason": "ข้อมูลผิดพลาด"
    }
  ],
  "summary": {
    "totalDeleted": 5,
    "periodDays": 30
  }
}
```

---

## 📂 ไฟล์ที่สร้างไว้แล้ว

1. ✅ `find-tax-invoice-tables.sql` - SQL query สำหรับค้นหา tables
2. ✅ `run-find-tax-tables.js` - Node script ค้นหา tables ทั้งหมด
3. ✅ `check-tax-invoice-structure.js` - Node script ดูโครงสร้างละเอียด
4. ✅ `tax-invoice-tables-report.json` - รายงาน tables ทั้งหมด
5. ✅ `tax-invoice-structure-report.json` - รายงานโครงสร้างละเอียด

---

## 🚀 ขั้นตอนการพัฒนาต่อไป

### Phase 1: Backend API
1. สร้าง API endpoints ตามที่ระบุด้านบน
2. เพิ่ม validation และ error handling
3. เพิ่ม pagination สำหรับข้อมูลจำนวนมาก
4. ทดสอบ API ด้วย Postman/Thunder Client

### Phase 2: Frontend Dashboard
1. สร้างหน้า Dashboard แสดงสถิติรวม
2. สร้างตารางแสดงใบกำกับภาษีที่ยกเลิก
3. สร้างตารางประวัติการแก้ไข
4. สร้างกราฟ Top 10 สินค้าขายดี
5. เพิ่มฟีเจอร์กรองข้อมูล (วันที่, เดือน)

### Phase 3: Reports & Export
1. สร้างรายงาน PDF
2. Export ไฟล์ Excel
3. สร้างกราฟวิเคราะห์แนวโน้ม
4. Email notification สำหรับบิลที่แก้ไข

---

## 💡 หมายเหตุสำคัญ

### ตารางใบกำกับภาษีที่พบ:
- ✅ `MasterPrintPostVate` - ใบกำกับภาษีหลัก (VAT)
- ✅ `DetailPrintPostVate` - รายละเอียดใบกำกับภาษี
- ✅ `MasterPrintCashVate` - ใบเสร็จเงินสด/ภาษี
- ✅ `DetailPrintCashVate` - รายละเอียดเงินสด
- ✅ `ChangeEditPrint` - ประวัติแก้ไข (1,051 รายการ!) ⭐

### ตารางบิลปกติ:
- ✅ `MasterPrintPost` - บิลปกติ (ไม่มี VAT)
- ✅ `DetailPrintPost` - รายละเอียดบิลปกติ

### คำถามที่ต้องชี้แจง:
1. **บิลที่ถูกยกเลิก** - ระบบปัจจุบันเก็บใน field `Status` หรือมีตารางแยกเก็บบิลที่ยกเลิก?
2. **เหตุผลการยกเลิก** - มีการเก็บเหตุผลไว้หรือไม่? หรือต้องเพิ่ม field ใหม่?
3. **สิทธิ์การแก้ไข** - มีการจำกัดสิทธิ์ว่าใครแก้ไขได้บ้างหรือไม่?

---

**สร้างเมื่อ:** June 6, 2026  
**ผู้สร้าง:** Kiro AI Assistant  
**Project:** Car Service Management System
