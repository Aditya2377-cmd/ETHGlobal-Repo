# ==============================================================================
# PerPay Windows 11 Clean Shutdown Script (scripts/stop.ps1)
# ==============================================================================

[CmdletBinding()]
param()

$WorkspaceRoot = (Resolve-Path "$PSScriptRoot\..").Path
Write-Host "Shutting down PerPay services..." -ForegroundColor Cyan

# 1. Kill saved PIDs if available
$PidFile = Join-Path $WorkspaceRoot "logs\pids.json"
if (Test-Path $PidFile) {
    try {
        $Pids = Get-Content $PidFile -Raw | ConvertFrom-Json
        foreach ($Key in @("gateway", "x402", "frontend")) {
            $PidVal = $Pids.$Key
            if ($PidVal) {
                Stop-Process -Id $PidVal -Force -ErrorAction SilentlyContinue
                Write-Host "  Stopped $Key process (PID: $PidVal)" -ForegroundColor Green
            }
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    } catch {}
}

# 2. Kill by port binding (8000, 4020, 3000)
$Ports = @(8000, 4020, 3000)
foreach ($Port in $Ports) {
    $Connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($Connections) {
        foreach ($Conn in $Connections) {
            $ProcessId = $Conn.OwningProcess
            if ($ProcessId -and $ProcessId -ne 0) {
                try {
                    $Proc = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
                    if ($Proc) {
                        Write-Host "  Terminated process on port $Port ($($Proc.ProcessName) PID: $ProcessId)" -ForegroundColor DarkYellow
                        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
                    }
                } catch {}
            }
        }
    }
}

Write-Host "PerPay services stopped cleanly." -ForegroundColor Green

