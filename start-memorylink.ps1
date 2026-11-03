$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$runScript = Join-Path $projectRoot 'run-memorylink.ps1'
$runtimeDir = Join-Path $projectRoot '.runtime'
$pidPath = Join-Path $runtimeDir 'memorylink-server.pid'

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

$listener = Get-NetTCPConnection -LocalAddress 127.0.0.1 -LocalPort 4175 -State Listen -ErrorAction SilentlyContinue
if ($listener) {
    Write-Host 'MemoryLink가 이미 http://127.0.0.1:4175 에서 실행 중입니다.'
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
            Write-Host 'MemoryLink가 백그라운드에서 실행되었습니다: http://127.0.0.1:4175/'
            exit 0
        }
    } catch {
        # 서버 준비가 끝날 때까지 다시 확인합니다.
    }
}

throw 'MemoryLink 서버가 제한 시간 안에 시작되지 않았습니다. .runtime\memorylink-server.log를 확인하세요.'

