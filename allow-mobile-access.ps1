$ErrorActionPreference = 'Stop'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
$isAdministrator = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdministrator) {
    Write-Host 'Windows 관리자 권한을 요청합니다.'
    Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @(
        '-NoProfile',
        '-ExecutionPolicy', 'Bypass',
        '-File', ('"' + $PSCommandPath + '"')
    )
    exit 0
}

$ruleName = 'MemoryLink LAN 4175'
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if (-not $existing) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort 4175 -Profile Private | Out-Null
}

$lanAddress = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.254*' -and
        $_.InterfaceAlias -notmatch 'WSL|Hyper-V|Loopback'
    } |
    Select-Object -First 1 -ExpandProperty IPAddress

Write-Host 'MemoryLink 모바일 접속 허용이 완료되었습니다.'
if ($lanAddress) {
    Write-Host "휴대폰 접속 주소: http://${lanAddress}:4175/"
}
Write-Host 'PC와 휴대폰이 같은 Wi-Fi 또는 같은 공유기에 연결되어 있어야 합니다.'
Read-Host '창을 닫으려면 Enter 키를 누르세요'
