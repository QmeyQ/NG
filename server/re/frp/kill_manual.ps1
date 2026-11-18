# 停止手动 relay(端口21119) 与手动 relay frpc(re\frpc.toml), 让 NSSM 服务接管
Get-NetTCPConnection -LocalPort 21119 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("kill relay pid " + $_.OwningProcess); Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*re\frpc.toml*' -and $_.Name -eq 'frpc.exe' } | ForEach-Object { Write-Output ("kill frpc pid " + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Write-Output 'manual instances stopped'
