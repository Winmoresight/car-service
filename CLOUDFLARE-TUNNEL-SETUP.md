# 🌐 Cloudflare Tunnel Setup Guide

คู่มือการตั้งค่า Cloudflare Tunnel เพื่อให้เข้าถึง ServiceCar Dashboard จาก internet ผ่าน domain

---

## 📋 Prerequisites

- ✅ Domain ที่เพิ่มเข้า Cloudflare แล้ว
- ✅ Cloudflare Account (Free plan ก็ใช้ได้)
- ✅ PM2 รันอยู่แล้ว (`pm2 status` แสดง online)

---

## 🔧 ขั้นตอนที่ 1: ติดตั้ง cloudflared

### วิธีที่ 1: ดาวน์โหลด Installer (แนะนำ)

1. ไปที่: https://github.com/cloudflare/cloudflared/releases/latest
2. ดาวน์โหลด: `cloudflared-windows-amd64.msi`
3. รันไฟล์ติดตั้ง (Next > Next > Install)
4. เปิด PowerShell ใหม่แล้วเช็ค:

```powershell
cloudflared --version
```

### วิธีที่ 2: ใช้ Chocolatey (ถ้ามี)

```powershell
choco install cloudflared
```

### วิธีที่ 3: ดาวน์โหลด Binary โดยตรง

```powershell
# ดาวน์โหลด
Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile "cloudflared.exe"

# ย้ายไปไว้ใน PATH
Move-Item cloudflared.exe C:\Windows\System32\cloudflared.exe

# เช็ค
cloudflared --version
```

---

## 🔐 ขั้นตอนที่ 2: Login Cloudflare

```powershell
cloudflared tunnel login
```

- จะเปิดเบราว์เซอร์ให้ login Cloudflare
- เลือก domain ที่ต้องการใช้
- หลังจาก authorize แล้วจะได้ไฟล์ certificate: `C:\Users\<USER>\.cloudflared\cert.pem`

---

## 🚇 ขั้นตอนที่ 3: สร้าง Tunnel

```powershell
# สร้าง tunnel (ตั้งชื่ออะไรก็ได้)
cloudflared tunnel create servicecar-dashboard
```

**ผลลัพธ์ที่ได้:**
```
Created tunnel servicecar-dashboard with id <TUNNEL-ID>
Tunnel credentials written to: C:\Users\<USER>\.cloudflared\<TUNNEL-ID>.json
```

**เก็บ TUNNEL-ID ไว้** จะใช้ในขั้นตอนถัดไป

---

## ⚙️ ขั้นตอนที่ 4: สร้างไฟล์ Config

สร้างไฟล์ config สำหรับ tunnel:

**ตำแหน่ง:** `C:\Users\<USER>\.cloudflared\config.yml`

```yaml
# แทนที่ <TUNNEL-ID> และ <YOUR-DOMAIN>
tunnel: <TUNNEL-ID>
credentials-file: C:\Users\<USER>\.cloudflared\<TUNNEL-ID>.json

ingress:
  # Dashboard หลัก
  - hostname: dashboard.yourdomain.com
    service: http://localhost:3000
  
  # Catch-all (required)
  - service: http_status:404
```

**ตัวอย่างไฟล์ config:**

```yaml
tunnel: abc123-def456-ghi789
credentials-file: C:\Users\winmoresight\.cloudflared\abc123-def456-ghi789.json

ingress:
  - hostname: dashboard.example.com
    service: http://localhost:3000
  - service: http_status:404
```

---

## 🌍 ขั้นตอนที่ 5: Route DNS

เพิ่ม DNS record ให้ชี้ไปที่ tunnel:

```powershell
# แทนที่ <TUNNEL-ID> และ domain ของคุณ
cloudflared tunnel route dns servicecar-dashboard dashboard.yourdomain.com
```

**ผลลัพธ์:**
```
Created CNAME record: dashboard.yourdomain.com -> <TUNNEL-ID>.cfargotunnel.com
```

---

## 🚀 ขั้นตอนที่ 6: ทดสอบ Tunnel

### ทดสอบแบบชั่วคราว:

```powershell
cloudflared tunnel run servicecar-dashboard
```

- เปิดเบราว์เซอร์ไปที่: `https://dashboard.yourdomain.com`
- ควรเห็น ServiceCar Dashboard
- กด Ctrl+C เพื่อหยุด

---

## 🔄 ขั้นตอนที่ 7: เพิ่ม Tunnel เข้า PM2

### วิธีที่ 1: เพิ่มใน ecosystem.config.js (แนะนำ)

แก้ไขไฟล์ `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: "servicecar-dashboard",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      // ... (config เดิม)
    },
    {
      name: "cloudflare-tunnel",
      script: "cloudflared",
      args: "tunnel --config C:\\Users\\<USER>\\.cloudflared\\config.yml run servicecar-dashboard",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/tunnel-error.log",
      out_file: "./logs/tunnel-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
```

**Start tunnel:**

```powershell
pm2 start ecosystem.config.js --only cloudflare-tunnel
pm2 save
```

### วิธีที่ 2: Start แยก (ง่ายกว่า)

```powershell
pm2 start cloudflared --name tunnel -- tunnel --config C:\Users\<USER>\.cloudflared\config.yml run servicecar-dashboard
pm2 save
```

---

## ✅ ขั้นตอนที่ 8: ตรวจสอบ

```powershell
# เช็ค PM2
pm2 status

# ควรเห็น 2 processes:
# - servicecar-dashboard (online)
# - cloudflare-tunnel (online) หรือ tunnel (online)

# เช็ค tunnel logs
pm2 logs tunnel --lines 50

# ทดสอบเข้าถึง
Start https://dashboard.yourdomain.com
```

---

## 🔒 Security Best Practices

### 1. ปิด Firewall Port 3000

เนื่องจากมี Cloudflare Tunnel แล้ว ไม่ต้อง expose port 3000 ออก internet:

```powershell
# Block port 3000 จาก external
New-NetFirewallRule -DisplayName "Block ServiceCar Dashboard External" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Block -RemoteAddress Internet
```

### 2. เพิ่ม Cloudflare Access (Optional - สำหรับ authentication)

ถ้าต้องการให้มี login ก่อนเข้า dashboard:

1. ไปที่ Cloudflare Dashboard → Zero Trust → Access → Applications
2. สร้าง Application ใหม่:
   - **Application name:** ServiceCar Dashboard
   - **Session duration:** 24 hours
   - **Application domain:** dashboard.yourdomain.com
3. เพิ่ม Policy:
   - **Policy name:** Allow Team
   - **Action:** Allow
   - **Include:** Emails ending in @yourdomain.com (หรือเลือกวิธีอื่น)
4. Save

### 3. ตั้งค่า SSL/TLS Mode

ใน Cloudflare Dashboard:
- SSL/TLS → Overview → Encryption mode: **Full** (แนะนำ)

---

## 🛠️ Troubleshooting

### Tunnel ไม่ online

```powershell
# เช็ค logs
pm2 logs tunnel --lines 100

# ลอง run ด้วยมือ
cloudflared tunnel run servicecar-dashboard

# เช็ค tunnel list
cloudflared tunnel list
```

### DNS ไม่ resolve

```powershell
# เช็ค DNS record
nslookup dashboard.yourdomain.com

# ลองลบแล้วสร้างใหม่
cloudflared tunnel route dns servicecar-dashboard dashboard.yourdomain.com
```

### 502 Bad Gateway

- เช็คว่า PM2 servicecar-dashboard รันอยู่: `pm2 status`
- เช็คว่า localhost:3000 เปิดอยู่: `curl http://localhost:3000`
- เช็ค tunnel config ว่า service ชี้ที่ `http://localhost:3000` ถูกต้อง

### Connection Timeout

- เช็คว่า config.yml มี `hostname` และ `service` ถูกต้อง
- ลองเปลี่ยน `http://localhost:3000` เป็น `http://127.0.0.1:3000`

---

## 📊 PM2 Commands สำหรับ Tunnel

```powershell
# ดูสถานะ
pm2 status

# Restart tunnel
pm2 restart tunnel

# Stop tunnel
pm2 stop tunnel

# ดู logs real-time
pm2 logs tunnel

# ดู logs ย้อนหลัง
pm2 logs tunnel --lines 200

# Clear logs
pm2 flush
```

---

## 🔄 Auto-Start Tunnel เมื่อ Boot

Tunnel จะ auto-start พร้อมกับ PM2 ถ้าคุณได้ทำ:

```powershell
pm2 save
```

และตั้งค่า Task Scheduler ตาม `TASK-SCHEDULER-SETUP.md` แล้ว

---

## 📝 Quick Commands Summary

```powershell
# ติดตั้ง cloudflared
# → ดาวน์โหลดจาก GitHub releases

# Login
cloudflared tunnel login

# สร้าง tunnel
cloudflared tunnel create servicecar-dashboard

# สร้าง config.yml
# → แก้ไขตามตัวอย่างข้างบน

# Route DNS
cloudflared tunnel route dns servicecar-dashboard dashboard.yourdomain.com

# ทดสอบ
cloudflared tunnel run servicecar-dashboard

# เพิ่มใน PM2
pm2 start cloudflared --name tunnel -- tunnel --config C:\Users\<USER>\.cloudflared\config.yml run servicecar-dashboard
pm2 save

# เช็คสถานะ
pm2 status
```

---

## 🎯 Architecture Diagram

```
┌─────────────────────────────────────────┐
│ Windows Server (Local)                  │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │ SQL Server   │◄───│  Next.js     │  │
│  │ Express      │    │  :3000       │  │
│  │              │    │  (PM2)       │  │
│  └──────────────┘    └──────┬───────┘  │
│                              │          │
│                    ┌─────────▼────────┐ │
│                    │  cloudflared     │ │
│                    │  (PM2)           │ │
│                    └─────────┬────────┘ │
└──────────────────────────────┼──────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Cloudflare Network   │
                    │ (Encrypted Tunnel)   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ dashboard.your       │
                    │ domain.com           │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Internet Users     │
                    │   (HTTPS)            │
                    └──────────────────────┘
```

---

**Setup Date:** June 2, 2026  
**Status:** Ready for Configuration  
**Security:** Encrypted, No port forwarding needed  
**Cost:** Free (Cloudflare Free Plan)

---

## 🚀 Next Steps

หลังจาก setup เสร็จ:

1. ✅ ทดสอบเข้าถึงจาก internet: `https://dashboard.yourdomain.com`
2. ✅ เช็ค SSL certificate (ควรเป็น Cloudflare cert)
3. ✅ ตั้งค่า Cloudflare Access ถ้าต้องการ authentication
4. ✅ Monitor tunnel logs: `pm2 logs tunnel`
5. ✅ Backup config files:
   - `C:\Users\<USER>\.cloudflared\config.yml`
   - `C:\Users\<USER>\.cloudflared\<TUNNEL-ID>.json`
