# Production Startup Script
# สำหรับ start application หลัง Windows boot

param(
    [switch]$SkipBuild,
    [switch]$SkipTest
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 ServiceCar Dashboard - Production Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SQL Server is running
Write-Host "🔍 Checking SQL Server..." -ForegroundColor Yellow
$sqlService = Get-Service -Name "MSSQL`$SQLEXPRESS" -ErrorAction SilentlyContinue

if ($null -eq $sqlService) {
    Write-Host "❌ SQL Server service not found!" -ForegroundColor Red
    exit 1
}

if ($sqlService.Status -ne "Running") {
    Write-Host "⚠️  SQL Server is not running. Starting..." -ForegroundColor Yellow
    Start-Service -Name "MSSQL`$SQLEXPRESS"
    Start-Sleep -Seconds 5
    Write-Host "✅ SQL Server started" -ForegroundColor Green
} else {
    Write-Host "✅ SQL Server is running" -ForegroundColor Green
}

# Test database connection
if (-not $SkipTest) {
    Write-Host ""
    Write-Host "🧪 Testing database connection..." -ForegroundColor Yellow
    
    try {
        node test-connection-production.js
        Write-Host "✅ Database connection test passed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Database connection test failed!" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Tips:" -ForegroundColor Yellow
        Write-Host "  1. Check .env.local configuration"
        Write-Host "  2. Verify SQL Server is accessible"
        Write-Host "  3. Check username and password"
        exit 1
    }
}

# Build if needed
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "🔨 Building production..." -ForegroundColor Yellow
    
    try {
        bun run build
        Write-Host "✅ Build completed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Build failed!" -ForegroundColor Red
        Write-Host "Error: $_" -ForegroundColor Red
        exit 1
    }
}

# Check if PM2 is installed
Write-Host ""
Write-Host "🔍 Checking PM2..." -ForegroundColor Yellow

try {
    $pm2Version = pm2 --version
    Write-Host "✅ PM2 version: $pm2Version" -ForegroundColor Green
} catch {
    Write-Host "❌ PM2 is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install with:" -ForegroundColor Yellow
    Write-Host "  npm install -g pm2" -ForegroundColor Cyan
    exit 1
}

# Stop existing PM2 process if running
Write-Host ""
Write-Host "🛑 Stopping existing process..." -ForegroundColor Yellow

try {
    pm2 stop servicecar-dashboard 2>$null
    pm2 delete servicecar-dashboard 2>$null
    Write-Host "✅ Existing process stopped" -ForegroundColor Green
} catch {
    Write-Host "⚠️  No existing process found" -ForegroundColor Yellow
}

# Start with PM2
Write-Host ""
Write-Host "🚀 Starting with PM2..." -ForegroundColor Yellow

try {
    pm2 start ecosystem.config.js --env production
    Write-Host "✅ Application started" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to start application!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Save PM2 configuration
Write-Host ""
Write-Host "💾 Saving PM2 configuration..." -ForegroundColor Yellow
pm2 save
Write-Host "✅ Configuration saved" -ForegroundColor Green

# Wait for application to warm up
Write-Host ""
Write-Host "⏳ Waiting for application to start (10 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check health
Write-Host ""
Write-Host "🩺 Checking application health..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing -TimeoutSec 10
    $health = $response.Content | ConvertFrom-Json
    
    if ($health.status -eq "ok") {
        Write-Host "✅ Application is healthy!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📊 Status:" -ForegroundColor Cyan
        Write-Host "  Database: $($health.database.status)" -ForegroundColor White
        Write-Host "  Response Time: $($health.database.responseTime)" -ForegroundColor White
        Write-Host "  Pool Connections: $($health.database.pool.size)" -ForegroundColor White
        Write-Host "  Memory Used: $($health.system.memory.used)" -ForegroundColor White
    } else {
        Write-Host "⚠️  Application started but status: $($health.status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Health check failed: $_" -ForegroundColor Yellow
    Write-Host "Application may still be starting..." -ForegroundColor Yellow
}

# Show PM2 status
Write-Host ""
Write-Host "📊 PM2 Status:" -ForegroundColor Cyan
pm2 status

# Show logs location
Write-Host ""
Write-Host "📝 Logs:" -ForegroundColor Cyan
Write-Host "  PM2 logs: pm2 logs servicecar-dashboard" -ForegroundColor White
Write-Host "  Error log: .\logs\pm2-error.log" -ForegroundColor White
Write-Host "  Out log: .\logs\pm2-out.log" -ForegroundColor White

# Show URLs
Write-Host ""
Write-Host "🌐 URLs:" -ForegroundColor Cyan
Write-Host "  Dashboard: http://localhost:3000" -ForegroundColor White
Write-Host "  Health: http://localhost:3000/api/health" -ForegroundColor White
Write-Host "  Monitor: http://localhost:3000/api/monitor" -ForegroundColor White

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Startup completed successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Show next steps
Write-Host "💡 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Setup Cloudflare Tunnel (see PM2-SETUP.md)" -ForegroundColor White
Write-Host "  2. Configure health check monitoring" -ForegroundColor White
Write-Host "  3. Setup database backup schedule" -ForegroundColor White
Write-Host ""
