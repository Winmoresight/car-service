# ServiceCar Insight - สรุปข้อมูลและแผนทำเว็บ Dashboard

เอกสารนี้สรุปจากฐานข้อมูล `BaseSeviceCar` บน `localhost\SQLEXPRESS` เพื่อใช้วางโครงสร้างเว็บสรุปข้อมูลภาษาไทย รองรับหน้าจอคอมและมือถือ โดยเน้น UI minimal, อ่านง่าย, ไม่ใช้ gradient, และไม่ทำหน้าตาแบบเว็บ AI

## ชื่อโปรเจกต์ที่แนะนำ

**ServiceCar Insight**

เหตุผล:
- อิงกับฐานข้อมูลเดิม `BaseSeviceCar`
- สื่อว่าเป็นระบบดูข้อมูลเชิงสรุป ไม่ใช่ระบบขายหน้าร้านตัวใหม่
- อ่านง่ายทั้งภาษาไทยและอังกฤษ
- เหมาะกับ dashboard สำหรับเจ้าของร้านหรือผู้จัดการ

ชื่อสำรอง:
- CarService Pulse
- Garage Insight
- BaseCar Mobile
- ServiceCar Dashboard

## ภาพรวมข้อมูลที่พบ

ฐานข้อมูลนี้เป็นระบบขายสินค้า บริการรถ ภาษี พรบ ตรอ ประกัน และสต็อกสินค้า ไม่ใช่ฐานข้อมูลรถอย่างเดียว

ข้อมูลหลัก:

| หมวด | ตารางหลัก | จำนวนข้อมูลโดยประมาณ |
|---|---:|---:|
| การเคลื่อนไหวสต็อก | `INOUTStockProduct` | 37,555 แถว |
| รายการขาย | `DetailSalePost` | 33,336 แถว |
| หัวบิลขาย | `MasterSalePost` | 10,139 แถว |
| ลูกค้า | `Customer` | 8,775 แถว |
| สินค้าเก่า | `MasterProductDetailOld` | 11,971 แถว |
| สินค้า master | `MasterProduct` | 1,094 แถว |
| รายละเอียดสินค้า/barcode | `MasterProductDetail` | 1,093 แถว |
| การชำระเงิน/รายการเงิน | `Payment` | 1,546 แถว |

ช่วงข้อมูลการขาย:

| รายการ | ค่า |
|---|---:|
| วันที่ขายแรกสุด | 14 ก.พ. 2025 |
| วันที่ขายล่าสุด | 2 มิ.ย. 2026 |
| จำนวนบิลขาย | 10,139 บิล |
| จำนวนรายการขาย | 33,336 รายการ |
| จำนวนสินค้าที่ขายรวม | 34,407.5 หน่วย |
| ยอดขายรวม | 13,830,017 บาท |
| ต้นทุนรวม | 12,712,186.24 บาท |
| กำไรรวมจากหัวบิล | 1,117,829.34 บาท |
| กำไรรวมจากรายการขาย | 1,137,009.32 บาท |

หมายเหตุ: กำไรจากหัวบิลและกำไรจากรายการขายต่างกันเล็กน้อย ควรตรวจสอบ logic การคำนวณก่อนทำ dashboard แบบ final

## จุดที่ควรดูเป็นอันดับแรก

### 1. ยอดขายและกำไร

ใช้ตาราง:
- `MasterSalePost`
- `DetailSalePost`

เหตุผล:
- เป็นแกนหลักของ dashboard
- มีข้อมูลครบทั้งยอดขาย ต้นทุน กำไร เงินสด เงินโอน ลูกค้า และข้อมูลรถ
- เหมาะกับหน้าแรกที่สุด

KPI ที่ควรแสดง:
- ยอดขายวันนี้
- ยอดขายเดือนนี้
- จำนวนบิลวันนี้
- กำไรวันนี้/เดือนนี้
- อัตรากำไรขั้นต้น
- เงินสดเทียบกับเงินโอน
- บิลล่าสุด

### 2. สินค้าขายดีและสินค้ากำไรดี

ใช้ตาราง:
- `DetailSalePost`
- `MasterProduct`
- `MasterProductDetail`

สินค้ายอดขายสูงที่พบ:

| สินค้า | ยอดขาย | กำไร |
|---|---:|---:|
| ภาษี | 3,982,444 | 463,349 |
| พรบ จยย | 1,740,754 | 59,914 |
| พรบ.รย1.อินทร | 574,102 | 68,332 |
| ตรอ รย | 566,420 | 3,620 |
| พรบ.รย3. อินทร | 552,385 | 66,889 |

สินค้ากำไรสูงที่พบ:

| สินค้า | ยอดขาย | กำไร |
|---|---:|---:|
| ภาษี | 3,982,444 | 463,349 |
| Castrol MAG 10W-30 D 6L | 147,890 | 93,149 |
| พรบ.รย1.อินทร | 574,102 | 68,332 |
| พรบ.รย3. อินทร | 552,385 | 66,889 |
| พรบ จยย | 1,740,754 | 59,914 |

จุดที่ต้องระวัง:
- บางสินค้าเป็นรายการบริการ เช่น ภาษี พรบ ตรอ
- บางสินค้าเป็นอะไหล่/น้ำมันเครื่องจริง
- ควรแยกหมวดสินค้าเพื่อไม่ให้ dashboard อ่านปนกัน

### 3. สินค้าหรือรายการที่ขาดทุน

ควรทำเป็นหน้า Alert หรือ Insight

ตัวอย่างรายการที่พบว่ากำไรรวมติดลบ:

| สินค้า/รายการ | ยอดขาย | กำไร |
|---|---:|---:|
| ประกันชั้น1 วิริยะ | 103,460 | -31,540 |
| ส่วนลดพิเศษ | -50,107 | -30,927.02 |
| Castrol น้ำมันเกียร์ TRANSMAX ATF 4L | 8,650 | -17,300 |
| ประกันชั้น1 ทิพย | 106,347.06 | -13,652.94 |
| ค่ามัดจำ : เงินสด | -32,240 | -7,324 |

สิ่งที่ควรตรวจสอบ:
- เป็นการขาดทุนจริงหรือเป็น logic ของส่วนลด/มัดจำ
- ต้นทุนถูกกรอกผิดหรือไม่
- รายการของแถมควรแยกหมวดออกจากสินค้าขายจริงหรือไม่

### 4. สต็อกและการเคลื่อนไหวสินค้า

ใช้ตาราง:
- `INOUTStockProduct`
- `MasterProductDetail`

ตาราง `INOUTStockProduct` มีข้อมูลมากที่สุด จึงควรเป็นจุดสำคัญลำดับถัดมา

คอลัมน์สำคัญ:
- `DateSave`
- `NumberPrint`
- `BarCode`
- `NameProduct`
- `Debit`
- `Credit`
- `Stock`
- `CostPrice`
- `NameCompany`

สินค้าที่เคลื่อนไหวบ่อย:

| Barcode | สินค้า | จำนวน movement |
|---|---|---:|
| 30010 | ภาษี | 7,427 |
| 20003 | พรบ จยย | 5,314 |
| 10001 | ตรอ จยย | 4,892 |
| 40012 | ค่าบริการฝากต่อภาษี จยย | 4,819 |
| 10002 | ตรอ รย | 3,089 |

ข้อควรระวัง:
- ค่า `Stock` บางรายการติดลบ เช่น ภาษี, พรบ, ตรอ ซึ่งอาจเป็นบริการ ไม่ใช่สินค้าสต็อกจริง
- ควรมี flag แยก "สินค้าแท้" กับ "บริการ/เอกสาร"
- ห้ามสรุปว่าสต็อกติดลบผิดทั้งหมดจนกว่าจะเข้าใจระบบเดิม

### 5. ลูกค้าและข้อมูลส่วนตัว

ใช้ตาราง:
- `Customer`
- `MasterSalePost`

ตาราง `Customer` มีข้อมูลส่วนตัวสูง:
- ชื่อลูกค้า
- ที่อยู่
- เบอร์โทร
- เลขบัตรประชาชน
- วันเกิด
- ข้อมูลรถ

แนวทาง dashboard:
- ห้ามแสดงเลขบัตรประชาชนบน dashboard
- เบอร์โทรควร masked เช่น `08x-xxx-1234`
- ชื่อลูกค้าควร masked ในหน้าสรุป
- แสดงข้อมูลเต็มเฉพาะหน้ารายละเอียด และต้องมีสิทธิ์ใช้งาน

KPI ที่ทำได้:
- จำนวนลูกค้าทั้งหมด
- ลูกค้าใหม่รายเดือน
- ลูกค้าซื้อซ้ำ
- จังหวัดที่มีลูกค้ามาก
- ลูกค้ากลุ่ม high value แบบ masked

### 6. การเงินและการชำระเงิน

ใช้ตาราง:
- `MasterSalePost`
- `Payment`
- `PayCredit`
- `MasterPaymentCustomer`
- `DetailPaymentCustomer`

ควรทำหลังจากยอดขายและสินค้าเรียบร้อยแล้ว เพราะต้องเข้าใจความหมายของรายการเงินก่อน

KPI ที่ทำได้:
- เงินสด
- เงินโอน
- ยอดเครดิต
- ยอดรับชำระ
- รายการค้างชำระ

## โครงสร้างหน้าเว็บที่แนะนำ

### หน้า 1: ภาพรวม

เหมาะกับเปิดดูบนมือถือทุกเช้า

องค์ประกอบ:
- ยอดขายวันนี้
- กำไรวันนี้
- จำนวนบิลวันนี้
- ยอดขายเดือนนี้
- กราฟยอดขาย 30 วัน
- สินค้าขายดี 5 อันดับ
- Alert รายการขาดทุน

### หน้า 2: ยอดขาย

องค์ประกอบ:
- filter วันที่
- รายการบิลล่าสุด
- ยอดรวมตามวัน/เดือน
- เงินสด/เงินโอน
- drill down ไปดูสินค้าในบิล

### หน้า 3: สินค้า

องค์ประกอบ:
- ค้นหาด้วยชื่อสินค้า/barcode
- ราคาขาย
- ต้นทุน
- กำไรต่อชิ้น
- ยอดขายรวม
- สถานะสินค้า active/inactive

### หน้า 4: สต็อก

องค์ประกอบ:
- movement ล่าสุด
- สินค้าเคลื่อนไหวบ่อย
- สินค้าที่ stock ต่ำ
- สินค้าที่ stock ติดลบ
- แยกบริการออกจากสินค้าจริง

### หน้า 5: ลูกค้า

องค์ประกอบ:
- ค้นหาลูกค้าแบบ masked
- ประวัติซื้อ
- จำนวนบิล
- ยอดซื้อรวม
- จังหวัด
- ข้อมูลรถที่เกี่ยวข้อง

### หน้า 6: Insight/Alert

องค์ประกอบ:
- รายการกำไรติดลบ
- วันที่ยอดขายตก
- สินค้าต้นทุนผิดปกติ
- บิลที่กำไรติดลบ
- สินค้าบริการที่ทำให้ stock ติดลบ

## แนวทาง UI

ภาษา:
- เว็บเป็นภาษาไทยทั้งหมด
- ชื่อระบบใช้ `ServiceCar Insight`
- ใช้คำสั้น ชัด อ่านเร็ว

Style:
- Minimal
- ไม่ใช้ gradient
- ไม่ใช้ visual แบบเว็บ AI
- ไม่ใช้ hero marketing
- ไม่ใช้การ์ดตกแต่งเยอะเกินจำเป็น
- เน้นข้อมูลจริง อ่านง่าย และ scan เร็ว

สี:
- พื้นหลังขาวหรือเทาอ่อน
- ตัวอักษรเทาเข้ม/ดำ
- สีเขียวสำหรับกำไร
- สีแดงสำหรับขาดทุน/alert
- สีเหลืองอำพันสำหรับคำเตือน
- สีน้ำเงินใช้เฉพาะ link หรือ active state ได้เล็กน้อย

Layout desktop:
- Sidebar ซ้าย
- Header บน
- Content กว้างแบบ dashboard
- KPI cards แถวบน
- ตารางและกราฟด้านล่าง

Layout mobile:
- Bottom navigation หรือ top tabs
- KPI เป็น 2 คอลัมน์
- ตารางแปลงเป็น list/card ที่อ่านง่าย
- filter วันที่ต้องใช้งานง่ายด้วยนิ้ว
- ปุ่มต้องกดง่าย ขนาดไม่เล็กเกินไป

## Prompt สำหรับทีมพัฒนา

ใช้ prompt นี้เพื่อวางโครงเว็บ:

```text
สร้างเว็บ dashboard ภาษาไทยชื่อ ServiceCar Insight สำหรับสรุปข้อมูลจากฐานข้อมูล SQL Server ของระบบบริการรถ/ขายสินค้า/ต่อภาษี/พรบ/ตรอ/ประกัน

เป้าหมาย:
- ให้เจ้าของร้านเปิดดูผ่านมือถือและคอมได้ง่าย
- สรุปยอดขาย กำไร สินค้าขายดี สต็อก และ alert สำคัญ
- UI minimal, professional, ไม่ใช้ gradient, ไม่ทำหน้าตาแบบเว็บ AI, ไม่ใช่ landing page
- หน้าแรกต้องเป็น dashboard ใช้งานจริงทันที

ข้อมูลหลัก:
- Database: BaseSeviceCar
- Sales header: dbo.MasterSalePost
- Sales detail: dbo.DetailSalePost
- Product master: dbo.MasterProduct
- Product detail/barcode: dbo.MasterProductDetail
- Stock movement: dbo.INOUTStockProduct
- Customer: dbo.Customer
- Payment: dbo.Payment, dbo.PayCredit, dbo.MasterPaymentCustomer

KPI หน้าแรก:
- ยอดขายวันนี้
- กำไรวันนี้
- จำนวนบิลวันนี้
- ยอดขายเดือนนี้
- กำไรเดือนนี้
- เงินสด/เงินโอน
- สินค้าขายดี 5 อันดับ
- รายการกำไรติดลบ 5 อันดับ
- กราฟยอดขายรายวัน 30 วันล่าสุด

ข้อกำหนดด้านข้อมูลส่วนตัว:
- ห้ามแสดงเลขบัตรประชาชน
- เบอร์โทรต้อง masked
- ชื่อลูกค้าใน dashboard ต้อง masked หรือแสดงเฉพาะเมื่อมีสิทธิ์
- ห้ามแสดงข้อมูล customer เต็มในหน้าแรก

โครงหน้า:
1. ภาพรวม
2. ยอดขาย
3. สินค้า
4. สต็อก
5. ลูกค้า
6. Insight/Alert

แนวทาง responsive:
- Desktop ใช้ sidebar + content dashboard
- Mobile ใช้ bottom navigation หรือ top tabs
- KPI card ต้องอ่านได้ในหน้าจอเล็ก
- ตารางยาวต้องแปลงเป็น list ในมือถือ
- filter วันที่ต้องใช้งานง่าย

ห้าม:
- ห้ามทำ landing page
- ห้ามใช้ gradient เป็นพื้นหลัง
- ห้ามใส่ข้อความอธิบายฟีเจอร์ยาว ๆ บนหน้าเว็บ
- ห้ามทำ UI สีม่วง/น้ำเงินแบบ AI SaaS
- ห้ามแสดงข้อมูลส่วนตัวลูกค้าแบบเต็มโดยไม่จำเป็น
```

## Query เริ่มต้นที่ควรเตรียม

### ยอดขายรวม

```sql
SELECT
    COUNT(*) AS bill_count,
    MIN(DateSalePost) AS first_sale,
    MAX(DateSalePost) AS last_sale,
    SUM(TotalPrice) AS total_sales,
    SUM(TotalCost) AS total_cost,
    SUM(TotalProfit) AS total_profit
FROM dbo.MasterSalePost;
```

### ยอดขายรายวัน

```sql
SELECT
    CONVERT(date, DateSalePost) AS sale_date,
    COUNT(*) AS bill_count,
    SUM(TotalPrice) AS sales,
    SUM(TotalProfit) AS profit,
    SUM(Cash) AS cash,
    SUM(Transfer) AS transfer
FROM dbo.MasterSalePost
GROUP BY CONVERT(date, DateSalePost)
ORDER BY sale_date DESC;
```

### สินค้าขายดี

```sql
SELECT TOP 20
    NameProduct,
    SUM(NumProduct) AS qty,
    SUM(SumPrice) AS sales,
    SUM(SumCost) AS cost,
    SUM(SumProfit) AS profit
FROM dbo.DetailSalePost
GROUP BY NameProduct
ORDER BY sales DESC;
```

### สินค้ากำไรสูง

```sql
SELECT TOP 20
    NameProduct,
    SUM(NumProduct) AS qty,
    SUM(SumPrice) AS sales,
    SUM(SumProfit) AS profit
FROM dbo.DetailSalePost
GROUP BY NameProduct
ORDER BY profit DESC;
```

### รายการกำไรติดลบ

```sql
SELECT TOP 20
    NameProduct,
    SUM(NumProduct) AS qty,
    SUM(SumPrice) AS sales,
    SUM(SumProfit) AS profit
FROM dbo.DetailSalePost
GROUP BY NameProduct
HAVING SUM(SumProfit) < 0
ORDER BY profit ASC;
```

### สินค้าที่เคลื่อนไหวบ่อย

```sql
SELECT TOP 20
    BarCode,
    NameProduct,
    COUNT(*) AS move_count,
    MAX(DateSave) AS last_move
FROM dbo.INOUTStockProduct
GROUP BY BarCode, NameProduct
ORDER BY move_count DESC;
```

## แผนงานแนะนำ

### Phase 1: Data Understanding

เป้าหมาย:
- ยืนยันความหมายของตารางหลัก
- แยกบริการกับสินค้าจริง
- ตรวจ logic กำไร ต้นทุน ส่วนลด และมัดจำ

งาน:
- ตรวจ `MasterSalePost` และ `DetailSalePost`
- ตรวจ relationship ด้วย `NumberPrintSalePost`
- ตรวจสินค้าขาดทุน
- ตรวจ stock ติดลบว่าเป็นบริการหรือสินค้าจริง

### Phase 2: Dashboard MVP

เป้าหมาย:
- ทำเว็บอ่านง่ายผ่านมือถือ
- ใช้ข้อมูลจริงจาก SQL Server
- ยังไม่ต้องมีระบบแก้ไขข้อมูล

งาน:
- หน้า Overview
- หน้า Sales
- หน้า Product
- หน้า Stock
- ระบบ filter วันที่
- API สำหรับ query KPI

### Phase 3: Privacy and Role

เป้าหมาย:
- ป้องกันข้อมูลลูกค้า
- แสดงข้อมูลตามสิทธิ์

งาน:
- login
- role admin/staff/viewer
- masking ชื่อ เบอร์ เลขบัตร
- audit การเปิดดูข้อมูลลูกค้า

### Phase 4: Insight

เป้าหมาย:
- ให้ระบบช่วยชี้จุดที่ควรดู

งาน:
- alert รายการขาดทุน
- alert stock ผิดปกติ
- alert ยอดขายตก
- alert สินค้ากำไรดี
- สรุปรายวันสำหรับเจ้าของร้าน

## Tech Stack & Tools ที่แนะนำ

### Frontend (มีอยู่แล้ว ✅)

**Core Framework:**
- **Next.js 16.2.7** - React framework พร้อม App Router, Server Components, และ React 19 Compiler
- **React 19.2.4** - ใช้ React Compiler เพื่อ performance ดีขึ้น
- **TypeScript 5** - Type safety สำหรับ codebase ขนาดใหญ่

**UI & Styling:**
- **Tailwind CSS 4** - Utility-first CSS framework
- **shadcn/ui** - Component library ที่ customize ได้ง่าย (มี Button component แล้ว)
- **Radix UI** - Headless UI primitives สำหรับ accessibility
- **lucide-react** - Icon library minimal และสวย
- **class-variance-authority (CVA)** - สำหรับจัดการ component variants
- **tailwind-merge** - รวม Tailwind classes อย่างฉลาด

**Code Quality:**
- **Biome** - Fast linter & formatter (แทน ESLint + Prettier)
- **TypeScript strict mode** - ป้องกัน runtime errors

### Backend & Database (ต้องเพิ่ม 🔧)

**Database Connection:**
```
ติดตั้ง: bun add mssql
```
- **mssql** (node-mssql) - Official SQL Server driver สำหรับ Node.js
- รองรับ connection pooling, prepared statements, และ transactions
- ทำงานได้ดีกับ SQL Server Express

**ORM/Query Builder (แนะนำ - optional):**

**ตัวเลือก A: Prisma** (แนะนำสำหรับโปรเจกต์ใหม่)
```
ติดตั้ง: bun add prisma @prisma/client
ติดตั้ง: bunx prisma init
```
ข้อดี:
- Type-safe queries แบบ auto-complete
- Schema visualization
- Migration management
- IntelliSense เต็มรูป

ข้อเสี้ย:
- ต้องสร้าง schema ใหม่ (introspect จาก DB ที่มีได้)
- Bundle size ใหญ่กว่า raw SQL เล็กน้อย

**ตัวเลือก B: Drizzle ORM** (เบา และเร็ว)
```
ติดตั้ง: bun add drizzle-orm better-sqlite3
ติดตั้ง: bun add -D drizzle-kit
```
ข้อดี:
- Performance สูงกว่า Prisma
- SQL-like syntax
- Zero dependencies in production

**ตัวเลือก C: ใช้ Raw SQL** (ถ้าทีมคุ้นเคยกับ SQL)
- ใช้ `mssql` package เขียน query เอง
- เหมาะกับทีมที่ชำนาญ T-SQL
- Performance ดีที่สุด
- ต้องระวังเรื่อง SQL injection

**คำแนะนำ:** เริ่มด้วย **raw mssql** สำหรับ MVP เพราะ query ไม่ซับซ้อน แล้วค่อย refactor เป็น Prisma ทีหลังถ้าต้องการ

### API Layer (ต้องสร้าง 📝)

**Next.js Route Handlers (App Router):**
```
src/app/api/
  ├── dashboard/
  │   └── route.ts          # GET /api/dashboard (KPI วันนี้)
  ├── sales/
  │   ├── route.ts          # GET /api/sales (รายการบิล)
  │   ├── daily/route.ts    # GET /api/sales/daily (ยอดขายรายวัน)
  │   └── [id]/route.ts     # GET /api/sales/:id (รายละเอียดบิล)
  ├── products/
  │   ├── route.ts          # GET /api/products (รายการสินค้า)
  │   ├── top/route.ts      # GET /api/products/top (สินค้าขายดี)
  │   └── loss/route.ts     # GET /api/products/loss (รายการขาดทุน)
  ├── stock/
  │   └── route.ts          # GET /api/stock (สต็อกและ movement)
  └── customers/
      └── route.ts          # GET /api/customers (ลูกค้า - masked)
```

**Data Fetching Pattern:**
- ใช้ **Server Components** สำหรับ initial data
- ใช้ **Client Components + SWR/React Query** สำหรับ real-time updates

### State Management & Data Fetching (แนะนำ 🎯)

**ตัวเลือก A: SWR** (จาก Vercel)
```
ติดตั้ง: bun add swr
```
ข้อดี:
- Lightweight (5KB)
- Auto revalidation
- Cache management
- Optimistic UI
- เหมาะกับ Next.js

**ตัวเลือก B: TanStack Query (React Query)**
```
ติดตั้ง: bun add @tanstack/react-query
```
ข้อดี:
- Feature ครบกว่า SWR
- DevTools ดี
- Infinite scroll built-in
- Mutation management ดีกว่า

**คำแนะนำ:** ใช้ **SWR** เพราะเบาและ integrate กับ Next.js ได้ดี

### Charts & Visualization (ใช้ shadcn/ui Charts ✅)

**shadcn/ui Charts** - Built-in และพร้อมใช้งาน!
```bash
# ติดตั้ง chart components จาก shadcn
bunx shadcn@latest add chart
```

Chart types ที่มีใน shadcn:
- **Line Chart** - เหมาะกับยอดขายรายวัน/รายเดือน
- **Bar Chart** - เหมาะกับเปรียบเทียบสินค้าขายดี
- **Area Chart** - เหมาะกับแสดงกำไรสะสม
- **Pie Chart / Donut Chart** - เหมาะกับสัดส่วนเงินสด/เงินโอน
- **Radar Chart** - เหมาะกับเปรียบเทียบหมวดสินค้า
- **Interactive Charts** - รองรับ tooltip, legend, และ responsive

ข้อดี:
- ใช้ **Recharts** ภายใน (battle-tested library)
- Styling ด้วย Tailwind แบบเดียวกับ component อื่น ๆ
- Accessible และ responsive out of the box
- Type-safe กับ TypeScript
- Minimal design ตรงตามที่ต้องการ
- ไม่ต้องติดตั้งอะไรเพิ่ม (มี dependencies ครบอยู่แล้ว)

**คำแนะนำ:** ใช้ **shadcn/ui Charts** เพราะมีอยู่แล้ว, minimal, และ integrate ได้ลงตัวกับ UI ที่มี

### Date & Time Handling (ต้องเพิ่ม 📅)

```
ติดตั้ง: bun add date-fns
```
- **date-fns** - Modern date utility (tree-shakeable)
- รองรับ Thai locale ได้ดี
- ใช้ format วันที่แบบไทย เช่น "2 มิ.ย. 2569"

```typescript
import { format } from 'date-fns';
import { th } from 'date-fns/locale';

format(new Date(), 'd MMM yyyy', { locale: th }); // "2 มิ.ย. 2569"
```

### Table & Data Display (แนะนำ 📋)

**ตัวเลือก A: TanStack Table (React Table v8)**
```
ติดตั้ง: bun add @tanstack/react-table
```
ข้อดี:
- Headless table library
- Sorting, filtering, pagination built-in
- Virtual scrolling support
- TypeScript support ดีมาก
- ทำ responsive table ได้ง่าย

**ตัวเลือก B: ใช้ shadcn/ui Table component**
- มีอยู่แล้วใน shadcn
- เบาและเพียงพอสำหรับ MVP
- ต้องจัดการ sorting/filtering เอง

**คำแนะนำ:** เริ่มด้วย **shadcn Table** สำหรับ MVP แล้วค่อย upgrade เป็น TanStack Table ถ้าต้องการ advanced features

### Authentication & Authorization (Phase 3 🔐)

**ตัวเลือก A: NextAuth.js (Auth.js v5)**
```
ติดตั้ง: bun add next-auth@beta
```
ข้อดี:
- Built สำหรับ Next.js
- Session management
- Role-based access control
- รองรับ credentials, OAuth

**ตัวเลือก B: Clerk**
```
ติดตั้ง: bun add @clerk/nextjs
```
ข้อดี:
- Drop-in solution
- Beautiful UI out of the box
- User management panel
- มีค่าใช้จ่าย (free tier 10k MAU)

**คำแนะนำ:** ใช้ **NextAuth.js** เพราะฟรีและควบคุมได้เต็ม

### Data Masking & Privacy (Phase 3 🔒)

สร้าง utility functions:

```typescript
// src/lib/privacy.ts
export function maskPhone(phone: string): string {
  return phone.replace(/(\d{2})\d{4}(\d{4})/, '$1x-xxx-$2');
}

export function maskIdCard(idCard: string): string {
  return idCard.replace(/(\d{1})\d{11}(\d{1})/, '$1-xxxx-xxxxx-xx-$2');
}

export function maskName(name: string): string {
  const parts = name.split(' ');
  return parts.map(p => p[0] + 'x'.repeat(p.length - 1)).join(' ');
}
```

### Environment Variables (ต้องสร้าง 🔧)

สร้างไฟล์ `.env.local`:

```bash
# Database
DATABASE_SERVER=localhost\\SQLEXPRESS
DATABASE_NAME=BaseSeviceCar
DATABASE_USER=sa
DATABASE_PASSWORD=your_password
DATABASE_PORT=1433
DATABASE_ENCRYPT=false
DATABASE_TRUST_SERVER_CERTIFICATE=true

# Next Auth (Phase 3)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here

# App Config
NODE_ENV=development
```

เพิ่ม type safety:

```typescript
// src/env.ts
export const env = {
  database: {
    server: process.env.DATABASE_SERVER!,
    database: process.env.DATABASE_NAME!,
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
  }
} as const;
```

### Development Tools (มีอยู่บ้างแล้ว ✅)

- **Biome** ✅ - Linting & formatting
- **TypeScript** ✅ - Type checking
- **Bun** - Package manager (เร็วกว่า npm/yarn)

**เพิ่มเติม:**
```
ติดตั้ง: bun add -D @types/mssql
```

### Deployment Recommendations (ในอนาคต 🚀)

**ตัวเลือก A: Vercel** (แนะนำ)
- Deploy Next.js ได้ทันที
- Free tier เพียงพอสำหรับ internal dashboard
- Edge functions
- ต้องระวังเรื่อง SQL Server connection (ใช้ connection pooling)

**ตัวเลือก B: Self-hosted**
- Docker container
- VPS (DigitalOcean, Linode, AWS Lightsail)
- ควบคุมได้เต็ม
- อยู่ network เดียวกับ SQL Server ได้

**คำแนะนำ:** Self-hosted ถ้า SQL Server อยู่ on-premise, Vercel ถ้า SQL Server อยู่ cloud หรือมี VPN

### Package Installation Order (สำหรับเริ่มต้น)

```bash
# Phase 1: Database & API
bun add mssql
bun add -D @types/mssql

# Phase 1: Data Fetching
bun add swr

# Phase 1: Charts & UI Components
bunx shadcn@latest add chart
bunx shadcn@latest add card
bunx shadcn@latest add table

# Phase 1: Date Handling
bun add date-fns

# Phase 2: Tables (optional - ถ้าต้องการ advanced features)
bun add @tanstack/react-table

# Phase 3: Authentication
bun add next-auth@beta
```

### Recommended Project Structure

```
src/
├── app/
│   ├── (dashboard)/              # Dashboard routes group
│   │   ├── layout.tsx           # Shared dashboard layout
│   │   ├── page.tsx             # หน้า Overview
│   │   ├── sales/
│   │   │   └── page.tsx         # หน้า ยอดขาย
│   │   ├── products/
│   │   │   └── page.tsx         # หน้า สินค้า
│   │   ├── stock/
│   │   │   └── page.tsx         # หน้า สต็อก
│   │   ├── customers/
│   │   │   └── page.tsx         # หน้า ลูกค้า
│   │   └── insights/
│   │       └── page.tsx         # หน้า Insight/Alert
│   ├── api/                     # API routes
│   │   ├── dashboard/
│   │   ├── sales/
│   │   ├── products/
│   │   ├── stock/
│   │   └── customers/
│   ├── layout.tsx               # Root layout
│   └── globals.css
├── components/
│   ├── dashboard/               # Dashboard-specific components
│   │   ├── kpi-card.tsx
│   │   ├── sales-chart.tsx
│   │   ├── top-products-table.tsx
│   │   └── loss-alert-table.tsx
│   ├── layout/                  # Layout components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── mobile-nav.tsx
│   ├── ui/                      # shadcn components
│   │   ├── button.tsx ✅
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   └── ...
│   └── fonts/ ✅
├── lib/
│   ├── db.ts                    # Database connection & queries
│   ├── privacy.ts               # Data masking functions
│   ├── utils.ts ✅              # Utility functions
│   └── env.ts                   # Environment variables
└── types/
    ├── database.ts              # Database types
    └── api.ts                   # API response types
```

## คำแนะนำสำหรับการเริ่มพัฒนา

เริ่มจาก dashboard ที่ใช้ `MasterSalePost` และ `DetailSalePost` ก่อน เพราะข้อมูลครบและให้มูลค่าทันที

อย่าเริ่มจากลูกค้าหรือรหัสผ่าน เพราะมีข้อมูลอ่อนไหว

อย่าเริ่มจาก stock แบบเต็มทันที เพราะมีบริการหลายรายการที่ทำให้ stock ติดลบโดยธรรมชาติ ต้องแยกประเภทก่อน

ลำดับที่เหมาะที่สุด:

1. Overview sales
2. Product ranking
3. Loss alert
4. Stock movement
5. Customer insight แบบ masked
6. Payment/credit

## สรุปสำหรับหัวหน้าทีม

โปรเจกต์นี้ควรเริ่มเป็น dashboard สรุปยอดขายและกำไรก่อน ไม่ใช่ระบบบริหารร้านเต็มรูปแบบ

ฐานข้อมูลมีข้อมูลจริงมากพอสำหรับ dashboard แล้ว โดยเฉพาะยอดขาย รายการขาย สินค้า และ stock movement

จุดเสี่ยงหลักคือข้อมูลลูกค้าและการตีความ stock ติดลบ จึงต้องออกแบบเรื่อง privacy และ data classification ตั้งแต่แรก

MVP ที่ดีควรตอบคำถาม 5 ข้อนี้:

1. วันนี้ขายได้เท่าไร
2. เดือนนี้กำไรเท่าไร
3. อะไรขายดีที่สุด
4. อะไรขาดทุนหรือผิดปกติ
5. มีสินค้า/บริการไหนควรตรวจสอบก่อน

