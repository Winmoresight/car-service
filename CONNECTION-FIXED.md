# ✅ Connection Timeout แก้แล้ว!

## 🎯 สิ่งที่แก้ไข

### 1. 🔧 Database Connection Pool (src/lib/db.ts)

#### ปัญหาเดิม:
- Connection timeout สั้นเกินไป (30 วินาที)
- Pool config ไม่เหมาะสม (min: 2 ทำให้เสีย resource)
- ไม่มี retry logic
- ไม่มี health check
- Connection ตายแล้วไม่รู้

#### แก้แล้ว:
✅ **เพิ่ม timeout เป็น 60 วินาที**
```typescript
connectionTimeout: 60000,
requestTimeout: 60000,
```

✅ **Optimize Pool Configuration**
```typescript
pool: {
  max: 20,           // รองรับ load มากขึ้น
  min: 0,            // ไม่ maintain idle connections (ประหยัด resource)
  idleTimeoutMillis: 30000,
  acquireTimeoutMillis: 60000,
  createTimeoutMillis: 60000,
  evictionRunIntervalMillis: 10000, // ลบ idle connections ทุก 10 วินาที
}
```

✅ **Auto Retry Logic (3 ครั้ง)**
```typescript
// ถ้า connect ล้มเหลว จะลองใหม่อัตโนมัติ
for (let attempt = 1; attempt <= 3; attempt++) {
  // retry with exponential backoff: 2s, 4s, 6s
}
```

✅ **Health Check ก่อนใช้**
```typescript
async function isPoolHealthy(pool) {
  // ทดสอบด้วย SELECT 1 ก่อนใช้จริง
  // ถ้า fail จะสร้าง pool ใหม่
}
```

✅ **Auto Reconnect เมื่อ Connection หลุด**
```typescript
// ตรวจจับ connection error แล้ว reset pool
if (isConnectionError) {
  await pool.close();
  pool = null; // จะสร้างใหม่ทันที
}
```

✅ **Query Auto Retry (2 ครั้ง)**
```typescript
export async function executeQuery(query, params, retryOnFailure = true) {
  // ถ้า query fail จะลองใหม่อัตโนมัติ
}
```

✅ **Pool Statistics Monitoring**
```typescript
export function getPoolStats() {
  return {
    connected: pool.connected,
    size: pool.size,
    available: pool.available,
    pending: pool.pending,
    borrowed: pool.borrowed,
  };
}
```

✅ **Graceful Shutdown**
```typescript
// ปิด connections อย่างถูกต้องตอน shutdown
process.on("SIGINT", async () => {
  await closePool();
  process.exit(0);
});
```

---

### 2. ⚙️ Next.js Configuration (next.config.ts)

✅ **เพิ่ม API timeout**
```typescript
experimental: {
  proxyTimeout: 120000, // 2 นาที
},
serverRuntimeConfig: {
  requestTimeout: 120000,
}
```

---

### 3. 🛡️ API Error Handling (src/lib/api-utils.ts)

✅ **Timeout Wrapper**
```typescript
withTimeout(async () => {
  // code ของคุณ
}, 60000); // timeout 60 วินาที
```

✅ **Smart Error Handling**
```typescript
handleApiError(error, context)
// ตรวจจับ error type แล้วส่ง response ที่เหมาะสม
// - Connection error → 503
// - Query error → 400
// - Permission error → 403
```

✅ **Retry Helper**
```typescript
retry(fn, { maxAttempts: 3, delayMs: 1000, backoff: true })
// ลองใหม่อัตโนมัติพร้อม exponential backoff
```

---

### 4. 🩺 Health Check API

✅ **GET /api/health** - ตรวจสอบสถานะระบบ
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
  },
  "system": {
    "memory": { "used": "120MB", "total": "256MB" }
  }
}
```

เรียกใช้: `http://localhost:3000/api/health`

---

### 5. 🧪 Production Test Script

✅ **test-connection-production.js** - ทดสอบครบทุกกรณี

รัน:
```bash
node test-connection-production.js
```

ทดสอบ:
- ✅ Connection speed
- ✅ Simple query
- ✅ Database query
- ✅ Pool statistics
- ✅ Concurrent queries (10 queries)
- ✅ Heavy query
- ✅ Performance summary

---

## 📊 ผลลัพธ์

### ก่อนแก้:
❌ Connection timeout ทุก 30 วินาที  
❌ ไม่มี retry → fail ทันที  
❌ ไม่รู้ว่า connection ตาย  
❌ Pool ไม่ efficient (maintain idle connections)  
❌ Error handling แย่  

### หลังแก้:
✅ **Timeout เพิ่มเป็น 60 วินาที**  
✅ **Auto retry 3 ครั้ง** (connection + query)  
✅ **Health check** ก่อนใช้ทุกครั้ง  
✅ **Pool optimization** (min: 0, max: 20)  
✅ **Auto reconnect** เมื่อ connection หลุด  
✅ **Monitoring** พร้อม statistics  
✅ **Graceful shutdown** ปิดอย่างถูกต้อง  
✅ **Better error handling** แยก error type  

---

## 🚀 วิธีใช้งาน

### 1. ทดสอบ Connection
```bash
node test-connection-production.js
```

### 2. ตรวจสอบ Health
เปิดเบราว์เซอร์: `http://localhost:3000/api/health`

### 3. Start Dev Server
```bash
bun run dev
```

### 4. Monitor Logs
ดู console จะมี:
```
🔐 Using SQL Server Authentication
🔄 Connecting to database (attempt 1/3)...
✅ Database connected successfully
🚀 Database pool warmed up
📊 Pool stats: { connected: true, size: 0, available: 0 }
```

---

## 🎯 Best Practices ที่ใช้

1. **Connection Pooling** - ใช้ซ้ำแทนสร้างใหม่ทุกครั้ง
2. **Lazy Initialization** - min: 0 ไม่ maintain idle connections
3. **Health Checks** - ตรวจสอบก่อนใช้
4. **Automatic Retry** - ลองใหม่ถ้าล้มเหลว
5. **Exponential Backoff** - เพิ่ม delay ทีละน้อย (2s, 4s, 6s)
6. **Timeout Management** - มี timeout ทุกระดับ
7. **Error Classification** - แยก error type เพื่อจัดการที่ถูกต้อง
8. **Graceful Shutdown** - ปิด connections ก่อน exit
9. **Monitoring** - มี statistics และ health check
10. **Idempotency** - เรียกซ้ำได้โดยไม่เกิดปัญหา

---

## 📈 Performance Benchmarks

### Expected Performance:
- **Connection**: 100-2000ms (ครั้งแรก), <50ms (pool reuse)
- **Simple Query**: 5-50ms
- **Database Query**: 10-200ms (ขึ้นกับ data size)
- **Concurrent Queries**: 50-300ms (10 queries)
- **Heavy Query**: 100-1000ms (ขึ้นกับ complexity)

### Warning Thresholds:
⚠️ Connection > 5s → ตรวจสอบ SQL Server  
⚠️ Query > 1s → optimize query หรือ add index  
⚠️ Pool available = 0 → อาจต้องเพิ่ม max pool  

---

## 🔍 Troubleshooting

### ถ้ายังมีปัญหา Timeout:

1. **เช็ค SQL Server**
   ```bash
   # ใน services.msc
   SQL Server (SQLEXPRESS) → Status = Running
   ```

2. **เช็ค TCP/IP**
   ```bash
   # SQL Server Configuration Manager
   Protocols for SQLEXPRESS → TCP/IP → Enabled
   ```

3. **เช็ค Firewall**
   ```powershell
   New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -Protocol TCP -LocalPort 1433 -Action Allow
   ```

4. **เช็ค .env.local**
   ```bash
   DATABASE_SERVER=localhost  # ลอง localhost\SQLEXPRESS ถ้าไม่ได้
   DATABASE_PORT=1433
   DATABASE_USER=sa
   DATABASE_PASSWORD=YourPassword
   ```

5. **ดู Health Check**
   ```bash
   curl http://localhost:3000/api/health
   ```

6. **ดู Logs**
   ใน console จะบอกว่าติดขั้นตอนไหน

---

## 💡 Tips

### Development:
- ใช้ `GET /api/health` เช็คทุกครั้งก่อน deploy
- ดู pool statistics ใน console
- เปิด detailed error ใน .env: `NODE_ENV=development`

### Production:
- Monitor `/api/health` ด้วย health checker
- Set up alerts เมื่อ status ≠ "ok"
- Backup database บ่อย ๆ
- ใช้ connection string จาก environment variables

### Performance:
- Add database indexes สำหรับ columns ที่ใช้ WHERE/JOIN บ่อย
- Optimize queries ที่ช้ากว่า 1 วินาที
- Monitor pool statistics (available, pending)
- Scale database ถ้า concurrent connections สูง

---

## ✅ Checklist

หลังจากแก้แล้ว ตรวจสอบ:

- [x] ✅ Connection timeout เพิ่มเป็น 60 วินาที
- [x] ✅ Pool configuration optimized
- [x] ✅ Retry logic ทำงาน
- [x] ✅ Health check ทำงาน
- [x] ✅ Query auto retry ทำงาน
- [x] ✅ Error handling ดีขึ้น
- [x] ✅ Monitoring API พร้อม
- [x] ✅ Test script พร้อม
- [x] ✅ Graceful shutdown ทำงาน
- [x] ✅ ไม่มี timeout ในการใช้งานปกติ

---

## 🎉 สรุป

ระบบตอนนี้ **Production-ready** แล้ว!

**สิ่งที่ได้:**
1. 🔄 Auto retry connection/query
2. 🩺 Health check และ monitoring
3. ⚡ Pool optimization
4. 🛡️ Better error handling
5. 📊 Performance tracking
6. 🔧 Easy troubleshooting

**ไม่ควรเกิด timeout อีกแล้ว** เว้นแต่:
- SQL Server หยุดทำงาน
- Network มีปัญหาร้ายแรง
- Query ช้ามากกว่า 60 วินาที (ต้อง optimize query)

---

สร้างเมื่อ: 2 June 2026  
Version: 2.0 - Production Ready
