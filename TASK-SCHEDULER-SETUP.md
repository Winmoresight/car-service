# 🕐 Windows Task Scheduler Setup

เนื่องจาก `pm2-windows-service` ติดตั้งไม่ได้ เราจะใช้ Windows Task Scheduler ให้ PM2 เริ่มต้นอัตโนมัติเมื่อ boot

---

## ขั้นตอนการตั้งค่า

### 1. เปิด Task Scheduler
1. กด `Win + R`
2. พิมพ์ `taskschd.msc`
3. กด Enter

### 2. สร้าง Basic Task ใหม่
1. คลิกขวาที่ "Task Scheduler Library"
2. เลือก "Create Basic Task..."
3. ตั้งชื่อ: **PM2 ServiceCar Dashboard**
4. Description: **Auto-start PM2 processes for ServiceCar Dashboard**

### 3. Trigger
- เลือก: **When the computer starts**
- คลิก Next

### 4. Action
- เลือก: **Start a program**
- คลิก Next

### 5. Program/Script Settings
```
Program/script: C:\Users\winmoresight\.bun\bin\pm2.exe
Add arguments: resurrect
Start in: C:\Users\winmoresight\Documents\website\project\car-service
```

### 6. Advanced Settings (หลังจากสร้างแล้ว)
1. คลิกขวาที่ Task ที่สร้าง → Properties
2. ใน General tab:
   - ✅ เลือก "Run whether user is logged on or not"
   - ✅ เลือก "Run with highest privileges"
   - ✅ Configure for: Windows 10/Windows 11

3. ใน Triggers tab:
   - คลิก Edit trigger
   - ✅ Delay task for: **30 seconds** (ให้เวลา SQL Server start ก่อน)

4. ใน Settings tab:
   - ✅ Allow task to be run on demand
   - ✅ If the task fails, restart every: **1 minute**
   - ✅ Attempt to restart up to: **3 times**
   - ❌ ปิด "Stop the task if it runs longer than"

---

## ทดสอบ Task

### วิธีที่ 1: Run Task ทันที
1. คลิกขวาที่ Task
2. เลือก "Run"
3. เช็คว่า PM2 เริ่มต้นสำเร็จ: `pm2 status`

### วิธีที่ 2: Restart เครื่อง
1. Restart Windows
2. รอ 1-2 นาที
3. เปิด PowerShell: `pm2 status`
4. ควรเห็น `servicecar-dashboard` status: `online`

---

## 🔍 Troubleshooting

### Task รันแล้วแต่ PM2 ไม่ start

**ตรวจสอบ:**
```powershell
# 1. เช็ค Task history
Get-ScheduledTask "PM2 ServiceCar Dashboard" | Get-ScheduledTaskInfo

# 2. เช็ค Event Viewer
eventvwr.msc
# → Task Scheduler → History
```

**แก้ไข:**
- ตรวจสอบว่า path ของ `pm2.exe` ถูกต้อง
- ลอง Run task manually ดูว่ามี error อะไร
- เพิ่ม delay ใน trigger (30-60 วินาที)

### SQL Server ยังไม่เปิดตอน PM2 start

**แก้ไข:**
1. เพิ่ม delay ใน Task Scheduler trigger → 60 seconds
2. หรือตั้ง SQL Server service ให้ start แบบ Automatic (Delayed Start)

---

## Alternative: ใช้ npm แทน bun สำหรับ pm2-windows-service

ถ้าต้องการใช้ `pm2-windows-service` จริงๆ ลองติดตั้งด้วย npm:

```bash
# ถอน PM2 ที่ติดตั้งด้วย bun
bun remove -g pm2

# ติดตั้งใหม่ด้วย npm
npm install -g pm2
npm install -g pm2-windows-service

# ตั้งค่า service
pm2-service-install -n PM2

# Start service
pm2 start ecosystem.config.js --env production
pm2 save
```

---

## ✅ เช็คว่าทำงานหรือไม่

```powershell
# เช็ค PM2 status
pm2 status

# เช็ค health
curl http://localhost:3000/api/health

# เช็ค Task Scheduler
Get-ScheduledTask | Where-Object {$_.TaskName -like "*PM2*"}

# ดู logs
pm2 logs servicecar-dashboard --lines 50
```

---

**Setup Date:** June 2, 2026  
**Method:** Windows Task Scheduler (pm2 resurrect)  
**Alternative:** pm2-windows-service (ต้องใช้ npm แทน bun)
