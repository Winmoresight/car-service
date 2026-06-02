# 🚀 Quick Start - ServiceCar Dashboard

## ⚡ ทดสอบทันที (1 นาที)

### 1️⃣ ทดสอบ Connection
```bash
node test-connection-production.js
```

✅ คาดหวัง: "ALL TESTS PASSED!"

### 2️⃣ Start Server
```bash
bun run dev
```

✅ คาดหวัง Console:
```
🔐 Using SQL Server Authentication
🔄 Connecting to database (attempt 1/3)...
✅ Database connected successfully
🚀 Database pool warmed up
```

### 3️⃣ เปิดเบราว์เซอร์
- Dashboard: http://localhost:3000
- Health: http://localhost:3000/api/health
- Monitor: http://localhost:3000/api/monitor

---

## ❌ ถ้ามีปัญหา

### Test ล้มเหลว?
ดู: `TEST-CONNECTION-NOW.md`

### ยังมี Timeout?
ดู: `CONNECTION-FIXED.md` และ `FIX-NOW.md`

### ต้องการรายละเอียด?
ดู: `README.md`

---

## ✅ Next Steps

หลังจากทดสอบสำเร็จ:

1. ✅ ดู Dashboard ที่ http://localhost:3000
2. ✅ เช็ค Health API
3. ✅ ทดสอบ Sales, Stock, Products pages
4. ✅ Monitor performance

---

**ใช้เวลา < 1 นาที!** 🎉
