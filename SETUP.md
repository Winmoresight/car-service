# ServiceCar Insight - Setup Guide

## Phase 1: MVP Dashboard Setup ✅

### สิ่งที่ติดตั้งแล้ว

```bash
✅ mssql - SQL Server driver
✅ swr - Data fetching library
✅ date-fns - Date formatting
✅ @types/mssql - TypeScript types
✅ shadcn/ui components (chart, card, table, badge)
```

### โครงสร้างโปรเจกต์

```
src/
├── app/
│   ├── api/
│   │   ├── dashboard/route.ts      # KPI endpoint
│   │   ├── sales/daily/route.ts    # Daily sales endpoint
│   │   └── products/
│   │       ├── top/route.ts        # Top products endpoint
│   │       └── loss/route.ts       # Loss products endpoint
│   ├── page.tsx                    # Dashboard page
│   └── layout.tsx
├── components/
│   ├── dashboard/
│   │   ├── kpi-card.tsx
│   │   ├── sales-chart.tsx
│   │   ├── top-products-table.tsx
│   │   └── loss-alert-table.tsx
│   └── ui/                         # shadcn components
├── lib/
│   ├── db.ts                       # Database connection
│   ├── env.ts                      # Environment config
│   ├── privacy.ts                  # Data masking
│   └── utils.ts
└── types/
    ├── database.ts                 # Database types
    └── api.ts                      # API types
```

## การตั้งค่า

### 1. แก้ไข .env.local

แก้ไข `.env.local` ให้ตรงกับการตั้งค่า SQL Server ของคุณ:

```bash
DATABASE_SERVER=localhost\\SQLEXPRESS
DATABASE_NAME=BaseSeviceCar
DATABASE_USER=sa
DATABASE_PASSWORD=your_actual_password_here
DATABASE_PORT=1433
DATABASE_ENCRYPT=false
DATABASE_TRUST_SERVER_CERTIFICATE=true
```

**สำคัญ:** อย่าลืมใส่รหัสผ่านจริงของคุณใน `DATABASE_PASSWORD`

### 2. ตรวจสอบ SQL Server

ตรวจสอบว่า SQL Server Express กำลังรันอยู่:

**Windows:**
```cmd
# เปิด Services และตรวจสอบว่า SQL Server (SQLEXPRESS) กำลังรัน
services.msc
```

**หรือใช้ SQL Server Configuration Manager:**
- เปิด SQL Server Configuration Manager
- ตรวจสอบ SQL Server Services
- ตรวจสอบ SQL Server Network Configuration (enable TCP/IP)

### 3. ทดสอบการเชื่อมต่อ

สร้างไฟล์ทดสอบ `test-db.js`:

```javascript
const sql = require('mssql');

const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'BaseSeviceCar',
  user: 'sa',
  password: 'your_password',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function testConnection() {
  try {
    await sql.connect(config);
    console.log('✅ Database connected successfully!');
    const result = await sql.query('SELECT COUNT(*) as count FROM dbo.MasterSalePost');
    console.log('Total sales:', result.recordset[0].count);
    await sql.close();
  } catch (err) {
    console.error('❌ Connection failed:', err);
  }
}

testConnection();
```

รันทดสอบ:
```bash
node test-db.js
```

### 4. รัน Development Server

```bash
bun run dev
```

เปิดเบราว์เซอร์: http://localhost:3000

## Features ที่ทำงานแล้ว

### หน้า Dashboard (/)

✅ **KPI Cards:**
- ยอดขายวันนี้
- กำไรวันนี้
- ยอดขายเดือนนี้
- อัตรากำไรขั้นต้น
- เงินสด/เงินโอนวันนี้

✅ **กราฟยอดขาย:**
- แสดงยอดขายและกำไร 30 วันล่าสุด
- Interactive chart พร้อม tooltip
- Responsive design

✅ **ตารางสินค้าขายดี:**
- Top 10 สินค้าขายดี
- แสดงยอดขาย, กำไร, จำนวน, % กำไร

✅ **รายการขาดทุน (Alert):**
- สินค้าที่กำไรติดลบ
- Alert สีแดงชัดเจน
- แสดง 5 อันดับแรก

### API Endpoints

✅ `GET /api/dashboard` - KPI หลัก
✅ `GET /api/sales/daily?days=30` - ยอดขายรายวัน
✅ `GET /api/products/top?limit=10&sortBy=sales` - สินค้าขายดี
✅ `GET /api/products/loss?limit=5` - รายการขาดทุน

### Auto-refresh

- KPI: ทุก 30 วินาที
- Charts & Tables: ทุก 60 วินาที

## Troubleshooting

### ❌ ไม่สามารถเชื่อมต่อ Database

1. ตรวจสอบว่า SQL Server Express กำลังรันอยู่
2. ตรวจสอบ username/password ใน `.env.local`
3. ตรวจสอบว่า TCP/IP enabled ใน SQL Server Configuration Manager
4. ตรวจสอบ firewall settings (port 1433)
5. ลองใช้ SQL Server Authentication แทน Windows Authentication

### ❌ "Login failed for user 'sa'"

- ตรวจสอบรหัสผ่าน
- ตรวจสอบว่า SQL Server Authentication enabled (ไม่ใช่แค่ Windows Authentication)

### ❌ "Cannot open database 'BaseSeviceCar'"

- ตรวจสอบชื่อฐานข้อมูลว่าถูกต้อง
- ตรวจสอบว่า user มีสิทธิ์เข้าถึงฐานข้อมูล

### ❌ Charts ไม่แสดง

- ตรวจสอบว่า API endpoints ทำงาน (เปิด Network tab ใน DevTools)
- ตรวจสอบ console errors
- ลอง refresh หน้าเว็บ

## Next Steps (Phase 2)

- [ ] เพิ่มหน้า Sales (รายละเอียดบิลขาย)
- [ ] เพิ่มหน้า Products (รายการสินค้า)
- [ ] เพิ่มหน้า Stock (สต็อกและ movement)
- [ ] เพิ่มหน้า Customers (ลูกค้า แบบ masked)
- [ ] เพิ่ม Date filter
- [ ] เพิ่ม Mobile navigation
- [ ] เพิ่ม Authentication (Phase 3)

## ติดต่อ/ขอความช่วยเหลือ

หากมีปัญหาหรือต้องการความช่วยเหลือ กรุณาตรวจสอบ:
1. Console errors ในเบราว์เซอร์ (F12)
2. Terminal errors จาก Next.js dev server
3. SQL Server logs
