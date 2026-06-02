# 🧪 ทดสอบ Connection ตอนนี้เลย!

## 🚀 Quick Start (3 ขั้นตอน)

### 1️⃣ ทดสอบ Connection
```bash
node test-connection-production.js
```

**คาดหวัง:**
```
============================================================
🧪 Production Connection Test
============================================================

📋 Configuration:
   Server: localhost
   Database: BaseSeviceCar
   User: sa
   ...

🔄 Test 1: Establishing connection...
✅ Connected in 234ms

🔄 Test 2: Running simple query...
✅ Query executed in 12ms

🔄 Test 3: Querying database tables...
✅ Query executed in 45ms

🔄 Test 4: Pool Statistics
   Connected: true
   Pool Size: 0
   Available: 0

🔄 Test 5: Running 10 concurrent queries...
✅ All queries completed in 89ms

🔄 Test 6: Running heavy query...
✅ Heavy query executed in 156ms

============================================================
✅ ALL TESTS PASSED!
============================================================

⚡ Performance Summary:
   Connection: 234ms
   Simple Query: 12ms
   Database Query: 45ms
   Concurrent Queries: 89ms
   Heavy Query: 156ms
```

### 2️⃣ Start Dev Server
```bash
bun run dev
```

**ดู Console:**
```
🔐 Using SQL Server Authentication
🔄 Connecting to database (attempt 1/3)...
✅ Database connected successfully
🚀 Database pool warmed up
📊 Pool stats: { connected: true, size: 0 }
```

### 3️⃣ เช็ค Health Check
เปิดเบราว์เซอร์: `http://localhost:3000/api/health`

**คาดหวัง:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-02T...",
  "uptime": 123.456,
  "database": {
    "status": "healthy",
    "responseTime": "15ms",
    "pool": {
      "connected": true,
      "size": 2,
      "available": 1,
      "pending": 0,
      "borrowed": 1
    }
  },
  "system": {
    "nodeVersion": "v20.0.0",
    "platform": "win32",
    "memory": {
      "used": "120MB",
      "total": "256MB"
    }
  },
  "responseTime": "18ms"
}
```

---

## ✅ ถ้าทุกอย่างผ่าน

คุณจะเห็น:
1. ✅ Test script แสดง "ALL TESTS PASSED"
2. ✅ Dev server เชื่อมต่อได้โดยไม่มี error
3. ✅ Health check แสดง `"status": "ok"`
4. ✅ Dashboard โหลดได้ไม่ timeout

**แสดงว่าแก้เสร็จแล้ว!** 🎉

---

## ❌ ถ้ายังมีปัญหา

### Error: "Failed to connect in 60000ms"

**แก้:**
1. เปิด `services.msc`
2. หา "SQL Server (SQLEXPRESS)"
3. Right-click → Start
4. ลองใหม่

### Error: "Login failed"

**แก้:**
1. เช็ค `.env.local`:
   ```
   DATABASE_USER=sa
   DATABASE_PASSWORD=YourPassword  # ตรงกับที่ตั้งไว้?
   ```
2. เปิด SSMS → Security → Logins → sa
3. Right-click → Properties → Status
4. Login: **Enabled** ✅

### Error: "ECONNREFUSED"

**แก้:**
1. SQL Server Configuration Manager
2. Protocols for SQLEXPRESS
3. TCP/IP → **Enabled** ✅
4. IP Addresses → IPALL → TCP Port: **1433**
5. Restart SQL Server

### Error: "Request timeout"

**แก้:**
ถ้า query ช้ามาก (>60 วินาที):
1. เปิด SQL Server Management Studio
2. รัน query นั้นดู execution plan
3. เพิ่ม index ให้ table
4. Optimize query

---

## 📊 Monitor Performance

### ดู Pool Statistics
```bash
# ใน dev server console จะมี
📊 Pool stats: {
  connected: true,
  size: 2,        # จำนวน connections ที่เปิดอยู่
  available: 1,   # จำนวนที่ว่างพร้อมใช้
  pending: 0,     # จำนวนที่รอ
  borrowed: 1     # จำนวนที่กำลังใช้งาน
}
```

### เช็ค Performance ตลอดเวลา
```bash
curl http://localhost:3000/api/health
```

ดูที่:
- `database.responseTime` - ควร < 100ms
- `database.pool.available` - ควร > 0 (มี connection พร้อมใช้)
- `database.pool.pending` - ควร = 0 (ไม่มีคนรอ)

---

## 🎯 Performance Goals

### Good ✅
- Connection: < 2s
- Query: < 200ms
- Health check: < 50ms
- Pool available: > 0

### Warning ⚠️
- Connection: 2-5s → ควรตรวจสอบ
- Query: 200-1000ms → ควร optimize
- Pool available: 0 → อาจต้องเพิ่ม max pool

### Critical ❌
- Connection: > 5s → มีปัญหาต้องแก้
- Query: > 1s → ต้อง optimize ด่วน
- Pool pending: > 5 → เพิ่ม max pool

---

## 🔄 ถ้าอัพเดทโค้ด

หลังจากแก้ไข `src/lib/db.ts` หรือ API routes:

1. **Restart Dev Server**
   ```bash
   # Ctrl+C แล้ว
   bun run dev
   ```

2. **ทดสอบใหม่**
   ```bash
   node test-connection-production.js
   ```

3. **เช็ค Health**
   ```bash
   curl http://localhost:3000/api/health
   ```

---

## 💡 Tips

### Development
- เปิด console ตลอดเพื่อดู logs
- ใช้ Health API เช็คก่อน commit
- ทดสอบ concurrent requests

### Production
- Set up monitoring สำหรับ `/api/health`
- Alert เมื่อ `status !== "ok"`
- Backup database ก่อน deploy
- Monitor logs หลัง deploy

### Performance
- เพิ่ม index ให้ columns ที่ใช้ WHERE
- Cache data ที่เปลี่ยนไม่บ่อย
- Use pagination สำหรับ large datasets
- Monitor slow queries

---

## 📝 Checklist สำหรับ Production

ก่อน deploy:

- [ ] ✅ Test script ผ่านทุก test
- [ ] ✅ Health API response "ok"
- [ ] ✅ Dashboard โหลดได้ไม่ timeout
- [ ] ✅ ทดสอบ concurrent users (load test)
- [ ] ✅ Connection pool config เหมาะสม
- [ ] ✅ Error handling ครอบคลุม
- [ ] ✅ Monitoring พร้อม
- [ ] ✅ Backup strategy พร้อม
- [ ] ✅ .env.local มี credentials ถูกต้อง
- [ ] ✅ SQL Server configuration ถูกต้อง

---

## 🆘 ยังไม่ได้อีก?

แชร์ข้อมูลเหล่านี้:

1. **Test Script Output**
   ```bash
   node test-connection-production.js > test-output.txt 2>&1
   ```

2. **Dev Server Logs**
   ```bash
   bun run dev > dev-logs.txt 2>&1
   ```

3. **Health Check Response**
   ```bash
   curl http://localhost:3000/api/health > health.json
   ```

4. **.env.local** (ซ่อน password)
   ```
   DATABASE_SERVER=?
   DATABASE_NAME=?
   DATABASE_PORT=?
   ```

5. **SQL Server Version**
   ```sql
   SELECT @@VERSION
   ```

---

สร้างเมื่อ: 2 June 2026  
Updated: หลังแก้ Connection Timeout
