# 🚀 PM2 Production Setup Guide

## สถาปัตยกรรม

```
┌─────────────────────────────────────────┐
│ Windows Server (Local)                  │
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │ SQL Server   │◄───│  Next.js     │  │
│  │ Express      │    │  (PM2)       │  │
│  └──────────────┘    └──────┬───────┘  │
│                              │          │
└──────────────────────────────┼──────────┘
                               │
                    ┌──────────▼───────────┐
                    │ Cloudflare Tunnel    │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   Internet Users     │
                    └──────────────────────┘
```

---

## 📋 Prerequisites

### 1. ติดตั้ง PM2
```bash
npm install -g pm2

# หรือ
bun add -g pm2

# เช็คเวอร์ชัน
pm2 --version
```

### 2. ติดตั้ง PM2 Windows Service (ให้รันตอน boot)
```bash
npm install -g pm2-windows-service

# ตั้งค่า service
pm2-service-install -n PM2
```

---

## 🔧 Configuration

### Database (.env.local)
```env
# Local SQL Server
DATABASE_SERVER=localhost
DATABASE_NAME=BaseSeviceCar
DATABASE_USER=sa
DATABASE_PASSWORD=YourStrongPassword
DATABASE_PORT=1433
DATABASE_ENCRYPT=false
DATABASE_TRUST_SERVER_CERTIFICATE=true

# Production
NODE_ENV=production
PORT=3000
```

### Pool Settings (src/lib/db.ts)
✅ **max: 50** - รองรับ concurrent users มาก  
✅ **min: 5** - maintain connections ตลอด  
✅ **connectionTimeout: 30s** - local ควรเร็ว  
✅ **requestTimeout: 120s** - ให้เวลา query ซับซ้อน  

---

## 🚀 Deployment Steps

### 1. Build Production
```bash
# ใน project directory
bun run build

# ทดสอบ production build
bun run start
```

### 2. Start with PM2
```bash
# Start application
pm2 start ecosystem.config.js --env production

# หรือ start โดยตรง
pm2 start npm --name "servicecar-dashboard" -- start
```

### 3. Save PM2 Configuration
```bash
# Save current process list
pm2 save

# ให้ PM2 start ตอน boot
pm2 startup
```

---

## 📊 PM2 Commands

### Basic Commands
```bash
# ดูสถานะ
pm2 status
pm2 list

# ดู logs
pm2 logs servicecar-dashboard
pm2 logs --lines 100

# Restart
pm2 restart servicecar-dashboard

# Stop
pm2 stop servicecar-dashboard

# Delete
pm2 delete servicecar-dashboard

# Reload (zero-downtime)
pm2 reload servicecar-dashboard
```

### Monitoring
```bash
# Dashboard
pm2 monit

# Web dashboard
pm2 plus  # ต้องสมัครบัญชี pm2.io
```

### Logs
```bash
# Real-time logs
pm2 logs

# Last 200 lines
pm2 logs --lines 200

# Error logs only
pm2 logs --err

# Clear logs
pm2 flush
```

---

## 🔍 Health Monitoring

### 1. เช็ค Health Endpoint
```bash
# ใน PowerShell
Invoke-WebRequest http://localhost:3000/api/health | Select-Object -ExpandProperty Content | ConvertFrom-Json

# หรือ curl
curl http://localhost:3000/api/health
```

### 2. Monitor Pool Statistics
```bash
curl http://localhost:3000/api/monitor
```

### 3. Windows Task Scheduler
สร้าง scheduled task เพื่อเช็ค health ทุก 5 นาที:

```powershell
# health-check.ps1
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
$json = $response.Content | ConvertFrom-Json

if ($json.status -ne "ok") {
    Write-Host "❌ Health check failed!"
    # Restart PM2 process
    pm2 restart servicecar-dashboard
    
    # Send alert (optional)
    # Send-MailMessage ...
} else {
    Write-Host "✅ Health check OK"
}
```

---

## 🌐 Cloudflare Tunnel Setup

### 1. ติดตั้ง cloudflared
ดาวน์โหลด: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

### 2. Login
```bash
cloudflared tunnel login
```

### 3. สร้าง Tunnel
```bash
cloudflared tunnel create servicecar-dashboard
```

### 4. Configure Tunnel
สร้างไฟล์ `cloudflared-config.yml`:

```yaml
tunnel: <TUNNEL-ID>
credentials-file: C:\Users\<USER>\.cloudflared\<TUNNEL-ID>.json

ingress:
  - hostname: dashboard.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

### 5. Start Tunnel with PM2
```bash
pm2 start cloudflared --name tunnel -- tunnel --config cloudflared-config.yml run
pm2 save
```

### 6. Route DNS
```bash
cloudflared tunnel route dns servicecar-dashboard dashboard.yourdomain.com
```

---

## 🛡️ Security Checklist

- [ ] ✅ .env.local มี strong password
- [ ] ✅ SQL Server ใช้ SQL Authentication (ไม่ใช่ Windows Auth)
- [ ] ✅ Firewall block port 3000 จาก external (ใช้แค่ Cloudflare Tunnel)
- [ ] ✅ Cloudflare Tunnel ใช้ authentication
- [ ] ✅ Windows Update เปิด auto-update
- [ ] ✅ SQL Server backup schedule ตั้งไว้
- [ ] ✅ PM2 logs มี rotation

---

## 📝 Production Checklist

### Before Deploy:
- [ ] ✅ Test connection: `node test-connection-production.js`
- [ ] ✅ Build success: `bun run build`
- [ ] ✅ Health check works: `/api/health`
- [ ] ✅ Monitor endpoint works: `/api/monitor`
- [ ] ✅ .env.local configured
- [ ] ✅ SQL Server running
- [ ] ✅ PM2 installed

### After Deploy:
- [ ] ✅ PM2 status = online
- [ ] ✅ Health check returns "ok"
- [ ] ✅ Dashboard accessible via tunnel
- [ ] ✅ No errors in PM2 logs
- [ ] ✅ Database connection stable
- [ ] ✅ Pool statistics healthy

---

## 🔧 Troubleshooting

### PM2 Won't Start
```bash
# ดู detailed error
pm2 logs --err --lines 50

# ลองรันโดยตรง
npm run start

# เช็ค port conflict
netstat -ano | findstr :3000
```

### Connection Issues
```bash
# ทดสอบ connection
node test-connection-production.js

# เช็ค SQL Server
Get-Service | Where-Object {$_.Name -like "*SQL*"}

# Restart SQL Server
Restart-Service -Name "MSSQL$SQLEXPRESS"
```

### High Memory Usage
```bash
# ดู memory usage
pm2 list

# ตั้ง max memory restart
pm2 restart servicecar-dashboard --max-memory-restart 1G
pm2 save
```

### Logs Full
```bash
# Clear logs
pm2 flush

# Set up log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🎯 Performance Tips

### 1. Database Indexes
```sql
-- เพิ่ม indexes สำหรับ columns ที่ใช้บ่อย
CREATE INDEX idx_date ON MasterSalePost(DateSalePost);
CREATE INDEX idx_barcode ON DetailSalePost(BarCode);
```

### 2. Windows Server Optimization
- ปิด Windows Search Indexing สำหรับ project folder
- เพิ่ม RAM ถ้าเป็นไปได้ (แนะนำ 8GB+)
- ใช้ SSD สำหรับ SQL Server data files

### 3. SQL Server Optimization
```sql
-- เช็ค query performance
SET STATISTICS TIME ON;
SET STATISTICS IO ON;

-- Update statistics
EXEC sp_updatestats;

-- Rebuild indexes (ทำทุกสัปดาห์)
EXEC sp_MSforeachtable 'ALTER INDEX ALL ON ? REBUILD';
```

---

## 📈 Monitoring Dashboard

### PM2 Plus (Optional)
1. สมัครที่ https://pm2.io
2. Link server:
   ```bash
   pm2 link <secret> <public>
   ```
3. ดู metrics ที่ https://app.pm2.io

### Custom Monitoring
สร้าง simple monitoring page:

```html
<!-- monitoring.html -->
<!DOCTYPE html>
<html>
<body>
  <h1>ServiceCar Dashboard Monitoring</h1>
  <div id="status"></div>
  <script>
    async function checkHealth() {
      const res = await fetch('/api/health');
      const data = await res.json();
      document.getElementById('status').innerHTML = 
        `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
    setInterval(checkHealth, 5000);
    checkHealth();
  </script>
</body>
</html>
```

---

## 🆘 Emergency Procedures

### Service Down
```bash
# 1. เช็คสถานะ
pm2 status

# 2. Restart
pm2 restart servicecar-dashboard

# 3. ดู logs
pm2 logs --err --lines 100

# 4. ถ้ายังไม่ได้ ทดสอบ connection
node test-connection-production.js

# 5. Restart SQL Server
net stop "MSSQL$SQLEXPRESS" && net start "MSSQL$SQLEXPRESS"
```

### Database Corruption
```sql
-- เช็ค database consistency
DBCC CHECKDB (BaseSeviceCar);

-- Restore from backup
RESTORE DATABASE BaseSeviceCar 
FROM DISK = 'C:\Backup\BaseSeviceCar.bak'
WITH REPLACE;
```

---

## 📞 Quick Commands

```bash
# Deploy update
bun run build && pm2 restart servicecar-dashboard

# Check health
curl http://localhost:3000/api/health

# View logs
pm2 logs servicecar-dashboard --lines 50

# Monitor
pm2 monit

# Restart everything
pm2 restart all
pm2 save
```

---

**Setup Date:** June 2, 2026  
**Environment:** Windows + PM2 + SQL Server Express + Cloudflare Tunnel  
**Status:** Production Ready ✅
