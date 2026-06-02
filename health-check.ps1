# Health Check Script for PM2
# ใช้ใน Windows Task Scheduler หรือ cron job

$ErrorActionPreference = "Stop"

# Configuration
$healthUrl = "http://localhost:3000/api/health"
$pm2AppName = "servicecar-dashboard"
$logFile = ".\logs\health-check.log"
$maxRetries = 3

# Colors
function Write-Color($text, $color) {
    Write-Host $text -ForegroundColor $color
}

# Log function
function Write-Log($message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $message"
    Add-Content -Path $logFile -Value $logMessage
    Write-Host $logMessage
}

# Create logs directory if not exists
if (-not (Test-Path ".\logs")) {
    New-Item -ItemType Directory -Path ".\logs" | Out-Null
}

Write-Log "=== Health Check Started ==="

# Retry loop
$attempt = 1
$healthy = $false

while ($attempt -le $maxRetries -and -not $healthy) {
    try {
        Write-Log "Attempt $attempt/$maxRetries - Checking health..."
        
        # Make request with timeout
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 10
        $json = $response.Content | ConvertFrom-Json
        
        if ($json.status -eq "ok" -and $json.database.status -eq "healthy") {
            Write-Color "✅ Health check PASSED" Green
            Write-Log "✅ Status: OK, Database: Healthy, Response: $($json.database.responseTime)"
            $healthy = $true
        } else {
            Write-Color "⚠️ Health check WARNING: Status=$($json.status), DB=$($json.database.status)" Yellow
            Write-Log "⚠️ Status: $($json.status), Database: $($json.database.status)"
            $attempt++
            if ($attempt -le $maxRetries) {
                Start-Sleep -Seconds 5
            }
        }
        
    } catch {
        Write-Color "❌ Health check FAILED: $($_.Exception.Message)" Red
        Write-Log "❌ Error: $($_.Exception.Message)"
        $attempt++
        
        if ($attempt -le $maxRetries) {
            Write-Log "Retrying in 5 seconds..."
            Start-Sleep -Seconds 5
        }
    }
}

# If all retries failed, restart PM2 app
if (-not $healthy) {
    Write-Color "❌ All health checks failed. Restarting application..." Red
    Write-Log "❌ All health checks failed. Attempting restart..."
    
    try {
        # Restart PM2 app
        pm2 restart $pm2AppName
        Write-Log "✅ PM2 restart command sent"
        
        # Wait for app to start
        Start-Sleep -Seconds 10
        
        # Check health again
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 10
        $json = $response.Content | ConvertFrom-Json
        
        if ($json.status -eq "ok") {
            Write-Color "✅ Application restarted successfully" Green
            Write-Log "✅ Application restarted and healthy"
        } else {
            Write-Color "❌ Application restarted but still unhealthy" Red
            Write-Log "❌ Application restarted but status: $($json.status)"
            
            # Send alert (implement your alert method)
            # Send-MailMessage ...
        }
        
    } catch {
        Write-Color "❌ Failed to restart application: $($_.Exception.Message)" Red
        Write-Log "❌ Restart failed: $($_.Exception.Message)"
        
        # Send critical alert
        # Send-MailMessage ...
    }
}

Write-Log "=== Health Check Completed ==="
Write-Host ""
