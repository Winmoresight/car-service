# 🔥 แก้ปัญหา Connection ทันที!

## สาเหตุที่แท้จริง (จาก error log):

```
❌ Failed to connect to localhost\SQLEXPRESS in 15000ms
❌ Login failed. The login is from an untrusted domain and cannot be used with Integrated authentication
```

**สรุป:** 
1. SQL Server SQLEXPRESS **อาจไม่ได้รัน** หรือ **TCP/IP ไม่ได้เปิด**
2. Windows Authentication **ใช้ไม่ได้** ต้องใช้ **SQL Authentication**

---

## ✅ วิธีแก้ (ทำทีละขั้นตอน)

### ขั้นที่ 1: เช็ค SQL Server รันหรือยัง 🔍

1. กด `Win + R`
2. พิมพ์: `services.msc`
3. หา **"SQL Server (SQLEXPRESS)"**
4. ถ้า Status ไม่ใช่ **"Running"** → Right-click → **Start**

### ขั้นที่ 2: ตั้งค่า SQL Server (ใช้ SSMS) 🔧

**ถ้ายังไม่มี SQL Server Management Studio:**
- ดาวน์โหลด: https://aka.ms/ssmsfullsetup
- หรือใช้ Azure Data Studio: https://aka.ms/azuredatastudio

**ตั้งค่า:**

1. **เปิด SSMS**
2. **Connect** ด้วย:
   - Server name: `localhost\SQLEXPRESS`
   - Authentication: **Windows Authentication**
3. **Right-click Server** (บนสุด) → **Properties**
4. ไปที่ **Security**
5. เลือก **"SQL Server and Windows Authentication mode"** ✅
6. คลิก **OK**

### ขั้นที่ 3: ตั้งรหัสผ่าน SA 🔐

**ใน SSMS:**

1. ขยาย **Security** → **Logins**
2. Right-click **"sa"** → **Properties**
3. ไปที่ **General**:
   - Password: `YourStrongPassword123!` (หรือรหัสที่ต้องการ)
   - Confirm password: `YourStrongPassword123!`
   - ❌ Uncheck **"Enforce password policy"**
   - ❌ Uncheck **"Enforce password expiration"**
4. ไปที่ **Status**:
   - Permission to connect to database engine: **Grant** ✅
   - Login: **Enabled** ✅
5. คลิก **OK**

**หรือรัน SQL Script:**

```sql
-- เปิด New Query ใน SSMS แล้ววางโค้ดนี้
USE [master]
GO

ALTER LOGIN [sa] ENABLE
GO

ALTER LOGIN [sa] WITH PASSWORD = N'YourStrongPassword123!'
GO
```

กด **Execute** (F5)

### ขั้นที่ 4: Enable TCP/IP 🌐

1. เปิด **SQL Server Configuration Manager**
   - Start Menu → พิมพ์ "SQL Server Configuration Manager"
   - หรือกด `Win + R` → `SQLServerManager16.msc` (16 อาจเป็น 15, 14 ตาม version)

2. ขยาย **SQL Server Network Configuration**
3. คลิก **Protocols for SQLEXPRESS**
4. Right-click **TCP/IP** → **Enable**
5. Double-click **TCP/IP**:
   - ไปที่ tab **IP Addresses**
   - เลื่อนลงไปที่ **IPALL**
   - ตั้งค่า: **TCP Port** = `1433`
6. คลิก **OK**

### ขั้นที่ 5: Restart SQL Server ♻️

**ใน Services (services.msc):**

1. หา **"SQL Server (SQLEXPRESS)"**
2. Right-click → **Restart**
3. รอจนกว่า Status เป็น **"Running"**

**หรือใช้ PowerShell (Admin):**

```powershell
Restart-Service -Name "MSSQL$SQLEXPRESS"
```

### ขั้นที่ 6: อัพเดท .env.local 📝

แก้ไขไฟล์ `.env.local`:

```bash
DATABASE_SERVER=localhost\SQLEXPRESS
DATABASE_NAME=BaseSeviceCar
DATABASE_USER=sa
DATABASE_PASSWORD=YourStrongPassword123!
DATABASE_PORT=1433
DATABASE_ENCRYPT=false
DATABASE_TRUST_SERVER_CERTIFICATE=true
```

**⚠️ สำคัญ:** ใส่รหัสผ่านจริงที่ตั้งไว้!

### ขั้นที่ 7: ทดสอบ Connection 🧪

```bash
node test-connection-sqlauth.js
```

ใส่ข้อมูล:
- Server: `localhost\SQLEXPRESS`
- Database: `BaseSeviceCar`
- Username: `sa`
- Password: `YourStrongPassword123!`

ถ้าเห็น **✅ เชื่อมต่อสำเร็จ!** แสดงว่าพร้อมแล้ว!

### ขั้นที่ 8: Restart Dev Server 🚀

```bash
# Ctrl+C หยุด server
bun run dev
```

เปิดเบราว์เซอร์: http://localhost:3000

---

## 🎯 Quick Checklist

- [ ] SQL Server (SQLEXPRESS) รันอยู่
- [ ] SQL Server Authentication mode enabled
- [ ] sa login enabled พร้อมรหัสผ่าน
- [ ] TCP/IP protocol enabled + port 1433
- [ ] Restart SQL Server แล้ว
- [ ] .env.local มี username และ password
- [ ] ทดสอบ connection สำเร็จ
- [ ] Restart dev server
- [ ] เปิด http://localhost:3000 เห็น dashboard

---

## ❌ ถ้ายังไม่ได้

### ลอง localhost แทน localhost\SQLEXPRESS

แก้ .env.local:

```bash
DATABASE_SERVER=localhost
# หรือ DATABASE_SERVER=127.0.0.1
```

### เช็ค SQL Server Browser Service

1. เปิด `services.msc`
2. หา **"SQL Server Browser"**
3. Right-click → **Start**
4. Startup Type → **Automatic**

### เช็ค Firewall

```powershell
# PowerShell (Admin)
New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -Protocol TCP -LocalPort 1433 -Action Allow
```

---

## 🆘 ยังไม่ได้อีก?

แชร์ผลลัพธ์จากคำสั่งนี้มา:

```bash
node test-connection-sqlauth.js
```

หรือเช็ค SQL Server error log:

```
C:\Program Files\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQL\Log\ERRORLOG
```

---

## 💡 Tips

**สำหรับ Production:**
- สร้าง user ใหม่แทน sa (ดูไฟล์ `setup-sql-auth.sql`)
- ใช้ Environment Variables ที่ปลอดภัย
- Enable encryption

**สำหรับ Development:**
- ใช้ sa ได้เลย สะดวก
- Password แข็งแรงพอควร
- Backup database บ่อย ๆ
