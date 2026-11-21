# 停止手动运行的 chat bridge(端口 21121), 让 NSSM 服务接管
Get-NetTCPConnection -LocalPort 21121 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Write-Output ("kill chat pid " + $_.OwningProcess); Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'node.exe' -and $_.CommandLine -like '*chat\bridge.cjs*' } | ForEach-Object { Write-Output ("kill node pid " + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2
Write-Output 'manual chat instances stopped'
