$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$pidPath = Join-Path $projectRoot '.runtime\memorylink-server.pid'

$listener = Get-NetTCPConnection -LocalPort 4175 -State Listen -ErrorAction SilentlyContinue
if (-not $listener) {
    Write-Host '실행 중인 MemoryLink 서버가 없습니다.'
    exit 0
}

$listenerProcessId = [int]$listener.OwningProcess
$listenerProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $listenerProcessId"
$wranglerProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $($listenerProcess.ParentProcessId)"
$commandLine = [string]$wranglerProcess.CommandLine

if ($commandLine -notmatch 'wrangler' -or $commandLine -notmatch '4175') {
    throw "4175 포트를 사용하는 프로세스가 MemoryLink 서버로 확인되지 않아 종료하지 않았습니다. PID: $listenerProcessId"
}

Stop-Process -Id $wranglerProcess.ProcessId -Force
if (Test-Path -LiteralPath $pidPath) { Remove-Item -LiteralPath $pidPath -Force }
Write-Host 'MemoryLink 서버를 종료했습니다.'
