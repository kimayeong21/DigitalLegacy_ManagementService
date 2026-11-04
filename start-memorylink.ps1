$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$runScript = Join-Path $projectRoot 'run-memorylink.ps1'
$runtimeDir = Join-Path $projectRoot '.runtime'
$pidPath = Join-Path $runtimeDir 'memorylink-server.pid'

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$listener = Get-NetTCPConnection -LocalPort 4175 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    $lanAddress = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notmatch 'WSL|Hyper-V|Loopback' } |
        Select-Object -First 1 -ExpandProperty IPAddress)
    Write-Host 'MemoryLink가 이미 실행 중입니다.'
    Write-Host 'PC 주소: http://127.0.0.1:4175/'
    if ($lanAddress) { Write-Host "모바일 주소: http://${lanAddress}:4175/" }
    exit 0
}

$process = Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $runScript
) -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru

$process.Id | Out-File -LiteralPath $pidPath -Encoding ascii

for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:4175/' -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $lanAddress = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
                Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notmatch 'WSL|Hyper-V|Loopback' } |
                Select-Object -First 1 -ExpandProperty IPAddress)
            Write-Host 'MemoryLink가 백그라운드에서 실행되었습니다.'
            Write-Host 'PC 주소: http://127.0.0.1:4175/'
            if ($lanAddress) { Write-Host "모바일 주소: http://${lanAddress}:4175/" }
            exit 0
        }
    } catch {
        # 서버 준비가 끝날 때까지 다시 확인합니다.
    }
}

throw 'MemoryLink 서버가 제한 시간 안에 시작되지 않았습니다. .runtime\memorylink-server.log를 확인하세요.'

