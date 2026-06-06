# 📚 API Documentation - Tax Invoices & Reports

## Base URL
```
http://localhost:3000/api
```

---

## 📋 API Endpoints

### 1. Tax Invoices - All (ใบกำกับภาษีทั้งหมด)

**Endpoint:** `GET /api/tax-invoices`

**Description:** ดึงรายการใบกำกับภาษีทั้งหมด พร้อมกรองและค้นหา

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | จำนวนรายการต่อหน้า |
| offset | number | 0 | เริ่มต้นจากรายการที่ |
| search | string | - | ค้นหาจากเลขที่บิล/ชื่อลูกค้า/รหัสลูกค้า |
| startDate | string | - | วันที่เริ่มต้น (YYYY-MM-DD) |
| endDate | string | - | วันที่สิ้นสุด (YYYY-MM-DD) |
| status | string | - | สถานะ (ค้างชำระ/ชำระเงินแล้ว/ยกเลิก) |

**Example Request:**
```bash
GET /api/tax-invoices?limit=10&status=ค้างชำระ&startDate=2026-01-01&endDate=2026-06-30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taxInvoices": [
      {
        "numberPrint": "POSV625000001",
        "date": "2025-06-09T00:00:00.000Z",
        "customerCode": "002145",
        "customerName": "โรงพยาบาลส่งเสริมสุขภาพตำบลเชียงสา",
        "nameCar": "งท3318นม",
        "province": "นครราชสีมา",
        "subVatePrice": 15070.00,
        "vatePrice": 1054.90,
        "totalPrice": 16124.90,
        "status": "ค้างชำระ",
        "userName": "ต้นเตย"
      }
    ],
    "total": 5,
    "limit": 10,
    "offset": 0
  },
  "timestamp": "2026-06-06T10:30:00.000Z"
}
```

---

### 2. Cancelled Tax Invoices (ใบกำกับภาษีที่ถูกยกเลิก)

**Endpoint:** `GET /api/tax-invoices/cancelled`

**Description:** ดึงรายการใบกำกับภาษีที่ถูกยกเลิกเท่านั้น

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | จำนวนรายการต่อหน้า |
| offset | number | 0 | เริ่มต้นจากรายการที่ |
| startDate | string | - | วันที่เริ่มต้น (YYYY-MM-DD) |
| endDate | string | - | วันที่สิ้นสุด (YYYY-MM-DD) |

**Example Request:**
```bash
GET /api/tax-invoices/cancelled?limit=20&startDate=2026-01-01&endDate=2026-06-30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "numberPrint": "POSV625000001",
        "date": "2025-06-09T00:00:00.000Z",
        "customerName": "โรงพยาบาลส่งเสริมสุขภาพตำบลเชียงสา",
        "nameCar": "งท3318นม",
        "subVatePrice": 15070.00,
        "vatePrice": 1054.90,
        "totalPrice": 16124.90,
        "userName": "ต้นเตย"
      }
    ],
    "summary": {
      "totalCancelled": 5,
      "totalAmount": 50000.00,
      "totalVat": 3500.00
    },
    "limit": 20,
    "offset": 0
  },
  "timestamp": "2026-06-06T10:30:00.000Z"
}
```

---

### 3. Bill Edit History (ประวัติการแก้ไขบิล)

**Endpoint:** `GET /api/bills/edit-history`

**Description:** ดึงประวัติการแก้ไข/เปลี่ยนแปลงบิลทั้งหมด

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | จำนวนรายการต่อหน้า |
| offset | number | 0 | เริ่มต้นจากรายการที่ |
| startDate | string | - | วันที่เริ่มต้น (YYYY-MM-DD) |
| endDate | string | - | วันที่สิ้นสุด (YYYY-MM-DD) |
| search | string | - | ค้นหาจากเลขที่บิล |

**Example Request:**
```bash
GET /api/bills/edit-history?limit=10&startDate=2026-06-01&endDate=2026-06-30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "numberPrint": "PSC626003948",
        "editDate": "2026-06-02T00:00:00.000Z",
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
      "totalCashChanges": 500,
      "totalTransferChanges": 551
    },
    "limit": 10,
    "offset": 0
  },
  "timestamp": "2026-06-06T10:30:00.000Z"
}
```

---

### 4. Deleted Bills (บิลที่ถูกลบ/ยกเลิก)

**Endpoint:** `GET /api/bills/deleted`

**Description:** ดึงรายการบิลที่ถูกลบ/ยกเลิกล่าสุด

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 50 | จำนวนรายการต่อหน้า |
| offset | number | 0 | เริ่มต้นจากรายการที่ |
| days | number | 30 | ย้อนหลังกี่วัน |

**Example Request:**
```bash
GET /api/bills/deleted?days=30&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "numberPrint": "PSC626003940",
        "originalDate": "2026-06-02T00:00:00.000Z",
        "customerName": "ไม่ระบุ",
        "totalPrice": 48.00,
        "totalProfit": 5.00,
        "cash": 48.00,
        "transfer": 0,
        "status": "ยกเลิก",
        "userName": "พลอย"
      }
    ],
    "summary": {
      "totalDeleted": 5,
      "totalAmount": 5000.00,
      "periodDays": 30
    },
    "limit": 20,
    "offset": 0
  },
  "timestamp": "2026-06-06T10:30:00.000Z"
}
```

---

### 5. Top Selling Products (สินค้าขายดี Top 10)

**Endpoint:** `GET /api/products/top-selling`

**Description:** ดึงสินค้าขายดี Top 10 รายเดือน พร้อมสถิติ

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | number | 10 | จำนวนสินค้า (Top N) |
| month | number | เดือนปัจจุบัน | เดือน (1-12) |
| year | number | ปีปัจจุบัน | ปี (YYYY) |

**Example Request:**
```bash
GET /api/products/top-selling?month=6&year=2026&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
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
      },
      {
        "rank": 2,
        "productName": "Castrol MAG 10W-30 D 1L",
        "barcode": "8851947601704",
        "salesCount": 120,
        "totalQuantity": 500,
        "totalSales": 128500.00,
        "totalProfit": 25000.00,
        "profitMargin": 19.46
      }
    ],
    "summary": {
      "period": "มิถุนายน 2026",
      "totalProducts": 150,
      "totalSales": 2500000.00,
      "totalProfit": 250000.00,
      "averageProfitMargin": 10.00
    }
  },
  "timestamp": "2026-06-06T10:30:00.000Z"
}
```

---

## 🔐 Authentication

ปัจจุบัน API ไม่มี authentication ยัง หากต้องการเพิ่ม authentication:
- เพิ่ม middleware สำหรับตรวจสอบ JWT token
- เพิ่ม Authorization header: `Bearer <token>`

---

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-06-06T10:30:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message here",
  "timestamp": "2026-06-06T10:30:00.000Z"
}
```

---

## 🧪 Testing

### Using cURL
```bash
# Test Tax Invoices
curl "http://localhost:3000/api/tax-invoices?limit=5"

# Test Cancelled Tax Invoices
curl "http://localhost:3000/api/tax-invoices/cancelled?limit=10"

# Test Bill Edit History
curl "http://localhost:3000/api/bills/edit-history?limit=10"

# Test Top Selling Products
curl "http://localhost:3000/api/products/top-selling?month=6&year=2026"
```

### Using Node.js Test Script
```bash
# Make sure the server is running first
npm run dev

# Run test script
node test-new-apis.js
```

---

## 📝 Notes

1. **Date Format**: ใช้ ISO 8601 format (YYYY-MM-DD)
2. **Pagination**: ใช้ `limit` และ `offset` สำหรับแบ่งหน้า
3. **Search**: รองรับ partial match (LIKE %search%)
4. **Status Values**: 
   - `ค้างชำระ` - ค้างชำระ
   - `ชำระเงินแล้ว` - ชำระแล้ว
   - `ยกเลิก` - ยกเลิกแล้ว

---

## 🚀 Next Steps

1. ✅ เพิ่ม authentication และ authorization
2. ✅ เพิ่ม rate limiting
3. ✅ เพิ่ม caching สำหรับ query ที่ช้า
4. ✅ เพิ่ม export to Excel/PDF
5. ✅ เพิ่ม real-time notifications

---

**Created:** June 6, 2026  
**Version:** 1.0.0  
**Project:** Car Service Management System
