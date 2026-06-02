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
# Database Connection
DATABASE_SERVER=localhost
DATABASE_NAME=BaseSeviceCar
DATABASE_USER=sa
DATABASE_PASSWORD=BirthDay:O9I2O5!
DATABASE_ENCRYPT=false
DATABASE_TRUST_SERVER_CERTIFICATE=true

# Database Pool Settings
DATABASE_CONNECTION_TIMEOUT=30000
DATABASE_REQUEST_TIMEOUT=30000
DATABASE_POOL_MAX=10
DATABASE_POOL_MIN=2
```

### Run Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

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

### API Response Times:
- **First load**: 1-3s (connection warm-up)
- **Subsequent**: 20-100ms
- **Pagination**: 30-50ms
- **Detail fetch**: 100-200ms

### Optimization Features:
- Connection pool with min=2 connections
- Pool warm-up on server start
- SWR caching
- Auto-refresh with intervals
- Skeleton loading states

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

If you see timeout errors:

1. Check SQL Server is running
2. Verify connection string in `.env.local`
3. Use `localhost` instead of `localhost\\SQLEXPRESS` for faster connection
4. Check SQL Server Authentication is enabled

See `FIX-NOW.md` for detailed troubleshooting guide.

### Build Errors

```bash
# Clean build
rm -rf .next
bun run build
```

---

## 📖 Documentation

- **SETUP.md** - ขั้นตอนการติดตั้งและ setup
- **FIX-NOW.md** - แก้ปัญหา connection timeout
- **OPTIMIZATION.md** - Performance optimization guide
- **PHASE1-COMPLETE.md** - Phase 1 summary
- **PHASE2-COMPLETE.md** - Phase 2 summary
- **PHASE3-COMPLETE.md** - Phase 3 summary
- **servicecar-insight-brief.md** - Project overview & planning

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
