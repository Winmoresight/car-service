# แก้ปัญหาการเชื่อมต่อ SQL Server

## ปัญหาที่พบ

```
❌ Failed to connect to localhost\SQLEXPRESS in 15000ms
❌ Login failed for user 'sa'
```

## วิธีแก้ปัญหา (ทำตามลำดับ)

### ขั้นที่ 1: ตรวจสอบ SQL Server กำลังรันหรือไม่

**Windows:**
1. กด `Win + R`
2. พิมพ์ `services.msc` แล้วกด Enter
3. หา **"SQL Server (SQLEXPRESS)"**
4. ตรวจสอบ:
   - Status ต้องเป็น **"Running"**
   - Startup Type ควรเป็น **"Automatic"**
5. ถ้าไม่รัน → Right-click → **Start**

### ขั้นที่ 2: Enable SQL Server Authentication

**ถ้าคุณใช้ SQL Server Management Studio (SSMS):**

1. เปิด SSMS
2. เชื่อมต่อด้วย **Windows Authentication**
3. Right-click Server name (บนสุด) → **Properties**
4. ไปที่ **Security**
5. เลือก **"SQL Server and Windows Authentication mode"**
6. คลิก **OK**
7. **Restart SQL Server service** (ใน services.msc)

### ขั้นที่ 3: ตั้งรหัสผ่าน sa

**ใน SSMS:**

1. ขยาย **Security** → **Logins**
2. Right-click **"sa"** → **Properties**
3. ไปที่ **General**:
   - ตั้ง **Password** ใหม่
   - ตั้ง **Confirm password**
   - Uncheck **"Enforce password policy"** (ถ้าต้องการ)
4. ไปที่ **Status**:
   - Permission to connect: **Grant**
   - Login: **Enabled**
5. คลิก **OK**

### ขั้นที่ 4: Enable TCP/IP

1. เปิด **SQL Server Configuration Manager**
   - หาได้ใน Start Menu หรือ
   - กด Win + R → พิมพ์ `C:\Windows\System32\SQLServerManager16.msc`
   - (ตัวเลข 16 อาจเป็น 15, 14, 13 ขึ้นกับ version)

2. ขยาย **SQL Server Network Configuration**
3. คลิก **Protocols for SQLEXPRESS**
4. Right-click **TCP/IP** → **Enable**
5. Double-click **TCP/IP** → ไปที่ tab **IP Addresses**
6. เลื่อนลงไปที่ **IPAII**:
   - **Enabled**: Yes
   - **TCP Port**: 1433
7. คลิก **OK**
8. **Restart SQL Server service**

### ขั้นที่ 5: ทดสอบการเชื่อมต่อ

รันไฟล์ทดสอบ:

```bash
node test-connection-sqlauth.js
```

ใส่ข้อมูล:
- **Server name**: `localhost\SQLEXPRESS`
- **Database name**: `BaseSeviceCar`
- **Username**: `sa`
- **Password**: รหัสผ่านที่ตั้งไว้

### ขั้นที่ 6: อัพเดท .env.local

ถ้าทดสอบสำเร็จ คัดลอก config ที่ได้มาใส่ใน `.env.local`:

```bash
DATABASE_SERVER=localhost\SQLEXPRESS
# หรือ DATABASE_SERVER=localhost ถ้าใช้ได้

DATABASE_NAME=BaseSeviceCar
DATABASE_USER=sa
DATABASE_PASSWORD=YourActualPasswordHere
DATABASE_PORT=1433
DATABASE_ENCRYPT=false
DATABASE_TRUST_SERVER_CERTIFICATE=true
```

### ขั้นที่ 7: Restart Dev Server

```bash
# หยุด dev server (Ctrl+C)
# รันใหม่
bun run dev
```

---

## ปัญหาอื่น ๆ ที่อาจเจอ

### "Cannot open database 'BaseSeviceCar'"

**สาเหตุ:** Database name ผิด หรือ user ไม่มีสิทธิ์

**แก้ไข:**
1. เปิด SSMS
2. ตรวจสอบชื่อ Database ที่ถูกต้อง
3. Right-click Database → **Properties** → **Permissions**
4. เพิ่ม user **sa** และให้สิทธิ์ **db_owner**

### "Login failed for user ''"

**สาเหตุ:** Windows Authentication mode แต่ไม่มี credentials

**แก้ไข:**
- ลบ `DATABASE_USER` และ `DATABASE_PASSWORD` ออกจาก `.env.local`
- หรือเปลี่ยนเป็น SQL Authentication (ดูขั้นที่ 2-3)

### "Named Pipes Provider: Could not open a connection to SQL Server"

**สาเหตุ:** SQL Server Browser service ไม่รัน

**แก้ไข:**
1. เปิด `services.msc`
2. หา **"SQL Server Browser"**
3. Right-click → **Start**
4. เปลี่ยน Startup Type เป็น **Automatic**

### "Network-related or instance-specific error"

**สาเหตุ:** Firewall block port 1433

**แก้ไข:**
1. เปิด **Windows Defender Firewall**
2. คลิก **Advanced settings**
3. **Inbound Rules** → **New Rule...**
4. เลือก **Port** → Next
5. เลือก **TCP** → พิมพ์ `1433` → Next
6. เลือก **Allow the connection** → Next
7. ตั้งชื่อ "SQL Server Port 1433" → Finish

---

## วิธีหา SQL Server instance name ที่ถูกต้อง

### วิธีที่ 1: ใช้ PowerShell

```powershell
Get-Service | Where-Object {$_.DisplayName -like "*SQL Server*"}
```

### วิธีที่ 2: ใช้ SSMS

เมื่อเปิด SSMS ดูที่ **Server name** dropdown จะเห็น instance ที่มีอยู่

### วิธีที่ 3: Registry

```
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Microsoft SQL Server\Instance Names\SQL
```

---

## Alternative: ใช้ Azure Data Studio แทน SSMS

ถ้าไม่มี SSMS ติดตั้ง:

1. ดาวน์โหลด **Azure Data Studio** (ฟรี): https://aka.ms/azuredatastudio
2. เชื่อมต่อด้วย:
   - **Server**: `localhost\SQLEXPRESS`
   - **Authentication**: Windows Authentication หรือ SQL Login
3. ทำ configuration เหมือนกับ SSMS

---

## สรุป Checklist

- [ ] SQL Server (SQLEXPRESS) service กำลังรัน
- [ ] SQL Server Authentication mode enabled
- [ ] sa user มี password และ enabled
- [ ] TCP/IP protocol enabled
- [ ] TCP Port 1433 ตั้งค่าถูกต้อง
- [ ] SQL Server Browser service กำลังรัน (ถ้าใช้ named instance)
- [ ] Firewall อนุญาต port 1433
- [ ] .env.local มี config ถูกต้อง
- [ ] Restart SQL Server service หลังเปลี่ยน config
- [ ] Restart dev server หลังแก้ .env.local

---

## ต้องการความช่วยเหลือเพิ่มเติม?

รันคำสั่งนี้และส่ง output มาให้ดู:

```bash
node test-connection-sqlauth.js
```

หรือตรวจสอบ error log ใน:
- SQL Server Error Log: `C:\Program Files\Microsoft SQL Server\MSSQL15.SQLEXPRESS\MSSQL\Log\ERRORLOG`
- Windows Event Viewer: Application log
