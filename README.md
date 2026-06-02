# 🚗 ServiceCar Insight Dashboard

Dashboard สำหรับวิเคราะห์ข้อมูลการขายและสต็อกจากฐานข้อมูล **BaseSeviceCar** บน SQL Server Express

> Built with Next.js 16, React 19, TypeScript, shadcn/ui, และ Tailwind CSS 4

---

## ✨ Features

### 📊 Dashboard (หน้าหลัก)
- **4 KPI Cards**: ยอดขาย, บิลขาย, กำไร, จำนวนลูกค้า
- **Sales Chart**: กราฟยอดขาย 30 วันล่าสุด
- **Top Products Table**: สินค้าขายดีอันดับ 1-10
- **Loss Alert Table**: สินค้าที่ขาดทุน
- **Auto-refresh**: 30-60 วินาที

### 💰 Sales (ยอดขาย)
- แสดงบิลขายทั้งหมด **10,139+ บิล**
- **Pagination**: 20 รายการ/หน้า
- **Search**: ค้นหาเลขที่บิล หรือชื่อลูกค้า
- **Sale Detail Dialog**: คลิกดูรายละเอียดบิลเต็ม
  - ข้อมูลลูกค้า (masked for privacy)
  - รายการสินค้าพร้อมกำไรต่อรายการ
  - สรุปยอดรวม + % กำไร
- Export button (UI ready)

### 📦 Stock (สต็อก)
- **Tab: สรุปสต็อก**
  - รายการสินค้าทั้งหมด
  - สต็อกปัจจุบัน + Badge สถานะ
  - จำนวนครั้งเคลื่อนไหว
- **Tab: การเคลื่อนไหว**
  - รายการเคลื่อนไหวล่าสุด 100 รายการ
  - ประเภท: เข้า/ออก
  - สต็อกคงเหลือ

### 🛍️ Products (สินค้า)
- แสดงข้อมูลสินค้า
- Tabs: ทั้งหมด, ขายดี, ขาดทุน
- Filter by category

### 👥 Customers (ลูกค้า)
- Template with privacy notices
- Coming soon features

### 💡 Insights (วิเคราะห์)
- Alerts & Warnings
- Analysis & Recommendations
- Coming soon features

---

## 🛠 Tech Stack

- **Framework**: Next.js 16.2.7 (App Router + Turbopack)
- **React**: 19
- **TypeScript**: 5.7+
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI)
- **Charts**: Recharts (via shadcn Charts)
- **Database**: SQL Server Express (mssql driver)
- **Data Fetching**: SWR
- **Date**: date-fns
- **Package Manager**: Bun

---

## 📁 Project Structure

```
car-service/
├── src/
│   ├── app/
│   │   ├── api/              # API Routes
│   │   │   ├── dashboard/    # KPI + Stats
│   │   │   ├── sales/        # Sales APIs
│   │   │   │   ├── route.ts  # List with pagination
│   │   │   │   ├── [id]/     # Detail by ID
│   │   │   │   └── daily/    # Daily aggregation
│   │   │   ├── stock/        # Stock APIs
│   │   │   └── products/     # Product APIs
│   │   ├── (pages)/
│   │   │   ├── page.tsx      # Dashboard
│   │   │   ├── sales/        # Sales page
│   │   │   ├── stock/        # Stock page
│   │   │   ├── products/     # Products page
│   │   │   ├── customers/    # Customers page
│   │   │   └── insights/     # Insights page
│   │   └── layout.tsx        # Root layout
│   ├── components/
│   │   ├── dashboard/        # Dashboard components
│   │   ├── sales/            # Sales components
│   │   ├── layout/           # Sidebar, Header, Nav
│   │   └── ui/               # shadcn components
│   ├── lib/
│   │   ├── db.ts             # Database connection
│   │   ├── privacy.ts        # Data masking functions
│   │   └── env.ts            # Environment config
│   └── types/
│       ├── api.ts            # API types
│       ├── dashboard.ts      # Dashboard types
│       └── ...
├── .env.local                # Environment variables
└── package.json
```

---

## 🔧 Connection & Performance

### ⚡ Production-Ready Connection (Updated June 2026)

ระบบได้รับการปรับปรุงแล้วเพื่อแก้ปัญหา **Connection Timeout**:

✅ **Auto-retry logic** (3 attempts)  
✅ **Health checks** before using connections  
✅ **Optimized pool** (max: 20, min: 0, idle eviction)  
✅ **Timeout increased** to 60s (connection + query)  
✅ **Auto-reconnect** on connection loss  
✅ **Query retry** on transient failures  
✅ **Graceful shutdown** on process exit  

### 🧪 Testing Connection

```bash
# ทดสอบ connection พร้อม performance metrics
node test-connection-production.js
```

**Expected output:**
- ✅ Connection: 100-2000ms
- ✅ Simple query: 5-50ms
- ✅ Database query: 10-200ms
- ✅ Concurrent queries: 50-300ms

### 🩺 Health Check

```bash
# เช็คสถานะระบบ
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "ok",
  "database": {
    "status": "healthy",
    "responseTime": "15ms",
    "pool": {
      "connected": true,
      "size": 2,
      "available": 1
    }
  }
}
```

### 📊 Monitoring

```bash
# ดูสถิติและ metrics
curl http://localhost:3000/api/monitor
```

**Metrics include:**
- Total requests & error rate
- Average response time
- Slow queries count
- Pool statistics

### 📖 Detailed Guides

- **CONNECTION-FIXED.md** - สิ่งที่แก้ไขและทำไมแก้
- **TEST-CONNECTION-NOW.md** - วิธีทดสอบทีละขั้นตอน
- **FIX-NOW.md** - Troubleshooting guide ฉบับเต็ม

---

## 🚀 Getting Started

### Prerequisites

- **Bun** (package manager)
- **SQL Server Express** with database `BaseSeviceCar`
- **Node.js** 18+ (for Next.js)

### Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd car-service

# 2. Install dependencies
bun install

# 3. Configure environment variables
# Copy .env.example to .env.local
cp .env.example .env.local

# Edit .env.local:
DATABASE_SERVER=localhost
DATABASE_NAME=BaseSeviceCar
DATABASE_USER=sa
DATABASE_PASSWORD=YourPassword
DATABASE_ENCRYPT=false
DATABASE_TRUST_SERVER_CERTIFICATE=true
```

### Configuration (.env.local)

```env
# Database Connection - Production Ready
DATABASE_SERVER=localhost              # หรือ localhost\SQLEXPRESS
DATABASE_NAME=BaseSeviceCar
DATABASE_USER=sa
DATABASE_PASSWORD=BirthDay:O9I2O5!
DATABASE_PORT=1433
DATABASE_ENCRYPT=false
DATABASE_TRUST_SERVER_CERTIFICATE=true

# App Config
NODE_ENV=development
```

**Note:** Pool settings ถูกตั้งค่าใน `src/lib/db.ts` แล้ว (max: 20, min: 0, timeout: 60s)

### Run Development Server

```bash
# ทดสอบ connection ก่อน (recommended)
node test-connection-production.js

# Start dev server
bun run dev
```

**Console output:**
```
🔐 Using SQL Server Authentication
🔄 Connecting to database (attempt 1/3)...
✅ Database connected successfully
🚀 Database pool warmed up
📊 Pool stats: { connected: true, size: 0 }
```

Open [http://localhost:3000](http://localhost:3000)

**Monitor:**
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- Stats: [http://localhost:3000/api/monitor](http://localhost:3000/api/monitor)

### Build for Production

```bash
bun run build
bun run start
```

---

## 📊 Database Schema

### Tables Used:

1. **MasterSalePost** - หัวบิลขาย
   - NumberPrintSalePost (ID)
   - DateSalePost
   - TotalPrice, TotalCost, TotalProfit
   - Cash, Transfer
   - Customer info

2. **DetailSalePost** - รายการสินค้าในบิล
   - NumberPrintSalePost (FK)
   - BarCode, NameProduct
   - NumProduct, PriceProduct
   - SumPrice, SumProfit

3. **INOUTStockProduct** - การเคลื่อนไหวสต็อก
   - BarCode, NameProduct
   - DateSave
   - Debit (เข้า), Credit (ออก)
   - Stock (คงเหลือ)

---

## 🔐 Privacy & Security

### Data Masking Functions (`src/lib/privacy.ts`)

- **maskName**: `สมชาย วงศ์ดี` → `สxx วxxxxx`
- **maskPhone**: `081-234-5678` → `0xx-xxx-xxxx`
- **maskIdCard**: `1-2345-67890-12-3` → `x-xxxx-xxxxx-xx-x`

ใช้กับข้อมูลลูกค้าในทุก API response

---

## 📝 API Documentation

### Dashboard APIs

#### GET `/api/dashboard`
```json
{
  "totalSales": 13842050.00,
  "totalOrders": 10139,
  "totalProfit": 1123094.00,
  "totalCustomers": 8234
}
```

#### GET `/api/sales/daily?days=30`
```json
{
  "dailySales": [
    { "date": "2025-02-01", "sales": 450000, "orders": 45 }
  ]
}
```

### Sales APIs

#### GET `/api/sales?limit=20&offset=0&search=xxx`
```json
{
  "sales": [...],
  "total": 10139,
  "limit": 20,
  "offset": 0
}
```

#### GET `/api/sales/[id]`
```json
{
  "id": "xxx",
  "date": "2025-02-01T10:30:00Z",
  "totalPrice": 15000,
  "customer": { "name": "สxx วxxxxx", "phone": "0xx-xxx-xxxx" },
  "items": [...]
}
```

### Stock APIs

#### GET `/api/stock?type=summary&limit=50`
```json
{
  "data": [
    {
      "barCode": "8851234567890",
      "name": "Product A",
      "currentStock": 50,
      "movements": 25
    }
  ]
}
```

#### GET `/api/stock?type=movements&limit=100`
```json
{
  "data": [
    {
      "barCode": "8851234567890",
      "type": "in",
      "quantity": 10,
      "stock": 50
    }
  ]
}
```

---

## 🎨 UI Components

### shadcn/ui Components Used:
- ✅ Button
- ✅ Card
- ✅ Table
- ✅ Badge
- ✅ Avatar
- ✅ Select
- ✅ Input
- ✅ Skeleton
- ✅ Tabs
- ✅ Separator
- ✅ Dialog
- ✅ Chart (Recharts wrapper)

---

## 🚦 Performance

### Connection Performance (After Optimization):
- **First connection**: 100-2000ms (with auto-retry)
- **Pool reuse**: <10ms (connection already open)
- **Query execution**: 10-200ms
- **Concurrent queries**: <300ms for 10 queries
- **Recovery time**: 2-6s (on connection loss)

### API Response Times:
- **Health check**: 15-50ms
- **Dashboard KPI**: 50-150ms
- **Sales list**: 30-100ms
- **Sale detail**: 100-200ms
- **Stock summary**: 80-200ms

### Optimization Features:
- ✅ Connection pool (max: 20, dynamic scaling)
- ✅ Lazy initialization (min: 0, no idle maintenance)
- ✅ Health checks before use
- ✅ Auto-retry on failure (3 attempts)
- ✅ Query auto-retry (2 attempts)
- ✅ Timeout management (60s)
- ✅ Connection eviction (30s idle)
- ✅ Graceful shutdown
- ✅ SWR caching on frontend
- ✅ Skeleton loading states

### Monitoring Endpoints:
- **GET /api/health** - System health check
- **GET /api/monitor** - Performance metrics

---

## 📅 Development Phases

### ✅ Phase 1: MVP Dashboard (Complete)
- Basic dashboard with KPIs
- Sales chart
- Top products & loss alerts
- Database connection

### ✅ Phase 2: Navigation & Pages (Complete)
- Sidebar (desktop) + Bottom nav (mobile)
- All pages created
- Responsive layout

### ✅ Phase 3: Real Data & Features (Complete)
- Sales API with pagination
- Sale detail dialog
- Stock API with tabs
- Real-time data integration

### 🎯 Phase 4: Advanced Features (Ideas)
- Date range picker
- Export functionality (Excel/PDF)
- Advanced filters
- Authentication (NextAuth.js)
- Notifications & alerts
- Reports & analytics

---

## 🐛 Troubleshooting

### Connection Issues

**If you see timeout errors:**

```bash
# 1. ทดสอบ connection
node test-connection-production.js

# 2. เช็ค health
curl http://localhost:3000/api/health

# 3. ดู logs
# Server console จะบอกปัญหา
```

**Common issues:**

1. **"Failed to connect in 60000ms"**
   - SQL Server ไม่ได้รัน → เปิด services.msc
   - TCP/IP ปิด → เปิดใน SQL Server Configuration Manager
   - Port ไม่ถูก → ตั้ง TCP Port = 1433

2. **"Login failed"**
   - Username/Password ผิด → เช็ค .env.local
   - SQL Auth ปิด → เปิดใน SSMS
   - sa disabled → enable ใน Security → Logins → sa

3. **"ECONNREFUSED"**
   - Firewall block → เปิด port 1433
   - ใช้ `localhost\SQLEXPRESS` แทน `localhost`

**Detailed guides:**
- `TEST-CONNECTION-NOW.md` - Quick testing guide
- `CONNECTION-FIXED.md` - What was fixed and why
- `FIX-NOW.md` - Complete troubleshooting steps

### Build Errors

```bash
# Clean build
rm -rf .next
bun run build
```

### Performance Issues

```bash
# Check pool statistics
curl http://localhost:3000/api/monitor

# Look for:
# - errorRate > 5% → investigate errors
# - avgResponseTime > 1s → slow queries
# - pool.pending > 0 → need more connections
```

---

## 📖 Documentation

### Setup & Configuration
- **SETUP.md** - ขั้นตอนการติดตั้งและ setup
- **FIX-NOW.md** - แก้ปัญหา connection timeout (detailed)

### Connection & Performance
- **CONNECTION-FIXED.md** - สิ่งที่แก้ไขแล้ว (June 2026)
- **TEST-CONNECTION-NOW.md** - วิธีทดสอบทีละขั้นตอน
- **OPTIMIZATION.md** - Performance optimization guide

### Development Phases
- **PHASE1-COMPLETE.md** - Phase 1 summary
- **PHASE2-COMPLETE.md** - Phase 2 summary  
- **PHASE3-COMPLETE.md** - Phase 3 summary

### Project Planning
- **servicecar-insight-brief.md** - Project overview & planning
- **AGENTS.md** - Agent rules for Next.js

---

## 👨‍💻 Development

### Available Scripts

```bash
bun run dev          # Start development server
bun run build        # Build for production
bun run start        # Start production server
bun run lint         # Run Biome linter
bun run lint:fix     # Fix linting issues
```

### Code Quality

- **Linter**: Biome
- **Type Checking**: TypeScript strict mode
- **Formatting**: Biome formatter

---

## 📊 Stats

- **Total Files**: 50+
- **Lines of Code**: ~5,000+
- **API Endpoints**: 8
- **Pages**: 6
- **Components**: 20+
- **Database Records**: 10,139 sales

---

## 🙏 Credits

- Next.js Team
- shadcn/ui
- Tailwind CSS
- Radix UI
- Recharts

---

## 📄 License

MIT

---

**Built with ❤️ for ServiceCar**
