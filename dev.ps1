[CmdletBinding()]
param(
    [ValidateRange(1, 65535)]
    [int]$ApiPort = 8000,

    [ValidateRange(1, 65535)]
    [int]$WebPort = 3000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = $PSScriptRoot
$apiDirectory = Join-Path $projectRoot "apps\api"
$webDirectory = Join-Path $projectRoot "apps\web"
$pythonPath = Join-Path $apiDirectory ".venv\Scripts\python.exe"
$webPackage = Join-Path $webDirectory "package.json"
$apiEnvironment = Join-Path $apiDirectory ".env"

function Assert-FileExists {
    param(
        [Parameter(Mandatory)]
        [string]$LiteralPath,

        [Parameter(Mandatory)]
        [string]$HelpMessage
    )

    if (-not (Test-Path -LiteralPath $LiteralPath -PathType Leaf)) {
        throw $HelpMessage
    }
}

function Assert-PortAvailable {
    param(
        [Parameter(Mandatory)]
        [int]$Port,

        [Parameter(Mandatory)]
        [string]$ServiceName
    )

    $connection = Get-NetTCPConnection `
        -LocalPort $Port `
        -State Listen `
        -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($null -ne $connection) {
        $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
        $processLabel = if ($null -ne $process) {
            "$($process.ProcessName), PID $($process.Id)"
        }
        else {
            "PID $($connection.OwningProcess)"
        }
        throw "$ServiceName cannot start because port $Port is already in use by $processLabel. Stop that verified process or choose another port."
    }

    $listener = [System.Net.Sockets.TcpListener]::new(
        [System.Net.IPAddress]::Loopback,
        $Port
    )
    try {
        $listener.Start()
    }
    catch {
        throw "$ServiceName cannot bind to port $Port. Windows may have reserved or blocked this port. Choose another port, for example: .\dev.ps1 -ApiPort 8100 -WebPort 3100"
    }
    finally {
        $listener.Stop()
    }
}

function Stop-ProcessTree {
    param([int]$ProcessId)

    $children = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.ParentProcessId -eq $ProcessId }

    foreach ($child in $children) {
        Stop-ProcessTree -ProcessId $child.ProcessId
    }

    Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

Assert-FileExists `
    -LiteralPath $pythonPath `
    -HelpMessage "Backend virtual environment is missing. Create apps\api\.venv and install requirements first."
Assert-FileExists `
    -LiteralPath $apiEnvironment `
    -HelpMessage "apps\api\.env is missing. Copy .env.example to .env and configure it locally."
Assert-FileExists `
    -LiteralPath $webPackage `
    -HelpMessage "Frontend package.json was not found in apps\web."

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if ($null -eq $npmCommand) {
    throw "npm.cmd was not found. Install Node.js 20 or newer and reopen PowerShell."
}

if (-not (Test-Path -LiteralPath (Join-Path $webDirectory "node_modules") -PathType Container)) {
    throw "Frontend dependencies are missing. Run 'npm install' inside apps\web first."
}

Assert-PortAvailable -Port $ApiPort -ServiceName "Planora API"
Assert-PortAvailable -Port $WebPort -ServiceName "Planora Web"

$apiProcess = $null
$webProcess = $null
$previousFrontendOrigins = $env:FRONTEND_ORIGINS
$previousPublicApiUrl = $env:NEXT_PUBLIC_API_URL

try {
    $env:FRONTEND_ORIGINS = "http://localhost:$WebPort,http://127.0.0.1:$WebPort"
    $apiProcess = Start-Process `
        -FilePath $pythonPath `
        -ArgumentList @(
            "-m",
            "uvicorn",
            "app.main:app",
            "--reload",
            "--host", "127.0.0.1",
            "--port", $ApiPort,
            "--loop", "app.core.event_loop:create_compatible_event_loop"
        ) `
        -WorkingDirectory $apiDirectory `
        -NoNewWindow `
        -PassThru

    # Keep the browser-facing Web and API hosts identical. Mixing localhost and
    # 127.0.0.1 makes SameSite=Lax authentication cookies cross-site.
    $env:NEXT_PUBLIC_API_URL = "http://localhost:$ApiPort/api/v1"
    $webProcess = Start-Process `
        -FilePath $npmCommand.Source `
        -ArgumentList @(
            "run", "dev", "--",
            "--hostname", "127.0.0.1",
            "--port", $WebPort
        ) `
        -WorkingDirectory $webDirectory `
        -NoNewWindow `
        -PassThru

    Write-Host ""
    Write-Host "Planora development servers are starting:" -ForegroundColor Green
    Write-Host "  Web:      http://localhost:$WebPort"
    Write-Host "  API:      http://localhost:$ApiPort"
    Write-Host "  API docs: http://localhost:$ApiPort/api/v1/docs"
    Write-Host ""
    Write-Host "Press Ctrl+C to stop both servers." -ForegroundColor Yellow
    Write-Host ""

    while (-not $apiProcess.HasExited -and -not $webProcess.HasExited) {
        Start-Sleep -Milliseconds 500
        $apiProcess.Refresh()
        $webProcess.Refresh()
    }

    if ($apiProcess.HasExited) {
        throw "Planora API stopped unexpectedly with exit code $($apiProcess.ExitCode)."
    }
    if ($webProcess.HasExited) {
        throw "Planora Web stopped unexpectedly with exit code $($webProcess.ExitCode)."
    }
}
finally {
    $env:FRONTEND_ORIGINS = $previousFrontendOrigins
    $env:NEXT_PUBLIC_API_URL = $previousPublicApiUrl

    if ($null -ne $webProcess -and -not $webProcess.HasExited) {
        Stop-ProcessTree -ProcessId $webProcess.Id
    }
    if ($null -ne $apiProcess -and -not $apiProcess.HasExited) {
        Stop-ProcessTree -ProcessId $apiProcess.Id
    }

    Write-Host "Planora development servers stopped." -ForegroundColor DarkGray
}
