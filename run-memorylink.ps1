$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$runtimeDir = Join-Path $projectRoot '.runtime'
$logPath = Join-Path $runtimeDir 'memorylink-server.log'

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
Set-Location -LiteralPath $projectRoot

"[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] MemoryLink server starting" | Out-File -LiteralPath $logPath -Append -Encoding utf8
& (Join-Path $projectRoot 'node_modules\.bin\wrangler.cmd') pages dev dist --ip 0.0.0.0 --port 4175 *>> $logPath

