# ==============================================================================
# PerPay Windows 11 Coordinated Development Launcher (scripts/dev.ps1)
# "Usage-based AI payments. Settled on-chain."
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$SkipHealthCheck,
    [int]$StartupTimeoutSeconds = 30
)

$ErrorActionPreference = "Stop"
$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $WorkspaceRoot

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "       PERPAY — THREE-FOLDER UNIFIED DEVELOPMENT LAUNCHER        " -ForegroundColor Cyan
Write-Host "            Usage-based AI payments. Settled on-chain.           " -ForegroundColor DarkCyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "Workspace Root: $WorkspaceRoot" -ForegroundColor Gray

# 1. Check prerequisites
Write-Host "`n[1/5] Checking environment prerequisites..." -ForegroundColor Yellow

$NodeVersion = & node -v 2>$null
if (-not $NodeVersion) {
    Write-Error "Node.js is not found on PATH. Please install Node.js 18+."
    exit 1
}
Write-Host "  [OK] Node.js: $NodeVersion" -ForegroundColor Green

$PythonVersion = & python --version 2>$null
if (-not $PythonVersion) {
    Write-Error "Python is not found on PATH. Please install Python 3.10+."
    exit 1
}
Write-Host "  [OK] Python: $PythonVersion" -ForegroundColor Green

# 2. Cleanup stale processes on ports 8000, 4020, 3000
Write-Host "`n[2/5] Checking and clearing ports (8000, 4020, 3000)..." -ForegroundColor Yellow
$TargetPorts = @(8000, 4020, 3000)
foreach ($Port in $TargetPorts) {
    $Connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($Connections) {
        foreach ($Conn in $Connections) {
            $ProcessId = $Conn.OwningProcess
            if ($ProcessId -and $ProcessId -ne 0) {
                try {
                    $Proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
                    if ($Proc) {
                        Write-Host "  Freeing port $Port (terminating process $($Proc.ProcessName) PID: $ProcessId)..." -ForegroundColor DarkYellow
                        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
                    }
                } catch {}
            }
        }
    }
}
Start-Sleep -Milliseconds 800

# Ensure logs directory
$LogDir = Join-Path $WorkspaceRoot "logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

$GatewayLog = Join-Path $LogDir "gateway.log"
$X402Log = Join-Path $LogDir "x402-service.log"
$FrontendLog = Join-Path $LogDir "frontend.log"

# Clear old log files
"" | Out-File -FilePath $GatewayLog -Encoding utf8
"" | Out-File -FilePath $X402Log -Encoding utf8
"" | Out-File -FilePath $FrontendLog -Encoding utf8

# 3. Launch Services
Write-Host "`n[3/5] Starting PerPay services..." -ForegroundColor Yellow

# A. Start Gateway (FastAPI on Port 8000)
Write-Host "  -> Launching Gateway (FastAPI, Port 8000)..." -ForegroundColor Cyan
$GatewayJob = Start-Process -FilePath "python" `
    -ArgumentList "-m", "uvicorn", "gateway.main:app", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $WorkspaceRoot `
    -RedirectStandardOutput $GatewayLog `
    -RedirectStandardError $GatewayLog `
    -PassThru

# B. Start x402-service (Express + x402 v2 on Port 4020)
Write-Host "  -> Launching x402 Service (Hedera Engine, Port 4020)..." -ForegroundColor Cyan
$X402Path = Join-Path $WorkspaceRoot "x402-service"
$X402Job = Start-Process -FilePath "npm.cmd" `
    -ArgumentList "run", "dev" `
    -WorkingDirectory $X402Path `
    -RedirectStandardOutput $X402Log `
    -RedirectStandardError $X402Log `
    -PassThru

# C. Start Frontend (React + Vite on Port 3000)
Write-Host "  -> Launching Frontend (React + Vite, Port 3000)..." -ForegroundColor Cyan
$FrontendPath = if (Test-Path (Join-Path $WorkspaceRoot "frontend-design")) { Join-Path $WorkspaceRoot "frontend-design" } else { $WorkspaceRoot }
$FrontendJob = Start-Process -FilePath "npm.cmd" `
    -ArgumentList "run", "dev", "--", "--port", "3000", "--host" `
    -WorkingDirectory $FrontendPath `
    -RedirectStandardOutput $FrontendLog `
    -RedirectStandardError $FrontendLog `
    -PassThru

# Save PID file for clean shutdown
$PidData = @{
    gateway = $GatewayJob.Id
    x402    = $X402Job.Id
    frontend= $FrontendJob.Id
    started = (Get-Date).ToString("o")
} | ConvertTo-Json
$PidData | Out-File -FilePath (Join-Path $LogDir "pids.json") -Encoding utf8

# 4. Health Checks
Write-Host "`n[4/5] Waiting for service health checks..." -ForegroundColor Yellow

function Test-EndpointHealthy([string]$Url, [int]$TimeoutSec) {
    $Deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $Deadline) {
        try {
            $Response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 2 -ErrorAction Stop
            return $true
        } catch {
            Start-Sleep -Milliseconds 800
        }
    }
    return $false
}

if (-not $SkipHealthCheck) {
    # Test Gateway Health
    Write-Host "  Testing Gateway at http://localhost:8000/health..." -NoNewline
    if (Test-EndpointHealthy "http://localhost:8000/health" $StartupTimeoutSeconds) {
        Write-Host " [ONLINE]" -ForegroundColor Green
    } else {
        Write-Host " [PENDING/OFFLINE]" -ForegroundColor Yellow
        Write-Host "  Notice: Gateway log output:" -ForegroundColor Gray
        Get-Content -Tail 10 $GatewayLog -ErrorAction SilentlyContinue | Write-Host -ForegroundColor DarkGray
    }

    # Test Frontend Health
    Write-Host "  Testing Frontend at http://localhost:3000..." -NoNewline
    if (Test-EndpointHealthy "http://localhost:3000" $StartupTimeoutSeconds) {
        Write-Host " [ONLINE]" -ForegroundColor Green
    } else {
        Write-Host " [PENDING]" -ForegroundColor Yellow
    }

    # Test x402 Health
    Write-Host "  Testing x402 Payment Service at http://localhost:4020/health..." -NoNewline
    if (Test-EndpointHealthy "http://localhost:4020/health" 10) {
        Write-Host " [ONLINE]" -ForegroundColor Green
    } else {
        Write-Host " [STANDBY / DEPENDENCY INSTALL REQUIRED]" -ForegroundColor Yellow
    }
}

# 5. Summary Report
Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host "             PERPAY PLATFORM IS RUNNING LOCALLY                  " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "  * Frontend Application:      http://localhost:3000" -ForegroundColor White
Write-Host "  * FastAPI Gateway API:       http://localhost:8000" -ForegroundColor White
Write-Host "  * Gateway Swagger Docs:      http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "  * x402 Payment Service:      http://localhost:4020" -ForegroundColor White
Write-Host "  * x402 Health Endpoint:      http://localhost:4020/health" -ForegroundColor Gray
Write-Host "-----------------------------------------------------------------" -ForegroundColor Gray
Write-Host "  Process IDs: Gateway=$($GatewayJob.Id), x402=$($X402Job.Id), Frontend=$($FrontendJob.Id)" -ForegroundColor Gray
Write-Host "  To stop all services cleanly: .\scripts\stop.ps1" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor Cyan

