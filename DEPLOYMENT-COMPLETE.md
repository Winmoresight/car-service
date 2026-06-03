# 🎉 ServiceCar Dashboard - Deployment Complete!

**Deployment Date:** June 3, 2026  
**Status:** ✅ Production Ready

---

## 🌐 Access Information

### Public URL
- **URL:** https://car.winmoresight.com
- **SSL:** ✅ Cloudflare (Auto)
- **CDN:** ✅ Cloudflare Global Network

### Local Access
- **Local:** http://localhost:3000
- **Network:** http://100.85.52.91:3000 (LAN only)

---

## 🔧 Infrastructure

### Application Stack
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
                    │ Cloudflare Tunnel    │
                    │ (Encrypted)          │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │ car.winmoresight.com │
                    └──────────────────────┘
```

### Components
- **Framework:** Next.js 16.2.7 (React 19, Turbopack)
- **Database:** SQL Server Express (Local)
- **Process Manager:** PM2 7.0.1
- **Tunnel:** Cloudflare Tunnel (cloudflared 2026.5.2)
- **Domain:** winmoresight.com
- **Subdomain:** car.winmoresight.com

---

## 📊 PM2 Status

### Current Processes
```bash
pm2 status
```

Expected output:
```
┌────┬───────────────────┬─────────┬──────┬──────────┬─────────┬─────────┐
│ id │ name              │ mode    │ ↺    │ status   │ cpu     │ memory  │
├────┼───────────────────┼─────────┼──────┼──────────┼─────────┼─────────┤
│ 0  │ cloudflare-tunnel │ fork    │ 0    │ online   │ 0%      │ 38mb    │
│ 1  │ car-service       │ fork    │ 0    │ online   │ 0%      │ 90mb    │
└────┴───────────────────┴─────────┴──────┴──────────┴─────────┴─────────┘
```

### Configuration Files
- **PM2 Config:** `ecosystem.config.js`
- **Tunnel Config:** `C:\Users\winmoresight\.cloudflared\config.yml`
- **Tunnel Credentials:** `C:\Users\winmoresight\.cloudflared\834cd16a-e9cc-42c6-9cce-8c5b6ffa27ad.json`
- **PM2 Dump:** `C:\Users\winmoresight\.pm2\dump.pm2`

---

## 🚀 Daily Operations

### Start/Stop Services

```powershell
# เช็คสถานะ
pm2 status

# Start ทั้งหมด
pm2 start all

# Restart ทั้งหมด
pm2 restart all

# Stop ทั้งหมด
pm2 stop all

# Restart เฉพาะ dashboard
pm2 restart car-service

# Restart เฉพาะ tunnel
pm2 restart cloudflare-tunnel
```

### View Logs

```powershell
# Logs real-time (ทั้งหมด)
pm2 logs

# Logs เฉพาะ dashboard
pm2 logs car-service

# Logs เฉพาะ tunnel
pm2 logs cloudflare-tunnel

# Logs ย้อนหลัง 100 บรรทัด
pm2 logs car-service --lines 100

# Clear logs
pm2 flush
```

### Monitoring

```powershell
# Dashboard แบบ CLI
pm2 monit

# Health check (API)
curl http://localhost:3000/api/health

# หรือใช้ PowerShell
Invoke-WebRequest http://localhost:3000/api/health | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

---

## 🔄 Deployment Updates

### วิธีการ Deploy Code ใหม่

```powershell
# 1. Pull code ใหม่
git pull

# 2. Install dependencies (ถ้ามี)
bun install

# 3. Build production
bun run build

# 4. Restart PM2
pm2 restart car-service

# 5. เช็คว่ารันสำเร็จ
pm2 logs car-service --lines 50
```

### Zero-Downtime Deployment (แนะนำ)

```powershell
# ใช้ reload แทน restart (graceful shutdown)
pm2 reload car-service
```

---

## 🛡️ Security Checklist

- ✅ **HTTPS:** Enabled via Cloudflare
- ✅ **Port 3000:** Not exposed to internet (Tunnel only)
- ✅ **Database:** Local connection only
- ✅ **Credentials:** Stored in .env.local (not in git)
- ✅ **SQL Auth:** Using SQL Server Authentication
- ⚠️ **Firewall:** Recommended to block port 3000 from external
- ⚠️ **Cloudflare Access:** Optional - Add authentication if needed

### Recommended: Block External Access to Port 3000

```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Block ServiceCar Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Block -RemoteAddress Internet
```

---

## 🔧 Auto-Start Configuration

### Current Setup
- ✅ PM2 processes configured
- ✅ PM2 configuration saved (`pm2 save`)
- ⚠️ Need to setup Windows Task Scheduler

### Setup Auto-Start (Choose One)

#### Option 1: Task Scheduler (Recommended)
See: `TASK-SCHEDULER-SETUP.md`

#### Option 2: pm2-windows-service (Alternative)
```powershell
# Requires npm (not bun)
npm install -g pm2
npm install -g pm2-windows-service
pm2-service-install -n PM2
```

---

## 📈 Performance Monitoring

### Database Pool Stats
```
Pool Configuration:
- Max Connections: 50
- Min Connections: 5
- Idle Timeout: 5 minutes
- Connection Timeout: 30 seconds
- Request Timeout: 2 minutes
```

### Monitor API
- **Health:** `http://localhost:3000/api/health`
- **Monitor:** `http://localhost:3000/api/monitor`

Response time should be:
- Database: < 50ms (local)
- API endpoints: < 200ms

---

## 🆘 Troubleshooting

### Dashboard ไม่เปิด

```powershell
# 1. เช็ค PM2 status
pm2 status

# 2. ดู error logs
pm2 logs car-service --err --lines 50

# 3. Restart
pm2 restart car-service

# 4. ถ้ายังไม่ได้ ลองรัน manual
cd C:\Users\winmoresight\Documents\website\project\car-service
bun run start
```

### Tunnel ไม่เชื่อม

```powershell
# 1. เช็ค tunnel status
pm2 logs cloudflare-tunnel --lines 50

# 2. Test tunnel manually
C:\cloudflared\cloudflared.exe tunnel --config C:\Users\winmoresight\.cloudflared\config.yml run car-service-tunnel

# 3. Check DNS
nslookup car.winmoresight.com

# 4. Restart tunnel
pm2 restart cloudflare-tunnel
```

### Database Connection Error

```powershell
# 1. เช็ค SQL Server service
Get-Service | Where-Object {$_.Name -like "*SQL*"}

# 2. Restart SQL Server
Restart-Service -Name "MSSQL$SQLEXPRESS"

# 3. Test connection
# ใช้ SQL Server Management Studio หรือ
sqlcmd -S localhost -U sa -P <password> -Q "SELECT @@VERSION"

# 4. Restart dashboard
pm2 restart car-service
```

### Port 3000 Already in Use

```powershell
# 1. หา process
netstat -ano | findstr :3000

# 2. Kill process (แทน <PID> ด้วย process ID)
taskkill /PID <PID> /F

# 3. Restart
pm2 restart car-service
```

---

## 📦 Backup Checklist

### Files to Backup
- ✅ `.env.local` (credentials)
- ✅ `ecosystem.config.js` (PM2 config)
- ✅ `C:\Users\winmoresight\.cloudflared\config.yml`
- ✅ `C:\Users\winmoresight\.cloudflared\834cd16a-e9cc-42c6-9cce-8c5b6ffa27ad.json`
- ✅ Source code (`git push`)
- ✅ SQL Server database (regular backups)

### Backup Commands
```powershell
# Backup database (SQL Server)
sqlcmd -S localhost -U sa -P <password> -Q "BACKUP DATABASE BaseSeviceCar TO DISK='C:\Backup\BaseSeviceCar.bak'"

# Backup PM2 config
pm2 save
```

---

## 🎯 Quick Reference

### Important URLs
- **Production:** https://car.winmoresight.com
- **Health Check:** https://car.winmoresight.com/api/health
- **Local:** http://localhost:3000

### Important Commands
```powershell
# Status
pm2 status

# Logs
pm2 logs

# Restart
pm2 restart all

# Save
pm2 save

# Health Check
curl http://localhost:3000/api/health

# Monitor
pm2 monit
```

### Important Files
```
project/
├── .env.local                    # Environment variables
├── ecosystem.config.js           # PM2 configuration
├── next.config.ts                # Next.js config
├── src/lib/db.ts                 # Database config
└── logs/
    ├── pm2-out.log              # Application logs
    └── pm2-error.log            # Error logs

~/.cloudflared/
├── config.yml                    # Tunnel configuration
├── cert.pem                      # Cloudflare certificate
└── <tunnel-id>.json             # Tunnel credentials
```

---

## ✅ Post-Deployment Checklist

- [x] Build production successfully
- [x] PM2 running (car-service + cloudflare-tunnel)
- [x] Database connected
- [x] Cloudflare Tunnel configured
- [x] DNS routing working
- [x] HTTPS accessible from internet
- [x] PM2 configuration saved
- [ ] Setup Windows Task Scheduler (Auto-start)
- [ ] Configure Cloudflare Access (Optional - Authentication)
- [ ] Setup database backup schedule
- [ ] Setup monitoring alerts (Optional)
- [ ] Firewall rules configured (Optional)

---

## 📞 Support

### Documentation
- `PM2-SETUP.md` - PM2 configuration guide
- `CLOUDFLARE-TUNNEL-SETUP.md` - Tunnel setup guide
- `TASK-SCHEDULER-SETUP.md` - Auto-start configuration
- `CONNECTION-FIXED.md` - Database troubleshooting

### Logs Location
- PM2 logs: `./logs/pm2-*.log`
- PM2 system: `C:\Users\winmoresight\.pm2\logs\`

### Key Configuration
- **Tunnel ID:** 834cd16a-e9cc-42c6-9cce-8c5b6ffa27ad
- **Domain:** car.winmoresight.com
- **Database:** BaseSeviceCar (Local SQL Server)
- **Port:** 3000 (Internal only)

---

**Deployed by:** Kiro AI  
**Deployment Date:** June 3, 2026  
**Status:** ✅ Production  
**Version:** 1.0.0

🎉 **Congratulations! Your ServiceCar Dashboard is now live!**
